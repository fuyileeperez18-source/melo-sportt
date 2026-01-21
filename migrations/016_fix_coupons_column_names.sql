-- Migration: Fix coupons column names
-- Description: Add missing columns and align schema with migration 006

DO $$
BEGIN
  -- Add columns that might be missing from initial schema
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'coupons' AND column_name = 'min_purchase') THEN
    -- Rename minimum_purchase to min_purchase if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'coupons' AND column_name = 'minimum_purchase') THEN
      ALTER TABLE coupons RENAME COLUMN minimum_purchase TO min_purchase;
    ELSE
      ALTER TABLE coupons ADD COLUMN min_purchase DECIMAL(10, 2);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'coupons' AND column_name = 'max_discount') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'coupons' AND column_name = 'maximum_discount') THEN
      ALTER TABLE coupons RENAME COLUMN maximum_discount TO max_discount;
    ELSE
      ALTER TABLE coupons ADD COLUMN max_discount DECIMAL(10, 2);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'coupons' AND column_name = 'expires_at') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'coupons' AND column_name = 'valid_until') THEN
      ALTER TABLE coupons RENAME COLUMN valid_until TO expires_at;
    ELSE
      ALTER TABLE coupons ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'coupons' AND column_name = 'starts_at') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'coupons' AND column_name = 'valid_from') THEN
      ALTER TABLE coupons RENAME COLUMN valid_from TO starts_at;
    ELSE
      ALTER TABLE coupons ADD COLUMN starts_at TIMESTAMP WITH TIME ZONE;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'coupons' AND column_name = 'active') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'coupons' AND column_name = 'is_active') THEN
      ALTER TABLE coupons RENAME COLUMN is_active TO active;
    ELSE
      ALTER TABLE coupons ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'coupons' AND column_name = 'applicable_to') THEN
    ALTER TABLE coupons ADD COLUMN applicable_to VARCHAR(20) DEFAULT 'all';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'coupons' AND column_name = 'product_ids') THEN
    ALTER TABLE coupons ADD COLUMN product_ids JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'coupons' AND column_name = 'updated_at') THEN
    ALTER TABLE coupons ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'coupons' AND column_name = 'description') THEN
    ALTER TABLE coupons ADD COLUMN description TEXT;
  END IF;

  -- Update data types if needed
  ALTER TABLE coupons
    ALTER COLUMN discount_type TYPE VARCHAR(20),
    ALTER COLUMN discount_value TYPE DECIMAL(10, 2);

  -- Add missing constraints
  ALTER TABLE coupons
    DROP CONSTRAINT IF EXISTS coupons_discount_type_check;

  ALTER TABLE coupons
    ADD CONSTRAINT coupons_discount_type_check
    CHECK (discount_type IN ('percentage', 'fixed'));

  ALTER TABLE coupons
    ADD CONSTRAINT coupons_discount_value_check
    CHECK (discount_value > 0);

END $$;

-- Update constraints
DO $$
BEGIN
  -- Drop old constraints that might exist
  ALTER TABLE coupons
    DROP CONSTRAINT IF EXISTS coupons_applicable_to_check;

  -- Add new constraint if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'coupons' AND column_name = 'applicable_to') THEN
    ALTER TABLE coupons
      ADD CONSTRAINT coupons_applicable_to_check
      CHECK (applicable_to IN ('all', 'specific'));
  END IF;

END $$;

-- Add indexes (they might already exist from migration 006)
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(UPPER(code));
  CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active);
  CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons(expires_at);
END $$;

-- Insert example coupons
INSERT INTO coupons (code, discount_type, discount_value, min_purchase, max_discount, usage_limit, active, description)
VALUES
  ('BIENVENIDO10', 'percentage', 10, 50000, 20000, 100, true, 'Descuento del 10% en tu primera compra'),
  ('DESCUENTO5000', 'fixed', 5000, 30000, NULL, 50, true, '$5,000 de descuento en compras superiores a $30,000'),
  ('VERANO20', 'percentage', 20, 100000, 50000, 200, true, 'Verano 20% de descuento')
ON CONFLICT (code) DO NOTHING;
