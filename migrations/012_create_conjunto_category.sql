-- Migration: Crear categoría CONJUNTO
-- Ejecutar en PostgreSQL

-- Insertar la categoría CONJUNTO si no existe
INSERT INTO categories (name, slug, description, position, is_active)
VALUES (
  'CONJUNTO',
  'conjunto',
  'Conjuntos de ropa que incluyen camisa y pantalón, con opción de accesorios adicionales',
  0,
  true
)
ON CONFLICT (slug) DO NOTHING;
