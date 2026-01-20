-- Add status column to chat_messages table
-- This column tracks the message state: pending, streaming, completed, failed

ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) 
DEFAULT 'completed' 
CHECK (status IN ('pending', 'streaming', 'completed', 'failed'));

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages(status);

-- Update existing messages to have 'completed' status
UPDATE chat_messages SET status = 'completed' WHERE status IS NULL;

COMMENT ON COLUMN chat_messages.status IS 'Message status: pending, streaming, completed, failed';
