import { create } from 'zustand';
import type { ChatMessage, Conversation, QuickReply } from '@/types';
import messageService from '@/services/message.service';

// Estados del flujo de escalación a agente
type EscalationStep = 'idle' | 'ask_problem_type' | 'ask_description' | 'confirming' | 'submitted';

// Tipos de problemas predefinidos
const problemTypes = [
  { id: 'order', label: 'Problema con mi pedido', icon: '📦' },
  { id: 'payment', label: 'Problema con el pago', icon: '💳' },
  { id: 'product', label: 'Consulta sobre producto', icon: '👕' },
  { id: 'shipping', label: 'Problema con el envío', icon: '🚚' },
  { id: 'return', label: 'Devolución o cambio', icon: '↩️' },
  { id: 'other', label: 'Otro asunto', icon: '❓' },
];

interface EscalationData {
  problemType: string | null;
  problemLabel: string | null;
  description: string | null;
}

interface ChatState {
  isOpen: boolean;
  isMinimized: boolean;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  unreadCount: number;
  agentActiveConversationId: string | null;

  // Estado de escalación
  escalationStep: EscalationStep;
  escalationData: EscalationData;

  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  minimizeChat: () => void;
  maximizeChat: () => void;

  setActiveConversation: (conversation: Conversation | null) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string, type?: ChatMessage['message_type']) => Promise<void>;
  handleQuickReply: (reply: QuickReply) => Promise<void>;
  startNewConversation: () => void;
  editMessage: (messageId: string, newContent: string) => void;
  deleteMessage: (messageId: string) => void;
  addMessage: (message: ChatMessage) => void;

  processUserMessage: (message: string) => Promise<void>;
  getBotResponse: (message: string) => Promise<string>;
  setTyping: (typing: boolean) => void;

  // Nuevas funciones de escalación
  startEscalation: () => void;
  selectProblemType: (problemId: string) => void;
  submitDescription: (description: string) => void;
  cancelEscalation: () => void;
  confirmAndSubmitEscalation: () => Promise<void>;
}

// Predefined bot responses
const botResponses: Record<string, string> = {
  greeting: '¡Hola! 👋 Soy MELOBOT, tu asistente de MELO SPORTT. ¿En qué puedo ayudarte hoy?',
  products: 'Tenemos una amplia variedad de productos. Puedes explorar nuestro catálogo en la sección de Productos o decirme qué estás buscando.',
  shipping: 'Realizamos envíos a toda Colombia. Los tiempos de entrega varían entre 2-5 días hábiles según tu ubicación en el país.',
  payment: 'Aceptamos todas las tarjetas de crédito/débito, transferencias bancarias y pagos en efectivo.',
  returns: 'Tienes 30 días para realizar devoluciones. El producto debe estar sin usar y en su empaque original.',
  hours: 'Atendemos de Lunes a Viernes de 9:00 AM a 6:00 PM. Sábados de 10:00 AM a 2:00 PM.',
  contact: 'Puedes contactarnos por WhatsApp al +57 300 123 4567 o por email a contacto@melosportt.com',
  default: 'Gracias por tu mensaje. Un agente se pondrá en contacto contigo pronto. ¿Hay algo más en lo que pueda ayudarte?',

  // Mensajes del flujo de escalación
  escalation_start: '¡Entendido! 🙋‍♂️ Para conectarte con un agente humano, necesito algunos datos.\n\n**¿Cuál es el motivo de tu consulta?**\n\nSelecciona una opción:',
  escalation_ask_description: '📝 **Cuéntame más sobre tu problema.**\n\nEscribe una breve descripción para que nuestro equipo pueda ayudarte mejor:',
  escalation_confirm: '✅ **Resumen de tu solicitud:**\n\n',
  escalation_submitted: '🎉 **¡Solicitud enviada!**\n\nUn agente revisará tu caso y te responderá pronto. Te notificaremos cuando haya una respuesta.\n\n¿Hay algo más en lo que pueda ayudarte mientras esperas?',
};

const quickReplies: QuickReply[] = [
  { id: '1', text: '📦 Estado de mi pedido', payload: 'order_status' },
  { id: '2', text: '🚚 Información de envío', payload: 'shipping' },
  { id: '3', text: '💳 Métodos de pago', payload: 'payment' },
  { id: '4', text: '↩️ Política de devoluciones', payload: 'returns' },
  { id: '5', text: '👤 Hablar con un agente', payload: 'agent' },
];

// Función auxiliar para agregar mensaje del bot
const addBotMessage = (messages: ChatMessage[], content: string, conversationId: string): ChatMessage[] => {
  return [
    ...messages,
    {
      id: Date.now().toString(),
      conversation_id: conversationId,
      sender_type: 'bot' as const,
      content,
      message_type: 'text' as const,
      is_read: true,
      created_at: new Date().toISOString(),
    },
  ];
};

// Función auxiliar para agregar mensaje del usuario
const addUserMessage = (messages: ChatMessage[], content: string, conversationId: string): ChatMessage[] => {
  return [
    ...messages,
    {
      id: Date.now().toString(),
      conversation_id: conversationId,
      sender_type: 'user' as const,
      content,
      message_type: 'text' as const,
      is_read: true,
      created_at: new Date().toISOString(),
    },
  ];
};

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  isMinimized: false,
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,
  isTyping: false,
  unreadCount: 0,
  agentActiveConversationId: null,

  // Estado inicial de escalación
  escalationStep: 'idle',
  escalationData: {
    problemType: null,
    problemLabel: null,
    description: null,
  },

  toggleChat: () => set((state) => ({ isOpen: !state.isOpen, isMinimized: false })),
  openChat: () => set({ isOpen: true, isMinimized: false }),
  closeChat: () => set({ isOpen: false }),
  minimizeChat: () => set({ isMinimized: true }),
  maximizeChat: () => set({ isMinimized: false }),

  startNewConversation: () => {
    set({
      messages: [],
      activeConversation: null,
      isTyping: false,
      escalationStep: 'idle',
      escalationData: { problemType: null, problemLabel: null, description: null },
    });
  },

  editMessage: (messageId, newContent) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: newContent, metadata: { ...msg.metadata, edited: true, editedAt: new Date().toISOString() } }
          : msg
      ),
    }));
  },

  deleteMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== messageId),
    }));
  },

  addMessage: (message) => {
    set((state) => {
      // Avoid duplicates
      if (state.messages.some((m) => m.id === message.id)) {
        return state;
      }
      return {
        messages: [...state.messages, message],
      };
    });
  },

  setActiveConversation: (conversation) => set({ activeConversation: conversation }),

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const response = await messageService.getConversations({ page: 1, limit: 20 });
      const rawConversations = response.conversations || response.data?.conversations || [];
      const conversations: Conversation[] = rawConversations.map((conv: any): Conversation => ({
        id: conv.id,
        user_id: conv.customerId,
        channel: 'website' as const,
        status: conv.status || 'pending' as const,
        unread_count: conv.unreadCount || 0,
        created_at: conv.createdAt || new Date().toISOString(),
        updated_at: conv.updatedAt || new Date().toISOString(),
      }));
      console.log('ChatStore convs loaded:', conversations.length);
      set({ conversations });
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMessages: async (conversationId) => {
    set({ isLoading: true });
    try {
      const response = await messageService.getMessages(conversationId, 1, 50);
      const rawMessages = response.messages || response.data?.messages || [];
      const messages: ChatMessage[] = rawMessages.map((m: any) => ({
        id: m.id,
        conversation_id: m.conversationId || m.conversation_id || '',
        sender_type: m.sender.role === 'customer' ? 'user' as const : 'agent' as const,
        content: m.content,
        message_type: 'text' as const,
        is_read: m.isRead,
        created_at: m.createdAt || m.created_at || new Date().toISOString(),
      }));
      console.log('ChatStore msgs loaded:', messages.length);
      set({ messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (content, type = 'text') => {
    const state = get();

    // Si estamos en flujo de escalación, manejar la descripción
    if (state.escalationStep === 'ask_description') {
      get().submitDescription(content);
      return;
    }

    if (!state.activeConversation) return;

    // Send to backend first
    try {
      await messageService.sendMessage(state.activeConversation.id, content);
    } catch (error) {
      console.error('Send failed:', error);
      return;
    }

    // Create user message locally
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      conversation_id: state.activeConversation.id,
      sender_type: 'user',
      content,
      message_type: type,
      is_read: true,
      created_at: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMessage] }));

    // Bot response solo si NO es modo agente
    if (state.agentActiveConversationId !== state.activeConversation.id) {
      await get().processUserMessage(content);
    }
  },

  // ==========================================
  // FLUJO DE ESCALACIÓN A AGENTE
  // ==========================================

  startEscalation: () => {
    const state = get();
    const conversationId = state.activeConversation?.id || 'local';

    set({ isTyping: true });

    setTimeout(() => {
      const problemOptions = problemTypes
        .map((p, i) => `${i + 1}. ${p.icon} ${p.label}`)
        .join('\n');

      const message = `${botResponses.escalation_start}\n\n${problemOptions}`;

      set((s) => ({
        messages: addBotMessage(s.messages, message, conversationId),
        escalationStep: 'ask_problem_type',
        isTyping: false,
      }));
    }, 1000);
  },

  selectProblemType: (problemId: string) => {
    const state = get();
    const conversationId = state.activeConversation?.id || 'local';

    // Encontrar el tipo de problema
    let selectedProblem = problemTypes.find(p => p.id === problemId);

    // Si es un número, buscar por índice
    if (!selectedProblem) {
      const index = parseInt(problemId) - 1;
      if (index >= 0 && index < problemTypes.length) {
        selectedProblem = problemTypes[index];
      }
    }

    if (!selectedProblem) {
      // No se encontró, pedir de nuevo
      set((s) => ({
        messages: addBotMessage(
          s.messages,
          '❌ No entendí tu selección. Por favor, escribe el número de la opción (1-6) o selecciona un botón.',
          conversationId
        ),
      }));
      return;
    }

    // Agregar mensaje del usuario
    const userResponse = `${selectedProblem.icon} ${selectedProblem.label}`;

    set({ isTyping: true });

    setTimeout(() => {
      set((s) => ({
        messages: addBotMessage(
          addUserMessage(s.messages, userResponse, conversationId),
          botResponses.escalation_ask_description,
          conversationId
        ),
        escalationStep: 'ask_description',
        escalationData: {
          ...s.escalationData,
          problemType: selectedProblem!.id,
          problemLabel: selectedProblem!.label,
        },
        isTyping: false,
      }));
    }, 800);
  },

  submitDescription: (description: string) => {
    const state = get();
    const conversationId = state.activeConversation?.id || 'local';

    if (description.trim().length < 10) {
      set((s) => ({
        messages: addBotMessage(
          addUserMessage(s.messages, description, conversationId),
          '⚠️ Por favor, escribe una descripción más detallada (mínimo 10 caracteres) para que podamos ayudarte mejor.',
          conversationId
        ),
      }));
      return;
    }

    set({ isTyping: true });

    setTimeout(() => {
      const { escalationData } = get();
      const summary = `${botResponses.escalation_confirm}` +
        `📋 **Tipo:** ${escalationData.problemLabel}\n` +
        `📝 **Descripción:** ${description}\n\n` +
        `¿Deseas enviar esta solicitud?\n\n` +
        `✅ Escribe **"sí"** o **"confirmar"** para enviar\n` +
        `❌ Escribe **"cancelar"** para volver al inicio`;

      set((s) => ({
        messages: addBotMessage(
          addUserMessage(s.messages, description, conversationId),
          summary,
          conversationId
        ),
        escalationStep: 'confirming',
        escalationData: {
          ...s.escalationData,
          description: description.trim(),
        },
        isTyping: false,
      }));
    }, 800);
  },

  cancelEscalation: () => {
    const state = get();
    const conversationId = state.activeConversation?.id || 'local';

    set((s) => ({
      messages: addBotMessage(
        s.messages,
        '👋 No hay problema. Si necesitas algo más, estoy aquí para ayudarte.',
        conversationId
      ),
      escalationStep: 'idle',
      escalationData: { problemType: null, problemLabel: null, description: null },
    }));
  },

  confirmAndSubmitEscalation: async () => {
    const state = get();
    const conversationId = state.activeConversation?.id || 'local';
    const { escalationData } = state;

    set({ isTyping: true });

    try {
      // Crear el mensaje de resumen para el agente
      const summaryForAgent = `🆘 **SOLICITUD DE SOPORTE**\n\n` +
        `📋 **Tipo de problema:** ${escalationData.problemLabel}\n` +
        `📝 **Descripción:** ${escalationData.description}\n\n` +
        `---\n` +
        `_Solicitud creada automáticamente por MELOBOT_`;

      // Crear conversación con el resumen
      const convResponse = await messageService.createOrGetConversation({
        initialMessage: summaryForAgent,
        metadata: {
          supportRequest: true,
          problemType: escalationData.problemType || undefined,
          problemLabel: escalationData.problemLabel || undefined,
          description: escalationData.description || undefined,
        }
      });

      const newConv = convResponse.data || convResponse;

      // Actualizar estado
      set((s) => ({
        messages: addBotMessage(s.messages, botResponses.escalation_submitted, conversationId),
        escalationStep: 'submitted',
        escalationData: { problemType: null, problemLabel: null, description: null },
        isTyping: false,
        activeConversation: {
          id: newConv.id,
          user_id: newConv.customerId,
          channel: 'website' as const,
          status: newConv.status || 'active' as const,
          unread_count: newConv.unreadCount || 0,
          created_at: newConv.createdAt || new Date().toISOString(),
          updated_at: newConv.updatedAt || new Date().toISOString(),
        },
        agentActiveConversationId: newConv.id,
        conversations: [...s.conversations, {
          id: newConv.id,
          user_id: newConv.customerId,
          channel: 'website' as const,
          status: newConv.status || 'active' as const,
          unread_count: newConv.unreadCount || 0,
          created_at: newConv.createdAt || new Date().toISOString(),
          updated_at: newConv.updatedAt || new Date().toISOString(),
        }],
      }));

      // Cargar mensajes de la nueva conversación
      await get().fetchMessages(newConv.id);

    } catch (error) {
      console.error('Error creating support request:', error);
      set((s) => ({
        messages: addBotMessage(
          s.messages,
          '❌ Hubo un error al enviar tu solicitud. Por favor, intenta de nuevo o contáctanos por WhatsApp.',
          conversationId
        ),
        isTyping: false,
      }));
    }
  },

  handleQuickReply: async (reply) => {
    const state = get();
    const conversationId = state.activeConversation?.id || 'local';

    // Agregar mensaje del usuario
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: Date.now().toString(),
          conversation_id: conversationId,
          sender_type: 'user',
          content: reply.text,
          message_type: 'quick_reply',
          is_read: true,
          created_at: new Date().toISOString(),
        },
      ],
    }));

    // Si quiere hablar con agente, iniciar flujo de escalación
    if (reply.payload === 'agent') {
      get().startEscalation();
      return;
    }

    const responseKey = reply.payload as keyof typeof botResponses;
    const response = botResponses[responseKey] || botResponses.default;

    set({ isTyping: true });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: (Date.now() + 1).toString(),
          conversation_id: conversationId,
          sender_type: 'bot',
          content: response,
          message_type: 'text',
          is_read: true,
          created_at: new Date().toISOString(),
        },
      ],
      isTyping: false,
    }));
  },

  processUserMessage: async (message) => {
    const state = get();
    const conversationId = state.activeConversation?.id || 'local';

    // Si ya estamos en una conversación con agente, no interviene el bot
    if (state.agentActiveConversationId === state.activeConversation?.id) {
      return;
    }

    // Manejar flujo de escalación
    if (state.escalationStep === 'ask_problem_type') {
      get().selectProblemType(message);
      return;
    }

    if (state.escalationStep === 'ask_description') {
      get().submitDescription(message);
      return;
    }

    if (state.escalationStep === 'confirming') {
      const lower = message.toLowerCase();
      if (lower.includes('sí') || lower.includes('si') || lower.includes('confirmar') || lower.includes('enviar')) {
        await get().confirmAndSubmitEscalation();
      } else if (lower.includes('cancelar') || lower.includes('no')) {
        get().cancelEscalation();
      } else {
        set((s) => ({
          messages: addBotMessage(
            addUserMessage(s.messages, message, conversationId),
            '❓ Por favor, escribe **"sí"** para confirmar o **"cancelar"** para volver.',
            conversationId
          ),
        }));
      }
      return;
    }

    // Flujo normal del bot
    set({ isTyping: true });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const response = await get().getBotResponse(message);

    const botMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      conversation_id: conversationId,
      sender_type: 'bot',
      content: response,
      message_type: 'text',
      is_read: true,
      created_at: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, botMessage],
      isTyping: false,
    }));
  },

  getBotResponse: async (message) => {
    const lowerMessage = message.toLowerCase();

    // Detectar si quiere hablar con agente
    if (lowerMessage.includes('agente') || lowerMessage.includes('humano') || lowerMessage.includes('persona')) {
      // Iniciar flujo de escalación
      setTimeout(() => get().startEscalation(), 100);
      return '¡Un momento! Te voy a conectar con nuestro equipo de soporte...';
    }

    if (lowerMessage.includes('hola') || lowerMessage.includes('hi') || lowerMessage.includes('buenos')) {
      return botResponses.greeting;
    }
    if (lowerMessage.includes('producto') || lowerMessage.includes('ropa') || lowerMessage.includes('catálogo') || lowerMessage.includes('catalogo')) {
      return botResponses.products;
    }
    if (lowerMessage.includes('envio') || lowerMessage.includes('envío') || lowerMessage.includes('entrega')) {
      return botResponses.shipping;
    }
    if (lowerMessage.includes('pago') || lowerMessage.includes('tarjeta') || lowerMessage.includes('pagar')) {
      return botResponses.payment;
    }
    if (lowerMessage.includes('devoluci') || lowerMessage.includes('cambio') || lowerMessage.includes('devolver')) {
      return botResponses.returns;
    }
    if (lowerMessage.includes('horario') || lowerMessage.includes('hora') || lowerMessage.includes('atienden')) {
      return botResponses.hours;
    }
    if (lowerMessage.includes('contacto') || lowerMessage.includes('whatsapp') || lowerMessage.includes('email')) {
      return botResponses.contact;
    }

    return botResponses.default;
  },

  setTyping: (typing) => set({ isTyping: typing }),
}));

export { quickReplies, problemTypes };
