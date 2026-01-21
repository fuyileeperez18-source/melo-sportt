import { query } from '../config/database.js';
import type { DashboardMetrics } from '../types/index.js';

export const analyticsService = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Fix timezone to Colombia (UTC-5) to ensure "Today" is accurate
    const now = new Date();
    const colombiaOffset = 5 * 60 * 60 * 1000;
    const todayDate = new Date(now.getTime() - colombiaOffset);
    const today = todayDate.toISOString().split('T')[0];
    
    const yesterdayDate = new Date(todayDate.getTime() - 86400000);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    // Get today's PAID orders and revenue (only count confirmed sales)
    const todayResult = await query(
      `SELECT COUNT(*) as order_count, COALESCE(SUM(total), 0) as revenue
       FROM orders WHERE created_at >= $1 AND payment_status = 'paid'`,
      [today]
    );

    // Get yesterday's PAID orders and revenue
    const yesterdayResult = await query(
      `SELECT COUNT(*) as order_count, COALESCE(SUM(total), 0) as revenue
       FROM orders WHERE created_at >= $1 AND created_at < $2 AND payment_status = 'paid'`,
      [yesterday, today]
    );

    // Get pending orders
    const pendingResult = await query(
      `SELECT COUNT(*) as count FROM orders WHERE status = 'pending'`
    );

    // Get low stock products
    const lowStockResult = await query(
      `SELECT COUNT(*) as count FROM products WHERE quantity < 10 AND track_quantity = true`
    );

    // Get new customers today
    const newCustomersResult = await query(
      `SELECT COUNT(*) as count FROM users WHERE created_at >= $1`,
      [today]
    );

    // Get marketplace commissions
    const commissionsResult = await query(
      `SELECT COALESCE(SUM(application_fee), 0) as total FROM orders WHERE payment_status = 'paid'`
    );

    const todayRevenue = parseFloat(todayResult.rows[0].revenue) || 0;
    const yesterdayRevenue = parseFloat(yesterdayResult.rows[0].revenue) || 0;
    const todayOrders = parseInt(todayResult.rows[0].order_count) || 0;
    const yesterdayOrders = parseInt(yesterdayResult.rows[0].order_count) || 0;
    const marketplaceCommissions = parseFloat(commissionsResult.rows[0].total) || 0;

    const revenueChange = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 0;

    const ordersChange = yesterdayOrders > 0
      ? ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100
      : 0;

    return {
      today_revenue: todayRevenue,
      today_orders: todayOrders,
      pending_orders: parseInt(pendingResult.rows[0].count) || 0,
      low_stock_products: parseInt(lowStockResult.rows[0].count) || 0,
      new_customers_today: parseInt(newCustomersResult.rows[0].count) || 0,
      revenue_change: revenueChange,
      orders_change: ordersChange,
      marketplace_commissions: marketplaceCommissions,
    };
  },

  async getRevenueByPeriod(startDate: string, endDate: string) {
    const result = await query(
      `SELECT DATE(created_at) as date, SUM(total) as revenue
       FROM orders
       WHERE created_at >= $1 AND created_at <= $2 AND payment_status = 'paid'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [startDate, endDate]
    );

    return result.rows.map((row: { date: string; revenue: string }) => ({
      date: row.date,
      revenue: parseFloat(row.revenue) || 0,
    }));
  },

  async getTopProducts(limit = 10) {
    const result = await query(
      `SELECT p.id, p.name, p.price, SUM(oi.quantity) as total_sold,
        COALESCE(SUM(oi.total), 0) as total_revenue,
        (SELECT json_agg(pi) FROM product_images pi WHERE pi.product_id = p.id LIMIT 1) as images
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.payment_status = 'paid'
       GROUP BY p.id, p.name, p.price
       ORDER BY total_sold DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  },

  async getOrdersByStatus() {
    const result = await query(
      `SELECT status, COUNT(*) as count FROM orders GROUP BY status`
    );

    return result.rows.map((row: { status: string; count: string }) => ({
      status: row.status,
      count: parseInt(row.count),
    }));
  },

  async getSalesOverview(days = 30) {
    const result = await query(
      `SELECT DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total) as revenue
       FROM orders
       WHERE created_at >= NOW() - INTERVAL '${days} days'
         AND payment_status = 'paid'
       GROUP BY DATE(created_at)
       ORDER BY date`
    );

    return result.rows;
  },

  // Get product stats for admin (sales, revenue, stock) - only PAID orders
  async getProductStats(productId: string) {
    const productResult = await query(
      `SELECT
        p.id,
        p.name,
        p.price,
        p.quantity,
        p.sku,
        p.is_active,
        p.is_featured,
        (SELECT json_agg(pi) FROM product_images pi WHERE pi.product_id = p.id LIMIT 1) as images,
        COALESCE(
          (SELECT SUM(oi.quantity) FROM order_items oi
           JOIN orders o ON oi.order_id = o.id
           WHERE oi.product_id = p.id AND o.payment_status = 'paid'), 0
        ) as total_sold,
        COALESCE(
          (SELECT COUNT(*) FROM order_items oi
           JOIN orders o ON oi.order_id = o.id
           WHERE oi.product_id = p.id AND o.payment_status = 'paid'), 0
        ) as order_count,
        COALESCE(
          (SELECT SUM(oi.total) FROM order_items oi
           JOIN orders o ON oi.order_id = o.id
           WHERE oi.product_id = p.id AND o.payment_status = 'paid'), 0
        ) as total_revenue
       FROM products p
       WHERE p.id = $1
       GROUP BY p.id`,
      [productId]
    );

    return productResult.rows[0] || null;
  },

  // Get all products with their stats for admin dashboard - only PAID orders
  async getAllProductsWithStats(limit = 50, offset = 0) {
    const result = await query(
      `SELECT
        p.id,
        p.name,
        p.price,
        p.quantity,
        p.sku,
        p.is_active,
        p.is_featured,
        p.created_at,
        COALESCE(
          (SELECT json_agg(pi) FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1), '[]'
        ) as images,
        COALESCE(
          (SELECT SUM(oi.quantity) FROM order_items oi
           JOIN orders o ON oi.order_id = o.id
           WHERE oi.product_id = p.id AND o.payment_status = 'paid'), 0
        ) as total_sold,
        COALESCE(
          (SELECT COUNT(*) FROM order_items oi
           JOIN orders o ON oi.order_id = o.id
           WHERE oi.product_id = p.id AND o.payment_status = 'paid'), 0
        ) as order_count,
        COALESCE(
          (SELECT SUM(oi.total) FROM order_items oi
           JOIN orders o ON oi.order_id = o.id
           WHERE oi.product_id = p.id AND o.payment_status = 'paid'), 0
        ) as total_revenue
       FROM products p
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  },

  // Get revenue by category (only PAID orders)
  async getRevenueByCategory() {
    const result = await query(
      `SELECT
        c.id,
        c.name,
        c.slug,
        COALESCE(SUM(oi.total), 0) as revenue,
        COALESCE(SUM(oi.quantity), 0) as items_sold,
        COUNT(DISTINCT oi.order_id) as orders_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = 'paid'
       WHERE c.is_active = true
       GROUP BY c.id, c.name, c.slug
       ORDER BY revenue DESC`
    );

    return result.rows;
  },

  // Get monthly revenue comparison (only PAID orders)
  async getMonthlyRevenueComparison() {
    const result = await query(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month_label,
        SUM(total) as revenue,
        COUNT(*) as orders
       FROM orders
       WHERE created_at >= NOW() - INTERVAL '12 months'
         AND payment_status = 'paid'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month`
    );

    return result.rows;
  },

  // Get recent orders for admin
  async getRecentOrders(limit = 10) {
    const result = await query(
      `SELECT o.*,
        u.full_name,
        u.email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  },

  // Get sales by gender (only PAID orders)
  async getSalesByGender() {
    const result = await query(
      `SELECT
        p.gender,
        COALESCE(SUM(oi.quantity), 0) as items_sold,
        COALESCE(SUM(oi.total), 0) as revenue,
        COUNT(DISTINCT oi.order_id) as orders
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = 'paid'
       WHERE p.gender IS NOT NULL
       GROUP BY p.gender
       ORDER BY revenue DESC`
    );

    return result.rows;
  },
};
