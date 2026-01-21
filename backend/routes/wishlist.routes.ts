import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';
import { wishlistService } from '../services/wishlist.service.js';

const router = Router();

const listQuerySchema = z.object({
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
  offset: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
});

const addSchema = z.object({
  productId: z.string().uuid(),
});

const productIdParamSchema = z.object({
  productId: z.string().uuid(),
});

// GET /api/wishlist/ids
router.get('/ids', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const ids = await wishlistService.getIds(userId);
    res.json({ success: true, data: ids });
  } catch (error) {
    next(error);
  }
});

// GET /api/wishlist?limit=&offset=
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const queryParams = listQuerySchema.parse(req.query);

    const { data, count } = await wishlistService.getWishlist(userId, {
      limit: queryParams.limit,
      offset: queryParams.offset,
    });

    res.json({ success: true, data, count });
  } catch (error) {
    next(error);
  }
});

// POST /api/wishlist
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const body = addSchema.parse(req.body);

    const result = await wishlistService.add(userId, body.productId);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/wishlist/:productId
router.delete('/:productId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const params = productIdParamSchema.parse(req.params);

    const result = await wishlistService.remove(userId, params.productId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
