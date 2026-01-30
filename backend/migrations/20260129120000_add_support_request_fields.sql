-- Migration to add support request fields to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS is_support_request BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS problem_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS problem_label VARCHAR(100),
ADD COLUMN IF NOT EXISTS problem_description TEXT,
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id);

-- Update status check constraint to include 'pending' if it doesn't already
-- First drop existing constraint if possible, or just add the new one.
-- In PostgreSQL, altering a check constraint usually involves dropping and recreating.
-- Assuming the constraint name is conversations_status_check (default naming) or similar.
-- However, safe way is to just alter column type or validation if needed, but since we are just adding 'pending', let's check.
-- The existing check was: CHECK (status IN ('active', 'resolved', 'archived'))
-- We need to add 'pending' for support requests.

-- Dropping constraint (name might vary, so we use a safe block or just try to add new one)
-- Better approach: just drop the constraint and re-add it with new values.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_status_check') THEN
        ALTER TABLE conversations DROP CONSTRAINT conversations_status_check;
    END IF;
END $$;

ALTER TABLE conversations
ADD CONSTRAINT conversations_status_check CHECK (status IN ('pending', 'active', 'resolved', 'archived', 'closed'));

-- Create indexes for support requests
CREATE INDEX IF NOT EXISTS idx_conversations_is_support_request ON conversations(is_support_request);
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON conversations(priority);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_admin_id ON conversations(assigned_admin_id);
