-- Migration: Crear categoría conjuntos
-- Ejecutar en PostgreSQL

-- Insertar la categoría conjuntos si no existe
INSERT INTO categories (name, slug, description, position, is_active)
VALUES (
  'conjuntos',
  'conjuntos',
  'Conjuntos de ropa que incluyen camisa y pantalón, con opción de accesorios adicionales',
  0,
  true
)
ON CONFLICT (slug) DO NOTHING;
