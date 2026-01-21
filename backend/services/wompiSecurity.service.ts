import { wompiService } from './wompi.service';

export const wompiSecurity = {
  async getAcceptanceTokens() {
    const token = await wompiService.getAcceptanceToken();
    return {
      acceptance_token: token.acceptance_token,
      permalink: token.permalink,
      type: token.type,
    };
  },

  generateIntegritySignature(reference: string, amountInCents: number, currency: string) {
    return wompiService.generateIntegritySignature(reference, amountInCents, currency);
  },

  validateWebhookSignature(signature: string, eventData: any) {
    try {
      // El timestamp viene en el body del evento de Wompi
      const timestamp = eventData?.timestamp;

      if (!timestamp) {
        console.error('❌ Missing timestamp in webhook event data');
        return false;
      }

      return wompiService.verifyEventSignature(signature, String(timestamp), eventData);
    } catch (error) {
      console.error('❌ Error validating webhook signature:', error);
      return false;
    }
  },
} as const;

export default wompiSecurity;
