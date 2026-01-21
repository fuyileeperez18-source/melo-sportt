import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { whatsappService, WhatsAppMessage } from '../services/whatsapp.service.js';
import { whatsappBotService } from '../services/whatsapp-bot.service.js';

const router = Router();

// ============================================
// WEBHOOK DE WHATSAPP
// ============================================

// Verificación del webhook (GET)
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query.mode;
  const token = req.query.token;
  const challenge = req.query.challenge;

  if (mode === 'subscribe' && token === env.WHATSAPP_WEBHOOK_TOKEN) {
    console.log('[WhatsApp] Webhook verificado exitosamente');
    res.status(200).send(challenge);
  } else {
    console.error('[WhatsApp] Error en verificación de webhook');
    res.status(403).send('Forbidden');
  }
});

// Recepción de mensajes (POST)
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const value = change.value;

            // Procesar mensajes
            if (value.messages) {
              for (const message of value.messages) {
                console.log(`[WhatsApp] Mensaje recibido de ${message.from}, tipo: ${message.type}`);

                // Extraer texto según el tipo de mensaje
                const messageData = extractMessageData(message);
                console.log(`[WhatsApp] Texto extraído: "${messageData.text}"`);

                // Verificar que no sea mensaje del bot y procesar
                if (message.type === 'text' || message.type === 'button' || message.type === 'interactive') {
                  await whatsappBotService.processMessage(messageData);
                }
              }
            }

            // Procesar estados de entrega
            if (value.statuses) {
              for (const status of value.statuses) {
                console.log(`[WhatsApp] Mensaje ${status.id} - Estado: ${status.status}`);
              }
            }
          }
        }
      }
    }

    // Responder rápidamente a Meta
    res.status(200).send({ success: true });
  } catch (error) {
    console.error('[WhatsApp] Error procesando webhook:', error);
    res.status(500).send({ success: false, error: 'Internal server error' });
  }
});

// ============================================
// UTILIDADES
// ============================================

function extractMessageData(message: any): WhatsAppMessage {
  // Construir objeto de mensaje procesado
  const messageData: WhatsAppMessage = {
    from: message.from,
    id: message.id,
    timestamp: message.timestamp,
    type: message.type,
  };

  // Extraer texto según el tipo
  if (message.type === 'text') {
    messageData.text = message.text;
  } else if (message.type === 'button') {
    messageData.button = message.button;
  } else if (message.type === 'interactive') {
    messageData.interactive = message.interactive;

    // Si es una respuesta de botón o lista, usar el ID como texto
    if (message.interactive.button_reply) {
      messageData.text = { body: message.interactive.button_reply.id || message.interactive.button_reply.title };
    } else if (message.interactive.list_reply) {
      messageData.text = { body: message.interactive.list_reply.id || message.interactive.list_reply.title };
    }
  }

  return messageData;
}

// ============================================
// ENDPOINTS ADMINISTRATIVOS
// ============================================

// Enviar mensaje manual
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { to, text } = req.body;

    if (!to || !text) {
      return res.status(400).json({ success: false, error: 'Missing to or text' });
    }

    const success = await whatsappService.sendMessage({ to, text });

    res.json({ success, to, text });
  } catch (error) {
    console.error('[WhatsApp] Error enviando mensaje:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Ver métricas del bot
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const metrics = whatsappBotService.getMetrics();
    const conversations = whatsappBotService.getAllActiveConversations();

    res.json({
      success: true,
      metrics,
      activeConversations: conversations.map(c => ({
        phone: c.phone,
        name: c.customerName,
        state: c.state,
        cartSize: c.cart.length,
        style: c.style,
      })),
    });
  } catch (error) {
    console.error('[WhatsApp] Error obteniendo métricas:', error);
    res.status(500).json({ success: false, error: 'Failed to get metrics' });
  }
});

// Ver catálogo del bot
router.get('/catalog', (req: Request, res: Response) => {
  try {
    const catalog = whatsappBotService.getCatalog();
    res.json({
      success: true,
      count: catalog.length,
      products: catalog,
    });
  } catch (error) {
    console.error('[WhatsApp] Error obteniendo catálogo:', error);
    res.status(500).json({ success: false, error: 'Failed to get catalog' });
  }
});

// Ver estado de conversación
router.get('/conversation/:phone', (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const conversation = whatsappBotService.getConversationState(phone);

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    res.json({
      success: true,
      conversation: {
        phone: conversation.phone,
        name: conversation.customerName,
        state: conversation.state,
        style: conversation.style,
        budget: conversation.budget,
        cart: conversation.cart,
        cartTotal: conversation.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        messageCount: conversation.messages.length,
      },
    });
  } catch (error) {
    console.error('[WhatsApp] Error obteniendo conversación:', error);
    res.status(500).json({ success: false, error: 'Failed to get conversation' });
  }
});

// ============================================
// ENDPOINTS DE PEDIDOS
// ============================================

// Ver todos los pedidos del bot
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { query } = await import('../config/database.js');
    const result = await query(`
      SELECT * FROM whatsapp_orders
      ORDER BY created_at DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      count: result.rows.length,
      orders: result.rows,
    });
  } catch (error) {
    console.error('[WhatsApp] Error obteniendo pedidos:', error);
    res.status(500).json({ success: false, error: 'Failed to get orders' });
  }
});

// Ver un pedido específico
router.get('/orders/:orderNumber', async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const { query } = await import('../config/database.js');

    const result = await query(
      `SELECT * FROM whatsapp_orders WHERE order_number = $1`,
      [orderNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({
      success: true,
      order: result.rows[0],
    });
  } catch (error) {
    console.error('[WhatsApp] Error obteniendo pedido:', error);
    res.status(500).json({ success: false, error: 'Failed to get order' });
  }
});

// Actualizar estado de un pedido
router.patch('/orders/:orderNumber/status', async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const { status } = req.body;

    if (!['pending', 'contacted', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const { query } = await import('../config/database.js');
    const result = await query(
      `UPDATE whatsapp_orders SET status = $1, updated_at = NOW() WHERE order_number = $2 RETURNING *`,
      [status, orderNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({
      success: true,
      order: result.rows[0],
    });
  } catch (error) {
    console.error('[WhatsApp] Error actualizando pedido:', error);
    res.status(500).json({ success: false, error: 'Failed to update order' });
  }
});

// ============================================
// ESTADO DEL SERVICIO
// ============================================

router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    configured: whatsappService.isConfigured(),
    service: 'WhatsApp Business API + Bot Inteligente',
    version: '2.0.0',
    features: [
      'Catálogo de productos desde BD',
      'Búsqueda inteligente de productos',
      'Carrito de compras',
      'Cálculo automático de comisiones',
      'Notificaciones a intermediario y dueño',
    ],
  });
});

export default router;
