-- Migration: Agregar campos de filtrado a productos
-- Ejecutar en PostgreSQL

-- Agregar columnas de filtrado a la tabla products
ALTER TABLE products ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(30);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS material VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight DECIMAL(10, 2);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_sizes ON products USING GIN(sizes);
CREATE INDEX IF NOT EXISTS idx_products_colors ON products USING GIN(colors);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

-- Comentarios
COMMENT ON COLUMN products.gender IS 'Género: hombre, mujer, unisex, nino, nina';
COMMENT ON COLUMN products.product_type IS 'Tipo: camiseta, camisa, pantalon, chaqueta, sudadera, short, accesorio, zapato, vestido, falda, otro';
COMMENT ON COLUMN products.sizes IS 'Array de tallas disponibles: XS, S, M, L, XL, XXL, o números';
COMMENT ON COLUMN products.colors IS 'Array de colores disponibles';
COMMENT ON COLUMN products.material IS 'Material principal del producto';
COMMENT ON COLUMN products.weight IS 'Peso en gramos';
