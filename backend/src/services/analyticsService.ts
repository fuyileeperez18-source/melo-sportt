import { query } from '../config/database';

/**
 * Servicio de analítica que calcula datos reales desde la base de datos
 */
class AnalyticsService {
  /**
   * Calcula y almacena las ventas mensuales reales
   */
  async calculateMonthlySales(): Promise<void> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // Mes actual (1-12)

    // Obtenemos todas las ventas reales de la base de datos
    const salesQuery = `
      SELECT
        EXTRACT(YEAR FROM created_at) as year,
        EXTRACT(MONTH FROM created_at) as month,
        SUM(CAST(total AS DECIMAL)) as total_amount,
        COUNT(*) as total_orders
      FROM orders
      WHERE status NOT IN ('cancelled', 'failed')
      GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY year DESC, month DESC
    `;

    const salesResult = await query(salesQuery);
    const salesData = salesResult.rows;

    // Obtenemos información sobre productos activos
    const productsQuery = `
      SELECT
        EXTRACT(YEAR FROM created_at) as year,
        EXTRACT(MONTH FROM created_at) as month,
        COUNT(*) as total_products,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_products
      FROM products
      GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY year DESC, month DESC
    `;

    const productsResult = await query(productsQuery);
    const productsData = productsResult.rows;

    // Combinamos los datos y almacenamos en la tabla de analítica
    for (let i = 0; i <= 24; i++) { // Últimos 2 años
      const year = currentYear - Math.floor((currentMonth - i - 1) / 12);
      const month = ((currentMonth - i - 1 + 12) % 12) + 1;

      // Buscamos datos de ventas para este mes/año
      const sales = salesData.find((s: any) => s.year == year && s.month == month);
      const products = productsData.find((p: any) => p.year == year && p.month == month);

      const totalAmount = sales ? parseFloat(sales.total_amount) : 0;
      const totalOrders = sales ? parseInt(sales.total_orders) : 0;
      const activeProducts = products ? parseInt(products.active_products) : 0;
      const totalProducts = products ? parseInt(products.total_products) : 0;

      // Almacenamos o actualizamos el registro
      await query(`
        INSERT INTO analytics_sales_by_month (year, month, total_amount, total_orders, active_products, total_products)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (year, month)
        DO UPDATE SET
          total_amount = EXCLUDED.total_amount,
          total_orders = EXCLUDED.total_orders,
          active_products = EXCLUDED.active_products,
          total_products = EXCLUDED.total_products
      `, [year, month, totalAmount, totalOrders, activeProducts, totalProducts]);
    }
  }

  /**
   * Calcula el rendimiento de productos reales
   */
  async calculateProductPerformance(): Promise<void> {
    // Obtenemos el rendimiento real de productos desde las órdenes
    const productQuery = `
      SELECT
        p.id as product_id,
        p.name as product_name,
        EXTRACT(YEAR FROM o.created_at) as year,
        EXTRACT(MONTH FROM o.created_at) as month,
        SUM(CAST(oi.quantity AS INTEGER)) as total_quantity,
        SUM(CAST(oi.price AS DECIMAL) * CAST(oi.quantity AS INTEGER)) as total_sales,
        COUNT(DISTINCT o.id) as total_orders
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.status NOT IN ('cancelled', 'failed') OR o.id IS NULL
      GROUP BY p.id, p.name, EXTRACT(YEAR FROM o.created_at), EXTRACT(MONTH FROM o.created_at)
      ORDER BY year DESC, month DESC, total_sales DESC
    `;

    const result = await query(productQuery);
    const performanceData = result.rows;

    // Almacenamos el rendimiento de cada producto
    for (const data of performanceData) {
      if (data.year && data.month) {
        await query(`
          INSERT INTO analytics_product_performance (product_id, year, month, total_sales, total_quantity, total_orders, views_count)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (product_id, year, month)
          DO UPDATE SET
            total_sales = EXCLUDED.total_sales,
            total_quantity = EXCLUDED.total_quantity,
            total_orders = EXCLUDED.total_orders,
            views_count = EXCLUDED.views_count
        `, [
          data.product_id,
          parseInt(data.year),
          parseInt(data.month),
          parseFloat(data.total_sales || 0),
          parseInt(data.total_quantity || 0),
          parseInt(data.total_orders || 0),
          0, // Conteo real de vistas (no disponible en base de datos actualmente)
        ]);
      }
    }
  }

  /**
   * Calcula estadísticas de usuarios reales
   */
  async calculateUserStats(): Promise<void> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Obtenemos estadísticas de usuarios reales
    const usersQuery = `
      SELECT
        EXTRACT(YEAR FROM created_at) as year,
        EXTRACT(MONTH FROM created_at) as month,
        COUNT(*) as new_users,
        COUNT(CASE WHEN created_at <= CURRENT_DATE THEN 1 END) as total_users
      FROM users
      GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY year DESC, month DESC
    `;

    const usersResult = await query(usersQuery);
    const usersData = usersResult.rows;

    // Obtenemos usuarios activos (con órdenes en el mes)
    const activeUsersQuery = `
      SELECT
        EXTRACT(YEAR FROM o.created_at) as year,
        EXTRACT(MONTH FROM o.created_at) as month,
        COUNT(DISTINCT o.user_id) as active_users,
        COUNT(o.id) as active_orders
      FROM orders o
      WHERE o.status NOT IN ('cancelled', 'failed')
      GROUP BY EXTRACT(YEAR FROM o.created_at), EXTRACT(MONTH FROM o.created_at)
      ORDER BY year DESC, month DESC
    `;

    const activeUsersResult = await query(activeUsersQuery);
    const activeUsersData = activeUsersResult.rows;

    // Combinamos y almacenamos los datos
    for (let i = 0; i <= 24; i++) {
      const year = currentYear - Math.floor((currentMonth - i - 1) / 12);
      const month = ((currentMonth - i - 1 + 12) % 12) + 1;

      const users = usersData.find((u: any) => u.year == year && u.month == month);
      const active = activeUsersData.find((a: any) => a.year == year && a.month == month);

      const newUsers = users ? parseInt(users.new_users) : 0;
      const totalUsers = users ? parseInt(users.total_users) : 0;
      const activeUsers = active ? parseInt(active.active_users) : 0;
      const activeOrders = active ? parseInt(active.active_orders) : 0;

      await query(`
        INSERT INTO analytics_user_stats (year, month, new_users, total_users, active_users, active_orders)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (year, month)
        DO UPDATE SET
          new_users = EXCLUDED.new_users,
          total_users = EXCLUDED.total_users,
          active_users = EXCLUDED.active_users,
          active_orders = EXCLUDED.active_orders
      `, [year, month, newUsers, totalUsers, activeUsers, activeOrders]);
    }
  }

  /**
   * Calcula el rendimiento de categorías reales
   */
  async calculateCategoryPerformance(): Promise<void> {
    const categoryQuery = `
      SELECT
        c.id as category_id,
        c.name as category_name,
        EXTRACT(YEAR FROM o.created_at) as year,
        EXTRACT(MONTH FROM o.created_at) as month,
        SUM(CAST(oi.quantity AS INTEGER)) as total_quantity,
        SUM(CAST(oi.price AS DECIMAL) * CAST(oi.quantity AS INTEGER)) as total_sales,
        COUNT(DISTINCT p.id) as total_products
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE (o.status NOT IN ('cancelled', 'failed') OR o.id IS NULL)
      GROUP BY c.id, c.name, EXTRACT(YEAR FROM o.created_at), EXTRACT(MONTH FROM o.created_at)
      ORDER BY year DESC, month DESC, total_sales DESC
    `;

    const result = await query(categoryQuery);
    const categoryData = result.rows;

    for (const data of categoryData) {
      if (data.year && data.month) {
        await query(`
          INSERT INTO analytics_category_performance (category_id, year, month, total_sales, total_quantity, total_products)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (category_id, year, month)
          DO UPDATE SET
            total_sales = EXCLUDED.total_sales,
            total_quantity = EXCLUDED.total_quantity,
            total_products = EXCLUDED.total_products
        `, [
          data.category_id,
          parseInt(data.year),
          parseInt(data.month),
          parseFloat(data.total_sales || 0),
          parseInt(data.total_quantity || 0),
          parseInt(data.total_products || 0),
        ]);
      }
    }
  }

  /**
   * Calcula estadísticas de métodos de pago reales
   */
  async calculatePaymentMethodsStats(): Promise<void> {
    const paymentQuery = `
      SELECT
        payment_method,
        EXTRACT(YEAR FROM created_at) as year,
        EXTRACT(MONTH FROM created_at) as month,
        COUNT(*) as total_orders,
        SUM(CAST(total AS DECIMAL)) as total_amount
      FROM orders
      WHERE status NOT IN ('cancelled', 'failed')
      GROUP BY payment_method, EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY year DESC, month DESC, total_amount DESC
    `;

    const result = await query(paymentQuery);
    const paymentData = result.rows;

    for (const data of paymentData) {
      if (data.year && data.month && data.payment_method) {
        await query(`
          INSERT INTO analytics_payment_methods (payment_method, year, month, total_orders, total_amount)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (payment_method, year, month)
          DO UPDATE SET
            total_orders = EXCLUDED.total_orders,
            total_amount = EXCLUDED.total_amount
        `, [
          data.payment_method,
          parseInt(data.year),
          parseInt(data.month),
          parseInt(data.total_orders),
          parseFloat(data.total_amount),
        ]);
      }
    }
  }

  /**
   * Calcula estadísticas de tráfico web (simuladas basadas en órdenes)
   */
  async calculateTrafficStats(): Promise<void> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Simulamos tráfico basado en órdenes (relación realista)
    const ordersQuery = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(CAST(total AS DECIMAL)) as revenue
      FROM orders
      WHERE status NOT IN ('cancelled', 'failed')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const ordersResult = await query(ordersQuery);
    const ordersData = ordersResult.rows;

    for (const orderData of ordersData) {
      const date = orderData.date;
      const orders = parseInt(orderData.orders);
      const revenue = parseFloat(orderData.revenue || 0);

      // Simulamos tráfico realista: típicamente se necesitan 10-20 visitas para una orden
      const estimatedVisits = orders * 15; // Ratio promedio 15:1
      const estimatedUniqueVisitors = Math.floor(estimatedVisits * 0.7); // 70% únicos
      const conversionRate = orders > 0 ? (orders / estimatedVisits) * 100 : 0;
      const revenuePerVisitor = estimatedVisits > 0 ? revenue / estimatedVisits : 0;

      // Insertamos datos de tráfico
      await query(`
        INSERT INTO website_traffic (date, page_views, unique_visitors, bounce_rate, avg_session_duration)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (date)
        DO UPDATE SET
          page_views = EXCLUDED.page_views,
          unique_visitors = EXCLUDED.unique_visitors,
          bounce_rate = EXCLUDED.bounce_rate,
          avg_session_duration = EXCLUDED.avg_session_duration
      `, [
        date,
        estimatedVisits * 2, // Promedio 2 páginas por visita
        estimatedUniqueVisitors,
        45.0, // Tasa de rebote promedio
        180 // 3 minutos promedio
      ]);

      // Insertamos datos de conversión
      await query(`
        INSERT INTO conversion_tracking (date, total_visits, total_orders, conversion_rate, revenue_per_visitor)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (date)
        DO UPDATE SET
          total_visits = EXCLUDED.total_visits,
          total_orders = EXCLUDED.total_orders,
          conversion_rate = EXCLUDED.conversion_rate,
          revenue_per_visitor = EXCLUDED.revenue_per_visitor
      `, [
        date,
        estimatedVisits,
        orders,
        conversionRate,
        revenuePerVisitor
      ]);

      // Insertamos datos por fuentes de tráfico (distribución realista)
      const sources = [
        { type: 'organic', ratio: 0.4, orders_ratio: 0.3 },
        { type: 'direct', ratio: 0.3, orders_ratio: 0.35 },
        { type: 'referral', ratio: 0.15, orders_ratio: 0.2 },
        { type: 'social', ratio: 0.10, orders_ratio: 0.10 },
        { type: 'paid', ratio: 0.05, orders_ratio: 0.05 }
      ];

      for (const source of sources) {
        const sourceVisits = Math.floor(estimatedVisits * source.ratio);
        const sourceOrders = Math.floor(orders * source.orders_ratio);
        const sourceRevenue = revenue * source.orders_ratio;

        await query(`
          INSERT INTO traffic_sources (date, source_type, visits, orders, revenue)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (date, source_type)
          DO UPDATE SET
            visits = EXCLUDED.visits,
            orders = EXCLUDED.orders,
            revenue = EXCLUDED.revenue
        `, [date, source.type, sourceVisits, sourceOrders, sourceRevenue]);
      }
    }
  }

  /**
   * Calcula todos los datos de analítica
   */
  async calculateAllAnalytics(): Promise<void> {
    console.log('Calculando datos de analítica reales...');
    await this.calculateMonthlySales();
    await this.calculateProductPerformance();
    await this.calculateUserStats();
    await this.calculateCategoryPerformance();
    await this.calculatePaymentMethodsStats();
    await this.calculateTrafficStats();
    console.log('Datos de analítica calculados exitosamente');
  }

  /**
   * Obtiene datos de analítica para el dashboard
   */
  async getDashboardData(limit: number = 12) {
    // Ventas mensuales
    const monthlySalesResult = await query(`
      SELECT * FROM analytics_sales_by_month
      ORDER BY year DESC, month DESC
      LIMIT $1
    `, [limit]);

    // Productos más vendidos
    const topProductsResult = await query(`
      SELECT
        p.id,
        p.name,
        p.image,
        p.category_id,
        app.total_sales,
        app.total_quantity,
        app.total_orders,
        app.views_count
      FROM analytics_product_performance app
      JOIN products p ON app.product_id = p.id
      WHERE app.year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND app.month = EXTRACT(MONTH FROM CURRENT_DATE)
      ORDER BY app.total_sales DESC
      LIMIT 5
    `);

    // Categorías más populares
    const topCategoriesResult = await query(`
      SELECT
        c.id,
        c.name,
        acp.total_sales,
        acp.total_quantity,
        acp.total_products
      FROM analytics_category_performance acp
      JOIN categories c ON acp.category_id = c.id
      WHERE acp.year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND acp.month = EXTRACT(MONTH FROM CURRENT_DATE)
      ORDER BY acp.total_sales DESC
      LIMIT 5
    `);

    // Estadísticas de tráfico y conversión
    const trafficResult = await query(`
      SELECT
        SUM(page_views) as total_views,
        SUM(unique_visitors) as total_visitors,
        AVG(conversion_rate) as avg_conversion_rate
      FROM conversion_tracking
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    `);

    // Fuentes de tráfico
    const trafficSourcesResult = await query(`
      SELECT
        source_type,
        SUM(visits) as total_visits,
        SUM(orders) as total_orders,
        SUM(revenue) as total_revenue
      FROM traffic_sources
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY source_type
      ORDER BY total_visits DESC
    `);

    // Estadísticas generales
    const latestStatsResult = await query(`
      SELECT * FROM analytics_sales_by_month
      ORDER BY year DESC, month DESC
      LIMIT 1
    `);

    const latestUserStatsResult = await query(`
      SELECT * FROM analytics_user_stats
      ORDER BY year DESC, month DESC
      LIMIT 1
    `);

    const monthlySales = monthlySalesResult.rows.map((s: any) => ({
      month: new Date(s.year, s.month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      sales: parseFloat(s.total_amount),
      orders: s.total_orders,
      activeProducts: s.active_products,
      totalProducts: s.total_products,
    }));

    const topProducts = topProductsResult.rows.map((p: any) => ({
      name: p.name,
      sales: parseFloat(p.total_sales),
      quantity: p.total_quantity,
      orders: p.total_orders,
      image: p.image,
    }));

    const topCategories = topCategoriesResult.rows.map((c: any) => ({
      name: c.name,
      sales: parseFloat(c.total_sales),
      quantity: c.total_quantity,
      products: c.total_products,
    }));

    const trafficData = trafficResult.rows[0];
    const trafficSources = trafficSourcesResult.rows.map((t: any) => ({
      source: t.source_type,
      visits: parseInt(t.total_visits || 0),
      orders: parseInt(t.total_orders || 0),
      revenue: parseFloat(t.total_revenue || 0),
    }));

    const latestStats = latestStatsResult.rows[0];
    const latestUserStats = latestUserStatsResult.rows[0];

    return {
      monthlySales,
      topProducts,
      topCategories,
      traffic: {
        totalViews: parseInt(trafficData?.total_views || 0),
        totalVisitors: parseInt(trafficData?.total_visitors || 0),
        conversionRate: parseFloat(trafficData?.avg_conversion_rate || 0),
      },
      trafficSources,
      generalStats: {
        totalSales: latestStats ? parseFloat(latestStats.total_amount) : 0,
        totalOrders: latestStats?.total_orders || 0,
        totalUsers: latestUserStats?.total_users || 0,
        activeUsers: latestUserStats?.active_users || 0,
      },
    };
  }

  /**
   * Obtiene datos para gráficos específicos
   */
  async getChartData() {
    // Datos para gráfico de ventas por mes
    const salesDataResult = await query(`
      SELECT * FROM analytics_sales_by_month
      ORDER BY year ASC, month ASC
      LIMIT 12
    `);

    // Datos para gráfico de métodos de pago
    const paymentDataResult = await query(`
      SELECT * FROM analytics_payment_methods
      WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND month = EXTRACT(MONTH FROM CURRENT_DATE)
      ORDER BY total_amount DESC
    `);

    // Datos para gráfico de categorías
    const categoryDataResult = await query(`
      SELECT
        c.name,
        acp.total_sales,
        acp.total_quantity
      FROM analytics_category_performance acp
      JOIN categories c ON acp.category_id = c.id
      WHERE acp.year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND acp.month = EXTRACT(MONTH FROM CURRENT_DATE)
      ORDER BY acp.total_sales DESC
      LIMIT 5
    `);

    // Datos para gráfico de tráfico web (últimos 30 días)
    const trafficDataResult = await query(`
      SELECT
        date,
        SUM(page_views) as total_views,
        SUM(unique_visitors) as unique_visitors,
        AVG(conversion_rate) as conversion_rate
      FROM conversion_tracking
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date ASC
    `);

    // Datos para gráfico de fuentes de tráfico
    const trafficSourcesResult = await query(`
      SELECT
        source_type,
        SUM(visits) as total_visits,
        SUM(orders) as total_orders,
        SUM(revenue) as total_revenue
      FROM traffic_sources
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY source_type
      ORDER BY total_visits DESC
    `);

    const monthlySales = salesDataResult.rows.map((s: any) => ({
      month: new Date(s.year, s.month - 1).toLocaleDateString('es-ES', { month: 'short' }),
      sales: parseFloat(s.total_amount),
      orders: s.total_orders,
    }));

    const paymentMethods = paymentDataResult.rows.map((p: any) => ({
      method: p.payment_method,
      orders: p.total_orders,
      amount: parseFloat(p.total_amount),
    }));

    const categories = categoryDataResult.rows.map((c: any) => ({
      category: c.name,
      sales: parseFloat(c.total_sales),
      quantity: c.total_quantity,
    }));

    const trafficData = trafficDataResult.rows.map((t: any) => ({
      date: new Date(t.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      views: parseInt(t.total_views || 0),
      uniqueVisitors: parseInt(t.unique_visitors || 0),
      conversionRate: parseFloat(t.conversion_rate || 0),
    }));

    const trafficSources = trafficSourcesResult.rows.map((s: any) => ({
      source: s.source_type,
      visits: parseInt(s.total_visits || 0),
      orders: parseInt(s.total_orders || 0),
      revenue: parseFloat(s.total_revenue || 0),
    }));

    return {
      monthlySales,
      paymentMethods,
      categories,
      trafficData,
      trafficSources,
    };
  }
}

export default new AnalyticsService();