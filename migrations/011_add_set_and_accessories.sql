-- Migration: Agregar soporte para conjuntos con accesorios opcionales
-- Ejecutar en PostgreSQL

-- Agregar columnas para conjuntos y accesorios
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_set BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_accessory BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS accessory_type VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS accessory_price DECIMAL(12, 2);

-- Crear índice para búsquedas rápidas de conjuntos
CREATE INDEX IF NOT EXISTS idx_products_is_set ON products(is_set);

-- Comentarios
COMMENT ON COLUMN products.is_set IS 'Indica si el producto es un conjunto (camisa + pantalón)';
COMMENT ON COLUMN products.has_accessory IS 'Indica si el conjunto tiene un accesorio opcional';
COMMENT ON COLUMN products.accessory_type IS 'Tipo de accesorio: gorra, reloj, cinturón, etc.';
COMMENT ON COLUMN products.accessory_price IS 'Precio adicional del accesorio si se incluye';
