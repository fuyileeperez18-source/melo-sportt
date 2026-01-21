import { create } from 'zustand';
import type { ChatMessage, Conversation, QuickReply } from '@/types';
import { chatService } from '@/lib/services';

interface ChatState {
  // State
  isOpen: boolean;
  isMinimized: boolean;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  unreadCount: number;

  // Actions
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  minimizeChat: () => void;
  maximizeChat: () => void;

  setActiveConversation: (conversation: Conversation | null) => void;
  fetchConversations: (userId?: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string, type?: ChatMessage['message_type']) => Promise<void>;
  handleQuickReply: (reply: QuickReply) => Promise<void>;
  startNewConversation: () => void;
  editMessage: (messageId: string, newContent: string) => void;
  deleteMessage: (messageId: string) => void;

  // Bot functions
  processUserMessage: (message: string) => Promise<void>;
  getBotResponse: (message: string) => Promise<string>;
  setTyping: (typing: boolean) => void;
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
};

const quickReplies: QuickReply[] = [
  { id: '1', text: '📦 Estado de mi pedido', payload: 'order_status' },
  { id: '2', text: '🚚 Información de envío', payload: 'shipping' },
  { id: '3', text: '💳 Métodos de pago', payload: 'payment' },
  { id: '4', text: '↩️ Política de devoluciones', payload: 'returns' },
  { id: '5', text: '👤 Hablar con un agente', payload: 'agent' },
];

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  isMinimized: false,
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,
  isTyping: false,
  unreadCount: 0,

  toggleChat: () => set((state) => ({ isOpen: !state.isOpen, isMinimized: false })),
  openChat: () => set({ isOpen: true, isMinimized: false }),
  closeChat: () => set({ isOpen: false }),
  minimizeChat: () => set({ isMinimized: true }),
  maximizeChat: () => set({ isMinimized: false }),

  startNewConversation: () => {
    set({
      messages: [],
      activeConversation: null,
      isTyping: false
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

  setActiveConversation: (conversation) => set({ activeConversation: conversation }),

  fetchConversations: async (userId) => {
    set({ isLoading: true });
    try {
      const conversations = await chatService.getConversations(userId);
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
      const messages = await chatService.getMessages(conversationId);
      set({ messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (content, type = 'text') => {
    const { activeConversation } = get();

    // Create user message locally
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      conversation_id: activeConversation?.id || 'local',
      sender_type: 'user',
      content,
      message_type: type,
      is_read: true,
      created_at: new Date().toISOString(),
    };

    set((state) => ({ messages: [...state.messages, userMessage] }));

    // Process message with bot
    await get().processUserMessage(content);
  },

  handleQuickReply: async (reply) => {
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: Date.now().toString(),
          conversation_id: get().activeConversation?.id || 'local',
          sender_type: 'user',
          content: reply.text,
          message_type: 'quick_reply',
          is_read: true,
          created_at: new Date().toISOString(),
        },
      ],
    }));

    // Get bot response based on payload
    const responseKey = reply.payload as keyof typeof botResponses;
    const response = botResponses[responseKey] || botResponses.default;

    set({ isTyping: true });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: (Date.now() + 1).toString(),
          conversation_id: get().activeConversation?.id || 'local',
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
    set({ isTyping: true });

    // Simulate typing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const response = await get().getBotResponse(message);

    const botMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      conversation_id: get().activeConversation?.id || 'local',
      sender_type: 'bot',
      content: response,
      message_type: 'text',
      is_read: true,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, botMessage],
      isTyping: false,
    }));
  },

  getBotResponse: async (message) => {
    const lowerMessage = message.toLowerCase();

    // Simple keyword matching
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

export { quickReplies };
