-- Migration: Actualizar categoría CONJUNTO a conjuntos
-- Ejecutar en PostgreSQL

-- Actualizar el nombre de la categoría de CONJUNTO a conjuntos
UPDATE categories
SET 
  name = 'conjuntos',
  slug = 'conjuntos',
  updated_at = NOW()
WHERE 
  slug = 'conjunto' OR name = 'CONJUNTO';
