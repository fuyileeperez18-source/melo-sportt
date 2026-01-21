-- Migration: Add Coupons System
-- Description: Create table for discount coupons

-- Create coupons table if not exists
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
  min_purchase DECIMAL(10, 2),
  max_discount DECIMAL(10, 2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  starts_at TIMESTAMP WITH TIME ZONE,
  applicable_to VARCHAR(20) DEFAULT 'all' CHECK (applicable_to IN ('all', 'specific')),
  product_ids JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'coupons' AND column_name = 'active') THEN
    ALTER TABLE coupons ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'coupons' AND column_name = 'applicable_to') THEN
    ALTER TABLE coupons ADD COLUMN applicable_to VARCHAR(20) DEFAULT 'all';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'coupons' AND column_name = 'product_ids') THEN
    ALTER TABLE coupons ADD COLUMN product_ids JSONB;
  END IF;
END $$;

-- Create indexes for faster lookups (handle case where column might not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'coupons' AND column_name = 'code') THEN
    CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(UPPER(code));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'coupons' AND column_name = 'active') THEN
    CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'coupons' AND column_name = 'expires_at') THEN
    CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons(expires_at);
  END IF;
END $$;

-- Add coupon_code and coupon_discount to orders table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'orders' AND column_name = 'coupon_code') THEN
    ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'orders' AND column_name = 'coupon_discount') THEN
    ALTER TABLE orders ADD COLUMN coupon_discount DECIMAL(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Insert some example coupons for testing (optional)
INSERT INTO coupons (code, discount_type, discount_value, min_purchase, max_discount, usage_limit, active)
VALUES
  ('BIENVENIDO10', 'percentage', 10, 50000, 20000, 100, true),
  ('DESCUENTO5000', 'fixed', 5000, 30000, NULL, 50, true),
  ('VERANO20', 'percentage', 20, 100000, 50000, 200, true)
ON CONFLICT (code) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE coupons IS 'Sistema de cupones de descuento para la tienda';
COMMENT ON COLUMN coupons.discount_type IS 'Tipo de descuento: percentage (porcentaje) o fixed (monto fijo)';
COMMENT ON COLUMN coupons.discount_value IS 'Valor del descuento (porcentaje 1-100 o monto fijo en pesos)';
COMMENT ON COLUMN coupons.min_purchase IS 'Compra mínima requerida para usar el cupón';
COMMENT ON COLUMN coupons.max_discount IS 'Descuento máximo aplicable (solo para percentage)';
COMMENT ON COLUMN coupons.usage_limit IS 'Límite de usos del cupón (NULL = ilimitado)';
COMMENT ON COLUMN coupons.used_count IS 'Contador de veces que se ha usado el cupón';
COMMENT ON COLUMN coupons.applicable_to IS 'Aplicabilidad: all (todos los productos) o specific (productos específicos)';
COMMENT ON COLUMN coupons.product_ids IS 'IDs de productos aplicables (JSON array) cuando applicable_to = specific';
