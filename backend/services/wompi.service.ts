import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

// Wompi API Configuration
// Determine API URL based on public key prefix (more reliable than NODE_ENV)
const getWompiApiUrl = () => {
  if (!env.WOMPI_PUBLIC_KEY) {
    return 'https://sandbox.wompi.co/v1'; // Default to sandbox if no key
  }
  // Check if it's a production key (pub_prod_) or test key (pub_test_)
  if (env.WOMPI_PUBLIC_KEY.startsWith('pub_prod_')) {
    return 'https://production.wompi.co/v1';
  }
  return 'https://sandbox.wompi.co/v1';
};

const WOMPI_API_URL = getWompiApiUrl();

// Simulated mode flag - only if no private key is set
const SIMULATED_MODE = !env.WOMPI_PRIVATE_KEY;

// In-memory storage for simulated transactions
const simulatedTransactions = new Map<string, {
  id: string;
  reference: string;
  status: string;
  amount_in_cents: number;
  currency: string;
  payment_method_type: string;
  payment_method: any;
  customer_email: string;
  redirect_url: string;
  created_at: number;
}>();

// Helper to generate fake IDs
const generateFakeId = (prefix: string) =>
  `${prefix}_simulated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export interface CreateTransactionData {
  amount_in_cents: number;
  currency: string;
  customer_email: string;
  payment_method?: {
    type: string;
    installments?: number;
    token?: string;
    // PSE fields
    financial_institution_code?: string;
    user_type?: number | string;
    user_legal_id_type?: string;
    user_legal_id?: string;
    payment_description?: string;
    // Nequi fields
    phone_number?: string;
    [key: string]: any; // Allow other fields
  };
  reference: string;
  redirect_url?: string;
  payment_source_id?: number;
  customer_data?: {
    phone_number?: string;
    full_name?: string;
    legal_id?: string;
    legal_id_type?: string;
  };
  shipping_address?: {
    address_line_1?: string;
    address_line_2?: string;
    country?: string;
    region?: string;
    city?: string;
    name?: string;
    phone_number?: string;
  };
}

export interface AcceptanceToken {
  acceptance_token: string;
  permalink: string;
  type: string;
}

export const wompiService = {
  /**
   * Get acceptance token for terms and conditions
   * Required before creating transactions
   */
  async getAcceptanceToken(): Promise<AcceptanceToken> {
    // SIMULATED MODE
    if (SIMULATED_MODE) {
      console.log('🧪 [SIMULATED WOMPI] Getting acceptance token');
      return {
        acceptance_token: 'simulated_acceptance_token_' + Date.now(),
        permalink: 'https://wompi.co/terms',
        type: 'END_USER_POLICY',
      };
    }

    // REAL MODE
    if (!env.WOMPI_PUBLIC_KEY) {
      throw new AppError('WOMPI_PUBLIC_KEY is required', 500);
    }

    try {
      console.log('[WOMPI] Environment check:', {
        NODE_ENV: env.NODE_ENV,
        WOMPI_PUBLIC_KEY: env.WOMPI_PUBLIC_KEY ? `${env.WOMPI_PUBLIC_KEY.substring(0, 20)}... (length: ${env.WOMPI_PUBLIC_KEY.length})` : 'NOT_SET',
        WOMPI_PRIVATE_KEY: env.WOMPI_PRIVATE_KEY ? `${env.WOMPI_PRIVATE_KEY.substring(0, 20)}... (length: ${env.WOMPI_PRIVATE_KEY.length})` : 'NOT_SET',
        API_URL: WOMPI_API_URL,
        SIMULATED_MODE: SIMULATED_MODE
      });

      const merchantUrl = `${WOMPI_API_URL}/merchants/${env.WOMPI_PUBLIC_KEY}`;
      console.log(`[WOMPI] Getting acceptance token from: ${merchantUrl}`);
      
      const response = await axios.get(merchantUrl, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('[WOMPI] Response status:', response.status);
      console.log('[WOMPI] Response data structure:', {
        hasData: !!response.data?.data,
        hasPresignedAcceptance: !!response.data?.data?.presigned_acceptance,
      });

      // Handle different response structures
      const merchantData = response.data?.data || response.data;
      
      if (!merchantData) {
        throw new AppError('Invalid response from Wompi API: missing data', 500);
      }

      const presignedAcceptance = merchantData.presigned_acceptance;

      if (!presignedAcceptance) {
        console.error('[WOMPI] Response data:', JSON.stringify(merchantData, null, 2));
        throw new AppError('Invalid response from Wompi API: missing presigned_acceptance', 500);
      }

      return {
        acceptance_token: presignedAcceptance.acceptance_token,
        permalink: presignedAcceptance.permalink,
        type: presignedAcceptance.type,
      };
    } catch (error: any) {
      console.error('[WOMPI] API Error details:', {
        url: `${WOMPI_API_URL}/merchants/${env.WOMPI_PUBLIC_KEY?.substring(0, 20)}...`,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
        }
      });
      
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.message 
        || error.message 
        || 'Unknown error';
      
      throw new AppError(
        `Failed to get acceptance token: ${errorMessage}`,
        error.response?.status || 500
      );
    }
  },

  /**
   * Create a payment transaction
   * Returns a transaction that can be used for checkout
   */
  async createTransaction(data: CreateTransactionData) {
    // SIMULATED MODE
    if (SIMULATED_MODE) {
      console.log('🧪 [SIMULATED WOMPI] Creating transaction:', data);

      const transactionId = generateFakeId('txn');
      const checkoutUrl = `https://checkout.wompi.co/l/${transactionId}`;

      const transaction = {
        id: transactionId,
        reference: data.reference,
        status: 'PENDING',
        amount_in_cents: data.amount_in_cents,
        currency: data.currency,
        payment_method_type: data.payment_method?.type || 'CARD',
        payment_method: data.payment_method || {},
        customer_email: data.customer_email,
        redirect_url: checkoutUrl,
        created_at: Date.now(),
      };

      simulatedTransactions.set(transactionId, transaction);

      console.log('✅ [SIMULATED WOMPI] Transaction created:', {
        id: transactionId,
        reference: data.reference,
        checkout_url: checkoutUrl,
      });

      return {
        id: transactionId,
        reference: data.reference,
        status: 'PENDING',
        checkout_url: checkoutUrl,
        amount_in_cents: data.amount_in_cents,
        currency: data.currency,
      };
    }

    // REAL MODE
    if (!env.WOMPI_PRIVATE_KEY || !env.WOMPI_PUBLIC_KEY) {
      throw new AppError('Wompi is not configured', 500);
    }

    // Declare payload outside try block so it's accessible in catch block
    let payload: any;

    try {
      // First, get acceptance token
      const acceptanceToken = await this.getAcceptanceToken();

      // Preparar payload para Wompi
      payload = {
        acceptance_token: acceptanceToken.acceptance_token,
        amount_in_cents: data.amount_in_cents,
        currency: data.currency,
        customer_email: data.customer_email,
        reference: data.reference,
      };

      // Agregar campos opcionales solo si están presentes
      if (data.payment_method) {
        payload.payment_method = data.payment_method;
      }
      if (data.payment_source_id) {
        payload.payment_source_id = data.payment_source_id;
      }
      if (data.redirect_url) {
        payload.redirect_url = data.redirect_url;
      }
      
      console.log('[Wompi Service] Creating transaction with payload:', JSON.stringify({
        ...payload,
        acceptance_token: payload.acceptance_token ? '***' : undefined,
      }, null, 2));
      if (data.customer_data && (data.customer_data.full_name || data.customer_data.phone_number)) {
        payload.customer_data = data.customer_data;
      }
      // Solo enviar shipping_address si tiene los campos mínimos requeridos
      // y cumple con las validaciones de Wompi (mínimo 4 caracteres para address_line_1 y city)
      if (data.shipping_address && 
          data.shipping_address.address_line_1 && 
          data.shipping_address.city && 
          data.shipping_address.country) {
        try {
          // Validar longitud mínima requerida por Wompi
          const addressLine1 = data.shipping_address.address_line_1.trim();
          const city = data.shipping_address.city.trim();
          
          if (addressLine1.length < 4) {
            console.warn('[Wompi Service] address_line_1 too short, skipping shipping_address');
            // No enviar shipping_address si no cumple requisitos
          } else if (city.length < 4) {
            console.warn('[Wompi Service] city too short, skipping shipping_address');
            // No enviar shipping_address si no cumple requisitos
          } else {
            // Asegurar que region tenga al menos 4 caracteres si se proporciona
            let region = data.shipping_address.region?.trim();
            if (region && region.length < 4) {
              // Si region es muy corta, usar city como fallback
              region = city;
            } else if (!region) {
              region = city;
            }

            // Construir name - debe tener al menos 4 caracteres
            const name = data.shipping_address.name?.trim() || 'Cliente Melo Sportt';
            const finalName = name.length >= 4 ? name : 'Cliente Melo Sportt';

            // Asegurar código de país de 2 letras
            let countryCode = data.shipping_address.country?.trim().toUpperCase() || 'CO';
            if (countryCode.length > 2) {
              countryCode = countryCode.substring(0, 2);
            }

            // Construir objeto shipping_address solo con campos válidos
            const shippingAddressPayload: any = {
              address_line_1: addressLine1,
              city: city,
              region: region,
              country: countryCode,
              name: finalName,
            };

            // Solo incluir address_line_2 si tiene al menos 4 caracteres
            if (data.shipping_address.address_line_2?.trim() && data.shipping_address.address_line_2.trim().length >= 4) {
              shippingAddressPayload.address_line_2 = data.shipping_address.address_line_2.trim();
            }

            // Solo incluir phone_number si tiene al menos 7 dígitos
            const cleanPhone = data.shipping_address.phone_number?.replace(/\D/g, '');
            if (cleanPhone && cleanPhone.length >= 7) {
              shippingAddressPayload.phone_number = cleanPhone;
            }

            console.log('[Wompi Service] Final shipping_address payload:', JSON.stringify(shippingAddressPayload, null, 2));

            payload.shipping_address = shippingAddressPayload;
          }
        } catch (error: any) {
          console.error('[Wompi Service] Error formatting shipping_address:', error);
          // Si hay error formateando, no enviar shipping_address (Wompi puede funcionar sin él)
          console.warn('[Wompi Service] Skipping shipping_address due to formatting error');
        }
      }

      // Create transaction
      console.log('[Wompi Service] Sending request to Wompi API:', {
        url: `${WOMPI_API_URL}/transactions`,
        hasPaymentMethod: !!payload.payment_method,
        hasPaymentSourceId: !!payload.payment_source_id,
        hasShippingAddress: !!payload.shipping_address,
        hasRedirectUrl: !!payload.redirect_url,
        payloadKeys: Object.keys(payload),
      });
      
      // IMPORTANTE: Según la documentación de Wompi, cuando se usa el checkout widget,
      // puedes enviar payment_method con solo el tipo (sin token) para indicar el método deseado,
      // o puedes omitirlo completamente y dejar que el widget maneje la selección.
      // 
      // Sin embargo, Wompi está rechazando transacciones sin payment_method ni payment_source_id
      // con error 422 "No se especificó método de pago o fuente de pago".
      //
      // Solución: Si no hay payment_method completo (con token), pero hay un tipo de pago,
      // incluimos payment_method con solo el tipo. Si no hay nada, intentamos crear la transacción
      // y si Wompi la rechaza, el error será claro y podremos implementar payment_source_id.
      //
      // Para métodos que usan checkout widget (PSE, Nequi, etc.), el flujo correcto es:
      // 1. Crear la transacción con payment_method.type (sin token) o payment_source_id
      // 2. Redirigir al usuario al checkout_url donde completará el pago
      // 3. Wompi procesará el pago y enviará un webhook cuando se complete
      
      const response = await axios.post(
        `${WOMPI_API_URL}/transactions`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${env.WOMPI_PRIVATE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('[Wompi Service] Transaction created successfully:', {
        transactionId: response.data.data?.id,
        status: response.data.data?.status,
        reference: response.data.data?.reference,
      });

      const transaction = response.data.data;

      // Generate checkout URL (Wompi Widget)
      const checkoutUrl = `https://checkout.wompi.co/l/${transaction.id}`;

      return {
        id: transaction.id,
        reference: transaction.reference,
        status: transaction.status,
        checkout_url: checkoutUrl,
        amount_in_cents: transaction.amount_in_cents,
        currency: transaction.currency,
      };
    } catch (error: any) {
      console.error('❌ [Wompi Service] API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        payload: payload ? {
          ...payload,
          acceptance_token: payload.acceptance_token ? '***' : undefined,
        } : undefined,
      });

      // Extraer mensaje de error más detallado
      let errorMessage = 'Error al crear la transacción';
      const errorData = error.response?.data;
      
      if (errorData?.error) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error.messages) {
          // Manejar mensajes de validación
          const messages = errorData.error.messages;
          const errorParts: string[] = [];
          
          if (messages.shipping_address) {
            const shippingErrors = Array.isArray(messages.shipping_address)
              ? messages.shipping_address
              : Object.values(messages.shipping_address);
            errorParts.push(`Dirección de envío: ${shippingErrors.join(', ')}`);
          }
          
          if (messages.customer_email) {
            errorParts.push(`Email: ${Array.isArray(messages.customer_email) ? messages.customer_email.join(', ') : messages.customer_email}`);
          }
          
          if (messages.payment_method) {
            const pm = messages.payment_method;
            let pmText = '';
            if (Array.isArray(pm)) {
              pmText = pm.join(', ');
            } else if (pm && typeof pm === 'object') {
              try {
                pmText = JSON.stringify(pm);
              } catch (e) {
                pmText = String(pm);
              }
            } else {
              pmText = String(pm);
            }
            errorParts.push(`Método de pago: ${pmText}`);
          }
          
          if (messages.payment_source_id) {
            errorParts.push(`Fuente de pago: ${Array.isArray(messages.payment_source_id) ? messages.payment_source_id.join(', ') : messages.payment_source_id}`);
          }
          
          if (errorData.error.reason) {
            errorParts.push(errorData.error.reason);
          }
          
          errorMessage = errorParts.length > 0 ? errorParts.join(' | ') : errorData.error.reason || errorMessage;
        } else if (errorData.error.reason) {
          errorMessage = errorData.error.reason;
        }
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new AppError(
        `Failed to create transaction: ${errorMessage}`,
        error.response?.status || 500
      );
    }
  },

  /**
   * Tokenize a credit card
   * NUNCA enviar datos de tarjeta directamente al backend en producción
   * pero este método sirve para el flujo de tokenización desde el servidor si es necesario
   */
  async tokenizeCard(data: {
    number: string;
    cvc: string;
    exp_month: string;
    exp_year: string;
    card_holder: string;
  }) {
    if (SIMULATED_MODE) {
      return {
        id: `tok_test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        status: 'CREATED'
      };
    }

    try {
      const response = await axios.post(
        `${WOMPI_API_URL}/tokens/cards`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${env.WOMPI_PUBLIC_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Wompi Tokenization Error:', error.response?.data || error.message);
      throw new AppError(`Error en tokenización: ${error.response?.data?.error?.reason || error.message}`, 400);
    }
  },

  /**
   * Calculate commission (10%)
   */
  calculateCommission(totalAmountInCents: number) {
    const commissionPercentage = 0.10; // 10%
    const commission = Math.round(totalAmountInCents * commissionPercentage);
    const merchantAmount = totalAmountInCents - commission;

    return {
      total: totalAmountInCents,
      commission,
      merchantAmount
    };
  },

  async getTransaction(transactionId: string) {
    // SIMULATED MODE
    if (SIMULATED_MODE) {
      console.log('🧪 [SIMULATED WOMPI] Getting transaction:', transactionId);

      const transaction = simulatedTransactions.get(transactionId);

      if (!transaction) {
        // Auto-create a successful transaction for testing
        const newTransaction = {
          id: transactionId,
          reference: `ORDER_${Date.now()}`,
          status: 'APPROVED',
          amount_in_cents: 100000,
          currency: 'COP',
          payment_method_type: 'CARD',
          payment_method: { type: 'CARD' },
          customer_email: 'test@example.com',
          redirect_url: '',
          created_at: Date.now(),
        };
        simulatedTransactions.set(transactionId, newTransaction);
        return newTransaction;
      }

      return transaction;
    }

    // REAL MODE
    if (!env.WOMPI_PUBLIC_KEY) {
      throw new AppError('Wompi is not configured', 500);
    }

    try {
      const response = await axios.get(
        `${WOMPI_API_URL}/transactions/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${env.WOMPI_PUBLIC_KEY}`,
          },
        }
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Wompi API Error:', error.response?.data || error.message);
      throw new AppError(
        `Failed to get transaction: ${error.message}`,
        500
      );
    }
  },

  /**
   * Verify event signature from webhook
   * According to Wompi docs: SHA256(event.data.transaction.id + event.data.transaction.status + event.data.transaction.amount_in_cents + event.timestamp + WOMPI_EVENTS_SECRET)
   */
  verifyEventSignature(
    signature: string,
    timestamp: string,
    eventData: any
  ): boolean {
    if (SIMULATED_MODE) {
      console.log('🧪 [SIMULATED WOMPI] Skipping signature verification in simulated mode');
      return true;
    }

    if (!env.WOMPI_EVENTS_SECRET) {
      throw new AppError('Wompi events secret is not configured', 500);
    }

    const transaction = eventData.data.transaction;

    // Wompi sends events checksum in x-event-checksum header (which is passed as signature here)
    // The concatenation order for transaction events is specific
    const concatenated = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${env.WOMPI_EVENTS_SECRET}`;

    // Generate SHA256 signature
    const expectedSignature = crypto
      .createHash('sha256')
      .update(concatenated)
      .digest('hex');

    return signature.toLowerCase() === expectedSignature.toLowerCase();
  },

  /**
   * Process webhook event from Wompi
   */
  async processWebhook(eventData: any, signature: string, timestamp: string) {
    // Verify signature (skip in simulated mode)
    if (!SIMULATED_MODE) {
      const isValid = this.verifyEventSignature(signature, timestamp, eventData);

      if (!isValid) {
        throw new AppError('Invalid webhook signature', 401);
      }
    }

    // Process different event types
    switch (eventData.event) {
      case 'transaction.updated':
        return await this.getTransaction(eventData.data.transaction.id);

      default:
        console.log('Ignoring unknown webhook event:', eventData.event);
        return null;
    }
  },

  /**
   * Generate payment link for checkout
   * This creates a hosted checkout page for the customer
   */
  async generatePaymentLink(data: {
    reference: string;
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    redirect_url: string;
    description?: string;
  }) {
    // Create transaction first
    const transaction = await this.createTransaction({
      amount_in_cents: data.amount_in_cents,
      currency: data.currency,
      customer_email: data.customer_email,
      reference: data.reference,
      redirect_url: data.redirect_url,
    });

    return {
      transaction_id: transaction.id,
      checkout_url: transaction.checkout_url,
      reference: transaction.reference,
    };
  },

  /**
   * Simulate a successful payment (only in simulated mode)
   */
  async simulatePaymentSuccess(transactionId: string) {
    if (!SIMULATED_MODE) {
      throw new AppError('This method is only available in simulated mode', 400);
    }

    const transaction = simulatedTransactions.get(transactionId);

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    transaction.status = 'APPROVED';
    simulatedTransactions.set(transactionId, transaction);

    console.log('✅ [SIMULATED WOMPI] Payment approved:', {
      id: transactionId,
      reference: transaction.reference,
    });

    return transaction;
  },

  /**
   * Helper to check if running in simulated mode
   */
  isSimulatedMode() {
    return SIMULATED_MODE;
  },

  /**
   * Generate integrity signature for widget
   * Required when using Wompi Widget on frontend
   */
  generateIntegritySignature(reference: string, amountInCents: number, currency: string): string {
    if (SIMULATED_MODE) {
      return 'simulated_integrity_signature';
    }

    if (!env.WOMPI_INTEGRITY_SECRET) {
      throw new AppError('Wompi integrity secret is not configured', 500);
    }

    const concatenated = `${reference}${amountInCents}${currency}${env.WOMPI_INTEGRITY_SECRET}`;

    return crypto
      .createHash('sha256')
      .update(concatenated)
      .digest('hex');
  },
};
