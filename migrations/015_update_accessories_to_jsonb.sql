-- Migration: Convertir accesorios a JSONB para soportar múltiples accesorios
-- Ejecutar en PostgreSQL

-- 1. Crear la nueva columna accessories como JSONB
ALTER TABLE products ADD COLUMN IF NOT EXISTS accessories JSONB DEFAULT '[]'::jsonb;

-- 2. Migrar los datos existentes de accessory_type y accessory_price a la nueva estructura
UPDATE products
SET accessories = jsonb_build_array(
  jsonb_build_object(
    'type', accessory_type,
    'price', accessory_price
  )
)
WHERE has_accessory = true
  AND accessory_type IS NOT NULL
  AND accessory_type != '';

-- 3. Eliminar las columnas antiguas (opcional, puedes comentar estas líneas si prefieres mantenerlas temporalmente)
ALTER TABLE products DROP COLUMN IF EXISTS accessory_type;
ALTER TABLE products DROP COLUMN IF EXISTS accessory_price;
ALTER TABLE products DROP COLUMN IF EXISTS has_accessory;

-- 4. Crear índice GIN para búsquedas en el array JSONB
CREATE INDEX IF NOT EXISTS idx_products_accessories ON products USING GIN (accessories);

-- Comentarios
COMMENT ON COLUMN products.accessories IS 'Array JSON de accesorios opcionales con tipo y precio: [{"type": "gorra", "price": 15000}, ...]';
