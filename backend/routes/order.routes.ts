import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { orderService } from '../services/order.service.js';
import { wompiService } from '../services/wompi.service.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import type { AuthRequest, OrderStatus } from '../types/index.js';

const router = Router();

const addressSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  apartment: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  label: z.string().optional(),
  street: z.string().optional(),
});

const orderItemSchema = z.object({
  product_id: z.string(),
  variant_id: z.string().optional(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

const createOrderSchema = z.object({
  user_id: z.string().optional(),
  order_number: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  shipping_address: addressSchema,
  billing_address: addressSchema.optional(),
  payment_method: z.enum(['card', 'wompi', 'cash_on_delivery', 'prepaid']).default('wompi'),
  payment_id: z.string().optional(),
  subtotal: z.number().positive(),
  discount: z.number().min(0).default(0),
  shipping_cost: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  total: z.number().positive(),
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded', 'partially_refunded']).optional(),
  notes: z.string().optional(),
  coupon_code: z.string().optional(),
});

// Get user's orders
router.get('/my-orders', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await orderService.getByUser(req.user!.id);
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

// Create order
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createOrderSchema.parse(req.body);

    // Handle cash on delivery orders
    if (data.payment_method === 'cash_on_delivery') {
      const order = await orderService.createCashOnDelivery({
        user_id: data.user_id || req.user!.id,
        order_number: data.order_number,
        subtotal: data.subtotal,
        discount: data.discount,
        shipping_cost: data.shipping_cost,
        tax: data.tax,
        total: data.total,
        shipping_address: data.shipping_address as any,
        billing_address: data.billing_address as any,
        notes: data.notes,
        coupon_code: data.coupon_code,
        items: data.items as any,
      });
      res.status(201).json({ success: true, data: order });
    } else {
      // Handle regular payment methods
      const order = await orderService.create({
        user_id: data.user_id || req.user!.id,
        order_number: data.order_number,
        subtotal: data.subtotal,
        discount: data.discount,
        shipping_cost: data.shipping_cost,
        tax: data.tax,
        total: data.total,
        status: data.status || 'pending',
        payment_status: data.payment_status || 'pending',
        payment_method: data.payment_method,
        payment_id: data.payment_id,
        shipping_address: data.shipping_address as any,
        billing_address: data.billing_address as any,
        notes: data.notes,
        coupon_code: data.coupon_code,
        items: data.items as any,
      });
      res.status(201).json({ success: true, data: order });
    }
  } catch (error) {
    next(error);
  }
});

// ==================== WOMPI ROUTES ====================

// Create Wompi transaction
router.post('/wompi/create-transaction', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      items,
      orderId,
      customerEmail,
      shippingAddress,
      payment_method,
      payment_type,
      financial_institution_code,
      user_type,
      user_legal_id_type,
      user_legal_id,
      payment_description,
      subtotal,
      shipping_cost,
      tax,
    } = z.object({
      items: z.array(z.object({
        title: z.string(),
        quantity: z.number().int().positive(),
        unit_price: z.number().positive(),
        product_id: z.string().optional(), // Para crear orden
        variant_id: z.string().optional(),
      })),
      orderId: z.string().optional(),
      customerEmail: z.string().email(),
      shippingAddress: z.object({
        address_line_1: z.string().optional(),
        address_line_2: z.string().optional(),
        country: z.string().optional(),
        region: z.string().optional(),
        city: z.string().optional(),
        name: z.string().optional(),
        phone_number: z.string().optional(),
      }).optional(),
      payment_method: z.object({
        type: z.string(),
        installments: z.number().optional(),
        token: z.string().optional(),
        phone_number: z.string().optional(),
        payment_description: z.string().optional(),
        financial_institution_code: z.string().optional(),
        user_type: z.union([z.string(), z.number()]).optional(),
        user_legal_id_type: z.string().optional(),
        user_legal_id: z.string().optional(),
      }).optional(),
      payment_type: z.enum(['CARD', 'PSE', 'NEQUI', 'BANCOLOMBIA_TRANSFER']).optional(),
      // PSE / Nequi fields
      financial_institution_code: z.string().optional(),
      user_type: z.union([z.string(), z.number()]).optional(),
      user_legal_id_type: z.string().optional(),
      user_legal_id: z.string().optional(),
      payment_description: z.string().optional(),
      subtotal: z.number().optional(),
      shipping_cost: z.number().optional(),
      tax: z.number().optional(),
    }).parse(req.body);

    // Calculate total amount in cents (multiply by 100 to convert pesos to centavos)
    const totalAmountInCents = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) * 100;

    console.log(`[Wompi Create Transaction] Calculated amount_in_cents: ${totalAmountInCents}`); // Log for debugging
    console.log(`[Wompi Create Transaction] Items received: ${JSON.stringify(items)}`); // Log items for debugging
    console.log(`[Wompi Create Transaction] Total in pesos: ${totalAmountInCents / 100}`); // Log pesos equivalent for debugging

    // Validate the amount is greater than 0
    if (totalAmountInCents <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El monto total debe ser mayor a 0 COP'
      });
    }

    // Helper: normalize phone to Wompi expected format (11 digits with country code for CO)
    const normalizePhoneForWompi = (raw?: string | null) => {
      if (!raw) return undefined;
      let phone = String(raw).replace(/\D/g, '');

      // Remove leading zeros
      phone = phone.replace(/^0+/, '');

      // If starts with 57 (Colombia country code), ensure total length is 11-12 digits
      if (phone.startsWith('57')) {
        // If longer than 11 digits (57 + 10 digits), truncate to 11 digits
        if (phone.length > 11) {
          phone = phone.substring(0, 11);
        }
        return phone;
      }

      // If doesn't have country code, add Colombia's code (57) if phone has 10 digits
      if (phone.length === 10) {
        return `57${phone}`;
      }

      // If phone has 7-9 digits, prepend 57
      if (phone.length >= 7 && phone.length < 10) {
        return `57${phone}`;
      }

      // If invalid length, return undefined
      if (phone.length < 7 || phone.length > 12) {
        return undefined;
      }

      return phone;
    };

    // Helper: normalize phone specifically for Nequi payments
    // Nequi expects EXACTLY 10 digits (local number without country code)
    const normalizePhoneForNequi = (raw?: string | null) => {
      if (!raw) return undefined;
      let phone = String(raw).replace(/\D/g, '');

      // Remove leading zeros
      phone = phone.replace(/^0+/, '');

      // Remove country code if present (57 for Colombia)
      if (phone.startsWith('57')) {
        phone = phone.substring(2);
      }

      // Remove + symbol prefix if it somehow remains
      if (phone.startsWith('+')) {
        phone = phone.substring(1);
      }

      // Nequi requires EXACTLY 10 digits for Colombian numbers
      if (phone.length === 10) {
        return phone;
      }

      // If invalid length for Nequi, return undefined
      console.warn(`[Order Routes] Phone number ${phone} has ${phone.length} digits. Nequi requires exactly 10 digits.`);
      return undefined;
    };

    // Generate reference using MST prefix for consistency
    const reference = orderId || `MST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create order in PENDING status before processing payment
    // This ensures the order exists when the webhook arrives
    let orderId_created: string | null = null;
    const totalInPesos = totalAmountInCents / 100;
    const orderItems = items.map(item => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: item.unit_price,
    })).filter(item => item.product_id);

    if (orderItems.length > 0) {
      try {
        const orderData = {
          user_id: req.user!.id,
          order_number: reference,
          subtotal: subtotal || totalInPesos,
          discount: 0,
          shipping_cost: shipping_cost || 0,
          tax: tax || 0,
          total: totalInPesos,
          status: 'pending' as const,
          payment_status: 'pending' as const,
          payment_method: 'wompi',
          shipping_address: shippingAddress ? {
            name: shippingAddress.name,
            address: shippingAddress.address_line_1,
            apartment: shippingAddress.address_line_2,
            city: shippingAddress.city,
            state: shippingAddress.region,
            country: shippingAddress.country,
            phone: shippingAddress.phone_number,
            email: customerEmail,
          } : { email: customerEmail },
          notes: `Pago pendiente - Wompi ref: ${reference}`,
          items: orderItems,
        };

        // Create order WITHOUT reducing stock (stock will be reduced when payment is confirmed)
        const order = await orderService.create(orderData as any, false);
        orderId_created = order.id;
        console.log(`[Order Routes] Pre-created order ${reference} with ID ${orderId_created}`);
      } catch (orderError: any) {
        console.error('[Order Routes] Failed to pre-create order:', orderError.message);
        // Continue without creating order - webhook will handle it
      }
    }

    // Validar y formatear shipping_address para Wompi
    let formattedShippingAddress = undefined;
    if (shippingAddress) {
      try {
        // Wompi requiere que si se envía shipping_address, tenga ciertos campos
        // Si falta información crítica, mejor no enviarlo (Wompi puede funcionar sin él)
        if (shippingAddress.address_line_1 && shippingAddress.city && shippingAddress.country) {
          // Validar que address_line_1 tenga al menos 4 caracteres (requisito de Wompi)
          const trimmedAddress = shippingAddress.address_line_1.trim();
          if (trimmedAddress.length < 4) {
            console.warn('[Order Routes] address_line_1 too short:', trimmedAddress.length, 'characters. Skipping shipping_address.');
            // No enviar shipping_address si no cumple requisitos
          } else {
            // Validar que city tenga al menos 4 caracteres
            const trimmedCity = shippingAddress.city.trim();
            if (trimmedCity.length < 4) {
              console.warn('[Order Routes] city too short:', trimmedCity.length, 'characters. Skipping shipping_address.');
              // No enviar shipping_address si no cumple requisitos
            } else {
              // Normalizar teléfono para Wompi (espera 10 dígitos locales en CO)
              const cleanPhone = normalizePhoneForWompi(shippingAddress.phone_number) || undefined;

              // Asegurar código de país de 2 letras
              let countryCode = shippingAddress.country;
              if (countryCode && countryCode.length > 2) {
                countryCode = countryCode.substring(0, 2).toUpperCase();
              } else if (countryCode) {
                countryCode = countryCode.toUpperCase();
              }

              // Validar region (si se proporciona, debe tener al menos 4 caracteres)
              let region = shippingAddress.region?.trim() || trimmedCity;
              if (region.length < 4) {
                // Si region es muy corta, usar city como fallback
                region = trimmedCity;
              }

              // Construir name - debe tener al menos 4 caracteres
              const name = shippingAddress.name?.trim() || 'Cliente Melo Sportt';
              const finalName = name.length >= 4 ? name : 'Cliente Melo Sportt';

              formattedShippingAddress = {
                address_line_1: trimmedAddress,
                // Solo incluir address_line_2 si tiene al menos 4 caracteres (Wompi requiere mínimo 4 si se envía)
                ...(shippingAddress.address_line_2?.trim() && shippingAddress.address_line_2.trim().length >= 4
                  ? { address_line_2: shippingAddress.address_line_2.trim() }
                  : {}),
                country: countryCode || 'CO', // Default a Colombia si no se especifica
                region: region,
                city: trimmedCity,
                name: finalName,
                // Solo incluir phone_number si tiene al menos 7 dígitos
                ...(cleanPhone && cleanPhone.length >= 7 ? { phone_number: cleanPhone } : {}),
              };

              // Log para debugging
              console.log('[Order Routes] Formatted shipping address for Wompi:', JSON.stringify(formattedShippingAddress, null, 2));
            }
          }
        } else {
          console.warn('[Order Routes] Missing required shipping fields. Skipping shipping_address.');
        }
      } catch (error: any) {
        console.error('[Order Routes] Error formatting shipping address:', error);
        // Si hay error, no enviar shipping_address (Wompi puede funcionar sin él)
        formattedShippingAddress = undefined;
      }
    }

    // Create transaction
    // Only include payment_method if provided (for direct card payments)
    // For PSE/Nequi redirect flows, we need to use payment_source_id or let Wompi handle it via checkout widget
    // If using specific redirect payment types, validate presence of required extra fields
    if (payment_type === 'PSE') {
      if (!financial_institution_code || typeof user_type === 'undefined' || !user_legal_id_type || !user_legal_id || !payment_description) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields for PSE: financial_institution_code, user_type, user_legal_id_type, user_legal_id, payment_description'
        });
      }
    }

    // Construir redirect_url para PSE y otros métodos que requieren redirección
    const frontendUrl = env.FRONTEND_URL || 'https://melo-sportt.vercel.app';
    const redirectUrl = `${frontendUrl}/checkout/confirmation?ref=${reference}`;

    const transactionData: any = {
      amount_in_cents: totalAmountInCents,
      currency: 'COP',
      customer_email: customerEmail,
      reference,
      redirect_url: redirectUrl, // URL donde el banco redirigirá después del pago
      shipping_address: formattedShippingAddress,
      customer_data: {
        full_name: shippingAddress?.name,
        phone_number: normalizePhoneForWompi(shippingAddress?.phone_number),
      },
    };

    console.log('[Order Routes] Redirect URL for payment:', redirectUrl);

    // For Nequi, include phone number (required)
    if (payment_type === 'NEQUI') {
      // Use phone number from shipping address or customer data
      // Wompi expects 10 digits for Colombia
      const nequiPhone = normalizePhoneForNequi(shippingAddress?.phone_number);
      if (nequiPhone) {
        transactionData.payment_method = transactionData.payment_method || {};
        transactionData.payment_method.phone_number = nequiPhone;
      } else {
        console.warn('[Order Routes] Warning: Nequi payment selected but no phone number available');
      }
    }

    // Only include payment_method if provided (for card payments with token)
    if (payment_method) {
      transactionData.payment_method = payment_method;
      console.log('[Order Routes] Including payment_method in transaction:', payment_method);
    } else if (payment_type) {
      // For redirect flows (PSE, Nequi, etc.), Wompi requires payment_method with type
      // even if we don't have a token yet. The checkout widget will handle the rest.
      transactionData.payment_method = {
        type: payment_type,
        installments: 1,
      };

      // Add a generic payment_description if provided by frontend
      // Only add payment_description for PSE, or if explicitly allowed for other methods
      if (payment_description && payment_type === 'PSE') {
        transactionData.payment_method.payment_description = payment_description;
      }

      // For PSE, include additional required fields
      if (payment_type === 'PSE') {
        Object.assign(transactionData.payment_method, {
          financial_institution_code,
          user_type: Number(user_type), // Ensure user_type is a number
          user_legal_id_type,
          user_legal_id
        });
      }

      // For Nequi, include phone number (required)
      if (payment_type === 'NEQUI') {
        // Use phone number from shipping address or customer data
        // Nequi expects EXACTLY 10 digits without country code for Colombian numbers
        const nequiPhone = normalizePhoneForNequi(shippingAddress?.phone_number);
        if (nequiPhone) {
          transactionData.payment_method.phone_number = nequiPhone;
          console.log('[Order Routes] Nequi phone number (10 digits):', nequiPhone);
        } else {
          console.warn('[Order Routes] Warning: Nequi payment selected but no valid 10-digit phone number available');
        }
      }

      console.log('[Order Routes] Including payment_method with type for redirect flow:', payment_type, transactionData.payment_method);
    } else {
      // When no payment method or type is specified, Wompi requires either:
      // 1. payment_method (even minimal)
      // 2. payment_source_id
      // 
      // Since we're using the checkout widget, we'll include a minimal payment_method
      // that allows the widget to handle payment method selection.
      // However, Wompi might still reject this. In that case, we need to use payment_source_id.
      //
      // For now, let's try without payment_method and see if Wompi's checkout widget accepts it.
      // If it continues to reject, we'll need to implement payment_source_id lookup or use payment links.
      console.log('[Order Routes] No payment_method or payment_type - transaction will use checkout widget');
      console.warn('[Order Routes] WARNING: Wompi may reject this transaction. Consider using payment_source_id or payment links.');
    }

    console.log('[Order Routes] Creating Wompi transaction with data:', {
      amount_in_cents: transactionData.amount_in_cents,
      currency: transactionData.currency,
      customer_email: transactionData.customer_email,
      reference: transactionData.reference,
      hasPaymentMethod: !!transactionData.payment_method,
      hasShippingAddress: !!transactionData.shipping_address,
      hasCustomerData: !!transactionData.customer_data,
    });

    const transaction = await wompiService.createTransaction(transactionData);

    // Generate integrity signature for widget
    const integritySignature = wompiService.generateIntegritySignature(
      reference,
      totalAmountInCents,
      'COP'
    );

    res.json({
      success: true,
      data: {
        ...transaction,
        public_key: env.WOMPI_PUBLIC_KEY,
        integrity_signature: integritySignature,
      }
    });
  } catch (error) {
    next(error);
  }
});

// Tokenize card for Wompi payment
router.post('/wompi/tokenize', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { number, cvc, exp_month, exp_year, card_holder } = z.object({
      number: z.string().min(13).max(19),
      cvc: z.string().min(3).max(4),
      exp_month: z.string().min(1).max(2),
      exp_year: z.string().min(2).max(2),
      card_holder: z.string().min(2),
    }).parse(req.body);

    console.log('[Order Routes] Tokenizing card for user:', req.user!.id);

    const result = await wompiService.tokenizeCard({
      number: number.replace(/\s/g, ''),
      cvc,
      exp_month: exp_month.padStart(2, '0'),
      exp_year,
      card_holder: card_holder.toUpperCase(),
    });

    // result ya tiene estructura { data: { id, status, ... } } de Wompi
    // Devolvemos result.data directamente para que el frontend reciba { data: { id, ... } }
    console.log('[Order Routes] Tokenization result:', result);
    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

// Get PSE financial institutions
router.get('/wompi/financial-institutions', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await wompiService.getFinancialInstitutions();
    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

// Get Wompi transaction status
router.get('/wompi/transaction/:transactionId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const transactionId = Array.isArray(req.params.transactionId) ? req.params.transactionId[0] : req.params.transactionId;
    if (!transactionId) {
        return res.status(400).json({ success: false, error: 'Transaction ID is required' });
    }
    const transaction = await wompiService.getTransaction(transactionId);
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
});

// Wompi Webhook
router.post('/wompi/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Wompi sends SHA256 events checksum in x-event-checksum header
    const signature = req.headers['x-event-checksum'] as string;
    const timestamp = req.headers['x-wompi-timestamp'] as string;
    const eventData = req.body;

    console.log('📬 [WOMPI WEBHOOK] Received:', eventData);

    const result = await wompiService.processWebhook(eventData, signature, timestamp);

    if (result && result.status === 'APPROVED') {
      const transactionId = result.id;
      const orderNumber = result.reference;

      console.log(`✅ [WOMPI WEBHOOK] Transaction approved: ${transactionId} for Order: ${orderNumber}`);

      // Find order by reference (order_number)
      const order = await orderService.getByOrderNumber(orderNumber);

      if (order && order.payment_status !== 'paid') {
        // Update order status
        await orderService.updatePaymentStatus(order.id, 'paid', transactionId);
        await orderService.updateStatus(order.id, 'confirmed');

        // Reduce stock for order items
        const { query: dbQuery } = await import('../config/database.js');
        const orderItemsResult = await dbQuery(
          'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = $1',
          [order.id]
        );

        for (const item of orderItemsResult.rows) {
          await dbQuery(`
            UPDATE products
            SET quantity = quantity - $1,
                total_sold = COALESCE(total_sold, 0) + $1,
                updated_at = NOW()
            WHERE id = $2 AND track_quantity = true
          `, [item.quantity, item.product_id]);

          if (item.variant_id) {
            await dbQuery(`
              UPDATE product_variants
              SET quantity = quantity - $1, updated_at = NOW()
              WHERE id = $2
            `, [item.quantity, item.variant_id]);
          }
        }

        console.log(`[WOMPI WEBHOOK] Stock reduced for order ${orderNumber}`);

        // Register commission (10%)
        const totalAmount = result.amount_in_cents / 100;
        const commissionData = wompiService.calculateCommission(result.amount_in_cents);

        await orderService.registerWompiCommission({
          order_id: order.id,
          transaction_id: transactionId,
          total_amount: totalAmount,
          commission_amount: commissionData.commission / 100,
          merchant_amount: commissionData.merchantAmount / 100,
          fuyi_phone: env.FUYI_PHONE_NUMBER || '573238020198'
        });

        // Create commissions for team members
        const teamMembersResult = await dbQuery(`
          SELECT id, user_id, position, commission_percentage
          FROM team_members
          WHERE commission_percentage > 0
        `);

        for (const member of teamMembersResult.rows) {
          const commissionAmount = parseFloat(order.total.toString()) * (parseFloat(member.commission_percentage) / 100);

          const existingCommission = await dbQuery(
            'SELECT id FROM commissions WHERE order_id = $1 AND team_member_id = $2',
            [order.id, member.id]
          );

          if (existingCommission.rows.length === 0) {
            await dbQuery(`
              INSERT INTO commissions (
                team_member_id, order_id, order_total, commission_percentage, commission_amount, status
              ) VALUES ($1, $2, $3, $4, $5, 'pending')
            `, [member.id, order.id, order.total, member.commission_percentage, commissionAmount]);

            console.log(`[WOMPI WEBHOOK] Team commission created for member ${member.id}: $${commissionAmount.toFixed(2)}`);
          }
        }

        console.log(`[WOMPI WEBHOOK] Registered commissions for Order ${orderNumber}`);
      }
    } else if (result && (result.status === 'DECLINED' || result.status === 'VOIDED' || result.status === 'ERROR')) {
      const transactionId = result.id;
      const orderNumber = result.reference;

      console.log(`❌ [WOMPI WEBHOOK] Transaction ${result.status}: ${transactionId} for Order: ${orderNumber}`);

      // Find order and update status to failed if it's not already paid
      const order = await orderService.getByOrderNumber(orderNumber);

      if (order && order.payment_status !== 'paid' && order.payment_status !== 'failed') {
        await orderService.updatePaymentStatus(order.id, 'failed', transactionId);
        // We keep the order status as 'pending' or move to 'cancelled' depending on business logic
        // For now, marking payment as failed allows the user to try again or admin to see the failure
      }
    }

    // Always respond 200 to acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ [WOMPI WEBHOOK] Error:', error);
    // Still respond 200 to avoid retries
    res.status(200).json({ success: false });
  }
});

// Wompi Tokenize card (Helper for frontend)
router.post('/wompi/tokenize', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = z.object({
      number: z.string(),
      cvc: z.string(),
      exp_month: z.string(),
      exp_year: z.string(),
      card_holder: z.string(),
    }).parse(req.body);

    const token = await wompiService.tokenizeCard(data);
    res.json({ success: true, data: token });
  } catch (error) {
    next(error);
  }
});

// Simulate successful Wompi payment (only in dev/testing)
router.post('/wompi/simulate-payment', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!wompiService.isSimulatedMode()) {
      res.status(400).json({
        success: false,
        error: 'This endpoint is only available in simulated mode'
      });
      return;
    }

    const { transactionId } = z.object({
      transactionId: z.string(),
    }).parse(req.body);

    const transaction = await wompiService.simulatePaymentSuccess(transactionId);

    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
});

// Get order by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Order ID is required' });
    }
    const order = await orderService.getById(id);

    // Check if user owns the order or is admin
    if (order.user_id !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// ==================== ADMIN ROUTES ====================

// Get all orders (Admin)
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      status: req.query.status as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };
    const result = await orderService.getAll(filters);
    res.json({ success: true, data: result.data, count: result.count });
  } catch (error) {
    next(error);
  }
});

// Update order status (Admin)
router.patch('/:id/status', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Order ID is required' });
    }
    const { status } = z.object({
      status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
    }).parse(req.body);

    const order = await orderService.updateStatus(id, status as OrderStatus);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// Update order tracking (Admin)
router.patch('/:id/tracking', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Order ID is required' });
    }
    const { trackingNumber, trackingUrl } = z.object({
      trackingNumber: z.string().min(1),
      trackingUrl: z.string().url().optional(),
    }).parse(req.body);

    const order = await orderService.updateTracking(id, trackingNumber, trackingUrl);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// Refund order (Admin) - Manual refund process for Wompi payments
router.post('/:id/refund', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Order ID is required' });
    }
    const { amount } = z.object({
      amount: z.number().positive().optional(),
    }).parse(req.body);

    const order = await orderService.getById(id);

    if (!order.payment_id) {
      res.status(400).json({ success: false, error: 'No payment to refund' });
      return;
    }

    // Update order status for manual refund process
    // Note: Wompi refunds must be processed manually through the Wompi dashboard
    await orderService.updatePaymentStatus(id, amount ? 'partially_refunded' : 'refunded');
    await orderService.updateStatus(id, 'refunded');

    res.json({
      success: true,
      data: {
        message: 'Order marked as refunded. Please process the refund manually through Wompi dashboard.',
        order_id: id,
        payment_id: order.payment_id
      }
    });
  } catch (error) {
    next(error);
  }
});

// Confirm cash on delivery payment (Admin)
router.post('/:id/confirm-cash-payment', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Order ID is required' });
    }
    const order = await orderService.confirmCashOnDelivery(id);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

export default router;
