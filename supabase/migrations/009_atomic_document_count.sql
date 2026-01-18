-- AxonBase Atomic Document Count Migration
-- Add atomic increment/decrement function for document_count to prevent race conditions

-- ============================================
-- ATOMIC INCREMENT FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION increment_document_count(kb_id_param UUID, increment_by INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.knowledge_bases
    SET
        document_count = document_count + increment_by,
        updated_at = NOW()
    WHERE id = kb_id_param;
END;
$$;

-- ============================================
-- ATOMIC DECREMENT FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION decrement_document_count(kb_id_param UUID, decrement_by INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.knowledge_bases
    SET
        document_count = GREATEST(0, document_count - decrement_by),
        updated_at = NOW()
    WHERE id = kb_id_param;
END;
$$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION increment_document_count IS 'Atomically increment document_count for a knowledge base';
COMMENT ON FUNCTION decrement_document_count IS 'Atomically decrement document_count for a knowledge base (minimum 0)';
