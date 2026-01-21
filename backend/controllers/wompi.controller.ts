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
      console.log('🔄 [WompiSecurity] Preparing transaction...');

      // 1. Validar y parsear input
      const {
        items,
        customer,
        shippingAddress,
        paymentType,
      } = prepareTransactionSchema.parse(req.body);

      // 2. Calcular monto total EN CENTAVOS (sin redondeo)
      const totalInCents = items.reduce((sum, item) => {
        // Multiplicar por 100 para convertir pesos a centavos
        const itemTotal = item.unit_price * item.quantity * 100;
        return sum + Math.round(itemTotal); // Evitar problemas de punto flotante
      }, 0);

      if (totalInCents <= 0) {
        throw new AppError('El monto total debe ser mayor a 0 COP', 400);
      }

      // 3. Generar referencia única (CSPRNG + timestamp)
      const reference = `MST-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase();

      console.log(`[WompiSecurity] Generated reference: ${reference}`);
      console.log(`[WompiSecurity] Total amount: ${totalInCents} cents (${totalInCents/100} COP)`);

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
   */
  handleWebhook(req: Request, res: Response): void {
    try {
      const { event, data, timestamp } = req.body;

      console.log(`[WompiWebhook] Received event: ${event}`, {
        timestamp,
        transactionId: data?.transaction?.id,
      });

      // Manejar diferentes tipos de eventos
      switch (event) {
        case 'transaction.updated':
          this.handleTransactionUpdated(data.transaction);
          break;

        case 'transaction.payment_approved':
          this.handlePaymentApproved(data.transaction);
          break;

        case 'transaction.payment_declined':
          this.handlePaymentDeclined(data.transaction);
          break;

        case 'transaction.payment_voided':
          this.handlePaymentVoided(data.transaction);
          break;

        case 'transaction.refund_applied':
          this.handleRefundApplied(data.transaction);
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

      res.status(200).json({
        success: true,
        data: transaction,
      });

    } catch (error) {
      console.error('❌ [WompiSecurity] Failed to get transaction:', error);
      throw error;
    }
  },

  // Handlers para webhooks
  handleTransactionUpdated(transaction: any): void {
    console.log('[WompiWebhook] Transaction updated:', {
      id: transaction.id,
      reference: transaction.reference,
      status: transaction.status,
    });

    // TODO: Actualizar estado del pedido en base de datos
    // TODO: Enviar notificación al cliente si es aprobado
    // TODO: Liberar inventario si es declinado
    // TODO: Activar flujo de envío si es aprobado
  },

  handlePaymentApproved(transaction: any): void {
    console.log('✅ [WompiWebhook] Payment approved:', transaction.id);

    // TODO: Marcar pedido como pagado
    // TODO: Enviar email de confirmación
    // TODO: Actualizar inventario
    // TODO: Notificar al vendedor
  },

  handlePaymentDeclined(transaction: any): void {
    console.log('❌ [WompiWebhook] Payment declined:', transaction.id);

    // TODO: Marcar pedido como fallido
    // TODO: Liberar inventario reservado
    // TODO: Notificar al cliente
  },

  handlePaymentVoided(transaction: any): void {
    console.log('🔄 [WompiWebhook] Payment voided:', transaction.id);

    // TODO: Anular pedido
    // TODO: Reembolsar si aplica
    // TODO: Liberar inventario
  },

  handleRefundApplied(transaction: any): void {
    console.log('💰 [WompiWebhook] Refund applied:', transaction.id);

    // TODO: Actualizar estado de reembolso
    // TODO: Notificar al cliente
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
