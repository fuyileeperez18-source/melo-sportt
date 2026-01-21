import express from 'express';
import {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  incrementCouponUsage,
} from '../controllers/coupons.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// Public routes
router.post('/validate', validateCoupon);

// Protected routes (require authentication)
router.post('/increment-usage', authenticate, incrementCouponUsage);

// Admin routes
router.get('/', authenticate, requireAdmin, getAllCoupons);
router.get('/:id', authenticate, requireAdmin, getCouponById);
router.post('/', authenticate, requireAdmin, createCoupon);
router.put('/:id', authenticate, requireAdmin, updateCoupon);
router.delete('/:id', authenticate, requireAdmin, deleteCoupon);

export default router;
