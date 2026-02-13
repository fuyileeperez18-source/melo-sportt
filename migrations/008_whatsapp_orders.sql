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
-- Drop first to handle return type changes
DROP FUNCTION IF EXISTS generate_whatsapp_order_number() CASCADE;

CREATE FUNCTION generate_whatsapp_order_number()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.order_number := 'WA-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
        LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
              FROM public.whatsapp_orders WHERE order_number LIKE 'WA-' || to_char(NOW(), 'YYYYMMDD') || '-%')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-generar número de orden
DROP TRIGGER IF EXISTS set_whatsapp_order_number ON whatsapp_orders;
CREATE TRIGGER set_whatsapp_order_number
    BEFORE INSERT ON whatsapp_orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
    EXECUTE FUNCTION generate_whatsapp_order_number();

-- Trigger para actualizar timestamp
DROP FUNCTION IF EXISTS update_whatsapp_order_timestamp() CASCADE;

CREATE FUNCTION update_whatsapp_order_timestamp()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
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
