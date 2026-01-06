-- ============================================
-- MELO SPORTT - MERCADO PAGO SPLIT PAYMENTS
-- Migration 009: Marketplace y Split de Pagos
-- ============================================

-- Tabla para almacenar las cuentas de Mercado Pago vinculadas (vendedores)
CREATE TABLE IF NOT EXISTS mercadopago_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  mp_user_id BIGINT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  public_key TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  live_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para registrar las comisiones de Mercado Pago (tu 10%)
CREATE TABLE IF NOT EXISTS mercadopago_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  payment_id VARCHAR(255) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,     -- Monto total de la transacción
  commission_amount DECIMAL(12, 2) NOT NULL, -- Tu comisión del 10%
  seller_amount DECIMAL(12, 2) NOT NULL,       -- Monto que va al vendedor (90%)
  seller_mp_id BIGINT,                         -- ID del vendedor en Mercado Pago
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campos adicionales en la tabla de órdenes para rastrear el split
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_preference_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_merchant_order_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS application_fee DECIMAL(12, 2); -- Tu 10%
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_amount DECIMAL(12, 2);    -- El 90% del vendedor
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_seller_id BIGINT;             -- ID del vendedor en MP

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_mercadopago_accounts_user_id ON mercadopago_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_mercadopago_accounts_mp_user_id ON mercadopago_accounts(mp_user_id);
CREATE INDEX IF NOT EXISTS idx_mercadopago_commissions_order_id ON mercadopago_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_mercadopago_commissions_created_at ON mercadopago_commissions(created_at DESC);

-- Trigger para updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_mercadopago_accounts_updated_at') THEN
        CREATE TRIGGER update_mercadopago_accounts_updated_at BEFORE UPDATE ON mercadopago_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;
