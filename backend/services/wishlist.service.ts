import { query } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

interface WishlistQueryOptions {
  limit?: number;
  offset?: number;
}

export interface WishlistItemRow {
  added_at: string;
  product: unknown; // JSON product object as returned by the query
}

export const wishlistService = {
  async getIds(userId: string): Promise<string[]> {
    const result = await query(
      `SELECT product_id
       FROM wishlist_items
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [userId]
    );

    return result.rows.map((r) => r.product_id as string);
  },

  async getWishlist(userId: string, options?: WishlistQueryOptions): Promise<{ data: WishlistItemRow[]; count: number }> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const countResult = await query(
      `SELECT COUNT(*)::int as count
       FROM wishlist_items wi
       JOIN products p ON p.id = wi.product_id
       WHERE wi.user_id = $1 AND p.is_active = true`,
      [userId]
    );

    const count = countResult.rows?.[0]?.count ?? 0;

    const result = await query(
      `SELECT
        wi.added_at,
        json_build_object(
          'id', p.id,
          'name', p.name,
          'slug', p.slug,
          'description', p.description,
          'short_description', p.short_description,
          'price', p.price,
          'compare_at_price', p.compare_at_price,
          'cost_per_item', p.cost_per_item,
          'sku', p.sku,
          'barcode', p.barcode,
          'quantity', p.quantity,
          'track_quantity', p.track_quantity,
          'continue_selling_when_out_of_stock', p.continue_selling_when_out_of_stock,
          'category_id', p.category_id,
          'brand', p.brand,
          'tags', p.tags,
          'is_active', p.is_active,
          'is_featured', p.is_featured,
          'seo_title', p.seo_title,
          'seo_description', p.seo_description,
          'gender', p.gender,
          'product_type', p.product_type,
          'sizes', p.sizes,
          'colors', p.colors,
          'material', p.material,
          'weight', p.weight,
          'created_at', p.created_at,
          'updated_at', p.updated_at,
          'category', CASE
            WHEN c.id IS NULL THEN NULL
            ELSE json_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
          END,
          'images', COALESCE(imgs.images, '[]'::json),
          'variants', COALESCE(vars.variants, '[]'::json)
        ) AS product
       FROM wishlist_items wi
       JOIN products p ON p.id = wi.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN LATERAL (
         SELECT json_agg(pi ORDER BY pi.position) AS images
         FROM product_images pi
         WHERE pi.product_id = p.id
       ) imgs ON true
       LEFT JOIN LATERAL (
         SELECT json_agg(pv) AS variants
         FROM product_variants pv
         WHERE pv.product_id = p.id AND pv.is_active = true
       ) vars ON true
       WHERE wi.user_id = $1
         AND p.is_active = true
       ORDER BY wi.added_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return { data: result.rows as WishlistItemRow[], count };
  },

  async add(userId: string, productId: string): Promise<{ added: boolean }> {
    const productExists = await query(
      `SELECT 1 FROM products WHERE id = $1 AND is_active = true`,
      [productId]
    );

    if (productExists.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    const inserted = await query(
      `INSERT INTO wishlist_items (user_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING
       RETURNING id`,
      [userId, productId]
    );

    return { added: inserted.rows.length > 0 };
  },

  async remove(userId: string, productId: string): Promise<{ removed: boolean }> {
    const deleted = await query(
      `DELETE FROM wishlist_items
       WHERE user_id = $1 AND product_id = $2
       RETURNING id`,
      [userId, productId]
    );

    return { removed: deleted.rows.length > 0 };
  },
};
