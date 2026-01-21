-- Add total_sold column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_sold INTEGER DEFAULT 0;

-- Update existing products to have total_sold = 0 where it's NULL
UPDATE products SET total_sold = 0 WHERE total_sold IS NULL;
