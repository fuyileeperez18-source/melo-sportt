-- Migración 006: Tabla de conversaciones de WhatsApp Bot
-- Esta tabla almacena las conversaciones del bot intermediario de WhatsApp

-- Crear tabla de conversaciones de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,

    -- Información del cliente
    customer_name VARCHAR(255),

    -- Preferencias recopiladas por el bot
    style VARCHAR(50), -- 'urbano' o 'clasico'
    occasion VARCHAR(255),
    budget VARCHAR(100),
    products TEXT[], -- Array de productos de interés

    -- Historial de conversación
    messages JSONB DEFAULT '[]'::jsonb,

    -- Estado de la conversación
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'escalated', 'closed'

    -- Timestamps
    escalated_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para buscar conversaciones por teléfono rápidamente
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone
ON whatsapp_conversations(phone);

-- Índice para filtrar por estado
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status
ON whatsapp_conversations(status);

-- Índice para ordenar por última actualización
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_updated
ON whatsapp_conversations(updated_at DESC);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_whatsapp_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp
DROP TRIGGER IF EXISTS trigger_update_whatsapp_conversation_timestamp
ON whatsapp_conversations;

CREATE TRIGGER trigger_update_whatsapp_conversation_timestamp
    BEFORE UPDATE ON whatsapp_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_conversation_timestamp();

COMMENT ON TABLE whatsapp_conversations IS 'Almacena conversaciones del bot de WhatsApp intermediario';
COMMENT ON COLUMN whatsapp_conversations.status IS 'Estado: active=conversando, escalated=escalado a humano, closed=cerrado';
