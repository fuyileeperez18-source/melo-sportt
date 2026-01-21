import api from '../lib/api';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  readAt: string | null;
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'document' | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  createdAt: string;
  updatedAt?: string;
  sender: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    role: string;
  };
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerAvatar: string | null;
  orderId: string | null;
  orderNumber: string | null;
  productId: string | null;
  productName: string | null;
  status: string;
  lastMessageAt: string | null;
  lastMessage: Message | null;
  unreadCount: number;
  totalMessages: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetConversationsResponse {
  success: boolean;
  data: {
    conversations: Conversation[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface GetMessagesResponse {
  success: boolean;
  data: {
    messages: Message[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

/**
 * Get all conversations for the current user
 */
export const getConversations = async (page = 1, limit = 20): Promise<GetConversationsResponse> => {
  const params: Record<string, string> = {
    page: String(page),
    limit: String(limit),
  };
  const response = await api.get<GetConversationsResponse>('/messages/conversations', params);
  if (!response || !response.data) {
    throw new Error('Invalid response from server');
  }
  return response.data;
};

/**
 * Get messages for a specific conversation
 */
export const getMessages = async (
  conversationId: string,
  page = 1,
  limit = 50
): Promise<GetMessagesResponse> => {
  const params: Record<string, string> = {
    page: String(page),
    limit: String(limit),
  };
  const response = await api.get<GetMessagesResponse>(`/messages/conversations/${conversationId}/messages`, params);
  if (!response || !response.data) {
    throw new Error('Invalid response from server');
  }
  return response.data;
};

/**
 * Send a message
 */
export const sendMessage = async (conversationId: string, content: string) => {
  const response = await api.post('/messages/messages', {
    conversationId,
    content,
  });
  return response.data;
};

/**
 * Create or get existing conversation
 */
export const createOrGetConversation = async (data: {
  productId?: string;
  orderId?: string;
  initialMessage?: string;
}) => {
  const response = await api.post('/messages/conversations', data);
  return response.data;
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (conversationId: string) => {
  const response = await api.put(`/messages/conversations/${conversationId}/read`);
  return response.data;
};

/**
 * Get unread messages count
 */
export const getUnreadCount = async () => {
  const response = await api.get('/messages/unread-count');
  return response.data;
};

/**
 * Edit a message
 */
export const editMessage = async (messageId: string, content: string) => {
  const response = await api.put(`/messages/messages/${messageId}`, {
    content,
  });
  return response.data;
};

/**
 * Delete a message
 */
export const deleteMessage = async (messageId: string) => {
  const response = await api.delete(`/messages/messages/${messageId}`);
  return response.data;
};

const messageService = {
  getConversations,
  getMessages,
  sendMessage,
  createOrGetConversation,
  markMessagesAsRead,
  getUnreadCount,
  editMessage,
  deleteMessage,
};

export default messageService;
