import { env } from '../config/env.js';
import { query } from '../config/database.js';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0';

// Tipos de mensajes de WhatsApp
export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  button?: { text: string; payload: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description: string };
  };
}

interface SendMessageRequest {
  to: string;
  text: string;
  previewUrl?: boolean;
}

interface SendTemplateRequest {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: any[];
}

// Servicio de WhatsApp Business API
export class WhatsAppService {
  private phoneNumberId: string;
  private accessToken: string;
  private fuyiPhone: string;

  constructor() {
    this.phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = env.WHATSAPP_ACCESS_TOKEN || '';
    this.fuyiPhone = env.FUYI_PHONE_NUMBER || '573238020198';
  }

  isConfigured(): boolean {
    return !!(this.phoneNumberId && this.accessToken);
  }

  // Enviar mensaje de texto
  async sendMessage({ to, text, previewUrl = false }: SendMessageRequest): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('[WhatsApp] Servicio no configurado. Mensaje simulado:', { to, text: text.substring(0, 100) });
      return false;
    }

    try {
      const response = await fetch(
        `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: this.formatPhoneNumber(to),
            type: 'text',
            text: { body: text, preview_url: previewUrl },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('[WhatsApp] Error enviando mensaje:', error);
        return false;
      }

      const result = await response.json() as { messages?: Array<{ id: string }> };
      console.log('[WhatsApp] Mensaje enviado:', result.messages?.[0]?.id);
      return true;
    } catch (error) {
      console.error('[WhatsApp] Error:', error);
      return false;
    }
  }

  // Enviar mensaje con botones (máximo 3 opciones)
  async sendInteractiveButtons(
    to: string,
    text: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('[WhatsApp] Botones simulados:', { to, buttons });
      return false;
    }

    if (buttons.length > 3) {
      console.warn('[WhatsApp] WhatsApp solo permite máximo 3 botones, truncando...');
      buttons = buttons.slice(0, 3);
    }

    try {
      const response = await fetch(
        `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: this.formatPhoneNumber(to),
            type: 'interactive',
            interactive: {
              type: 'button',
              body: { text },
              action: {
                buttons: buttons.map((btn) => ({
                  type: 'reply',
                  reply: { id: btn.id, title: btn.title.substring(0, 20) },
                })),
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('[WhatsApp] Error enviando botones:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[WhatsApp] Error:', error);
      return false;
    }
  }

  // Enviar lista de opciones (más de 3 opciones)
  async sendInteractiveList(
    to: string,
    text: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('[WhatsApp] Lista simulada:', { to, text, sections });
      return false;
    }

    try {
      const response = await fetch(
        `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: this.formatPhoneNumber(to),
            type: 'interactive',
            interactive: {
              type: 'list',
              body: { text },
              action: {
                button: buttonText.substring(0, 20),
                sections,
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('[WhatsApp] Error enviando lista:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[WhatsApp] Error:', error);
      return false;
    }
  }

  // Guardar conversación en la base de datos
  async saveConversation(
    phone: string,
    messages: Array<{ from: string; text: string; timestamp: Date }>
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO whatsapp_conversations (phone, messages, status, created_at, updated_at)
         VALUES ($1, $2, 'active', NOW(), NOW())
         ON CONFLICT (phone) DO UPDATE SET
           messages = $2,
           updated_at = NOW()
         RETURNING id`,
        [phone, JSON.stringify(messages)]
      );
    } catch (error) {
      console.error('[WhatsApp] Error guardando conversación:', error);
    }
  }

  // Obtener conversación activa
  async getActiveConversation(phone: string): Promise<any> {
    try {
      const result = await query(
        `SELECT * FROM whatsapp_conversations WHERE phone = $1 ORDER BY updated_at DESC LIMIT 1`,
        [phone]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('[WhatsApp] Error obteniendo conversación:', error);
      return null;
    }
  }

  // Formatear número de teléfono
  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('57') && cleaned.length === 12) {
      return cleaned;
    }
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
      return `57${cleaned}`;
    }
    return cleaned;
  }

  // Procesar mensaje entrante (webhook)
  async processIncomingMessage(message: WhatsAppMessage): Promise<void> {
    const from = message.from;
    const text = message.text?.body || message.button?.text || '';
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    console.log(`[WhatsApp] Mensaje de ${from}: ${text.substring(0, 50)}...`);

    // Extraer el texto real del mensaje (puede venir de diferentes fuentes)
    const messageText = this.extractMessageText(message);
    console.log(`[WhatsApp] Texto procesado: "${messageText}"`);
  }

  private extractMessageText(message: WhatsAppMessage): string {
    // Texto normal
    if (message.text?.body) {
      return message.text.body;
    }
    // Botones
    if (message.button?.text) {
      return message.button.text;
    }
    // Respuesta de botón interactivo
    if (message.interactive?.button_reply?.title) {
      return message.interactive.button_reply.title;
    }
    // Respuesta de lista interactiva
    if (message.interactive?.list_reply?.title) {
      return message.interactive.list_reply.title;
    }
    // ID del botón/lista
    if (message.interactive?.button_reply?.id) {
      return message.interactive.button_reply.id;
    }
    if (message.interactive?.list_reply?.id) {
      return message.interactive.list_reply.id;
    }
    return '';
  }
}

export const whatsappService = new WhatsAppService();
