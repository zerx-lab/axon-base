-- ============================================
-- CHAT SESSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    kb_ids UUID[] DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_chat_session_status CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);

COMMENT ON TABLE chat_sessions IS 'Chat sessions for AI conversations';
COMMENT ON COLUMN chat_sessions.kb_ids IS 'Associated knowledge base IDs for RAG';
COMMENT ON COLUMN chat_sessions.settings IS 'Session-specific settings (model, temperature, etc)';

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_chat_message_role CHECK (role IN ('user', 'assistant', 'system')),
    CONSTRAINT chk_chat_message_status CHECK (status IN ('pending', 'streaming', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages(status) WHERE status IN ('pending', 'streaming');

COMMENT ON TABLE chat_messages IS 'Messages in chat sessions';
COMMENT ON COLUMN chat_messages.status IS 'Message status: pending (waiting), streaming (AI generating), completed, failed';
COMMENT ON COLUMN chat_messages.metadata IS 'Extra info: token usage, referenced documents, error details';

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MESSAGE COUNT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_chat_session_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.chat_sessions 
        SET message_count = message_count + 1 
        WHERE id = NEW.session_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.chat_sessions 
        SET message_count = GREATEST(0, message_count - 1) 
        WHERE id = OLD.session_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER tr_chat_message_count
    AFTER INSERT OR DELETE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_chat_session_message_count();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_chat_sessions" ON chat_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL PRIVILEGES ON chat_sessions TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON chat_messages TO anon, authenticated, service_role;
