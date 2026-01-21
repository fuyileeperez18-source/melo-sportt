import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { analyticsService } from '../services/analytics.service.js';
import { orderService } from '../services/order.service.js';
import analyticsServiceReal from '../src/services/analyticsService.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// All analytics routes require admin authentication

// Get dashboard metrics (using real data)
router.get('/dashboard', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await analyticsServiceReal.getDashboardData();
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
});

// Get revenue by period
router.get('/revenue', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = z.object({
      startDate: z.string(),
      endDate: z.string(),
    }).parse(req.query);

    const data = await analyticsService.getRevenueByPeriod(startDate, endDate);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get top products
router.get('/top-products', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const data = await analyticsService.getTopProducts(limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get orders by status
router.get('/orders-by-status', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getOrdersByStatus();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get sales overview
router.get('/sales-overview', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const data = await analyticsService.getSalesOverview(days);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get product stats for admin
router.get('/products/:productId/stats', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getProductStats(req.params.productId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get all products with stats for admin dashboard
router.get('/products', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const data = await analyticsService.getAllProductsWithStats(limit, offset);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get revenue by category
router.get('/revenue-by-category', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getRevenueByCategory();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get monthly revenue comparison
router.get('/monthly-revenue', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getMonthlyRevenueComparison();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get recent orders
router.get('/recent-orders', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const data = await analyticsService.getRecentOrders(limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get sales by gender
router.get('/sales-by-gender', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getSalesByGender();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Calcular datos de analítica reales (nuevo endpoint)
router.post('/calculate-real-data', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await analyticsServiceReal.calculateAllAnalytics();
    res.json({ success: true, message: 'Datos de analítica calculados exitosamente' });
  } catch (error) {
    next(error);
  }
});

// Obtener datos del dashboard con datos reales
router.get('/real-dashboard', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsServiceReal.getDashboardData();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Obtener datos para gráficos con datos reales
router.get('/real-chart-data', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsServiceReal.getChartData();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});


export default router;
