import { whatsappService, WhatsAppMessage } from './whatsapp.service.js';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

// ============================================
// TIPOS E INTERFACES
// ============================================

// Estados del bot
enum BotState {
  GREETING = 'greeting',
  ASK_NAME = 'ask_name',
  ASK_STYLE = 'ask_style',
  ASK_CATALOG = 'ask_catalog',
  BROWSE_CATALOG = 'browse_catalog',
  ASK_PRODUCTS = 'ask_products',
  ASK_BUDGET = 'ask_budget',
  ASK_QUANTITIES = 'ask_quantities',
  CONFIRM_ORDER = 'confirm_order',
  ORDER_CONFIRMED = 'order_confirmed',
  ESCALATE = 'escalate',
  CLOSED = 'closed',
}

// Producto del catálogo
interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  category?: string;
  sizes?: string[];
  colors?: string[];
  description?: string;
}

// Item en el carrito del bot
interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  notes?: string;
}

// Conversación del cliente
interface BotConversation {
  phone: string;
  state: BotState;
  customerName: string;
  style: 'urbano' | 'clasico' | null;
  budget: string;
  cart: CartItem[];
  messages: Array<{ role: 'bot' | 'customer'; text: string; timestamp: Date }>;
  escalatedAt?: Date;
  closedAt?: Date;
  lastActivity?: Date;
}

// ============================================
// SERVICIO DEL BOT DE WHATSAPP
// ============================================

class WhatsAppBotService {
  private conversations: Map<string, BotConversation> = new Map();
  private catalog: CatalogProduct[] = [];
  private readonly CONVERSATION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
  private readonly COMMISSION_PERCENTAGE = parseFloat(env.INTERMEDIARY_COMMISSION_PERCENTAGE) || 10;

  constructor() {
    // Cargar catálogo al iniciar
    this.loadCatalog();
    // Cargar conversaciones activas
    this.loadActiveConversations();
    // Limpiar conversaciones inactivas periódicamente
    setInterval(() => this.cleanupInactiveConversations(), 10 * 60 * 1000);
    // Recargar catálogo cada 5 minutos
    setInterval(() => this.loadCatalog(), 5 * 60 * 1000);
  }

  // ========================================
  // CATÁLOGO DE PRODUCTOS
  // ========================================

  private async loadCatalog(): Promise<void> {
    try {
      const result = await query(`
        SELECT
          p.id,
          p.name,
          p.price,
          p.description,
          p.sizes,
          p.colors,
          c.name as category,
          (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image_url
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 100
      `);

      this.catalog = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        description: row.description,
        category: row.category,
        sizes: row.sizes || [],
        colors: row.colors || [],
        image_url: row.image_url,
      }));

      console.log(`[Bot] Catálogo cargado: ${this.catalog.length} productos`);
    } catch (error) {
      console.error('[Bot] Error cargando catálogo:', error);
    }
  }

  getCatalog(): CatalogProduct[] {
    return this.catalog;
  }

  searchProducts(queryText: string): CatalogProduct[] {
    const q = queryText.toLowerCase();
    return this.catalog.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    ).slice(0, 10);
  }

  // ========================================
  // PROCESAMIENTO DE MENSAJES
  // ========================================

  async processMessage(message: WhatsAppMessage): Promise<void> {
    const phone = message.from;
    const text = message.text?.body || message.button?.text || '';
    const timestamp = new Date();

    // Obtener o crear conversación
    let conversation = this.conversations.get(phone);
    if (!conversation) {
      const newConversation = await this.createConversation(phone);
      if (newConversation) {
        conversation = newConversation;
      } else {
        return;
      }
    }

    // Guardar mensaje del cliente
    conversation.messages.push({ role: 'customer', text, timestamp });
    conversation.lastActivity = timestamp;

    // Procesar según el estado
    await this.handleState(conversation, text, message);
  }

  private async createConversation(phone: string): Promise<BotConversation | null> {
    try {
      // Verificar si existe en BD
      const existing = await this.getConversationFromDB(phone);
      if (existing && ['escalated', 'closed'].includes(existing.status)) {
        return null;
      }

      const newConversation: BotConversation = {
        phone,
        state: BotState.GREETING,
        customerName: '',
        style: null,
        budget: '',
        cart: [],
        messages: [],
      };

      this.conversations.set(phone, newConversation);
      await this.sendGreeting(newConversation);

      return newConversation;
    } catch (error) {
      console.error('[Bot] Error creando conversación:', error);
      return null;
    }
  }

  // ========================================
  // SALUDOS Y FLUJO PRINCIPAL
  // ========================================

  private async sendGreeting(conversation: BotConversation): Promise<void> {
    const greeting = `🏃‍♂️💨 *¡Hola! Bienvenido a Melo Sportt* 🏃‍♂️

Somos tu tienda de ropa urbana y clásica de la mejor calidad en Cartagena.

🤖 *Soy tu asistente virtual inteligente* y te voy a ayudar a encontrar exactamente lo que buscas.

*¿Cómo te llamas?* 😊`;

    await whatsappService.sendMessage({
      to: conversation.phone,
      text: greeting,
    });

    conversation.messages.push({
      role: 'bot',
      text: greeting,
      timestamp: new Date(),
    });

    conversation.state = BotState.ASK_NAME;
    await this.saveConversation(conversation);
  }

  // ========================================
  // MANEJO DE ESTADOS
  // ========================================

  private async handleState(conversation: BotConversation, input: string, message?: WhatsAppMessage): Promise<void> {
    switch (conversation.state) {
      case BotState.ASK_NAME:
        await this.handleAskName(conversation, input);
        break;
      case BotState.ASK_STYLE:
        await this.handleAskStyle(conversation, input);
        break;
      case BotState.ASK_CATALOG:
        await this.handleAskCatalog(conversation, input);
        break;
      case BotState.BROWSE_CATALOG:
        await this.handleBrowseCatalog(conversation, input);
        break;
      case BotState.ASK_PRODUCTS:
        await this.handleAskProducts(conversation, input);
        break;
      case BotState.ASK_BUDGET:
        await this.handleAskBudget(conversation, input);
        break;
      case BotState.ASK_QUANTITIES:
        await this.handleAskQuantities(conversation, input);
        break;
      case BotState.CONFIRM_ORDER:
        await this.handleConfirmOrder(conversation, input);
        break;
      case BotState.ORDER_CONFIRMED:
      case BotState.ESCALATE:
      case BotState.CLOSED:
        break;
    }
  }

  private async handleAskName(conversation: BotConversation, name: string): Promise<void> {
    conversation.customerName = name.trim();

    const response = `¡Mucho gusto, *${name.trim()}*! 👋

Ahora, cuéntanos, ¿qué tipo de estilo buscas?

🏙️ *Urbano* - Para un look moderno y fresco
👔 *Clásico* - Elegancia atemporal`;

    await whatsappService.sendInteractiveButtons(
      conversation.phone,
      response,
      [
        { id: 'style_urbano', title: '🏙️ Urbano' },
        { id: 'style_clasico', title: '👔 Clásico' },
      ]
    );

    conversation.state = BotState.ASK_STYLE;
    await this.saveConversation(conversation);
  }

  private async handleAskStyle(conversation: BotConversation, input: string): Promise<void> {
    const isUrbano = input.toLowerCase().includes('urbano') || input.includes('1');
    const isClasico = input.toLowerCase().includes('clásico') || input.toLowerCase().includes('clasico') || input.includes('2');

    if (!isUrbano && !isClasico) {
      await whatsappService.sendMessage({
        to: conversation.phone,
        text: 'Por favor selecciona una opción:\n1. Urbano\n2. Clásico',
      });
      return;
    }

    conversation.style = isUrbano ? 'urbano' : 'clasico';
    const styleName = conversation.style === 'urbano' ? 'urbano' : 'clásico';

    const response = `¡Excelente! 🎯 Estilo *${styleName}* seleccionado.

📱 *¿Cómo quieres ver nuestros productos?*

🔗 *Ver catálogo completo online* - Navega en nuestra página web
🛒 *Ver aquí mismo* - Te muestro algunos productos destacados`;

    await whatsappService.sendInteractiveButtons(
      conversation.phone,
      response,
      [
        { id: 'catalog_online', title: '🔗 Ver catálogo online' },
        { id: 'catalog_here', title: '🛒 Ver aquí mismo' },
      ]
    );

    conversation.state = BotState.ASK_CATALOG;
    await this.saveConversation(conversation);
  }

  private async handleAskCatalog(conversation: BotConversation, input: string): Promise<void> {
    const wantsOnline = input.toLowerCase().includes('online') || input.toLowerCase().includes('web') || input.includes('1');

    if (wantsOnline) {
      const catalogMessage = `📱 *Aquí está nuestro catálogo online:*\n\n🔗 https://goomelooskin.vercel.app/products\n\nPuedes filtrar por:\n• Estilo: Urbano 🏙️ / Clásico 👔\n• Tipo: Camisetas, Buzos, Pantalonetas...\n• Género: Hombre / Mujer\n\nCuando Encuentres algo que te guste, vuelve aquí y me dices qué quieres comprar. 💪`;

      await whatsappService.sendMessage({
        to: conversation.phone,
        text: catalogMessage,
        previewUrl: true,
      });

      conversation.state = BotState.ASK_PRODUCTS;
    } else {
      // Mostrar productos destacados aquí mismo
      await this.showFeaturedProducts(conversation);
    }

    await this.saveConversation(conversation);
  }

  private async showFeaturedProducts(conversation: BotConversation): Promise<void> {
    // Filtrar por estilo si está definido
    const products = conversation.style
      ? this.catalog.filter(p => {
          const desc = (p.description || '').toLowerCase();
          return desc.includes(conversation.style!);
        }).slice(0, 8)
      : this.catalog.slice(0, 8);

    if (products.length === 0) {
      await whatsappService.sendMessage({
        to: conversation.phone,
        text: `📦 *Nuestros productos disponibles:*\n\n${this.catalog.slice(0, 10).map((p, i) => `${i + 1}. ${p.name} - $${this.formatPrice(p.price)}`).join('\n')}\n\n*¿Cuál te interesa?* Escribe el número o el nombre.`,
      });
      conversation.state = BotState.ASK_PRODUCTS;
      return;
    }

    // Enviar productos como lista interactiva
    const sections = [
      {
        title: '🏆 Productos destacados',
        rows: products.map((p, i) => ({
          id: `product_${p.id}`,
          title: `${p.name}`,
          description: `$${this.formatPrice(p.price)}`,
        })),
      },
    ];

    await whatsappService.sendInteractiveList(
      conversation.phone,
      `📦 *Nuestros productos (${products.length}):*\n\nSelecciona uno para ver detalles o escribe lo que buscas.`,
      'Ver productos',
      sections
    );

    conversation.state = BotState.BROWSE_CATALOG;
  }

  private async handleBrowseCatalog(conversation: BotConversation, input: string): Promise<void> {
    // Si seleccionó un producto de la lista
    if (input.startsWith('product_')) {
      const productId = input.replace('product_', '');
      const product = this.catalog.find(p => p.id === productId);

      if (product) {
        const sizeInfo = product.sizes?.length ? `\n📏 Tallas: ${product.sizes.join(', ')}` : '';
        const colorInfo = product.colors?.length ? `\n🎨 Colores: ${product.colors.join(', ')}` : '';

        const details = `🛍️ *${product.name}*\n\n💰 *Precio:* $${this.formatPrice(product.price)}${sizeInfo}${colorInfo}\n\n${product.description || 'Producto de alta calidad.'}\n\n*¿Cuántas unidades quieres?* (escribe un número o "1" para默认)`;

        await whatsappService.sendMessage({
          to: conversation.phone,
          text: details,
        });

        // Guardar producto seleccionado temporalmente en el mensaje
        conversation.messages[conversation.messages.length - 1].text = `${input}: ${product.name}`;
        conversation.state = BotState.ASK_QUANTITIES;

        await this.saveConversation(conversation);
        return;
      }
    }

    // Buscar productos por nombre
    const searchResults = this.searchProducts(input);

    if (searchResults.length > 0) {
      const productsList = searchResults.map((p, i) =>
        `${i + 1}. *${p.name}* - $${this.formatPrice(p.price)}`
      ).join('\n');

      await whatsappService.sendMessage({
        to: conversation.phone,
        text: `🔍 *Resultados para "${input}":*\n\n${productsList}\n\n*¿Cuál te interesa?* Escribe el número o nombre.`,
      });
    } else {
      await whatsappService.sendMessage({
        to: conversation.phone,
        text: `No encontré "${input}". 🤔\n\n📦 *Nuestro catálogo:*\n${this.catalog.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} - $${this.formatPrice(p.price)}`).join('\n')}\n\n*¿Cuál te interesa?*`,
      });
    }
  }

  private async handleAskProducts(conversation: BotConversation, input: string): Promise<void> {
    // Buscar productos
    const searchResults = this.searchProducts(input);

    if (searchResults.length > 0) {
      const productsList = searchResults.map((p, i) =>
        `${i + 1}. *${p.name}* - $${this.formatPrice(p.price)}`
      ).join('\n');

      await whatsappService.sendMessage({
        to: conversation.phone,
        text: `🔍 *Encontré esto para "${input}":*\n\n${productsList}\n\n*¿Cuál te interesa y cuántas unidades?*\nEjemplo: "Quiero el #1, 2 unidades" o "el tercero"`,
      });

      conversation.state = BotState.ASK_QUANTITIES;
    } else {
      await whatsappService.sendMessage({
        to: conversation.phone,
        text: `🤔 No encontré "${input}".\n\n💡 *Nuestros productos más populares:*\n${this.catalog.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} - $${this.formatPrice(p.price)}`).join('\n')}\n\n*¿Cuál te interesa?*`,
      });
    }
  }

  private async handleAskQuantities(conversation: BotConversation, input: string): Promise<void> {
    // Extraer cantidad del mensaje
    const quantityMatch = input.match(/(\d+)/);
    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

    // Intentar encontrar el último producto mencionado
    const lastMessage = conversation.messages[conversation.messages.length - 2]?.text || '';
    let productName = '';

    if (lastMessage.includes('product_')) {
      const productId = lastMessage.split('_')[1];
      const product = this.catalog.find(p => p.id === productId);
      if (product) productName = product.name;
    } else {
      // Buscar en el mensaje actual
      const words = input.split(' ');
      for (const word of words) {
        const product = this.catalog.find(p =>
          p.name.toLowerCase().includes(word.toLowerCase())
        );
        if (product) {
          productName = product.name;
          break;
        }
      }
    }

    if (productName) {
      // Agregar al carrito
      const existingItem = conversation.cart.find(
        item => item.name.toLowerCase().includes(productName.toLowerCase())
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        const product = this.catalog.find(p =>
          p.name.toLowerCase().includes(productName.toLowerCase())
        );
        conversation.cart.push({
          product_id: product?.id || '',
          name: productName,
          price: product?.price || 0,
          quantity,
        });
      }

      await this.confirmAddToCart(conversation, productName, quantity);
    } else {
      await whatsappService.sendMessage({
        to: conversation.phone,
        text: `🤔 No entendí qué producto quieres.\n\n💡 *Nuestros productos:*\n${this.catalog.slice(0, 5).map((p, i) => `${i + 1}. ${p.name}`).join('\n')}\n\n*¿Cuál quieres?*`,
      });
    }
  }

  private async confirmAddToCart(conversation: BotConversation, productName: string, quantity: number): Promise<void> {
    const cartTotal = this.calculateCartTotal(conversation.cart);
    const commission = cartTotal * (this.COMMISSION_PERCENTAGE / 100);
    const ownerTotal = cartTotal - commission;

    const response = `✅ *¡Agregado al carrito!*\n\n🛒 *${quantity}x ${productName}*\n\n📦 *Tu carrito actual:*\n${this.formatCart(conversation.cart)}\n\n💵 *Subtotal:* $${this.formatPrice(cartTotal)}\n\n*¿Algo más?* Responde:\n• "Sí" o "agregar más" - para seguir comprando\n• "No" o "continuar" - para ver resumen y finalize`;

    await whatsappService.sendInteractiveButtons(
      conversation.phone,
      response,
      [
        { id: 'cart_add_more', title: '✅ Sí, agregar más' },
        { id: 'cart_confirm', title: '📋 No, ver resumen' },
      ]
    );

    conversation.state = BotState.CONFIRM_ORDER;
    await this.saveConversation(conversation);
  }

  private async handleAskBudget(conversation: BotConversation, input: string): Promise<void> {
    conversation.budget = input.trim();
    await this.confirmOrder(conversation);
  }

  private async handleConfirmOrder(conversation: BotConversation, input: string): Promise<void> {
    const wantsMore = input.toLowerCase().includes('sí') ||
                      input.toLowerCase().includes('si') ||
                      input.toLowerCase().includes('yes') ||
                      input.toLowerCase().includes('agregar') ||
                      input.toLowerCase().includes('más') ||
                      input === '1';

    if (wantsMore) {
      await whatsappService.sendMessage({
        to: conversation.phone,
        text: 'Perfecto, ¿qué más te interesa?\n\nPuedes:\n• Escribir el nombre de un producto\n• Decir "ver catálogo" para ver más opciones',
      });
      conversation.state = BotState.ASK_PRODUCTS;
      await this.saveConversation(conversation);
    } else {
      await this.confirmOrder(conversation);
    }
  }

  private async confirmOrder(conversation: BotConversation): Promise<void> {
    const cartTotal = this.calculateCartTotal(conversation.cart);
    const commission = cartTotal * (this.COMMISSION_PERCENTAGE / 100);
    const ownerTotal = cartTotal - commission;

    const response = `📋 *RESUMEN DE TU PEDIDO*

*Cliente:* ${conversation.customerName}
*Estilo:* ${conversation.style || 'No especificado'}
*Presupuesto:* ${conversation.budget || 'A confirmar'}

🛒 *Productos:*
${this.formatCart(conversation.cart)}

💰 *RESUMEN FINANCIERO:*
─────────────────
Subtotal: $${this.formatPrice(cartTotal)}
Comisión (${this.COMMISSION_PERCENTAGE}%): -$${this.formatPrice(commission)}
─────────────────
💵 *Para el tienda:* $${this.formatPrice(ownerTotal)}

─────────────────

*¿Confirmas este pedido?* ✅

Responde "Sí" o "confirmar" para enviar a procesar.`;

    await whatsappService.sendInteractiveButtons(
      conversation.phone,
      response,
      [
        { id: 'order_confirm', title: '✅ Sí, confirmar pedido' },
        { id: 'order_edit', title: '✏️ Editar pedido' },
      ]
    );

    conversation.state = BotState.ORDER_CONFIRMED;
    await this.saveConversation(conversation);
  }

  // ========================================
  // FINALIZAR PEDIDO Y NOTIFICACIONES
  // ========================================

  async confirmAndFinishOrder(conversation: BotConversation): Promise<void> {
    try {
      // Calcular totales
      const cartTotal = this.calculateCartTotal(conversation.cart);
      const commission = cartTotal * (this.COMMISSION_PERCENTAGE / 100);
      const ownerTotal = cartTotal - commission;

      // Generar número de orden
      const orderResult = await query('SELECT generate_whatsapp_order_number() as order_number');
      const orderNumber = orderResult.rows[0].order_number;

      // Guardar pedido en la base de datos
      const savedOrder = await query(`
        INSERT INTO whatsapp_orders (
          order_number, customer_phone, customer_name, items,
          subtotal, commission_percentage, commission_amount, final_total,
          style, budget, status, notified_to_fuyi, notified_to_owner,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', false, false, NOW(), NOW())
        RETURNING id
      `, [
        orderNumber,
        conversation.phone,
        conversation.customerName,
        JSON.stringify(conversation.cart),
        cartTotal,
        this.COMMISSION_PERCENTAGE,
        commission,
        ownerTotal,
        conversation.style,
        conversation.budget,
      ]);

      const orderId = savedOrder.rows[0].id;

      // Actualizar conversación con referencia al pedido
      await query(
        `UPDATE whatsapp_conversations SET whatsapp_order_id = $1, status = 'escalated', escalated_at = NOW() WHERE phone = $2`,
        [orderId, conversation.phone]
      );

      // Enviar resumen a Fuyi (tú)
      await this.sendSummaryToFuyi(conversation, orderNumber, cartTotal, commission, ownerTotal);

      // Enviar notificación al dueño del local
      await this.sendNotificationToOwner(conversation, orderNumber, cartTotal, commission, ownerTotal);

      // Confirmar al cliente
      await this.confirmToCustomer(conversation, orderNumber);

      // Marcar conversación como cerrada
      conversation.state = BotState.CLOSED;
      conversation.closedAt = new Date();
      await this.saveConversation(conversation);
      await this.saveConversationToDB(conversation);

      console.log(`[Bot] Pedido ${orderNumber} confirmado para ${conversation.phone}`);
    } catch (error) {
      console.error('[Bot] Error confirmando pedido:', error);
    }
  }

  private async sendSummaryToFuyi(
    conversation: BotConversation,
    orderNumber: string,
    subtotal: number,
    commission: number,
    ownerTotal: number
  ): Promise<void> {
    const productsList = conversation.cart.map(item =>
      `• ${item.quantity}x ${item.name} - $${this.formatPrice(item.price * item.quantity)}`
    ).join('\n');

    const summary = `🛒 *NUEVO PEDIDO #${orderNumber}*

━━━━━━━━━━━━━━━━━━━━
👤 *CLIENTE:*
• Nombre: ${conversation.customerName}
• Teléfono: ${this.formatPhoneNumber(conversation.phone)}
• Estilo: ${conversation.style || 'No especificado'}
• Presupuesto: ${conversation.budget || 'A confirmar'}
━━━━━━━━━━━━━━━━━━━━

📦 *PRODUCTOS:*
${productsList}

━━━━━━━━━━━━━━━━━━━━
💰 *RESUMEN FINANCIERO:*
• Subtotal: $${this.formatPrice(subtotal)}
• Comisión (${this.COMMISSION_PERCENTAGE}%): $${this.formatPrice(commission)}
━━━━━━━━━━━━━━━━━━━━
💵 *TU GANANCIA:* $${this.formatPrice(commission)}
🏪 *PARA LA TIENDA:* $${this.formatPrice(ownerTotal)}
━━━━━━━━━━━━━━━━━━━━

📞 *Acción:* Contactar al cliente para confirmar detalles de entrega y pago.`;

    await whatsappService.sendMessage({
      to: env.FUYI_PHONE_NUMBER,
      text: summary,
    });

    // Marcar como notificado
    await query('UPDATE whatsapp_orders SET notified_to_fuyi = true WHERE order_number = $1', [orderNumber]);
  }

  private async sendNotificationToOwner(
    conversation: BotConversation,
    orderNumber: string,
    subtotal: number,
    commission: number,
    ownerTotal: number
  ): Promise<void> {
    const ownerPhone = env.STORE_OWNER_PHONE || env.FUYI_PHONE_NUMBER;

    if (!env.STORE_OWNER_PHONE) {
      console.log('[Bot] STORE_OWNER_PHONE no configurado, saltando notificación al dueño');
      return;
    }

    const productsList = conversation.cart.map(item =>
      `• ${item.quantity}x ${item.name}`
    ).join('\n');

    const notification = `🏪 *NUEVO PEDIDO #${orderNumber}*

👤 Cliente: ${conversation.customerName}
📱 Teléfono: ${this.formatPhoneNumber(conversation.phone)}

📦 *Productos:*
${productsList}

💰 *Monto total:* $${this.formatPrice(subtotal)}
📝 Pedido confirmado por intermediario

💡 El cliente está esperando tu contacto para finalizar la venta.

📞 Contactar: ${this.formatPhoneNumber(conversation.phone)}`;

    await whatsappService.sendMessage({
      to: ownerPhone,
      text: notification,
    });

    // Marcar como notificado
    await query('UPDATE whatsapp_orders SET notified_to_owner = true WHERE order_number = $1', [orderNumber]);
  }

  private async confirmToCustomer(conversation: BotConversation, orderNumber: string): Promise<void> {
    const cartTotal = this.calculateCartTotal(conversation.cart);
    const commission = cartTotal * (this.COMMISSION_PERCENTAGE / 100);

    const message = `✅ *¡Pedido confirmado, ${conversation.customerName}!* 🎉

📋 *Número de pedido:* #${orderNumber}

🛒 *Resumen:*
${this.formatCart(conversation.cart)}

💰 *Total:* $${this.formatPrice(cartTotal)}

📞 *Próximos pasos:*
Nuestro equipo te contactará al ${this.formatPhoneNumber(conversation.phone)} para confirmar:

• Método de pago
• Dirección de entrega
• Disponibilidad de productos

🏃‍♂️💨 ¡Gracias por elegir Melo Sportt!`;

    await whatsappService.sendMessage({
      to: conversation.phone,
      text: message,
    });
  }

  // ========================================
  // UTILIDADES
  // ========================================

  private calculateCartTotal(cart: CartItem[]): number {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  private formatCart(cart: CartItem[]): string {
    return cart.map(item =>
      `${item.quantity}x ${item.name} - $${this.formatPrice(item.price * item.quantity)}`
    ).join('\n');
  }

  private formatPrice(price: number): string {
    return price.toLocaleString('es-CO');
  }

  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('57') && cleaned.length === 12) {
      return `+${cleaned.substring(0, 2)} (${cleaned.substring(2, 5)}) ${cleaned.substring(5, 8)}-${cleaned.substring(8)}`;
    }
    if (cleaned.length === 10) {
      return `+57 (${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    return phone;
  }

  // ========================================
  // BASE DE DATOS
  // ========================================

  private async saveConversation(conversation: BotConversation): Promise<void> {
    this.conversations.set(conversation.phone, conversation);
  }

  private async saveConversationToDB(conversation: BotConversation): Promise<void> {
    try {
      await query(
        `INSERT INTO whatsapp_conversations
         (phone, customer_name, style, budget, products, messages, status, escalated_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         ON CONFLICT (phone) DO UPDATE SET
           customer_name = $2,
           style = $3,
           budget = $4,
           products = $5,
           messages = $6,
           status = $7,
           escalated_at = $8,
           updated_at = NOW()`,
        [
          conversation.phone,
          conversation.customerName,
          conversation.style,
          conversation.budget,
          JSON.stringify(conversation.cart.map(c => c.name)),
          JSON.stringify(conversation.messages),
          conversation.state,
          conversation.escalatedAt,
        ]
      );
    } catch (error) {
      console.error('[Bot] Error guardando en BD:', error);
    }
  }

  private async getConversationFromDB(phone: string): Promise<any> {
    try {
      const result = await query(
        `SELECT * FROM whatsapp_conversations WHERE phone = $1 ORDER BY updated_at DESC LIMIT 1`,
        [phone]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('[Bot] Error obteniendo de BD:', error);
      return null;
    }
  }

  private async loadActiveConversations(): Promise<void> {
    try {
      const result = await query(
        `SELECT * FROM whatsapp_conversations WHERE status NOT IN ('escalated', 'closed')`
      );

      for (const row of result.rows) {
        this.conversations.set(row.phone, {
          phone: row.phone,
          state: row.status,
          customerName: row.customer_name || '',
          style: row.style,
          budget: row.budget || '',
          cart: [],
          messages: row.messages || [],
          escalatedAt: row.escalated_at,
          closedAt: row.closed_at,
        });
      }

      console.log(`[Bot] Cargadas ${this.conversations.size} conversaciones activas`);
    } catch (error) {
      console.error('[Bot] Error cargando conversaciones:', error);
    }
  }

  private async cleanupInactiveConversations(): Promise<void> {
    const now = new Date();
    const timeout = this.CONVERSATION_TIMEOUT;

    for (const [phone, conversation] of this.conversations.entries()) {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      if (lastMessage) {
        const timeSinceLastMessage = now.getTime() - lastMessage.timestamp.getTime();

        if (timeSinceLastMessage > timeout && conversation.state !== BotState.CLOSED) {
          const goodbyeMessage = `⏰ *Hola ${conversation.customerName},*

Hemos notado que has estado inactivo. ¿Sigues interesado en nuestros productos?

Responde "sí" para continuar o "no" para que te contactemos después.`;

          await whatsappService.sendMessage({
            to: conversation.phone,
            text: goodbyeMessage,
          });

          conversation.messages.push({
            role: 'bot',
            text: 'Mensaje de seguimiento por inactividad',
            timestamp: new Date(),
          });

          this.conversations.set(phone, conversation);
        }
      }
    }
  }

  // ========================================
  // API PÚBLICA
  // ========================================

  getConversationState(phone: string): BotConversation | undefined {
    return this.conversations.get(phone);
  }

  getAllActiveConversations(): BotConversation[] {
    return Array.from(this.conversations.values()).filter(
      c => c.state !== BotState.CLOSED
    );
  }

  getMetrics(): any {
    const conversations = Array.from(this.conversations.values());
    return {
      total: conversations.length,
      active: conversations.filter(c => c.state !== BotState.CLOSED).length,
      escalated: conversations.filter(c => c.state === BotState.ESCALATE).length,
      byStyle: {
        urbano: conversations.filter(c => c.style === 'urbano').length,
        clasico: conversations.filter(c => c.style === 'clasico').length,
      },
      catalogSize: this.catalog.length,
    };
  }

  // Método para procesar confirmación de pedido desde webhook
  async processOrderConfirmation(phone: string): Promise<void> {
    const conversation = this.conversations.get(phone);
    if (conversation && conversation.state === BotState.ORDER_CONFIRMED) {
      await this.confirmAndFinishOrder(conversation);
    }
  }
}

export const whatsappBotService = new WhatsAppBotService();
