import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { productService, categoryService } from '../services/product.service.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// ==================== PRODUCTS ====================

// Get all products
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      category: req.query.category as string,
      search: req.query.search as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };
    const products = await productService.getAll(filters);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

// Get featured products
router.get('/featured', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productService.getFeatured();
    res.json({ success: true, data: products });
  } catch (error) {
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
    const product = await productService.getBySlug(req.params.slug);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// Get related products
router.get('/:id/related', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId } = req.query;
    const products = await productService.getRelated(req.params.id, categoryId as string);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

// Get product by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.getById(req.params.id);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// ==================== ADMIN ROUTES ====================

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
  category_id: z.string().uuid().optional(),
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
    const data = productSchema.partial().parse(req.body);
    const product = await productService.update(req.params.id, data);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// Delete product (Admin)
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productService.delete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
});

// Add product image
router.post('/:id/images', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const image = await productService.addImage(req.params.id, req.body);
    res.status(201).json({ success: true, data: image });
  } catch (error) {
    next(error);
  }
});

// Delete product image
router.delete('/images/:imageId', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productService.deleteImage(req.params.imageId);
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    next(error);
  }
});

// Add product variant
router.post('/:id/variants', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variant = await productService.addVariant(req.params.id, req.body);
    res.status(201).json({ success: true, data: variant });
  } catch (error) {
    next(error);
  }
});

// Update product variant
router.put('/variants/:variantId', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variant = await productService.updateVariant(req.params.variantId, req.body);
    res.json({ success: true, data: variant });
  } catch (error) {
    next(error);
  }
});

// Delete product variant
router.delete('/variants/:variantId', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productService.deleteVariant(req.params.variantId);
    res.json({ success: true, message: 'Variant deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
