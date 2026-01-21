-- ============================================
-- MESSAGING SYSTEM FOR CUSTOMER-SELLER COMMUNICATION
-- ============================================
-- Migration: Add messaging system
-- This migration adds/replaces the chat system for customer-seller communication

-- 1. First, drop old chat_messages table if it exists (from 000_initial_schema)
-- and rename to our new messages table
DROP TABLE IF EXISTS chat_messages CASCADE;

-- 2. Conversations table - ensure it has the right structure
-- If conversations table exists from initial schema, add missing columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'order_id') THEN
            ALTER TABLE conversations ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'product_id') THEN
            ALTER TABLE conversations ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_at') THEN
            ALTER TABLE conversations ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'updated_at') THEN
            ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        -- Add constraint check if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'conversations' AND constraint_name = 'conversations_status_check') THEN
            ALTER TABLE conversations ADD CONSTRAINT conversations_status_check CHECK (status IN ('active', 'archived'));
        END IF;
    ELSE
        -- Create conversations table if it doesn't exist
        CREATE TABLE conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
            product_id UUID REFERENCES products(id) ON DELETE SET NULL,
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
            last_message_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- Create indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_order_id ON conversations(order_id);
CREATE INDEX IF NOT EXISTS idx_conversations_product_id ON conversations(product_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- 3. Messages table - create if not exists
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    attachment_url TEXT,
    attachment_type VARCHAR(20) CHECK (attachment_type IN ('image', 'document')),
    attachment_name VARCHAR(255),
    attachment_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 4. Function to update last_message_at in conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update last_message_at
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_last_message();

-- 5. Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE messages
    SET
        is_read = true,
        read_at = NOW()
    WHERE
        conversation_id = p_conversation_id
        AND sender_id != p_user_id
        AND is_read = false;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to get unread messages count
CREATE OR REPLACE FUNCTION get_unread_messages_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    -- Admin sees unread messages from all conversations
    IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role IN ('admin', 'super_admin')) THEN
        SELECT COUNT(*)
        INTO unread_count
        FROM messages m
        INNER JOIN conversations c ON m.conversation_id = c.id
        WHERE m.sender_id != p_user_id
            AND m.is_read = false;
    ELSE
        -- Customers only see their conversations
        SELECT COUNT(*)
        INTO unread_count
        FROM messages m
        INNER JOIN conversations c ON m.conversation_id = c.id
        WHERE c.user_id = p_user_id
            AND m.sender_id != p_user_id
            AND m.is_read = false;
    END IF;

    RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE conversations IS 'Conversaciones entre clientes y el vendedor/admin';
COMMENT ON TABLE messages IS 'Mensajes individuales dentro de cada conversación';
COMMENT ON FUNCTION mark_messages_as_read IS 'Marca todos los mensajes de una conversación como leídos para un usuario';
COMMENT ON FUNCTION get_unread_messages_count IS 'Obtiene el número total de mensajes no leídos para un usuario';
