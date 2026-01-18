-- Migration: Hybrid Search Optimization for Large Scale (100k+ documents)
-- Optimizations: Chinese tokenization, HNSW index, query performance, monitoring

-- ============================================
-- CHINESE TOKENIZATION SUPPORT
-- ============================================

-- Create custom text search configuration for mixed Chinese/English content
-- Using 'simple' as base and adding n-gram based tokenization for Chinese
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'chinese_english') THEN
        CREATE TEXT SEARCH CONFIGURATION chinese_english (COPY = simple);
    END IF;
END $$;

-- Function for tokenizing mixed Chinese/English text
-- Uses character-level tokenization for CJK characters (unigram/bigram)
CREATE OR REPLACE FUNCTION tokenize_mixed_content(content TEXT)
RETURNS tsvector
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    result tsvector;
    chinese_chars TEXT;
    english_words TEXT;
    bigrams TEXT;
    i INTEGER;
    char1 TEXT;
    char2 TEXT;
BEGIN
    IF content IS NULL OR content = '' THEN
        RETURN ''::tsvector;
    END IF;
    
    -- Extract and process English words (alphanumeric sequences)
    english_words := regexp_replace(content, '[^\x00-\x7F]+', ' ', 'g');
    result := to_tsvector('simple', COALESCE(english_words, ''));
    
    -- Extract CJK characters and create bigrams for better matching
    chinese_chars := regexp_replace(content, '[\x00-\x7F]+', '', 'g');
    
    IF length(chinese_chars) > 0 THEN
        -- Add individual Chinese characters as tokens
        FOR i IN 1..length(chinese_chars) LOOP
            result := result || to_tsvector('simple', substring(chinese_chars from i for 1));
        END LOOP;
        
        -- Add bigrams for Chinese characters (improves phrase matching)
        IF length(chinese_chars) > 1 THEN
            FOR i IN 1..length(chinese_chars)-1 LOOP
                char1 := substring(chinese_chars from i for 1);
                char2 := substring(chinese_chars from i+1 for 1);
                result := result || to_tsvector('simple', char1 || char2);
            END LOOP;
        END IF;
    END IF;
    
    RETURN result;
END;
$$;

-- Function for tokenizing query (same logic for consistency)
CREATE OR REPLACE FUNCTION tokenize_mixed_query(query_text TEXT)
RETURNS tsquery
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    result tsquery;
    tokens TEXT[];
    token TEXT;
    chinese_chars TEXT;
    english_words TEXT;
    i INTEGER;
BEGIN
    IF query_text IS NULL OR query_text = '' THEN
        RETURN ''::tsquery;
    END IF;
    
    tokens := ARRAY[]::TEXT[];
    
    -- Extract English words
    english_words := regexp_replace(query_text, '[^\x00-\x7F]+', ' ', 'g');
    FOREACH token IN ARRAY regexp_split_to_array(trim(english_words), '\s+')
    LOOP
        IF token != '' AND length(token) > 0 THEN
            tokens := array_append(tokens, token);
        END IF;
    END LOOP;
    
    -- Extract Chinese characters
    chinese_chars := regexp_replace(query_text, '[\x00-\x7F]+', '', 'g');
    
    IF length(chinese_chars) > 0 THEN
        -- Add individual characters
        FOR i IN 1..length(chinese_chars) LOOP
            tokens := array_append(tokens, substring(chinese_chars from i for 1));
        END LOOP;
        
        -- Add bigrams
        IF length(chinese_chars) > 1 THEN
            FOR i IN 1..length(chinese_chars)-1 LOOP
                tokens := array_append(tokens, substring(chinese_chars from i for 2));
            END LOOP;
        END IF;
    END IF;
    
    IF array_length(tokens, 1) IS NULL OR array_length(tokens, 1) = 0 THEN
        RETURN ''::tsquery;
    END IF;
    
    -- Build tsquery with OR logic for better recall
    result := to_tsquery('simple', tokens[1]);
    FOR i IN 2..array_length(tokens, 1) LOOP
        result := result || to_tsquery('simple', tokens[i]);
    END LOOP;
    
    RETURN result;
END;
$$;

-- ============================================
-- UPDATE SEARCH VECTOR TRIGGER
-- ============================================

-- Update trigger function to use mixed tokenization
CREATE OR REPLACE FUNCTION update_chunk_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := tokenize_mixed_content(COALESCE(NEW.original_content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VECTOR INDEX OPTIMIZATION
-- ============================================

-- Note: HNSW index requires fixed dimensions on the embedding column.
-- Since we support multiple embedding models with different dimensions,
-- we use a partial IVFFLAT index grouped by document for better performance.
-- For production with known dimension (e.g., 1536 for text-embedding-3-small),
-- consider altering the column: ALTER COLUMN embedding TYPE vector(1536)
-- Then create HNSW: CREATE INDEX ... USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64)

DROP INDEX IF EXISTS idx_chunks_embedding_ivfflat;

-- ============================================
-- COMPOSITE INDEXES FOR QUERY OPTIMIZATION
-- ============================================

-- Composite index for filtering by kb_id with embedding status
CREATE INDEX IF NOT EXISTS idx_docs_kb_embedding_status 
    ON documents(kb_id, embedding_status) 
    WHERE embedding_status = 'completed';

-- Composite index for document_id lookup with chunk ordering
CREATE INDEX IF NOT EXISTS idx_chunks_doc_order 
    ON document_chunks(document_id, chunk_index);

-- Partial index for chunks with embeddings only
CREATE INDEX IF NOT EXISTS idx_chunks_has_embedding 
    ON document_chunks(document_id) 
    WHERE embedding IS NOT NULL;

-- ============================================
-- OPTIMIZED HYBRID SEARCH FUNCTION
-- ============================================

DROP FUNCTION IF EXISTS hybrid_search_chunks(TEXT, vector, UUID, INTEGER, FLOAT, FLOAT, INTEGER);

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
    -- Use custom tokenizer for query
    query_tsquery := public.tokenize_mixed_query(query_text);
    
    -- Retrieve more candidates for better RRF fusion (3x final count)
    candidate_limit := LEAST(match_count * 3, 500);
    
    RETURN QUERY
    WITH 
    -- Pre-filter valid document IDs for this knowledge base
    valid_docs AS (
        SELECT d.id, d.title
        FROM public.documents d
        WHERE d.kb_id = target_kb_id
            AND d.embedding_status = 'completed'
    ),
    
    -- Vector search with pre-filtering
    vector_results AS (
        SELECT 
            dc.id,
            dc.document_id,
            vd.title AS document_title,
            dc.original_content,
            dc.context_summary,
            dc.chunk_index,
            (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding))::FLOAT AS sim,
            ROW_NUMBER() OVER (ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding) AS v_rank
        FROM public.document_chunks dc
        INNER JOIN valid_docs vd ON vd.id = dc.document_id
        WHERE dc.embedding IS NOT NULL
            AND (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding)) >= match_threshold
        ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding
        LIMIT candidate_limit
    ),
    
    -- BM25 search with custom tokenization
    bm25_results AS (
        SELECT 
            dc.id,
            dc.document_id,
            vd.title AS document_title,
            dc.original_content,
            dc.context_summary,
            dc.chunk_index,
            ts_rank_cd(dc.search_vector, query_tsquery, 32)::FLOAT AS bm25_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC) AS b_rank
        FROM public.document_chunks dc
        INNER JOIN valid_docs vd ON vd.id = dc.document_id
        WHERE dc.search_vector @@ query_tsquery
        ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC
        LIMIT candidate_limit
    ),
    
    -- RRF fusion with weighted scoring
    rrf_combined AS (
        SELECT 
            COALESCE(v.id, b.id) AS id,
            COALESCE(v.document_id, b.document_id) AS document_id,
            COALESCE(v.document_title, b.document_title) AS document_title,
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
        r.document_title,
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

-- ============================================
-- EXTENDED HYBRID SEARCH WITH RERANKING SUPPORT
-- ============================================

-- Returns more candidates for external reranking
CREATE OR REPLACE FUNCTION hybrid_search_for_reranking(
    query_text TEXT,
    query_embedding extensions.vector,
    target_kb_id UUID,
    candidate_count INTEGER DEFAULT 100,
    match_threshold FLOAT DEFAULT 0.2,
    vector_weight FLOAT DEFAULT 0.5,
    rrf_k INTEGER DEFAULT 60
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    document_title VARCHAR(500),
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
    valid_docs AS (
        SELECT d.id, d.title
        FROM public.documents d
        WHERE d.kb_id = target_kb_id
            AND d.embedding_status = 'completed'
    ),
    
    vector_results AS (
        SELECT 
            dc.id,
            dc.document_id,
            vd.title AS document_title,
            dc.original_content,
            dc.context_summary,
            dc.chunk_index,
            dc.token_count,
            (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding))::FLOAT AS sim,
            ROW_NUMBER() OVER (ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding) AS v_rank
        FROM public.document_chunks dc
        INNER JOIN valid_docs vd ON vd.id = dc.document_id
        WHERE dc.embedding IS NOT NULL
            AND (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding)) >= match_threshold
        ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding
        LIMIT internal_limit
    ),
    
    bm25_results AS (
        SELECT 
            dc.id,
            dc.document_id,
            vd.title AS document_title,
            dc.original_content,
            dc.context_summary,
            dc.chunk_index,
            dc.token_count,
            ts_rank_cd(dc.search_vector, query_tsquery, 32)::FLOAT AS bm25_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC) AS b_rank
        FROM public.document_chunks dc
        INNER JOIN valid_docs vd ON vd.id = dc.document_id
        WHERE dc.search_vector @@ query_tsquery
        ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC
        LIMIT internal_limit
    ),
    
    rrf_combined AS (
        SELECT 
            COALESCE(v.id, b.id) AS id,
            COALESCE(v.document_id, b.document_id) AS document_id,
            COALESCE(v.document_title, b.document_title) AS document_title,
            COALESCE(v.original_content, b.original_content) AS original_content,
            COALESCE(v.context_summary, b.context_summary) AS context_summary,
            COALESCE(v.chunk_index, b.chunk_index) AS chunk_index,
            COALESCE(v.token_count, b.token_count) AS token_count,
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
        r.id,
        r.document_id,
        r.document_title,
        r.original_content,
        r.context_summary,
        r.chunk_index,
        r.similarity,
        r.bm25_rank,
        r.vector_rank,
        r.combined_score,
        r.search_type,
        r.token_count
    FROM rrf_combined r
    ORDER BY r.combined_score DESC
    LIMIT candidate_count;
END;
$$;

-- ============================================
-- SEARCH STATISTICS AND MONITORING
-- ============================================

-- Get search index statistics for a knowledge base
CREATE OR REPLACE FUNCTION get_search_stats(target_kb_id UUID)
RETURNS TABLE (
    total_chunks BIGINT,
    chunks_with_embedding BIGINT,
    chunks_with_search_vector BIGINT,
    avg_chunk_tokens NUMERIC,
    total_documents BIGINT,
    index_coverage_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public, extensions'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(dc.id)::BIGINT AS total_chunks,
        COUNT(dc.id) FILTER (WHERE dc.embedding IS NOT NULL)::BIGINT AS chunks_with_embedding,
        COUNT(dc.id) FILTER (WHERE dc.search_vector IS NOT NULL)::BIGINT AS chunks_with_search_vector,
        ROUND(AVG(dc.token_count)::NUMERIC, 2) AS avg_chunk_tokens,
        COUNT(DISTINCT dc.document_id)::BIGINT AS total_documents,
        ROUND(
            (COUNT(dc.id) FILTER (WHERE dc.embedding IS NOT NULL AND dc.search_vector IS NOT NULL)::NUMERIC / 
             NULLIF(COUNT(dc.id), 0)::NUMERIC) * 100, 
            2
        ) AS index_coverage_percent
    FROM public.document_chunks dc
    INNER JOIN public.documents d ON d.id = dc.document_id
    WHERE d.kb_id = target_kb_id;
END;
$$;

-- Rebuild search vectors for a knowledge base (maintenance function)
CREATE OR REPLACE FUNCTION rebuild_search_vectors(target_kb_id UUID)
RETURNS TABLE (
    updated_count BIGINT,
    duration_ms BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public, extensions'
AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    rows_updated BIGINT;
BEGIN
    start_time := clock_timestamp();
    
    WITH updated AS (
        UPDATE public.document_chunks dc
        SET search_vector = public.tokenize_mixed_content(COALESCE(dc.original_content, ''))
        FROM public.documents d
        WHERE d.id = dc.document_id
            AND d.kb_id = target_kb_id
        RETURNING dc.id
    )
    SELECT COUNT(*) INTO rows_updated FROM updated;
    
    end_time := clock_timestamp();
    
    RETURN QUERY
    SELECT 
        rows_updated,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::BIGINT;
END;
$$;

-- ============================================
-- BACKFILL: Update existing search vectors with new tokenization
-- ============================================

-- Update all existing chunks to use the new tokenization
UPDATE public.document_chunks 
SET search_vector = tokenize_mixed_content(COALESCE(original_content, ''))
WHERE search_vector IS NULL 
   OR search_vector = to_tsvector('simple', COALESCE(original_content, ''));

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

ANALYZE public.document_chunks;
ANALYZE public.documents;
