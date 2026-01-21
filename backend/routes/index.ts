import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import orderRoutes from './order.routes.js';
import userRoutes from './user.routes.js';
import chatRoutes from './chat.routes.js';
import analyticsRoutes from './analytics.routes.js';
import uploadRoutes from './upload.routes.js';
import commissionRoutes from './commission.routes.js';
import messagesRoutes from './messages.routes.js';
import couponsRoutes from './coupons.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import sellerRoutes from './seller.routes.js';
import wishlistRoutes from './wishlist.routes.js';
import invoiceRoutes from './invoice.routes.js';
import wompiRoutes from './wompi.routes.js';

const router = Router();

// Rutas Wompi deben estar ANTES de las rutas de órdenes por prioridad de seguridad
router.use('/wompi', wompiRoutes); // 🔐 NUEVAS RUTAS SEGURAS

router.use('/auth', authRoutes); // existing routes...

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/chat', chatRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/upload', uploadRoutes);
router.use('/commissions', commissionRoutes);
router.use('/messages', messagesRoutes);
router.use('/coupons', couponsRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/sellers', sellerRoutes);
router.use('/invoices', invoiceRoutes);

export default router;

// Instructions for migrating old Wompi routes to new secure routes:
// 1. The old Wompi routes in order.routes.ts should be deprecated
// 2. Update frontend to use /api/wompi/prepare instead of /api/orders/wompi/create-transaction
// 3. This new implementation provides proper security and signature validation
// 4. Old routes can be removed after migration is complete and tested
