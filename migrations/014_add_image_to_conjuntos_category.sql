-- Migration: Agregar imagen a la categoría conjuntos
-- Ejecutar en PostgreSQL

-- Actualizar la categoría conjuntos con una imagen
UPDATE categories
SET 
  image_url = 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600',
  updated_at = NOW()
WHERE 
  slug = 'conjuntos' AND (image_url IS NULL OR image_url = '');
