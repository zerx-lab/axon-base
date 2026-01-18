CREATE OR REPLACE FUNCTION public.hybrid_search_document_chunks(
    query_text TEXT,
    query_embedding extensions.vector,
    target_document_id UUID,
    match_count INTEGER DEFAULT 10,
    match_threshold FLOAT DEFAULT 0.3,
    vector_weight FLOAT DEFAULT 0.5,
    rrf_k INTEGER DEFAULT 60
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
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
SET search_path = 'public, extensions'
AS $$
DECLARE
    query_tsquery tsquery;
    candidate_limit INTEGER;
BEGIN
    query_tsquery := public.tokenize_mixed_query(query_text);
    candidate_limit := LEAST(match_count * 3, 100);
    
    RETURN QUERY
    WITH 
    vector_results AS (
        SELECT 
            dc.id,
            dc.document_id,
            dc.original_content,
            dc.context_summary,
            dc.chunk_index,
            (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding))::FLOAT AS sim,
            ROW_NUMBER() OVER (ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding) AS v_rank
        FROM public.document_chunks dc
        WHERE dc.document_id = target_document_id
            AND dc.embedding IS NOT NULL
            AND (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding)) >= match_threshold
        ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding
        LIMIT candidate_limit
    ),
    
    bm25_results AS (
        SELECT 
            dc.id,
            dc.document_id,
            dc.original_content,
            dc.context_summary,
            dc.chunk_index,
            ts_rank_cd(dc.search_vector, query_tsquery, 32)::FLOAT AS bm25_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC) AS b_rank
        FROM public.document_chunks dc
        WHERE dc.document_id = target_document_id
            AND dc.search_vector IS NOT NULL
            AND dc.search_vector @@ query_tsquery
        ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC
        LIMIT candidate_limit
    ),
    
    rrf_combined AS (
        SELECT 
            COALESCE(v.id, b.id) AS id,
            COALESCE(v.document_id, b.document_id) AS document_id,
            COALESCE(v.original_content, b.original_content) AS original_content,
            COALESCE(v.context_summary, b.context_summary) AS context_summary,
            COALESCE(v.chunk_index, b.chunk_index) AS chunk_index,
            COALESCE(v.sim, 0)::FLOAT AS similarity,
            b.b_rank::INTEGER AS bm25_rank,
            v.v_rank::INTEGER AS vector_rank,
            (
                COALESCE(vector_weight / (rrf_k + v.v_rank), 0) + 
                COALESCE((1 - vector_weight) / (rrf_k + b.b_rank), 0)
            )::FLOAT AS combined_score,
            CASE 
                WHEN v.id IS NOT NULL AND b.id IS NOT NULL THEN 'hybrid'
                WHEN v.id IS NOT NULL THEN 'vector'
                ELSE 'bm25'
            END AS search_type
        FROM vector_results v
        FULL OUTER JOIN bm25_results b ON v.id = b.id
    )
    
    SELECT 
        r.id AS chunk_id,
        r.document_id,
        r.original_content AS chunk_content,
        r.context_summary AS chunk_context,
        r.chunk_index,
        r.similarity,
        r.bm25_rank,
        r.vector_rank,
        r.combined_score,
        r.search_type
    FROM rrf_combined r
    ORDER BY r.combined_score DESC
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.hybrid_search_document_chunks IS 'Hybrid search within a single document using RRF fusion of vector similarity and BM25';
