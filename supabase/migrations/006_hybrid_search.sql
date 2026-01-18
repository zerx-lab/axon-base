-- Migration: Add BM25/Full-text search support for Hybrid Search
-- Implements Anthropic's Contextual Retrieval best practice: Vector + BM25 + RRF
-- Expected improvement: 49% reduction in retrieval failure rate

-- ============================================
-- FULL-TEXT SEARCH SETUP
-- ============================================

-- Add tsvector column for full-text search (supports both English and Chinese)
ALTER TABLE document_chunks 
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_chunks_search_vector 
  ON document_chunks USING GIN(search_vector);

-- ============================================
-- TRIGGER FOR AUTO-UPDATING SEARCH VECTOR
-- ============================================

-- Function to generate search vector from content
-- Combines multiple language configurations for multilingual support
CREATE OR REPLACE FUNCTION update_chunk_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  -- Use 'simple' config for better multilingual support (works with Chinese)
  -- Combines original_content for keyword matching
  NEW.search_vector := to_tsvector('simple', COALESCE(NEW.original_content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search_vector on insert/update
DROP TRIGGER IF EXISTS tr_chunk_search_vector ON document_chunks;
CREATE TRIGGER tr_chunk_search_vector
  BEFORE INSERT OR UPDATE OF original_content ON document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_chunk_search_vector();

-- ============================================
-- BACKFILL EXISTING DATA
-- ============================================

-- Update existing chunks to generate search vectors
UPDATE document_chunks 
SET search_vector = to_tsvector('simple', COALESCE(original_content, ''))
WHERE search_vector IS NULL;

-- ============================================
-- HYBRID SEARCH FUNCTION (RRF FUSION)
-- ============================================

-- Drop existing function if exists (to handle signature changes)
DROP FUNCTION IF EXISTS hybrid_search_chunks(TEXT, vector, UUID, INTEGER, FLOAT, FLOAT, INTEGER);

-- Hybrid search combining vector similarity and BM25 using Reciprocal Rank Fusion
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
BEGIN
    -- Convert query text to tsquery for BM25 search
    -- Use plainto_tsquery for simple word matching (better for user queries)
    query_tsquery := plainto_tsquery('simple', query_text);
    
    RETURN QUERY
    WITH 
    -- Vector search results (semantic similarity)
    vector_results AS (
        SELECT 
            dc.id,
            dc.document_id,
            d.title AS document_title,
            dc.original_content,
            dc.context_summary,
            dc.chunk_index,
            (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding))::FLOAT AS similarity,
            ROW_NUMBER() OVER (ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding) AS v_rank
        FROM public.document_chunks dc
        JOIN public.documents d ON d.id = dc.document_id
        WHERE d.kb_id = target_kb_id
            AND d.embedding_status = 'completed'
            AND dc.embedding IS NOT NULL
            AND (1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding)) >= match_threshold
        ORDER BY dc.embedding OPERATOR(extensions.<=>) query_embedding
        LIMIT 150
    ),
    
    -- BM25/Full-text search results (keyword matching)
    bm25_results AS (
        SELECT 
            dc.id,
            dc.document_id,
            d.title AS document_title,
            dc.original_content,
            dc.context_summary,
            dc.chunk_index,
            ts_rank_cd(dc.search_vector, query_tsquery, 32)::FLOAT AS bm25_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC) AS b_rank
        FROM public.document_chunks dc
        JOIN public.documents d ON d.id = dc.document_id
        WHERE d.kb_id = target_kb_id
            AND d.embedding_status = 'completed'
            AND dc.search_vector @@ query_tsquery
        ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC
        LIMIT 150
    ),
    
    -- Reciprocal Rank Fusion (RRF) to combine results
    -- Formula: RRF(d) = sum(1 / (k + rank))
    rrf_combined AS (
        SELECT 
            COALESCE(v.id, b.id) AS id,
            COALESCE(v.document_id, b.document_id) AS document_id,
            COALESCE(v.document_title, b.document_title) AS document_title,
            COALESCE(v.original_content, b.original_content) AS original_content,
            COALESCE(v.context_summary, b.context_summary) AS context_summary,
            COALESCE(v.chunk_index, b.chunk_index) AS chunk_index,
            COALESCE(v.similarity, 0)::FLOAT AS similarity,
            b.b_rank::INTEGER AS bm25_rank,
            v.v_rank::INTEGER AS vector_rank,
            -- RRF score calculation with configurable weights
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
-- VECTOR-ONLY SEARCH (FALLBACK)
-- ============================================

-- Keep the original vector-only search for backward compatibility
-- This is useful when query has no good keyword matches

-- ============================================
-- BM25-ONLY SEARCH FUNCTION
-- ============================================

-- Pure BM25 search for keyword-heavy queries
CREATE OR REPLACE FUNCTION bm25_search_chunks(
    query_text TEXT,
    target_kb_id UUID,
    match_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    document_title VARCHAR(500),
    chunk_content TEXT,
    chunk_context TEXT,
    chunk_index INTEGER,
    bm25_score FLOAT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public, extensions'
AS $$
DECLARE
    query_tsquery tsquery;
BEGIN
    query_tsquery := plainto_tsquery('simple', query_text);
    
    RETURN QUERY
    SELECT 
        dc.id AS chunk_id,
        dc.document_id,
        d.title AS document_title,
        dc.original_content AS chunk_content,
        dc.context_summary AS chunk_context,
        dc.chunk_index,
        ts_rank_cd(dc.search_vector, query_tsquery, 32)::FLOAT AS bm25_score
    FROM public.document_chunks dc
    JOIN public.documents d ON d.id = dc.document_id
    WHERE d.kb_id = target_kb_id
        AND d.embedding_status = 'completed'
        AND dc.search_vector @@ query_tsquery
    ORDER BY ts_rank_cd(dc.search_vector, query_tsquery, 32) DESC
    LIMIT match_count;
END;
$$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN document_chunks.search_vector IS 'Full-text search vector for BM25 keyword matching';
COMMENT ON FUNCTION hybrid_search_chunks IS 'Hybrid search combining vector similarity and BM25 using Reciprocal Rank Fusion (RRF). Based on Anthropic Contextual Retrieval best practice.';
COMMENT ON FUNCTION bm25_search_chunks IS 'Pure BM25 keyword search for cases where semantic search is not needed';
