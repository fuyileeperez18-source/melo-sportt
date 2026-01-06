import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

// Initialize Mercado Pago client
const client = env.MERCADOPAGO_ACCESS_TOKEN
  ? new MercadoPagoConfig({
      accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
      options: {
        timeout: 5000,
      }
    })
  : null;

// Simulated mode flag
const SIMULATED_MODE = !env.MERCADOPAGO_ACCESS_TOKEN;

// In-memory storage for simulated payments
const simulatedPreferences = new Map<string, {
  id: string;
  init_point: string;
  status: string;
  items: any[];
  payer: any;
  back_urls: any;
  metadata: any;
  created_at: number;
}>();

const simulatedPayments = new Map<string, {
  id: string;
  status: string;
  status_detail: string;
  payment_type_id: string;
  payment_method_id: string;
  transaction_amount: number;
  currency_id: string;
  metadata: any;
  created_at: number;
}>();

// Helper to generate fake IDs
const generateFakeId = (prefix: string) =>
  `${prefix}_simulated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export interface CreatePreferenceData {
  items: Array<{
    id?: string;
    title: string;
    description?: string;
    quantity: number;
    unit_price: number;
    currency_id?: string;
  }>;
  payer?: {
    name?: string;
    surname?: string;
    email?: string;
    phone?: {
      area_code?: string;
      number?: string;
    };
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return?: 'approved' | 'all';
  payment_methods?: {
    excluded_payment_methods?: Array<{ id: string }>;
    excluded_payment_types?: Array<{ id: string }>;
    installments?: number;
  };
  notification_url?: string;
  external_reference?: string;
  metadata?: Record<string, any>;
  // Split Payment / Marketplace configuration
  marketplace?: string;
  marketplace_fee?: number;
  application_fee?: number;
  collector_id?: string;
}

export const mercadopagoService = {
  /**
   * Calculate marketplace commission/fee
   * @param totalAmount Total transaction amount
   * @param commissionRate Commission rate as percentage (e.g., 10 for 10%)
   * @returns Commission amount
   */
  calculateMarketplaceFee(totalAmount: number, commissionRate: number): number {
    return Math.round(totalAmount * (commissionRate / 100));
  },

  /**
   * Create a payment preference with optional split payment support
   * This generates a checkout link where the user can pay
   *
   * @param data Preference data
   * @param sellerAccessToken Optional access token from the seller (required for Split)
   */
  async createPreference(data: CreatePreferenceData, sellerAccessToken?: string) {
    // SIMULATED MODE - for testing without real Mercado Pago
    if (SIMULATED_MODE) {
      console.log('🧪 [SIMULATED MERCADOPAGO] Creating preference:', data);

      const preferenceId = generateFakeId('pref');
      const initPoint = `https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=${preferenceId}`;

      const preference = {
        id: preferenceId,
        init_point: initPoint,
        sandbox_init_point: initPoint,
        status: 'active',
        items: data.items,
        payer: data.payer || {},
        back_urls: data.back_urls || {},
        metadata: data.metadata || {},
        created_at: Date.now(),
      };

      simulatedPreferences.set(preferenceId, preference);

      console.log('✅ [SIMULATED MERCADOPAGO] Preference created:', {
        id: preferenceId,
        init_point: initPoint,
      });

      return {
        id: preferenceId,
        init_point: initPoint,
        sandbox_init_point: initPoint,
      };
    }

    // REAL MODE - using actual Mercado Pago
    // If sellerAccessToken is provided, we use it. Otherwise we fallback to the marketplace token.
    const effectiveToken = sellerAccessToken || env.MERCADOPAGO_ACCESS_TOKEN;

    if (!effectiveToken) {
      throw new AppError('Mercado Pago is not configured. Missing access token.', 500);
    }

    // Initialize client for this specific request if using a different token
    const requestClient = sellerAccessToken
      ? new MercadoPagoConfig({ accessToken: sellerAccessToken, options: { timeout: 5000 } })
      : client;

    if (!requestClient) {
      throw new AppError('Mercado Pago client initialization failed', 500);
    }

    try {
      const preference = new Preference(requestClient);

      const preferenceBody: any = {
        items: data.items.map(item => ({
          id: item.id || `item_${Date.now()}`,
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: item.currency_id || 'COP',
        })),
        payer: data.payer,
        back_urls: data.back_urls,
        auto_return: data.auto_return,
        payment_methods: data.payment_methods,
        notification_url: data.notification_url,
        external_reference: data.external_reference,
        metadata: data.metadata,
      };

      // Add marketplace/split payment configuration if provided
      // NOTE: marketplace is the platform ID in some contexts,
      // but "application_fee" is the key for Split Payments.
      if (data.marketplace) {
        preferenceBody.marketplace = data.marketplace;
      }

      // Calculate 10% automatically if not provided but requested
      const totalAmount = data.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const feePercentage = parseInt(env.MERCADOPAGO_MARKETPLACE_FEE_PERCENTAGE || '10');

      if (data.application_fee) {
        preferenceBody.application_fee = data.application_fee;
      } else if (sellerAccessToken) {
        // Only apply automatic split if we are charging on behalf of a seller
        preferenceBody.application_fee = this.calculateMarketplaceFee(totalAmount, feePercentage);
      }

      const response = await preference.create({
        body: preferenceBody
      });

      return {
        id: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
        application_fee: preferenceBody.application_fee,
        seller_amount: totalAmount - (preferenceBody.application_fee || 0)
      };
    } catch (error: any) {
      console.error('Mercado Pago API Error:', error.response?.data || error);
      throw new AppError(
        `Failed to create payment preference: ${error.message}`,
        500
      );
    }
  },

  /**
   * Get payment information
   */
  async getPayment(paymentId: string) {
    // SIMULATED MODE
    if (SIMULATED_MODE) {
      console.log('🧪 [SIMULATED MERCADOPAGO] Getting payment:', paymentId);

      const payment = simulatedPayments.get(paymentId);

      if (!payment) {
        // Auto-create a successful payment for testing
        const newPayment = {
          id: paymentId,
          status: 'approved',
          status_detail: 'accredited',
          payment_type_id: 'credit_card',
          payment_method_id: 'visa',
          transaction_amount: 100000,
          currency_id: 'COP',
          metadata: {},
          created_at: Date.now(),
        };
        simulatedPayments.set(paymentId, newPayment);
        return newPayment;
      }

      return payment;
    }

    // REAL MODE
    if (!client) {
      throw new AppError('Mercado Pago is not configured', 500);
    }

    try {
      const payment = new Payment(client);
      const response = await payment.get({ id: paymentId });

      return {
        id: response.id,
        status: response.status,
        status_detail: response.status_detail,
        payment_type_id: response.payment_type_id,
        payment_method_id: response.payment_method_id,
        transaction_amount: response.transaction_amount,
        currency_id: response.currency_id,
        metadata: response.metadata,
      };
    } catch (error: any) {
      console.error('Mercado Pago API Error:', error);
      throw new AppError(
        `Failed to get payment: ${error.message}`,
        500
      );
    }
  },

  /**
   * Simulate a successful payment (only in simulated mode)
   */
  async simulatePaymentSuccess(preferenceId: string, amount: number) {
    if (!SIMULATED_MODE) {
      throw new AppError('This method is only available in simulated mode', 400);
    }

    const paymentId = generateFakeId('pay');
    const payment = {
      id: paymentId,
      status: 'approved',
      status_detail: 'accredited',
      payment_type_id: 'credit_card',
      payment_method_id: 'visa',
      transaction_amount: amount,
      currency_id: 'COP',
      metadata: { preference_id: preferenceId },
      created_at: Date.now(),
    };

    simulatedPayments.set(paymentId, payment);

    console.log('✅ [SIMULATED MERCADOPAGO] Payment approved:', {
      id: paymentId,
      amount,
    });

    return payment;
  },

  /**
   * Process webhook notification from Mercado Pago
   */
  async processWebhook(paymentId: string, topic: string) {
    if (topic !== 'payment') {
      console.log('Ignoring non-payment webhook:', topic);
      return null;
    }

    const payment = await this.getPayment(paymentId);

    // Logic to sync with database will be handled in the route/controller
    // but we return the payment data for downstream processing
    return payment;
  },

  /**
   * Helper to check if running in simulated mode
   */
  isSimulatedMode() {
    return SIMULATED_MODE;
  },

  /**
   * Get preference by ID (mainly for testing)
   */
  async getPreference(preferenceId: string) {
    if (SIMULATED_MODE) {
      return simulatedPreferences.get(preferenceId) || null;
    }

    if (!client) {
      throw new AppError('Mercado Pago is not configured', 500);
    }

    try {
      const preference = new Preference(client);
      const response = await preference.get({ preferenceId });
      return response;
    } catch (error: any) {
      console.error('Mercado Pago API Error:', error);
      throw new AppError(
        `Failed to get preference: ${error.message}`,
        500
      );
    }
  },
};
