-- ============================================
-- UPDATE SEARCH FUNCTIONS TO INCLUDE SOURCE_URL
-- ============================================

-- Drop existing functions to recreate with new return type
DROP FUNCTION IF EXISTS hybrid_search_chunks(TEXT, extensions.vector, UUID, INTEGER, FLOAT, FLOAT, INTEGER);
DROP FUNCTION IF EXISTS hybrid_search_for_reranking(TEXT, extensions.vector, UUID, INTEGER, FLOAT, FLOAT, INTEGER);
DROP FUNCTION IF EXISTS search_similar_chunks(vector, UUID, INTEGER, FLOAT);

-- ============================================
-- SEARCH SIMILAR CHUNKS (with source_url)
-- ============================================

CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector,
    target_kb_id UUID,
    match_count INTEGER DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    document_title VARCHAR(500),
    document_source_url TEXT,
    chunk_content TEXT,
    chunk_context TEXT,
    chunk_index INTEGER,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id, dc.document_id, d.title, d.source_url, dc.original_content, dc.context_summary, dc.chunk_index,
        (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity
    FROM public.document_chunks dc
    JOIN public.documents d ON d.id = dc.document_id
    WHERE d.kb_id = target_kb_id AND d.embedding_status = 'completed' AND dc.embedding IS NOT NULL
        AND (1 - (dc.embedding <=> query_embedding)) >= match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- HYBRID SEARCH CHUNKS (with source_url)
-- ============================================

CREATE OR REPLACE FUNCTION hybrid_search_chunks(
    query_text TEXT,
    query_embedding extensions.vector,
    target_kb_id UUID,
    match_count INTEGER DEFAULT 20,
    match_threshold FLOAT DEFAULT 0.3,
    vector_weight FLOAT DEFAULT 0.5,
    rrf_k INTEGER DEFAULT 60
)
RETURNS TABLE (
    chunk_id UUID, 
    document_id UUID, 
    document_title VARCHAR(500), 
    document_source_url TEXT,
    chunk_content TEXT, 
    chunk_context TEXT,
    chunk_index INTEGER, 
    similarity FLOAT, 
    bm25_rank INTEGER, 
    vector_rank INTEGER, 
    combined_score FLOAT, 
    search_type TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public, extensions'
AS $$
DECLARE
    query_tsquery tsquery;
    candidate_limit INTEGER;
BEGIN
    query_tsquery := public.tokenize_mixed_query(query_text);
    candidate_limit := LEAST(match_count * 3, 500);

    RETURN QUERY
    WITH
    valid_docs AS (SELECT d.id, d.title, d.source_url FROM public.documents d WHERE d.kb_id = target_kb_id AND d.embedding_status = 'completed'),
    vector_results AS (
        SELECT dc.id, dc.document_id, vd.title AS document_title, vd.source_url AS document_source_url, dc.original_content, dc.context_summary, dc.chunk_index,
            (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding))::FLOAT AS sim,
            ROW_NUMBER() OVER (ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding) AS v_rank
        FROM public.document_chunks dc INNER JOIN valid_docs vd ON vd.id = dc.document_id
        WHERE dc.embedding IS NOT NULL AND (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding)) >= match_threshold
        ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding LIMIT candidate_limit
    ),
    bm25_results AS (
        SELECT dc.id, dc.document_id, vd.title AS document_title, vd.source_url AS document_source_url, dc.original_content, dc.context_summary, dc.chunk_index,
            ts_rank_cd(dc.search_vector, query_tsquery, 32)::FLOAT AS bm25_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC) AS b_rank
        FROM public.document_chunks dc INNER JOIN valid_docs vd ON vd.id = dc.document_id
        WHERE dc.search_vector @@ query_tsquery
        ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC LIMIT candidate_limit
    ),
    rrf_combined AS (
        SELECT COALESCE(v.id, b.id) AS id, COALESCE(v.document_id, b.document_id) AS document_id,
            COALESCE(v.document_title, b.document_title) AS document_title,
            COALESCE(v.document_source_url, b.document_source_url) AS document_source_url,
            COALESCE(v.original_content, b.original_content) AS original_content,
            COALESCE(v.context_summary, b.context_summary) AS context_summary,
            COALESCE(v.chunk_index, b.chunk_index) AS chunk_index,
            COALESCE(v.sim, 0)::FLOAT AS similarity, b.b_rank::INTEGER AS bm25_rank, v.v_rank::INTEGER AS vector_rank,
            (COALESCE(vector_weight / (rrf_k + v.v_rank), 0) + COALESCE((1 - vector_weight) / (rrf_k + b.b_rank), 0))::FLOAT AS combined_score,
            CASE WHEN v.id IS NOT NULL AND b.id IS NOT NULL THEN 'hybrid' WHEN v.id IS NOT NULL THEN 'vector' ELSE 'bm25' END AS search_type
        FROM vector_results v FULL OUTER JOIN bm25_results b ON v.id = b.id
    )
    SELECT r.id, r.document_id, r.document_title, r.document_source_url, r.original_content, r.context_summary, r.chunk_index,
        r.similarity, r.bm25_rank, r.vector_rank, r.combined_score, r.search_type
    FROM rrf_combined r ORDER BY r.combined_score DESC LIMIT match_count;
END;
$$;

-- ============================================
-- HYBRID SEARCH FOR RERANKING (with source_url)
-- ============================================

CREATE OR REPLACE FUNCTION hybrid_search_for_reranking(
    query_text TEXT, query_embedding extensions.vector, target_kb_id UUID,
    candidate_count INTEGER DEFAULT 100, match_threshold FLOAT DEFAULT 0.2, vector_weight FLOAT DEFAULT 0.5, rrf_k INTEGER DEFAULT 60
)
RETURNS TABLE (
    chunk_id UUID, 
    document_id UUID, 
    document_title VARCHAR(500), 
    document_source_url TEXT,
    chunk_content TEXT, 
    chunk_context TEXT,
    chunk_index INTEGER, 
    similarity FLOAT, 
    bm25_rank INTEGER, 
    vector_rank INTEGER, 
    combined_score FLOAT, 
    search_type TEXT, 
    token_count INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public, extensions'
AS $$
DECLARE
    query_tsquery tsquery;
    internal_limit INTEGER;
BEGIN
    query_tsquery := public.tokenize_mixed_query(query_text);
    internal_limit := LEAST(candidate_count * 2, 1000);

    RETURN QUERY
    WITH
    valid_docs AS (SELECT d.id, d.title, d.source_url FROM public.documents d WHERE d.kb_id = target_kb_id AND d.embedding_status = 'completed'),
    vector_results AS (
        SELECT dc.id, dc.document_id, vd.title AS document_title, vd.source_url AS document_source_url, dc.original_content, dc.context_summary, dc.chunk_index, dc.token_count,
            (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding))::FLOAT AS sim,
            ROW_NUMBER() OVER (ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding) AS v_rank
        FROM public.document_chunks dc INNER JOIN valid_docs vd ON vd.id = dc.document_id
        WHERE dc.embedding IS NOT NULL AND (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding)) >= match_threshold
        ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding LIMIT internal_limit
    ),
    bm25_results AS (
        SELECT dc.id, dc.document_id, vd.title AS document_title, vd.source_url AS document_source_url, dc.original_content, dc.context_summary, dc.chunk_index, dc.token_count,
            ts_rank_cd(dc.search_vector, query_tsquery, 32)::FLOAT AS bm25_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC) AS b_rank
        FROM public.document_chunks dc INNER JOIN valid_docs vd ON vd.id = dc.document_id
        WHERE dc.search_vector @@ query_tsquery ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC LIMIT internal_limit
    ),
    rrf_combined AS (
        SELECT COALESCE(v.id, b.id) AS id, COALESCE(v.document_id, b.document_id) AS document_id,
            COALESCE(v.document_title, b.document_title) AS document_title, 
            COALESCE(v.document_source_url, b.document_source_url) AS document_source_url,
            COALESCE(v.original_content, b.original_content) AS original_content,
            COALESCE(v.context_summary, b.context_summary) AS context_summary, COALESCE(v.chunk_index, b.chunk_index) AS chunk_index,
            COALESCE(v.token_count, b.token_count) AS token_count, COALESCE(v.sim, 0)::FLOAT AS similarity,
            b.b_rank::INTEGER AS bm25_rank, v.v_rank::INTEGER AS vector_rank,
            (COALESCE(vector_weight / (rrf_k + v.v_rank), 0) + COALESCE((1 - vector_weight) / (rrf_k + b.b_rank), 0))::FLOAT AS combined_score,
            CASE WHEN v.id IS NOT NULL AND b.id IS NOT NULL THEN 'hybrid' WHEN v.id IS NOT NULL THEN 'vector' ELSE 'bm25' END AS search_type
        FROM vector_results v FULL OUTER JOIN bm25_results b ON v.id = b.id
    )
    SELECT r.id, r.document_id, r.document_title, r.document_source_url, r.original_content, r.context_summary, r.chunk_index,
        r.similarity, r.bm25_rank, r.vector_rank, r.combined_score, r.search_type, r.token_count
    FROM rrf_combined r ORDER BY r.combined_score DESC LIMIT candidate_count;
END;
$$;

-- ============================================
-- MULTI-KB HYBRID SEARCH (new function)
-- ============================================

CREATE OR REPLACE FUNCTION hybrid_search_chunks_multi_kb(
    query_text TEXT,
    query_embedding extensions.vector,
    target_kb_ids UUID[],
    match_count INTEGER DEFAULT 20,
    match_threshold FLOAT DEFAULT 0.3,
    vector_weight FLOAT DEFAULT 0.5,
    rrf_k INTEGER DEFAULT 60
)
RETURNS TABLE (
    chunk_id UUID, 
    document_id UUID, 
    document_title VARCHAR(500), 
    document_source_url TEXT,
    kb_id UUID,
    chunk_content TEXT, 
    chunk_context TEXT,
    chunk_index INTEGER, 
    similarity FLOAT, 
    bm25_rank INTEGER, 
    vector_rank INTEGER, 
    combined_score FLOAT, 
    search_type TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public, extensions'
AS $$
DECLARE
    query_tsquery tsquery;
    candidate_limit INTEGER;
BEGIN
    query_tsquery := public.tokenize_mixed_query(query_text);
    candidate_limit := LEAST(match_count * 3, 500);

    RETURN QUERY
    WITH
    valid_docs AS (
        SELECT d.id, d.title, d.source_url, d.kb_id 
        FROM public.documents d 
        WHERE d.kb_id = ANY(target_kb_ids) AND d.embedding_status = 'completed'
    ),
    vector_results AS (
        SELECT dc.id, dc.document_id, vd.title AS document_title, vd.source_url AS document_source_url, vd.kb_id,
            dc.original_content, dc.context_summary, dc.chunk_index,
            (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding))::FLOAT AS sim,
            ROW_NUMBER() OVER (ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding) AS v_rank
        FROM public.document_chunks dc INNER JOIN valid_docs vd ON vd.id = dc.document_id
        WHERE dc.embedding IS NOT NULL AND (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding)) >= match_threshold
        ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding LIMIT candidate_limit
    ),
    bm25_results AS (
        SELECT dc.id, dc.document_id, vd.title AS document_title, vd.source_url AS document_source_url, vd.kb_id,
            dc.original_content, dc.context_summary, dc.chunk_index,
            ts_rank_cd(dc.search_vector, query_tsquery, 32)::FLOAT AS bm25_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC) AS b_rank
        FROM public.document_chunks dc INNER JOIN valid_docs vd ON vd.id = dc.document_id
        WHERE dc.search_vector @@ query_tsquery
        ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC LIMIT candidate_limit
    ),
    rrf_combined AS (
        SELECT COALESCE(v.id, b.id) AS id, COALESCE(v.document_id, b.document_id) AS document_id,
            COALESCE(v.document_title, b.document_title) AS document_title,
            COALESCE(v.document_source_url, b.document_source_url) AS document_source_url,
            COALESCE(v.kb_id, b.kb_id) AS kb_id,
            COALESCE(v.original_content, b.original_content) AS original_content,
            COALESCE(v.context_summary, b.context_summary) AS context_summary,
            COALESCE(v.chunk_index, b.chunk_index) AS chunk_index,
            COALESCE(v.sim, 0)::FLOAT AS similarity, b.b_rank::INTEGER AS bm25_rank, v.v_rank::INTEGER AS vector_rank,
            (COALESCE(vector_weight / (rrf_k + v.v_rank), 0) + COALESCE((1 - vector_weight) / (rrf_k + b.b_rank), 0))::FLOAT AS combined_score,
            CASE WHEN v.id IS NOT NULL AND b.id IS NOT NULL THEN 'hybrid' WHEN v.id IS NOT NULL THEN 'vector' ELSE 'bm25' END AS search_type
        FROM vector_results v FULL OUTER JOIN bm25_results b ON v.id = b.id
    )
    SELECT r.id, r.document_id, r.document_title, r.document_source_url, r.kb_id, r.original_content, r.context_summary, r.chunk_index,
        r.similarity, r.bm25_rank, r.vector_rank, r.combined_score, r.search_type
    FROM rrf_combined r ORDER BY r.combined_score DESC LIMIT match_count;
END;
$$;
