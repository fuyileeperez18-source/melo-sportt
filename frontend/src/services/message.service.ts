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
export const getConversations = async (page = 1, limit = 20): Promise<any> => {
  const params: Record<string, string> = {
    page: String(page),
    limit: String(limit),
  };
  const apiResponse = await api.get('/messages/conversations', params);
  const data = apiResponse.data;
  return {
    conversations: data?.data?.conversations || data?.conversations || (Array.isArray(data) ? data : []) || [],
    pagination: data?.data?.pagination || data?.pagination || {}
  };
};

/**
 * Get messages for a specific conversation
 */
export const getMessages = async (
  conversationId: string,
  page = 1,
  limit = 50
): Promise<any> => {
  const params: Record<string, string> = {
    page: String(page),
    limit: String(limit),
  };
  const apiResponse = await api.get(`/messages/conversations/${conversationId}/messages`, params);
  const data = apiResponse.data;
  return {
    messages: data?.data?.messages || data?.messages || [],
    pagination: data?.data?.pagination || data?.pagination || {}
  };
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

export interface CreateConversationResponse {
  success: boolean;
  data: Conversation;
}

/**
 * Create or get existing conversation
 */
export const createOrGetConversation = async (data: {
  productId?: string;
  orderId?: string;
  initialMessage?: string;
}): Promise<any> => {
  const response = await api.post('/messages/conversations', data);
  // Backend devuelve {success: true, data: {conversation: {...}, isNew: boolean}}
  const backendData = response.data as any;
  return {
    success: backendData?.success ?? true,
    data: backendData?.data?.conversation ?? backendData?.conversation ?? backendData ?? {},
  };
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
