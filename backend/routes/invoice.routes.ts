import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { invoiceService } from '../services/invoice.service.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

const getStringParam = (param: string | string[] | undefined): string | undefined => {
    if (Array.isArray(param)) return param[0];
    return param as string | undefined;
}

// Get invoice by ID (authenticated users can only see their own invoices)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Invoice ID is required' });

    const invoice = await invoiceService.getById(id);

    if (!invoice) {
      res.status(404).json({ success: false, error: 'Factura no encontrada' });
      return;
    }

    // Check if user owns this invoice or is admin
    if (invoice.user_id !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'No autorizado' });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
});

// Get invoice by order ID
router.get('/order/:orderId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orderId = getStringParam(req.params.orderId);
    if (!orderId) return res.status(400).json({ success: false, error: 'Order ID is required' });

    const invoice = await invoiceService.getByOrderId(orderId);

    if (!invoice) {
      res.status(404).json({ success: false, error: 'Factura no encontrada' });
      return;
    }

    // Check if user owns this invoice or is admin
    if (invoice.user_id !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'No autorizado' });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
});

// Get invoice by invoice number
router.get('/number/:invoiceNumber', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invoiceNumber = getStringParam(req.params.invoiceNumber);
    if (!invoiceNumber) return res.status(400).json({ success: false, error: 'Invoice number is required' });

    const invoice = await invoiceService.getByInvoiceNumber(invoiceNumber);

    if (!invoice) {
      res.status(404).json({ success: false, error: 'Factura no encontrada' });
      return;
    }

    // Check if user owns this invoice or is admin
    if (invoice.user_id !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'No autorizado' });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
});

// Create invoice from order
router.post('/create/:orderId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orderId = getStringParam(req.params.orderId);
    if (!orderId) return res.status(400).json({ success: false, error: 'Order ID is required' });
    const invoice = await invoiceService.createFromOrder(orderId);
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
});

// Get invoice details with items
router.get('/:id/details', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Invoice ID is required' });

    const invoice = await invoiceService.getInvoiceDetails(id);

    if (!invoice) {
      res.status(404).json({ success: false, error: 'Factura no encontrada' });
      return;
    }

    // Check if user owns this invoice or is admin
    if (invoice.user_id !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'No autorizado' });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
});

// Get printable HTML invoice
router.get('/:id/print', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return res.status(400).send('<h1>Invoice ID is required</h1>');

    const invoice = await invoiceService.getById(id);

    if (!invoice) {
      res.status(404).send('<h1>Factura no encontrada</h1>');
      return;
    }

    // Check if user owns this invoice or is admin
    if (invoice.user_id !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      res.status(403).send('<h1>No autorizado</h1>');
      return;
    }

    const html = await invoiceService.getPrintableInvoice(id);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
});

// Get all invoices (Admin only)
router.get('/', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const invoices = await invoiceService.getAll(filters);
    res.json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
});

// Update invoice status (Admin only)
router.patch('/:id/status', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Invoice ID is required' });

    const { status } = z.object({
      status: z.enum(['draft', 'sent', 'paid', 'cancelled']),
    }).parse(req.body);

    const invoice = await invoiceService.updateStatus(id, status);
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
});

export default router;