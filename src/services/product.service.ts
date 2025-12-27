import { query } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Product, Category, ProductImage, ProductVariant } from '../types/index.js';

interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  gender?: string;
  product_type?: string;
  sizes?: string[];
  colors?: string[];
  brand?: string;
  sort_by?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'name';
  limit?: number;
  offset?: number;
}

export const productService = {
  async getAll(filters?: ProductFilters): Promise<Product[]> {
    let sql = `
      SELECT p.*,
        json_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug
        ) as category,
        COALESCE(
          (SELECT json_agg(pi ORDER BY pi.position)
           FROM product_images pi
           WHERE pi.product_id = p.id), '[]'
        ) as images,
        COALESCE(
          (SELECT json_agg(pv)
           FROM product_variants pv
           WHERE pv.product_id = p.id AND pv.is_active = true), '[]'
        ) as variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.category) {
      sql += ` AND p.category_id = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    if (filters?.search) {
      sql += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters?.minPrice) {
      sql += ` AND p.price >= $${paramIndex}`;
      params.push(filters.minPrice);
      paramIndex++;
    }

    if (filters?.maxPrice) {
      sql += ` AND p.price <= $${paramIndex}`;
      params.push(filters.maxPrice);
      paramIndex++;
    }

    // Filtro por género
    if (filters?.gender) {
      sql += ` AND p.gender = $${paramIndex}`;
      params.push(filters.gender);
      paramIndex++;
    }

    // Filtro por tipo de producto
    if (filters?.product_type) {
      sql += ` AND p.product_type = $${paramIndex}`;
      params.push(filters.product_type);
      paramIndex++;
    }

    // Filtro por tallas (busca si alguna talla coincide)
    if (filters?.sizes && filters.sizes.length > 0) {
      sql += ` AND p.sizes && $${paramIndex}::text[]`;
      params.push(filters.sizes);
      paramIndex++;
    }

    // Filtro por colores (busca si algún color coincide)
    if (filters?.colors && filters.colors.length > 0) {
      sql += ` AND p.colors && $${paramIndex}::text[]`;
      params.push(filters.colors);
      paramIndex++;
    }

    // Filtro por marca
    if (filters?.brand) {
      sql += ` AND p.brand ILIKE $${paramIndex}`;
      params.push(`%${filters.brand}%`);
      paramIndex++;
    }

    // Ordenamiento
    switch (filters?.sort_by) {
      case 'price_asc':
        sql += ' ORDER BY p.price ASC';
        break;
      case 'price_desc':
        sql += ' ORDER BY p.price DESC';
        break;
      case 'name':
        sql += ' ORDER BY p.name ASC';
        break;
      case 'popular':
        sql += ' ORDER BY p.is_featured DESC, p.created_at DESC';
        break;
      case 'newest':
      default:
        sql += ' ORDER BY p.created_at DESC';
    }

    if (filters?.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters?.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await query(sql, params);
    return result.rows as Product[];
  },

  // Get all products for admin (includes inactive)
  async getAllAdmin(filters?: ProductFilters & { includeInactive?: boolean }): Promise<Product[]> {
    let sql = `
      SELECT p.*,
        json_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug
        ) as category,
        COALESCE(
          (SELECT json_agg(pi ORDER BY pi.position)
           FROM product_images pi
           WHERE pi.product_id = p.id), '[]'
        ) as images,
        COALESCE(
          (SELECT json_agg(pv)
           FROM product_variants pv
           WHERE pv.product_id = p.id), '[]'
        ) as variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.category) {
      sql += ` AND p.category_id = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    if (filters?.search) {
      sql += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters?.minPrice) {
      sql += ` AND p.price >= $${paramIndex}`;
      params.push(filters.minPrice);
      paramIndex++;
    }

    if (filters?.maxPrice) {
      sql += ` AND p.price <= $${paramIndex}`;
      params.push(filters.maxPrice);
      paramIndex++;
    }

    sql += ' ORDER BY p.created_at DESC';

    if (filters?.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters?.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await query(sql, params);
    return result.rows as Product[];
  },

  async getBySlug(slug: string): Promise<Product> {
    const result = await query(
      `SELECT p.*,
        json_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug
        ) as category,
        COALESCE(
          (SELECT json_agg(pi ORDER BY pi.position)
           FROM product_images pi
           WHERE pi.product_id = p.id), '[]'
        ) as images,
        COALESCE(
          (SELECT json_agg(pv)
           FROM product_variants pv
           WHERE pv.product_id = p.id AND pv.is_active = true), '[]'
        ) as variants,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', pr.id,
              'rating', pr.rating,
              'title', pr.title,
              'content', pr.content,
              'created_at', pr.created_at,
              'user', json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url)
            )
          )
           FROM product_reviews pr
           LEFT JOIN users u ON pr.user_id = u.id
           WHERE pr.product_id = p.id), '[]'
        ) as reviews
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    return result.rows[0] as Product;
  },

  async getById(id: string): Promise<Product> {
    const result = await query(
      `SELECT p.*,
        json_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug
        ) as category,
        COALESCE(
          (SELECT json_agg(pi ORDER BY pi.position)
           FROM product_images pi
           WHERE pi.product_id = p.id), '[]'
        ) as images,
        COALESCE(
          (SELECT json_agg(pv)
           FROM product_variants pv
           WHERE pv.product_id = p.id AND pv.is_active = true), '[]'
        ) as variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    return result.rows[0] as Product;
  },

  async getFeatured(): Promise<Product[]> {
    const result = await query(
      `SELECT p.*,
        json_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug
        ) as category,
        COALESCE(
          (SELECT json_agg(pi ORDER BY pi.position)
           FROM product_images pi
           WHERE pi.product_id = p.id), '[]'
        ) as images
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true AND p.is_featured = true
      ORDER BY p.created_at DESC
      LIMIT 8`
    );

    return result.rows as Product[];
  },

  async getRelated(productId: string, categoryId: string): Promise<Product[]> {
    const result = await query(
      `SELECT p.*,
        COALESCE(
          (SELECT json_agg(pi ORDER BY pi.position)
           FROM product_images pi
           WHERE pi.product_id = p.id), '[]'
        ) as images
      FROM products p
      WHERE p.category_id = $1 AND p.id != $2 AND p.is_active = true
      LIMIT 4`,
      [categoryId, productId]
    );

    return result.rows as Product[];
  },

  async search(searchQuery: string): Promise<Product[]> {
    const result = await query(
      `SELECT p.*,
        COALESCE(
          (SELECT json_agg(pi ORDER BY pi.position)
           FROM product_images pi
           WHERE pi.product_id = p.id), '[]'
        ) as images
      FROM products p
      WHERE p.is_active = true
        AND (p.name ILIKE $1 OR p.description ILIKE $1 OR $2 = ANY(p.tags))
      LIMIT 20`,
      [`%${searchQuery}%`, searchQuery]
    );

    return result.rows as Product[];
  },

  // Admin functions
  async create(product: Partial<Product>): Promise<Product> {
    const result = await query(
      `INSERT INTO products (name, slug, description, short_description, price, compare_at_price,
        cost_per_item, sku, barcode, quantity, track_quantity, continue_selling_when_out_of_stock,
        category_id, brand, tags, is_active, is_featured, seo_title, seo_description,
        gender, product_type, sizes, colors, material, weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
       RETURNING *`,
      [
        product.name,
        product.slug,
        product.description,
        product.short_description,
        product.price,
        product.compare_at_price,
        product.cost_per_item,
        product.sku,
        product.barcode,
        product.quantity || 0,
        product.track_quantity ?? true,
        product.continue_selling_when_out_of_stock ?? false,
        product.category_id,
        product.brand,
        product.tags || [],
        product.is_active ?? true,
        product.is_featured ?? false,
        product.seo_title,
        product.seo_description,
        product.gender,
        product.product_type,
        product.sizes || [],
        product.colors || [],
        product.material,
        product.weight,
      ]
    );

    return result.rows[0] as Product;
  },

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'slug', 'description', 'short_description', 'price', 'compare_at_price',
      'cost_per_item', 'sku', 'barcode', 'quantity', 'track_quantity',
      'continue_selling_when_out_of_stock', 'category_id', 'brand', 'tags',
      'is_active', 'is_featured', 'seo_title', 'seo_description',
      'gender', 'product_type', 'sizes', 'colors', 'material', 'weight'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    values.push(id);
    const result = await query(
      `UPDATE products SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    return result.rows[0] as Product;
  },

  async delete(id: string): Promise<void> {
    const result = await query('DELETE FROM products WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      throw new AppError('Product not found', 404);
    }
  },

  // Product Images
  async addImage(productId: string, image: Partial<ProductImage>): Promise<ProductImage> {
    const result = await query(
      `INSERT INTO product_images (product_id, url, alt_text, position, is_primary)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [productId, image.url, image.alt_text, image.position || 0, image.is_primary || false]
    );
    return result.rows[0] as ProductImage;
  },

  async deleteImage(imageId: string): Promise<void> {
    await query('DELETE FROM product_images WHERE id = $1', [imageId]);
  },

  // Product Variants
  async addVariant(productId: string, variant: Partial<ProductVariant>): Promise<ProductVariant> {
    const result = await query(
      `INSERT INTO product_variants (product_id, name, sku, price, compare_at_price, quantity, options, image_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        productId,
        variant.name,
        variant.sku,
        variant.price,
        variant.compare_at_price,
        variant.quantity || 0,
        JSON.stringify(variant.options || []),
        variant.image_url,
        variant.is_active ?? true,
      ]
    );
    return result.rows[0] as ProductVariant;
  },

  async updateVariant(variantId: string, updates: Partial<ProductVariant>): Promise<ProductVariant> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id' && key !== 'product_id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(key === 'options' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    values.push(variantId);
    const result = await query(
      `UPDATE product_variants SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] as ProductVariant;
  },

  async deleteVariant(variantId: string): Promise<void> {
    await query('DELETE FROM product_variants WHERE id = $1', [variantId]);
  },
};

// Categories Service
export const categoryService = {
  async getAll(): Promise<Category[]> {
    const result = await query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = true) as products_count
       FROM categories c
       WHERE c.is_active = true
       ORDER BY c.position`
    );
    return result.rows as Category[];
  },

  async getBySlug(slug: string): Promise<Category> {
    const result = await query('SELECT * FROM categories WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      throw new AppError('Category not found', 404);
    }
    return result.rows[0] as Category;
  },

  async create(category: Partial<Category>): Promise<Category> {
    const result = await query(
      `INSERT INTO categories (name, slug, description, image_url, parent_id, position, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        category.name,
        category.slug,
        category.description,
        category.image_url,
        category.parent_id,
        category.position || 0,
        category.is_active ?? true,
      ]
    );
    return result.rows[0] as Category;
  },

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    values.push(id);
    const result = await query(
      `UPDATE categories SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Category not found', 404);
    }

    return result.rows[0] as Category;
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM categories WHERE id = $1', [id]);
  },
};
