import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { wompiSecurity } from '../services/wompiSecurity.service.js';
import { wompiService } from '../services/wompi.service.js';
import { z } from 'zod';
import crypto from 'crypto';
import { env } from '../config/env.js';  // Import env to ensure consistent loading

// For backwards compatibility, ensure we have the public key loaded
const WOMPI_PUBLIC_KEY = env.WOMPI_PUBLIC_KEY || process.env.WOMPI_PUBLIC_KEY; // Remove process.env fallback after testing
if (!WOMPI_PUBLIC_KEY) {
  console.warn('⚠ Warning: WOMPI_PUBLIC_KEY is not set in environment variables');
}

// Esquema de validación para preparar transacción
const prepareTransactionSchema = z.object({
  items: z.array(z.object({
    title: z.string(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
    product_id: z.string().optional(), // Para crear order_items
    variant_id: z.string().optional(),
  })).min(1, 'El carrito debe contener al menos un producto'),

  customer: z.object({
    email: z.string().email('Email inválido'),
    fullName: z.string().min(2, 'Nombre completo requerido'),
    phone: z.string().optional(),
  }),

  shippingAddress: z.object({
    addressLine1: z.string().min(4, 'Dirección requerida'),
    addressLine2: z.string().optional(),
    city: z.string().min(4, 'Ciudad requerida'),
    region: z.string().min(4, 'Departamento requerido'),
    country: z.string().length(2, 'Código de país inválido (ej: CO)'),
    name: z.string().min(2, 'Nombre del destinatario requerido'),
    phone: z.string().optional(),
  }).optional(),

  paymentType: z.enum(['CARD', 'PSE', 'NEQUI', 'BANCOLOMBIA_TRANSFER']).optional(),

  // Campos específicos por método de pago
  financialInstitutionCode: z.string().optional(),
  userType: z.union([z.string(), z.number()]).optional(),
  userLegalIdType: z.string().optional(),
  userLegalId: z.string().optional(),
  paymentDescription: z.string().optional(),

  // Datos adicionales para crear la orden
  subtotal: z.number().optional(),
  shipping_cost: z.number().optional(),
  tax: z.number().optional(),

  // redirectUrl is now automatically configured by the backend
  // but we accept it for backwards compatibility with frontend
  redirectUrl: z.string().url('URL de redirección inválida').optional().default(''),
  }); // Added redirectUrl back to the schema so the frontend won't receive validation errors; backend ignores it in favor of configured URL.

// Esquema para confirmar transacción
const confirmTransactionSchema = z.object({
  reference: z.string().min(1, 'Referencia requerida'),
  transactionId: z.string().min(1, 'ID de transacción requerido'),
  amountInCents: z.number().positive('Monto inválido'),
  currency: z.string().length(3, 'Código de moneda inválido'),
  integritySignature: z.string().length(64, 'Firma de integridad inválida'),
});

// Store for prepared transactions (in production, use Redis or database)
const preparedTransactions = new Map<string, {
  reference: string;
  amount: number;
  customerEmail: string;
  createdAt: number;
  expiresAt: number;
}>();

/**
 * Limpia transacciones expiradas cada 5 minutos
 */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, transaction] of preparedTransactions.entries()) {
    if (transaction.expiresAt < now) {
      preparedTransactions.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[WompiSecurity] Cleaned ${cleaned} expired transactions`);
  }
}, 5 * 60 * 1000);

export const wompiSecurityController = {
  /**
   * FASE 1: Preparar transacción
   * - Valida carrito y calcula total
   * - Genera referencia única
   * - Obtiene tokens de aceptación
   * - Genera firma de integridad SHA256
   * - No expone secretos al frontend
   */
  async prepareTransaction(req: Request, res: Response): Promise<void> {
    try {
      console.log('[WompiSecurity] Preparing transaction...');

      // 1. Validar y parsear input
      const {
        items,
        customer,
        shippingAddress,
        paymentType,
        subtotal,
        shipping_cost,
        tax,
      } = prepareTransactionSchema.parse(req.body);

      // Obtener user_id del request autenticado
      const userId = (req as any).user?.id;

      // 2. Calcular monto total EN CENTAVOS (sin redondeo)
      const totalInCents = items.reduce((sum, item) => {
        // Multiplicar por 100 para convertir pesos a centavos
        const itemTotal = item.unit_price * item.quantity * 100;
        return sum + Math.round(itemTotal); // Evitar problemas de punto flotante
      }, 0);

      if (totalInCents <= 0) {
        throw new AppError('El monto total debe ser mayor a 0 COP', 400);
      }

      const totalInPesos = totalInCents / 100;

      // 3. Generar referencia única (CSPRNG + timestamp)
      const reference = `MST-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase();

      console.log(`[WompiSecurity] Generated reference: ${reference}`);
      console.log(`[WompiSecurity] Total amount: ${totalInCents} cents (${totalInPesos} COP)`);

      // 3.5 CREAR ORDEN EN ESTADO PENDING antes de procesar pago
      // Esto asegura que cuando llegue el webhook, la orden ya existe
      let orderId: string | null = null;
      try {
        const { orderService } = await import('../services/order.service.js');

        // Preparar datos de la orden
        const orderItems = items.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: item.unit_price,
        })).filter(item => item.product_id); // Solo incluir items con product_id

        // Solo crear orden si tenemos product_ids (el frontend debe enviarlos)
        if (orderItems.length > 0) {
          const orderData = {
            user_id: userId,
            order_number: reference, // Usar la referencia de Wompi como order_number
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
              address: shippingAddress.addressLine1,
              apartment: shippingAddress.addressLine2,
              city: shippingAddress.city,
              state: shippingAddress.region,
              country: shippingAddress.country,
              phone: shippingAddress.phone,
              email: customer.email,
            } : { email: customer.email },
            notes: `Pago pendiente - Wompi ref: ${reference}`,
            items: orderItems,
          };

          // Crear orden sin reducir stock (se reducirá cuando el pago sea confirmado)
          const order = await orderService.create(orderData as any, false);
          orderId = order.id;
          console.log(`[WompiSecurity] Pre-created order ${reference} with ID ${orderId}`);
        } else {
          console.log('[WompiSecurity] No product_ids provided, skipping order pre-creation');
        }
      } catch (orderError: any) {
        console.error('[WompiSecurity] Failed to pre-create order:', orderError.message);
        // Continuar sin crear orden - el frontend la creará después del pago
      }

      // 4. Obtener tokens de aceptación (Habeas Data - REQUERIDO)
      let acceptanceToken: string;
      let policyLink: string;

      try {
        const tokens = await wompiSecurity.getAcceptanceTokens();
        acceptanceToken = tokens.acceptance_token;
        policyLink = tokens.permalink;

        console.log('[WompiSecurity] Acceptance token acquired successfully');
      } catch (error: any) {
        console.error('❌ [WompiSecurity] Failed to get acceptance tokens:', error.message);
        throw new AppError('No se pudieron obtener los términos y condiciones', 500);
      }

      // 5. Generar firma de integridad SHA256 (CRÍTICO - solo backend)
      const integritySignature = wompiSecurity.generateIntegritySignature(
        reference,
        totalInCents,
        'COP'
      );

      // 6. Normalizar dirección de envío para Wompi
      let formattedShippingAddress = undefined;
      if (shippingAddress) {
        try {
          // Validar longitudes mínimas (requisito de Wompi)
          const addressLine1 = shippingAddress.addressLine1.trim();
          const city = shippingAddress.city.trim();
          let region = shippingAddress.region.trim();

          if (addressLine1.length < 4) {
            throw new AppError('La dirección debe tener al menos 4 caracteres', 400);
          }
          if (city.length < 4) {
            throw new AppError('La ciudad debe tener al menos 4 caracteres', 400);
          }
          if (region.length < 4) {
            region = city; // Fallback
          }

          // Normalizar teléfono
          const normalizedPhone = shippingAddress.phone
            ? this.normalizeWompiPhone(shippingAddress.phone)
            : undefined;

          formattedShippingAddress = {
            address_line_1: addressLine1,
            ...(shippingAddress.addressLine2 && {
              address_line_2: shippingAddress.addressLine2.trim(),
            }),
            country: shippingAddress.country.toUpperCase(),
            region,
            city,
            name: shippingAddress.name.trim(),
            ...(normalizedPhone && { phone_number: normalizedPhone }),
          };
        } catch (error) {
          console.warn('[WompiSecurity] Error formatting shipping address:', error);
          // Continuar sin shipping address si falla
        }
      }

      // 7. Guardar transacción preparada (para verificación posterior)
      const expiresAt = Date.now() + (15 * 60 * 1000); // Expira en 15 minutos
      preparedTransactions.set(reference, {
        reference,
        amount: totalInCents,
        customerEmail: customer.email,
        createdAt: Date.now(),
        expiresAt,
      });

      // 8. Determinar entorno
      const environment = WOMPI_PUBLIC_KEY?.startsWith('pub_prod_')
        ? 'production'
        : 'sandbox';

      // 9. Construir respuesta (sin secretos!)
      // URLs are now configured by the backend when creating transactions
      const responseData = {
        // Datos del Widget (requeridos)
        publicKey: WOMPI_PUBLIC_KEY,
        integrity: integritySignature,
        reference,
        amountInCents: totalInCents,
        currency: 'COP',
        environment,

        // Datos del cliente (para pre-llenar el widget)
        customerEmail: customer.email,
        customerFullName: customer.fullName,

        // Tokens de aceptación (Habeas Data)
        acceptanceToken: acceptanceToken,
        acceptancePolicyLink: policyLink,

        // Dirección de envío (opcional)
        shippingAddress: formattedShippingAddress,

        // Método de pago preferido (opcional)
        paymentType: paymentType || 'CARD',

        // URLs are configured by the backend (redirectUrl needed for frontend widget)
        redirectUrl: `${env.FRONTEND_URL}/checkout/wompi/callback`
      };

      console.log('✅ [WompiSecurity] Transaction prepared successfully:', {
        reference,
        amount: totalInCents,
        environment,
      });

      res.status(200).json({
        success: true,
        data: responseData,
      });

    } catch (error) {
      console.error('❌ [WompiSecurity] Failed to prepare transaction:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Datos inválidos en la solicitud',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      } else {
        throw error;
      }
    }
  },

  /**
   * FASE 2: Confirmar transacción
   * - Valida firma de integridad recibida del widget
   * - Verifica transacción con API de Wompi
   * - Actualiza estado del pedido
   */
  async confirmTransaction(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 [WompiSecurity] Confirming transaction...');

      const {
        reference,
        transactionId,
        amountInCents,
        currency,
        integritySignature,
      } = confirmTransactionSchema.parse(req.body);

      // 1. Verificar que la transacción fue preparada por nosotros
      const preparedTx = preparedTransactions.get(reference);
      if (!preparedTx) {
        throw new AppError(
          'Transaction not found or expired. Please restart the payment process.',
          404
        );
      }

      // 2. Validar que el monto no ha sido modificado (CRÍTICO)
      if (preparedTx.amount !== amountInCents) {
        console.error('🚨 FRUD ALERT: Amount mismatch!', {
          expected: preparedTx.amount,
          received: amountInCents,
          reference,
          transactionId,
        });

        throw new AppError(
          'Transaction amount does not match expected value',
          400
        );
      }

      // 3. Generar firma esperada para comparación
      const expectedSignature = wompiSecurity.generateIntegritySignature(
        reference,
        amountInCents,
        currency
      );

      // 4. Validar firma usando timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature.toLowerCase()),
        Buffer.from(integritySignature.toLowerCase())
      );

      if (!isValid) {
        console.error('🚨 FRUD ALERT: Invalid integrity signature!', {
          reference,
          transactionId,
          expectedSignature,
          receivedSignature: integritySignature,
        });

        throw new AppError(
          'Invalid transaction signature - possible fraud attempt',
          400
        );
      }

      console.log('✅ [WompiSecurity] Integrity signature validated');

      // 5. Obtener transacción desde Wompi API
      const transaction = await wompiService.getTransaction(transactionId);

      if (!transaction) {
        throw new AppError('Transaction not found in Wompi', 404);
      }

      // 6. Validar consistencia de datos
      if (
        transaction.reference !== reference ||
        transaction.amount_in_cents !== amountInCents ||
        transaction.currency !== currency
      ) {
        console.error('🚨 Data mismatch between prepared and confirmed transaction!', {
          expected: { reference, amountInCents, currency },
          received: {
            reference: transaction.reference,
            amount: transaction.amount_in_cents,
            currency: transaction.currency,
          },
        });

        throw new AppError('Transaction data mismatch', 400);
      }

      // 7. Limpiar transacción preparada
      preparedTransactions.delete(reference);

      console.log('✅ [WompiSecurity] Transaction confirmed:', {
        transactionId,
        status: transaction.status,
      });

      // 8. Retornar datos de la transacción
      res.status(200).json({
        success: true,
        data: {
          transactionId,
          reference,
          status: transaction.status,
          amountInCents,
          currency,
          paymentMethod: transaction.payment_method_type,
          createdAt: transaction.created_at,
        },
      });

    } catch (error) {
      console.error('❌ [WompiSecurity] Transaction confirmation failed:', error);
      throw error;
    }
  },

  /**
   * Maneja webhooks de Wompi (eventos asíncronos)
   * POST /api/wompi/webhook
   *
   * ROUTER: Si la referencia tiene un prefijo de otro proyecto,
   * reenvía el webhook a ese proyecto.
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { event, data, timestamp } = req.body;
      const reference = data?.transaction?.reference || '';

      console.log(`[WompiWebhook] Received event: ${event}`, {
        timestamp,
        transactionId: data?.transaction?.id,
        reference,
      });

      // Extraer prefijo de la referencia (ej: "PROJ1_ORDER123" -> "PROJ1")
      const prefixMatch = reference.match(/^([A-Z0-9]+)[-_]/i);
      const prefix = prefixMatch ? prefixMatch[1].toUpperCase() : null;

      // Verificar si es de este proyecto (MST = Melo-Sportt)
      const isLocalProject = prefix === 'MST' || !prefix;

      // Cargar rutas de webhooks de otros proyectos
      let webhookRoutes: Record<string, string> = {};
      if (env.WOMPI_WEBHOOK_ROUTES) {
        try {
          webhookRoutes = JSON.parse(env.WOMPI_WEBHOOK_ROUTES);
        } catch (e) {
          console.error('[WompiWebhook] Error parsing WOMPI_WEBHOOK_ROUTES:', e);
        }
      }

      // Si el prefijo corresponde a otro proyecto, reenviar
      if (prefix && !isLocalProject && webhookRoutes[prefix]) {
        const targetUrl = webhookRoutes[prefix];
        console.log(`[WompiWebhook] Forwarding to ${prefix}: ${targetUrl}`);

        try {
          const forwardResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Reenviar headers importantes de Wompi
              ...(req.headers['x-event-checksum'] && {
                'X-Event-Checksum': req.headers['x-event-checksum'] as string,
              }),
            },
            body: JSON.stringify(req.body),
          });

          console.log(`[WompiWebhook] Forward response from ${prefix}: ${forwardResponse.status}`);
        } catch (forwardError) {
          console.error(`[WompiWebhook] Error forwarding to ${prefix}:`, forwardError);
        }

        // Responder OK a Wompi inmediatamente
        res.status(200).send('FORWARDED');
        return;
      }

      // Procesar localmente si es de este proyecto
      // Nota: Las funciones son async pero NO usamos await porque Wompi
      // requiere respuesta 200 inmediatamente. El procesamiento continua en background.
      // Capturar referencia al objeto para mantener el contexto
      const self = this;
      switch (event) {
        case 'transaction.updated':
          self.handleTransactionUpdated(data.transaction).catch(err =>
            console.error('[WompiWebhook] Background error in handleTransactionUpdated:', err)
          );
          break;

        case 'transaction.payment_approved':
          self.handlePaymentApproved(data.transaction).catch(err =>
            console.error('[WompiWebhook] Background error in handlePaymentApproved:', err)
          );
          break;

        case 'transaction.payment_declined':
          self.handlePaymentDeclined(data.transaction).catch(err =>
            console.error('[WompiWebhook] Background error in handlePaymentDeclined:', err)
          );
          break;

        case 'transaction.payment_voided':
          self.handlePaymentVoided(data.transaction).catch(err =>
            console.error('[WompiWebhook] Background error in handlePaymentVoided:', err)
          );
          break;

        case 'transaction.refund_applied':
          self.handleRefundApplied(data.transaction).catch(err =>
            console.error('[WompiWebhook] Background error in handleRefundApplied:', err)
          );
          break;

        default:
          console.log(`[WompiWebhook] Unknown event type: ${event}`);
      }

      // Wompi requiere respuesta 200 OK inmediatamente
      res.status(200).send('OK');

    } catch (error) {
      console.error('❌ [WompiWebhook] Error processing webhook:', error);
      // Aún respondemos 200 para evitar reintentos de Wompi
      // El error se debe manejar internamente y notificar al equipo
      res.status(200).send('ERROR_LOGGED');
    }
  },

  /**
   * Obtiene transacción desde Wompi API
   */
  async getTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Transaction ID is required', 400);
      }

      const transaction = await wompiService.getTransaction(id);

      if (!transaction) {
        throw new AppError('Transaction not found', 404);
      }

      // Asociar el ID de transacción de Wompi con nuestra orden interna
      // para asegurar que el webhook pueda encontrarla.
      try {
        const { orderService } = await import('../services/order.service.js');
        const order = await orderService.getByOrderNumber(transaction.reference).catch(() => null);
        
        if (order && !order.payment_id) {
          await orderService.updatePaymentId(order.id, id);
          console.log(`[WompiSecurity] Associated transaction ${id} with order ${order.order_number}`);
        }
      } catch (error) {
        console.error(`[WompiSecurity] Failed to associate payment ID for transaction ${id}:`, error);
        // No lanzar error, el flujo principal debe continuar.
      }

      res.status(200).json({
        success: true,
        data: transaction,
      });

    } catch (error) {
      console.error('❌ [WompiSecurity] Failed to get transaction:', error);
      throw error;
    }
  },

  // Handlers para webhooks - Implementaciones reales
  async handleTransactionUpdated(transaction: any): Promise<void> {
    console.log('[WompiWebhook] Transaction updated:', {
      id: transaction.id,
      reference: transaction.reference,
      status: transaction.status,
    });

    // Si el estado es APPROVED, delegar al handler más completo.
    if (transaction.status === 'APPROVED') {
      console.log(`[WompiWebhook] Transaction updated to APPROVED, delegating to handlePaymentApproved.`);
      await this.handlePaymentApproved(transaction);
      return;
    }

    try {
      const { orderService } = await import('../services/order.service.js');

      // Buscar orden por referencia (order_number)
      const order = await orderService.getByOrderNumber(transaction.reference).catch(() => null);

      if (!order) {
        console.warn(`[WompiWebhook] Order not found for reference: ${transaction.reference}`);
        return;
      }

      // Mapear estados de Wompi a estados de orden
      const statusMap: Record<string, { orderStatus?: string; paymentStatus: string }> = {
        // 'APPROVED' is handled above
        'DECLINED': { paymentStatus: 'failed' },
        'VOIDED': { orderStatus: 'cancelled', paymentStatus: 'refunded' },
        'ERROR': { paymentStatus: 'failed' },
        'PENDING': { paymentStatus: 'pending' },
      };

      const mapping = statusMap[transaction.status];
      if (mapping) {
        // Actualizar estado de pago
        await orderService.updatePaymentStatus(order.id, mapping.paymentStatus, transaction.id);

        // Actualizar estado de orden si aplica
        if (mapping.orderStatus) {
          await orderService.updateStatus(order.id, mapping.orderStatus as any);
        }

        console.log(`[WompiWebhook] Order ${order.order_number} updated: payment=${mapping.paymentStatus}, status=${mapping.orderStatus || 'unchanged'}`);
      }
    } catch (error) {
      console.error('[WompiWebhook] Error handling transaction update:', error);
    }
  },

  async handlePaymentApproved(transaction: any): Promise<void> {
    console.log('[WompiWebhook] Payment approved:', transaction.id);

    const findOrderWithRetry = async (
      reference: string,
      paymentId: string,
      retries = 3,
      delay = 2000 // 2 seconds
    ): Promise<any> => {
      const { orderService } = await import('../services/order.service.js');
      
      for (let i = 0; i < retries; i++) {
        // First, try by reference
        let order = await orderService.getByOrderNumber(reference).catch(() => null);
        
        // If not found, try by paymentId
        if (!order) {
          order = await orderService.getByPaymentId(paymentId).catch(() => null);
        }

        if (order) {
          console.log(`[WompiWebhook] Found order on attempt ${i + 1}`);
          return order;
        }

        console.log(`[WompiWebhook] Order not found on attempt ${i + 1}. Retrying in ${delay / 1000}s...`);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      console.warn(`[WompiWebhook] CRITICAL: Order not found after ${retries} attempts for reference: ${reference} or paymentId: ${paymentId}`);
      return null;
    };

    try {
      const { orderService } = await import('../services/order.service.js');
      const { query } = await import('../config/database.js');

      // Buscar orden con reintentos
      const order = await findOrderWithRetry(transaction.reference, transaction.id);

      if (!order) {
        return; // El error ya fue logueado en findOrderWithRetry
      }

      // Verificar si ya fue procesado (evitar duplicados)
      if (order.payment_status === 'paid') {
        console.log(`[WompiWebhook] Order ${order.order_number} already marked as paid, skipping`);
        return;
      }

      // Actualizar orden como pagada y confirmada
      await orderService.updatePaymentStatus(order.id, 'paid', transaction.id);
      await orderService.updateStatus(order.id, 'confirmed');

      // Reducir stock de productos (la orden se creo con reduceStock=false)
      const orderItemsResult = await query(
        'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = $1',
        [order.id]
      );

      for (const item of orderItemsResult.rows) {
        // Reducir stock del producto
        await query(`
          UPDATE products
          SET quantity = quantity - $1,
              total_sold = COALESCE(total_sold, 0) + $1,
              updated_at = NOW()
          WHERE id = $2 AND track_quantity = true
        `, [item.quantity, item.product_id]);

        // Reducir stock de variante si aplica
        if (item.variant_id) {
          await query(`
            UPDATE product_variants
            SET quantity = quantity - $1, updated_at = NOW()
            WHERE id = $2
          `, [item.quantity, item.variant_id]);
        }
      }

      console.log(`[WompiWebhook] Stock reduced for order ${order.order_number}`);

      // Crear comisiones para todos los miembros del equipo con porcentaje de comision
      const teamMembersResult = await query(`
        SELECT id, user_id, position, commission_percentage
        FROM team_members
        WHERE commission_percentage > 0
      `);

      for (const member of teamMembersResult.rows) {
        const commissionAmount = parseFloat(order.total.toString()) * (parseFloat(member.commission_percentage) / 100);

        // Verificar que no exista ya una comision para este pedido y miembro
        const existingCommission = await query(
          'SELECT id FROM commissions WHERE order_id = $1 AND team_member_id = $2',
          [order.id, member.id]
        );

        if (existingCommission.rows.length === 0) {
          await query(`
            INSERT INTO commissions (
              team_member_id, order_id, order_total, commission_percentage, commission_amount, status
            ) VALUES ($1, $2, $3, $4, $5, 'pending')
          `, [
            member.id,
            order.id,
            order.total,
            member.commission_percentage,
            commissionAmount
          ]);

          console.log(`[WompiWebhook] Commission created for team member ${member.id}: $${commissionAmount.toFixed(2)}`);
        }
      }

      console.log(`[WompiWebhook] Order ${order.order_number} marked as paid and confirmed`);
    } catch (error) {
      console.error('[WompiWebhook] Error handling payment approved:', error);
    }
  },

  async handlePaymentDeclined(transaction: any): Promise<void> {
    console.log('[WompiWebhook] Payment declined:', transaction.id);

    try {
      const { orderService } = await import('../services/order.service.js');
      const { query } = await import('../config/database.js');

      // Buscar orden por referencia
      const order = await orderService.getByOrderNumber(transaction.reference).catch(() => null);

      if (!order) {
        console.warn(`[WompiWebhook] Order not found for reference: ${transaction.reference}`);
        return;
      }

      // Marcar pedido como fallido
      await orderService.updatePaymentStatus(order.id, 'failed', transaction.id);

      // Restaurar inventario - obtener items de la orden
      const orderItemsResult = await query(
        'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = $1',
        [order.id]
      );

      for (const item of orderItemsResult.rows) {
        // Restaurar stock del producto
        await query(`
          UPDATE products
          SET quantity = quantity + $1,
              total_sold = GREATEST(0, COALESCE(total_sold, 0) - $1),
              updated_at = NOW()
          WHERE id = $2 AND track_quantity = true
        `, [item.quantity, item.product_id]);

        // Restaurar stock de variante si aplica
        if (item.variant_id) {
          await query(`
            UPDATE product_variants
            SET quantity = quantity + $1, updated_at = NOW()
            WHERE id = $2
          `, [item.quantity, item.variant_id]);
        }
      }

      console.log(`[WompiWebhook] Order ${order.order_number} marked as failed, inventory restored`);
    } catch (error) {
      console.error('[WompiWebhook] Error handling payment declined:', error);
    }
  },

  async handlePaymentVoided(transaction: any): Promise<void> {
    console.log('[WompiWebhook] Payment voided:', transaction.id);

    try {
      const { orderService } = await import('../services/order.service.js');
      const { query } = await import('../config/database.js');

      // Buscar orden por referencia o por ID de pago como fallback
      let order = await orderService.getByOrderNumber(transaction.reference).catch(() => null);
      if (!order) {
        console.log(`[WompiWebhook] Order not found by reference ${transaction.reference}, trying paymentId ${transaction.id}`);
        order = await orderService.getByPaymentId(transaction.id).catch(() => null);
      }

      if (!order) {
        console.warn(`[WompiWebhook] Order not found for reference: ${transaction.reference} or paymentId: ${transaction.id}`);
        return;
      }

      // Anular pedido
      await orderService.updatePaymentStatus(order.id, 'refunded', transaction.id);
      await orderService.updateStatus(order.id, 'cancelled');

      // Restaurar inventario
      const orderItemsResult = await query(
        'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = $1',
        [order.id]
      );

      for (const item of orderItemsResult.rows) {
        await query(`
          UPDATE products
          SET quantity = quantity + $1,
              total_sold = GREATEST(0, COALESCE(total_sold, 0) - $1),
              updated_at = NOW()
          WHERE id = $2 AND track_quantity = true
        `, [item.quantity, item.product_id]);

        if (item.variant_id) {
          await query(`
            UPDATE product_variants
            SET quantity = quantity + $1, updated_at = NOW()
            WHERE id = $2
          `, [item.quantity, item.variant_id]);
        }
      }

      // Cancelar comisiones pendientes asociadas a esta orden
      await query(`
        UPDATE commissions
        SET status = 'cancelled', updated_at = NOW()
        WHERE order_id = $1 AND status = 'pending'
      `, [order.id]);

      console.log(`[WompiWebhook] Order ${order.order_number} voided, inventory restored, commissions cancelled`);
    } catch (error) {
      console.error('[WompiWebhook] Error handling payment voided:', error);
    }
  },

  async handleRefundApplied(transaction: any): Promise<void> {
    console.log('[WompiWebhook] Refund applied:', transaction.id);

    try {
      const { orderService } = await import('../services/order.service.js');
      const { query } = await import('../config/database.js');

      // Buscar orden por referencia
      const order = await orderService.getByOrderNumber(transaction.reference).catch(() => null);

      if (!order) {
        console.warn(`[WompiWebhook] Order not found for reference: ${transaction.reference}`);
        return;
      }

      // Actualizar estado de reembolso
      await orderService.updatePaymentStatus(order.id, 'refunded', transaction.id);
      await orderService.updateStatus(order.id, 'refunded');

      // Cancelar comisiones asociadas
      await query(`
        UPDATE commissions
        SET status = 'cancelled', updated_at = NOW()
        WHERE order_id = $1 AND status IN ('pending', 'approved')
      `, [order.id]);

      console.log(`[WompiWebhook] Order ${order.order_number} refunded, commissions cancelled`);
    } catch (error) {
      console.error('[WompiWebhook] Error handling refund:', error);
    }
  },

  // Utilidades
  normalizeWompiPhone(phone: string): string | undefined {
    if (!phone) return undefined;

    let cleanPhone = phone.replace(/\D/g, '');
    cleanPhone = cleanPhone.replace(/^0+/, '');

    if (cleanPhone.startsWith('57')) {
      return cleanPhone.substring(0, 11); // Máximo 11 caracteres
    }

    if (cleanPhone.length === 10) {
      return `57${cleanPhone}`;
    }

    return cleanPhone.length >= 7 ? `57${cleanPhone}` : undefined;
  },
};
