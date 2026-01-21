import { query } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Order } from '../types/index.js';

export interface Invoice {
  id: string;
  order_id: string;
  invoice_number: string;
  issue_date: Date;
  due_date?: Date;
  subtotal: number;
  tax: number;
  discount: number;
  shipping_cost: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export const invoiceService = {
  /**
   * Generate a unique invoice number
   */
  generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `INV-${year}${month}-${random}`;
  },

  /**
   * Create invoice from order
   */
  async createFromOrder(orderId: string): Promise<Invoice> {
    const client = await (await import('../config/database.js')).pool.connect();

    try {
      await client.query('BEGIN');

      // Get order details
      const orderResult = await client.query(
        `SELECT o.*, u.email, u.full_name
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = $1`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new AppError('Orden no encontrada', 404);
      }

      const order = orderResult.rows[0];

      // Check if invoice already exists
      const existingInvoice = await client.query(
        'SELECT * FROM invoices WHERE order_id = $1',
        [orderId]
      );

      if (existingInvoice.rows.length > 0) {
        await client.query('COMMIT');
        return existingInvoice.rows[0];
      }

      // Create invoice
      const invoiceNumber = this.generateInvoiceNumber();
      const invoiceResult = await client.query(
        `INSERT INTO invoices (order_id, invoice_number, issue_date, subtotal, tax, discount, shipping_cost, total, status)
         VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          orderId,
          invoiceNumber,
          order.subtotal,
          order.tax,
          order.discount,
          order.shipping_cost,
          order.total,
          order.payment_status === 'paid' ? 'paid' : 'sent'
        ]
      );

      await client.query('COMMIT');
      return invoiceResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Get invoice by ID
   */
  async getById(invoiceId: string): Promise<any | null> {
    const result = await query(
      `SELECT i.*, o.order_number, o.payment_method, o.shipping_address, o.billing_address, o.user_id,
        u.email, u.full_name, u.phone
       FROM invoices i
       LEFT JOIN orders o ON i.order_id = o.id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  },

  /**
   * Get invoice by order ID
   */
  async getByOrderId(orderId: string): Promise<any | null> {
    const result = await query(
      `SELECT i.*, o.order_number, o.payment_method, o.shipping_address, o.billing_address, o.user_id,
        u.email, u.full_name, u.phone
       FROM invoices i
       LEFT JOIN orders o ON i.order_id = o.id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE i.order_id = $1`,
      [orderId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  },

  /**
   * Get invoice by invoice number
   */
  async getByInvoiceNumber(invoiceNumber: string): Promise<any | null> {
    const result = await query(
      `SELECT i.*, o.order_number, o.payment_method, o.shipping_address, o.billing_address, o.user_id,
        u.email, u.full_name, u.phone
       FROM invoices i
       LEFT JOIN orders o ON i.order_id = o.id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE i.invoice_number = $1`,
      [invoiceNumber]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  },

  /**
   * Update invoice status
   */
  async updateStatus(invoiceId: string, status: Invoice['status']): Promise<Invoice> {
    const result = await query(
      `UPDATE invoices
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, invoiceId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Factura no encontrada', 404);
    }

    return result.rows[0];
  },

  /**
   * Get all invoices with filters
   */
  async getAll(filters: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    let queryText = `
      SELECT i.*, o.order_number, o.payment_method, o.user_id,
        u.email, u.full_name
      FROM invoices i
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      queryText += ` AND i.status = $${paramIndex}`;
      queryParams.push(filters.status);
      paramIndex++;
    }

    if (filters.startDate) {
      queryText += ` AND i.issue_date >= $${paramIndex}`;
      queryParams.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      queryText += ` AND i.issue_date <= $${paramIndex}`;
      queryParams.push(filters.endDate);
      paramIndex++;
    }

    queryText += ' ORDER BY i.created_at DESC';

    if (filters.limit) {
      queryText += ` LIMIT $${paramIndex}`;
      queryParams.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      queryText += ` OFFSET $${paramIndex}`;
      queryParams.push(filters.offset);
    }

    const result = await query(queryText, queryParams);
    return result.rows;
  },

  /**
   * Get invoice details with all related information
   */
  async getInvoiceDetails(invoiceId: string): Promise<any> {
    const invoice = await this.getById(invoiceId);
    if (!invoice) {
      throw new AppError('Factura no encontrada', 404);
    }

    // Get order items
    const itemsResult = await query(
      `SELECT oi.*, p.name as product_name, p.sku, p.images
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [invoice.order_id]
    );

    return {
      ...invoice,
      items: itemsResult.rows,
      shipping_address: typeof invoice.shipping_address === 'string'
        ? JSON.parse(invoice.shipping_address)
        : invoice.shipping_address,
      billing_address: typeof invoice.billing_address === 'string'
        ? JSON.parse(invoice.billing_address)
        : invoice.billing_address,
    };
  },

  /**
   * Get printable invoice data (HTML format)
   */
  async getPrintableInvoice(invoiceId: string): Promise<string> {
    const invoiceDetails = await this.getInvoiceDetails(invoiceId);

    // Return HTML string that can be rendered in the frontend
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Factura ${invoiceDetails.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .company-info h1 { margin: 0; font-size: 24px; }
          .invoice-info { text-align: right; }
          .customer-info { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; }
          .totals { text-align: right; margin-top: 20px; }
          .totals div { margin: 5px 0; }
          .total-final { font-size: 18px; font-weight: bold; margin-top: 10px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>MELO SPORTT</h1>
            <p>Cartagena de Indias, Colombia<br>
            741 Cra. 17, Barrio San Francisco<br>
            Email: info@melosportt.com</p>
          </div>
          <div class="invoice-info">
            <h2>FACTURA</h2>
            <p>Nº ${invoiceDetails.invoice_number}<br>
            Fecha: ${new Date(invoiceDetails.issue_date).toLocaleDateString('es-CO')}<br>
            Estado: ${invoiceDetails.status.toUpperCase()}</p>
          </div>
        </div>

        <div class="customer-info">
          <h3>CLIENTE</h3>
          <p>${invoiceDetails.full_name || 'N/A'}<br>
          ${invoiceDetails.email || 'N/A'}<br>
          ${invoiceDetails.phone || 'N/A'}<br>
          ${invoiceDetails.shipping_address?.address || ''}, ${invoiceDetails.shipping_address?.city || ''}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio Unitario</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceDetails.items.map((item: any) => `
              <tr>
                <td>${item.product_name || 'Producto'}</td>
                <td>${item.quantity}</td>
                <td>$${item.price.toLocaleString('es-CO')}</td>
                <td>$${item.total.toLocaleString('es-CO')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div>Subtotal: $${invoiceDetails.subtotal.toLocaleString('es-CO')}</div>
          ${invoiceDetails.discount > 0 ? `<div>Descuento: -$${invoiceDetails.discount.toLocaleString('es-CO')}</div>` : ''}
          <div>Envío: $${invoiceDetails.shipping_cost.toLocaleString('es-CO')}</div>
          ${invoiceDetails.tax > 0 ? `<div>IVA: $${invoiceDetails.tax.toLocaleString('es-CO')}</div>` : ''}
          <div class="total-final">TOTAL: $${invoiceDetails.total.toLocaleString('es-CO')}</div>
        </div>

        <div style="margin-top: 40px;">
          <p>Método de pago: ${invoiceDetails.payment_method}<br>
          Orden Nº: ${invoiceDetails.order_number}</p>
        </div>

        <div style="text-align: center; margin-top: 60px; color: #666;">
          <p>Gracias por tu compra en Melo Sportt</p>
        </div>

        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #000; color: #fff; border: none; cursor: pointer; border-radius: 5px;">
          Imprimir Factura
        </button>
      </body>
      </html>
    `;
  },
};
