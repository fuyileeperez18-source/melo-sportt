import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { productService, categoryService } from '../services/product.service.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// ==================== PRODUCTS ====================

// Get all products
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('📦 [PRODUCTS] GET / - Query params:', req.query);
    const filters = {
      category: req.query.category && (req.query.category as string).trim() !== '' ? req.query.category as string : undefined,
      search: req.query.search && (req.query.search as string).trim() !== '' ? req.query.search as string : undefined,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : req.query.min_price ? parseFloat(req.query.min_price as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : req.query.max_price ? parseFloat(req.query.max_price as string) : undefined,
      gender: req.query.gender && (req.query.gender as string).trim() !== '' && req.query.gender !== 'all' ? req.query.gender as string : undefined,
      product_type: req.query.product_type && (req.query.product_type as string).trim() !== '' && req.query.product_type !== 'all' ? req.query.product_type as string : undefined,
      sizes: req.query.sizes && (req.query.sizes as string).trim() !== '' ? (req.query.sizes as string).split(',').filter(Boolean) : undefined,
      colors: req.query.colors && (req.query.colors as string).trim() !== '' ? (req.query.colors as string).split(',').filter(Boolean) : undefined,
      brand: req.query.brand && (req.query.brand as string).trim() !== '' ? req.query.brand as string : undefined,
      material: req.query.material && (req.query.material as string).trim() !== '' ? req.query.material as string : undefined,
      sort_by: req.query.sort_by && (req.query.sort_by as string).trim() !== '' ? req.query.sort_by as 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'name' : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };
    console.log('📦 [PRODUCTS] Filters:', filters);
    const products = await productService.getAll(filters);
    console.log('📦 [PRODUCTS] Found products:', products.length);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('❌ [PRODUCTS] Error in GET /:', error);
    next(error);
  }
});

// Get featured products
router.get('/featured', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('📦 [PRODUCTS] GET /featured - Request received');
    const products = await productService.getFeatured();
    console.log('📦 [PRODUCTS] GET /featured - Found products:', products.length);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('❌ [PRODUCTS] GET /featured - Error:', error);
    next(error);
  }
});

// Search products
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      res.json({ success: true, data: [] });
      return;
    }
    const products = await productService.search(query);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

// Get all products for admin (includes inactive) - MUST be before /:id route
router.get('/admin', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      category: req.query.category as string,
      search: req.query.search as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      includeInactive: true,
    };
    const products = await productService.getAllAdmin(filters);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

// Get product by slug
router.get('/slug/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    if (!slug) {
        return res.status(400).json({ success: false, error: 'Slug is required' });
    }
    const product = await productService.getBySlug(slug);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// Get related products
router.get('/:id/related', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Product ID is required' });
    }
    const { categoryId: categoryIdQuery } = req.query;
    const categoryId = Array.isArray(categoryIdQuery) ? categoryIdQuery[0] : categoryIdQuery as string;
    if (!categoryId || typeof categoryId !== 'string') {
        return res.status(400).json({ success: false, error: 'Category ID is required and must be a string' });
    }

    const products = await productService.getRelated(id, categoryId);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

// Get product by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Product ID is required' });
    }
    const product = await productService.getById(id);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// ==================== ADMIN ROUTES ====================

const accessorySchema = z.object({
  type: z.string().min(1),
  price: z.number().positive(),
});

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  short_description: z.string().optional(),
  price: z.number().positive(),
  compare_at_price: z.number().optional().nullable(),
  cost_per_item: z.number().optional().nullable(),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  quantity: z.number().int().min(0).default(0),
  track_quantity: z.boolean().default(true),
  continue_selling_when_out_of_stock: z.boolean().default(false),
  category_id: z.string().uuid().optional().nullable().transform((val) => (val === '' ? null : val)),
  brand: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  // Campos adicionales para ropa
  gender: z.enum(['hombre', 'mujer', 'unisex', 'nino', 'nina']).optional(),
  product_type: z.enum(['camiseta', 'camisa', 'pantalon', 'chaqueta', 'sudadera', 'short', 'accesorio', 'zapato', 'vestido', 'falda', 'otro']).optional(),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  material: z.string().optional().nullable(),
  weight: z.number().optional().nullable(),
  // Campos para conjuntos con accesorios
  is_set: z.boolean().optional().default(false),
  accessories: z.array(accessorySchema).optional().default([]),
});

// Create product (Admin)
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await productService.create(data);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// Update product (Admin)
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Product ID is required' });
    }
    const data = productSchema.partial().parse(req.body);
    const product = await productService.update(id, data);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// Delete product (Admin)
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Product ID is required' });
    }
    await productService.delete(id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
});

// Add product image
router.post('/:id/images', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Product ID is required' });
    }
    const image = await productService.addImage(id, req.body);
    res.status(201).json({ success: true, data: image });
  } catch (error) {
    next(error);
  }
});

// Delete product image
router.delete('/images/:imageId', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const imageId = Array.isArray(req.params.imageId) ? req.params.imageId[0] : req.params.imageId;
    if (!imageId) {
        return res.status(400).json({ success: false, error: 'Image ID is required' });
    }
    await productService.deleteImage(imageId);
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    next(error);
  }
});

// Add product variant
router.post('/:id/variants', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Product ID is required' });
    }
    const variant = await productService.addVariant(id, req.body);
    res.status(201).json({ success: true, data: variant });
  } catch (error) {
    next(error);
  }
});

// Update product variant
router.put('/variants/:variantId', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variantId = Array.isArray(req.params.variantId) ? req.params.variantId[0] : req.params.variantId;
    if (!variantId) {
        return res.status(400).json({ success: false, error: 'Variant ID is required' });
    }
    const variant = await productService.updateVariant(variantId, req.body);
    res.json({ success: true, data: variant });
  } catch (error) {
    next(error);
  }
});

// Delete product variant
router.delete('/variants/:variantId', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variantId = Array.isArray(req.params.variantId) ? req.params.variantId[0] : req.params.variantId;
    if (!variantId) {
        return res.status(400).json({ success: false, error: 'Variant ID is required' });
    }
    await productService.deleteVariant(variantId);
    res.json({ success: true, message: 'Variant deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
