import { motion } from 'framer-motion';
import { generateWhatsAppUrl } from '@/lib/utils';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '+573044155473';
const DEFAULT_MESSAGE = '¡Hola! Me gustaría obtener más información sobre sus productos.';

interface WhatsAppButtonProps {
  message?: string;
  className?: string;
}

export function WhatsAppButton({
  message = DEFAULT_MESSAGE,
  className,
}: WhatsAppButtonProps) {
  const whatsappUrl = generateWhatsAppUrl(WHATSAPP_NUMBER, message);

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={`fixed bottom-6 left-6 z-40 p-4 bg-[#25D366] text-white rounded-full shadow-lg hover:bg-[#22c55e] transition-colors ${className}`}
      aria-label="Contact on WhatsApp"
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-6 h-6"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>

      {/* Pulse animation */}
      <span className="absolute inset-0 rounded-full animate-ping bg-[#25D366] opacity-30" />
    </motion.a>
  );
}

// WhatsApp integration service
export const whatsappService = {
  // Generate order notification message
  generateOrderMessage(orderNumber: string, items: string[], total: number) {
    return `🛒 *Nuevo Pedido #${orderNumber}*

Productos:
${items.map((item) => `• ${item}`).join('\n')}

*Total: $${total.toFixed(2)}*

¡Gracias por tu compra!`;
  },

  // Generate support message
  generateSupportMessage(orderId: string, issue: string) {
    return `🆘 *Solicitud de Soporte*

Pedido: #${orderId}
Problema: ${issue}

Por favor, ayúdenme con este tema.`;
  },

  // Generate product inquiry message
  generateProductInquiry(productName: string, productUrl: string) {
    return `🛍️ *Consulta sobre producto*

Producto: ${productName}
Link: ${productUrl}

Me gustaría obtener más información sobre este producto.`;
  },

  // Send message via WhatsApp API (requires WhatsApp Business API setup)
  async sendMessage(to: string, message: string, templateName?: string) {
    const apiUrl = import.meta.env.VITE_WHATSAPP_API_URL;
    const apiToken = import.meta.env.VITE_WHATSAPP_API_TOKEN;

    if (!apiUrl || !apiToken) {
      console.warn('WhatsApp API not configured');
      return null;
    }

    try {
      const response = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: templateName ? 'template' : 'text',
          ...(templateName
            ? {
                template: {
                  name: templateName,
                  language: { code: 'es' },
                },
              }
            : {
                text: { body: message },
              }),
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('WhatsApp API error:', error);
      return null;
    }
  },

  // Send order confirmation
  async sendOrderConfirmation(phone: string, orderNumber: string, total: number) {
    const message = `✅ *Pedido Confirmado*

Tu pedido #${orderNumber} ha sido recibido.

Total: $${total.toFixed(2)}

Te notificaremos cuando sea enviado.

¡Gracias por comprar en WALMER!`;

    return this.sendMessage(phone, message);
  },

  // Send shipping update
  async sendShippingUpdate(phone: string, orderNumber: string, trackingUrl: string) {
    const message = `📦 *Tu pedido está en camino*

Pedido: #${orderNumber}

Rastrea tu envío aquí:
${trackingUrl}

¡Pronto llegará!`;

    return this.sendMessage(phone, message);
  },
};
