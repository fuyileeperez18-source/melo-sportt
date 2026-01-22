import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { categoryService } from '../services/product.service.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Get all categories
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('📁 [CATEGORIES] GET / - Request received');
    const categories = await categoryService.getAll();
    console.log('📁 [CATEGORIES] GET / - Found categories:', categories.length);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('❌ [CATEGORIES] GET / - Error:', error);
    next(error);
  }
});

// Get category by slug
router.get('/slug/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug: slugFromParams } = req.params;
    const slug = Array.isArray(slugFromParams) ? slugFromParams[0] : slugFromParams;
    if (!slug) {
        return res.status(400).json({ success: false, error: 'Slug is required.' });
    }
    const category = await categoryService.getBySlug(slug);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

// ==================== ADMIN ROUTES ====================

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  parent_id: z.string().uuid().optional(),
  position: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

// Create category (Admin)
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = categorySchema.parse(req.body);
    const category = await categoryService.create(data);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

// Update category (Admin)
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: idFromParams } = req.params;
    const id = Array.isArray(idFromParams) ? idFromParams[0] : idFromParams;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Category ID is required.' });
    }
    const data = categorySchema.partial().parse(req.body);
    const category = await categoryService.update(id, data);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

// Delete category (Admin)
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: idFromParams } = req.params;
    const id = Array.isArray(idFromParams) ? idFromParams[0] : idFromParams;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Category ID is required.' });
    }
    await categoryService.delete(id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;