import { query } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Order, OrderItem, OrderStatus } from '../types/index.js';

interface OrderFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const orderService = {
  async create(orderData: Partial<Order> & { items: Partial<OrderItem>[] }, reduceStock = true): Promise<Order> {
    const client = await (await import('../config/database.js')).pool.connect();

    try {
      await client.query('BEGIN');

      // Validate stock availability before creating order
      if (reduceStock) {
        for (const item of orderData.items || []) {
          const productResult = await client.query(
            `SELECT id, name, quantity, track_quantity, continue_selling_when_out_of_stock
             FROM products WHERE id = $1`,
            [item.product_id]
          );

          if (productResult.rows.length === 0) {
            throw new AppError(`Producto ${item.product_id} no encontrado`, 404);
          }

          const product = productResult.rows[0];

          if (product.track_quantity) {
            if (product.quantity < (item.quantity || 0) && !product.continue_selling_when_out_of_stock) {
              throw new AppError(`No hay suficiente stock para ${product.name}. Disponible: ${product.quantity}`, 400);
            }
          }
        }
      }

      // Create order with order_number
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, order_number, subtotal, discount, shipping_cost, tax, total, status,
          payment_status, payment_method, payment_id, shipping_address, billing_address, notes, coupon_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          orderData.user_id,
          orderData.order_number || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          orderData.subtotal || 0,
          orderData.discount || 0,
          orderData.shipping_cost || 0,
          orderData.tax || 0,
          orderData.total || 0,
          orderData.status || 'pending',
          orderData.payment_status || 'pending',
          orderData.payment_method || 'wompi',
          orderData.payment_id || null,
          orderData.shipping_address ? JSON.stringify(orderData.shipping_address) : null,
          orderData.billing_address ? JSON.stringify(orderData.billing_address) : null,
          orderData.notes || null,
          orderData.coupon_code || null,
        ]
      );

      const order = orderResult.rows[0] as Order;

      // Create order items and reduce stock
      for (const item of orderData.items || []) {
        // Create order item
        await client.query(
          `INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            order.id,
            item.product_id,
            item.variant_id,
            item.quantity,
            item.price,
            (item.price || 0) * (item.quantity || 0),
          ]
        );

        // Reduce product stock
        if (reduceStock) {
          await client.query(
            `UPDATE products
             SET quantity = quantity - $1,
                 total_sold = COALESCE(total_sold, 0) + $1,
                 updated_at = NOW()
             WHERE id = $2 AND track_quantity = true`,
            [item.quantity, item.product_id]
          );

          // Update variant stock if applicable
          if (item.variant_id) {
            await client.query(
              `UPDATE product_variants
               SET quantity = quantity - $1,
                   updated_at = NOW()
               WHERE id = $2`,
              [item.quantity, item.variant_id]
            );
          }
        }
      }

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getByUser(userId: string): Promise<Order[]> {
    const result = await query(
      `SELECT o.*,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'variant_id', oi.variant_id,
              'quantity', oi.quantity,
              'price', oi.price,
              'total', oi.total,
              'product', json_build_object(
                'id', p.id,
                'name', p.name,
                'slug', p.slug,
                'price', p.price,
                'images', (SELECT json_agg(pi) FROM product_images pi WHERE pi.product_id = p.id)
              )
            )
          )
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = o.id), '[]'
        ) as items
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC`,
      [userId]
    );

    return result.rows as Order[];
  },

  async getById(id: string): Promise<Order> {
    const result = await query(
      `SELECT o.*,
        json_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'email', u.email
        ) as user,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'variant_id', oi.variant_id,
              'quantity', oi.quantity,
              'price', oi.price,
              'total', oi.total,
              'product', json_build_object(
                'id', p.id,
                'name', p.name,
                'slug', p.slug,
                'price', p.price
              ),
              'variant', (SELECT row_to_json(pv) FROM product_variants pv WHERE pv.id = oi.variant_id)
            )
          )
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = o.id), '[]'
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Order not found', 404);
    }

    return result.rows[0] as Order;
  },

  async getAll(filters?: OrderFilters): Promise<{ data: Order[]; count: number }> {
    let sql = `
      SELECT o.*,
        json_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'email', u.email
        ) as user,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      sql += ` AND o.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.startDate) {
      sql += ` AND o.created_at >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      sql += ` AND o.created_at <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    // Get count
    const countResult = await query(
      `SELECT COUNT(*) FROM orders o WHERE 1=1 ${filters?.status ? 'AND o.status = $1' : ''}`,
      filters?.status ? [filters.status] : []
    );
    const count = parseInt(countResult.rows[0].count);

    sql += ' ORDER BY o.created_at DESC';

    if (filters?.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters?.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await query(sql, params);
    return { data: result.rows as Order[], count };
  },

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const result = await query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Order not found', 404);
    }

    return result.rows[0] as Order;
  },

  async updateTracking(id: string, trackingNumber: string, trackingUrl?: string): Promise<Order> {
    const result = await query(
      `UPDATE orders SET tracking_number = $1, tracking_url = $2, status = 'shipped', updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [trackingNumber, trackingUrl, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Order not found', 404);
    }

    return result.rows[0] as Order;
  },

  async updatePaymentStatus(id: string, paymentStatus: string, paymentId?: string, paymentMethod?: string): Promise<Order> {
    const result = await query(
      `UPDATE orders SET payment_status = $1, payment_id = $2, payment_method = COALESCE($4, payment_method), updated_at = NOW() WHERE id = $3 RETURNING *`,
      [paymentStatus, paymentId, id, paymentMethod]
    );

    if (result.rows.length === 0) {
      throw new AppError('Order not found', 404);
    }

    // Auto-create invoice when payment is confirmed
    if (paymentStatus === 'paid') {
      try {
        const { invoiceService } = await import('./invoice.service.js');
        await invoiceService.createFromOrder(id);
        console.log(`✅ Invoice auto-created for order ${id}`);
      } catch (error) {
        console.error(`⚠️  Failed to auto-create invoice for order ${id}:`, error);
        // Don't throw - invoice creation failure shouldn't block payment confirmation
      }
    }

    return result.rows[0] as Order;
  },

  /**
   * Create an order for cash on delivery (contra entrega)
   */
  async createCashOnDelivery(orderData: Partial<Order> & { items: Partial<OrderItem>[] }): Promise<Order> {
    const client = await (await import('../config/database.js')).pool.connect();

    try {
      await client.query('BEGIN');

      // Validate stock availability before creating order
      for (const item of orderData.items || []) {
        const productResult = await client.query(
          `SELECT id, name, quantity, track_quantity, continue_selling_when_out_of_stock
           FROM products WHERE id = $1`,
          [item.product_id]
        );

        if (productResult.rows.length === 0) {
          throw new AppError(`Producto ${item.product_id} no encontrado`, 404);
        }

        const product = productResult.rows[0];

        if (product.track_quantity) {
          if (product.quantity < (item.quantity || 0) && !product.continue_selling_when_out_of_stock) {
            throw new AppError(`No hay suficiente stock para ${product.name}. Disponible: ${product.quantity}`, 400);
          }
        }
      }

      // Create order with cash on delivery details
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, order_number, subtotal, discount, shipping_cost, tax, total, status,
          payment_status, payment_method, shipping_address, billing_address, notes, coupon_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          orderData.user_id,
          orderData.order_number || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          orderData.subtotal || 0,
          orderData.discount || 0,
          orderData.shipping_cost || 0,
          orderData.tax || 0,
          orderData.total || 0,
          'pending', // Status starts as pending
          'pending', // Payment status is pending until delivery
          'cash_on_delivery', // Payment method is cash on delivery
          orderData.shipping_address ? JSON.stringify(orderData.shipping_address) : null,
          orderData.billing_address ? JSON.stringify(orderData.billing_address) : null,
          orderData.notes || 'Pago contra entrega - Pago en efectivo al recibir el pedido',
          orderData.coupon_code || null,
        ]
      );

      const order = orderResult.rows[0] as Order;

      // Create order items and reduce stock
      for (const item of orderData.items || []) {
        // Create order item
        await client.query(
          `INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            order.id,
            item.product_id,
            item.variant_id,
            item.quantity,
            item.price,
            (item.price || 0) * (item.quantity || 0),
          ]
        );

        // Reduce product stock
        await client.query(
          `UPDATE products
           SET quantity = quantity - $1,
               total_sold = COALESCE(total_sold, 0) + $1,
               updated_at = NOW()
           WHERE id = $2 AND track_quantity = true`,
          [item.quantity, item.product_id]
        );

        // Update variant stock if applicable
        if (item.variant_id) {
          await client.query(
            `UPDATE product_variants
             SET quantity = quantity - $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [item.quantity, item.variant_id]
          );
        }
      }

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Confirm cash on delivery payment (called when order is delivered)
   */
  async confirmCashOnDelivery(id: string): Promise<Order> {
    const result = await query(
      `UPDATE orders SET
         payment_status = 'paid',
         status = 'completed',
         updated_at = NOW()
       WHERE id = $1 AND payment_method = 'cash_on_delivery' AND status = 'pending'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Order not found or not eligible for cash on delivery confirmation', 404);
    }

    const order = result.rows[0] as Order;

    // Auto-create invoice when payment is confirmed
    try {
      const { invoiceService } = await import('./invoice.service.js');
      await invoiceService.createFromOrder(id);
      console.log(`✅ Invoice auto-created for cash on delivery order ${id}`);
    } catch (error) {
      console.error(`⚠️  Failed to auto-create invoice for cash on delivery order ${id}:`, error);
      // Don't throw - invoice creation failure shouldn't block payment confirmation
    }

    return result.rows[0] as Order;
  },

  async updatePaymentId(id: string, paymentId: string): Promise<Order> {
    const result = await query(
      `UPDATE orders SET payment_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [paymentId, id]
    );
    if (result.rows.length === 0) {
      throw new AppError('Order not found', 404);
    }
    return result.rows[0] as Order;
  },

  async getByPaymentId(paymentId: string): Promise<Order> {
    const result = await query(
      'SELECT * FROM orders WHERE payment_id = $1',
      [paymentId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Orden no encontrada por payment_id', 404);
    }

    return result.rows[0] as Order;
  },

  async getByOrderNumber(orderNumber: string): Promise<Order> {
    const result = await query(
      'SELECT * FROM orders WHERE order_number = $1',
      [orderNumber]
    );

    if (result.rows.length === 0) {
      throw new AppError('Orden no encontrada', 404);
    }

    return result.rows[0] as Order;
  },

  async registerWompiCommission(data: {
    order_id: string;
    transaction_id: string;
    total_amount: number;
    commission_amount: number;
    merchant_amount: number;
    fuyi_phone: string;
  }) {
    const result = await query(
      `INSERT INTO wompi_commissions (order_id, transaction_id, total_amount, commission_amount, merchant_amount, fuyi_phone)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.order_id, data.transaction_id, data.total_amount, data.commission_amount, data.merchant_amount, data.fuyi_phone]
    );
    return result.rows[0];
  },

};
