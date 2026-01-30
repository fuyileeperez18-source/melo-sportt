-- ============================================
-- SUPPORT REQUESTS SYSTEM FOR MELOBOT ESCALATION
-- ============================================
-- Migration: Add support request tracking to conversations
-- This migration adds fields to track support requests created by MELOBOT

-- 1. Add support request fields to conversations table
DO $$
BEGIN
    -- Add is_support_request flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'is_support_request') THEN
        ALTER TABLE conversations ADD COLUMN is_support_request BOOLEAN DEFAULT false;
    END IF;

    -- Add problem_type field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'problem_type') THEN
        ALTER TABLE conversations ADD COLUMN problem_type VARCHAR(50);
    END IF;

    -- Add problem_label field (human readable)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'problem_label') THEN
        ALTER TABLE conversations ADD COLUMN problem_label VARCHAR(255);
    END IF;

    -- Add problem_description field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'problem_description') THEN
        ALTER TABLE conversations ADD COLUMN problem_description TEXT;
    END IF;

    -- Add assigned_admin_id field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'assigned_admin_id') THEN
        ALTER TABLE conversations ADD COLUMN assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Add priority field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'priority') THEN
        ALTER TABLE conversations ADD COLUMN priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
    END IF;

    -- Add resolved_at field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'resolved_at') THEN
        ALTER TABLE conversations ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add resolved_by field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'resolved_by') THEN
        ALTER TABLE conversations ADD COLUMN resolved_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Update status check constraint to include 'pending' and 'resolved'
    ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_status_check;
    ALTER TABLE conversations ADD CONSTRAINT conversations_status_check
        CHECK (status IN ('active', 'archived', 'pending', 'resolved', 'closed'));
END $$;

-- 2. Create indexes for support request queries
CREATE INDEX IF NOT EXISTS idx_conversations_is_support_request ON conversations(is_support_request) WHERE is_support_request = true;
CREATE INDEX IF NOT EXISTS idx_conversations_problem_type ON conversations(problem_type);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_admin_id ON conversations(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON conversations(priority);

-- 3. Create a view for pending support requests
CREATE OR REPLACE VIEW pending_support_requests AS
SELECT
    c.id,
    c.user_id,
    c.problem_type,
    c.problem_label,
    c.problem_description,
    c.priority,
    c.status,
    c.assigned_admin_id,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    u.full_name as customer_name,
    u.email as customer_email,
    u.phone as customer_phone,
    u.avatar_url as customer_avatar,
    admin.full_name as assigned_admin_name,
    (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.is_read = false AND m.sender_id = c.user_id) as unread_count
FROM conversations c
INNER JOIN users u ON c.user_id = u.id
LEFT JOIN users admin ON c.assigned_admin_id = admin.id
WHERE c.is_support_request = true
    AND c.status NOT IN ('resolved', 'closed')
ORDER BY
    CASE c.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
    END,
    c.created_at ASC;

-- 4. Function to assign support request to admin
CREATE OR REPLACE FUNCTION assign_support_request(
    p_conversation_id UUID,
    p_admin_id UUID
)
RETURNS conversations AS $$
DECLARE
    updated_conversation conversations;
BEGIN
    UPDATE conversations
    SET
        assigned_admin_id = p_admin_id,
        status = 'active',
        updated_at = NOW()
    WHERE id = p_conversation_id
        AND is_support_request = true
    RETURNING * INTO updated_conversation;

    RETURN updated_conversation;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to resolve support request
CREATE OR REPLACE FUNCTION resolve_support_request(
    p_conversation_id UUID,
    p_admin_id UUID
)
RETURNS conversations AS $$
DECLARE
    updated_conversation conversations;
BEGIN
    UPDATE conversations
    SET
        status = 'resolved',
        resolved_at = NOW(),
        resolved_by = p_admin_id,
        updated_at = NOW()
    WHERE id = p_conversation_id
        AND is_support_request = true
    RETURNING * INTO updated_conversation;

    RETURN updated_conversation;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to get support request stats
CREATE OR REPLACE FUNCTION get_support_request_stats()
RETURNS TABLE (
    total_pending BIGINT,
    total_active BIGINT,
    total_resolved_today BIGINT,
    by_type JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM conversations WHERE is_support_request = true AND status = 'pending')::BIGINT as total_pending,
        (SELECT COUNT(*) FROM conversations WHERE is_support_request = true AND status = 'active')::BIGINT as total_active,
        (SELECT COUNT(*) FROM conversations WHERE is_support_request = true AND status = 'resolved' AND resolved_at >= CURRENT_DATE)::BIGINT as total_resolved_today,
        (
            SELECT jsonb_object_agg(COALESCE(problem_type, 'unknown'), cnt)
            FROM (
                SELECT problem_type, COUNT(*) as cnt
                FROM conversations
                WHERE is_support_request = true AND status IN ('pending', 'active')
                GROUP BY problem_type
            ) sub
        )::JSONB as by_type;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON COLUMN conversations.is_support_request IS 'Indica si esta conversación es una solicitud de soporte creada por MELOBOT';
COMMENT ON COLUMN conversations.problem_type IS 'Tipo de problema: order, payment, product, shipping, return, other';
COMMENT ON COLUMN conversations.problem_label IS 'Etiqueta legible del tipo de problema';
COMMENT ON COLUMN conversations.problem_description IS 'Descripción del problema proporcionada por el usuario';
COMMENT ON COLUMN conversations.assigned_admin_id IS 'Admin asignado para manejar esta solicitud';
COMMENT ON COLUMN conversations.priority IS 'Prioridad de la solicitud: low, normal, high, urgent';
COMMENT ON COLUMN conversations.resolved_at IS 'Fecha y hora de resolución';
COMMENT ON COLUMN conversations.resolved_by IS 'Admin que resolvió la solicitud';
COMMENT ON VIEW pending_support_requests IS 'Vista de solicitudes de soporte pendientes para el panel de admin';
