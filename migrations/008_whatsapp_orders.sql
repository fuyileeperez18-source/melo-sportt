-- ============================================
-- MELO SPORTT - WhatsApp Bot Orders Migration
-- ============================================
-- Esta tabla almacena los pedidos generados por el bot de WhatsApp

-- Pedidos del bot de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_orders (
    id BIGSERIAL PRIMARY KEY,

    -- Identificación
    order_number VARCHAR(50) UNIQUE NOT NULL,

    -- Cliente
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,

    -- Productos seleccionados (con precios del momento)
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Estructura: [{ product_id, name, price, quantity, notes }]

    -- Totales
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 10,
    commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    final_total DECIMAL(12, 2) NOT NULL DEFAULT 0,

    -- Preferencias recopiladas por el bot
    style VARCHAR(50),
    occasion VARCHAR(255),
    budget VARCHAR(100),

    -- Notas adicionales del cliente
    customer_notes TEXT,

    -- Estado del pedido
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'confirmed', 'cancelled', 'completed')),

    -- Notifications
    notified_to_fuyi BOOLEAN DEFAULT false,
    notified_to_owner BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_orders_phone ON whatsapp_orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_orders_status ON whatsapp_orders(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_orders_created ON whatsapp_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_orders_order_number ON whatsapp_orders(order_number);

-- Función para generar número de orden único
CREATE OR REPLACE FUNCTION generate_whatsapp_order_number()
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN 'WA-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_whatsapp_order_timestamp ON whatsapp_orders;

CREATE TRIGGER trigger_update_whatsapp_order_timestamp
    BEFORE UPDATE ON whatsapp_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_order_timestamp();

COMMENT ON TABLE whatsapp_orders IS 'Almacena pedidos generados por el bot de WhatsApp';
COMMENT ON COLUMN whatsapp_orders.status IS 'pending=esperando contacto, contacted=contactado, confirmado=confirmado por tienda, completed=vendido';

-- ============================================
-- Mejorar la tabla de conversaciones para integrar con pedidos
-- ============================================

-- Agregar referencia al pedido si existe
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS whatsapp_order_id BIGINT REFERENCES whatsapp_orders(id);

-- Agregar columna para el presupuesto estimado del cliente
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS estimated_budget DECIMAL(12, 2);

-- Agregar columna para notas del bot
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS bot_notes TEXT;
