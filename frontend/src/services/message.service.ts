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
export const getConversations = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  unreadOnly?: boolean;
  sortBy?: string;
} = {}): Promise<{ conversations: Conversation[]; pagination: any; data?: any }> => {
  const queryParams: Record<string, string> = {
    page: String(params.page || 1),
    limit: String(params.limit || 20),
    ...(params.search && { search: params.search }),
    ...(params.status && { status: params.status }),
    ...(params.dateFrom && { dateFrom: params.dateFrom }),
    ...(params.dateTo && { dateTo: params.dateTo }),
    ...(params.unreadOnly && { unreadOnly: 'true' }),
    ...(params.sortBy && { sortBy: params.sortBy }),
  };
  const apiResponse = await api.get('/messages/conversations', queryParams);
  const data = apiResponse.data as any;
  console.log('Service convs raw:', Object.keys(data || {}));
  const conversations = data?.data?.conversations || data?.conversations || (Array.isArray(data) ? data : []) || [];
  const pagination = data?.data?.pagination || data?.pagination || {};
  return {
    conversations,
    pagination,
    data: { conversations, pagination }
  };
};

/**
 * Get messages for a specific conversation
 */
export const getMessages = async (
  conversationId: string,
  page = 1,
  limit = 50
): Promise<{ messages: Message[]; pagination: any; data?: any; success?: boolean }> => {
  const params: Record<string, string> = {
    page: String(page),
    limit: String(limit),
  };
  const apiResponse = await api.get(`/messages/conversations/${conversationId}/messages`, params);
  const data = apiResponse.data as any;
  console.log('Service convs raw:', Object.keys(data || {}));
  const messages = data?.data?.messages || data?.messages || [];
  const pagination = data?.data?.pagination || data?.pagination || {};
  return {
    messages,
    pagination,
    data: { messages, pagination },
    success: data?.success ?? true
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
 * @param data.metadata - Optional metadata for support requests (supportRequest, problemType, problemLabel, description)
 */
export const createOrGetConversation = async (data: {
  productId?: string;
  orderId?: string;
  initialMessage?: string;
  metadata?: {
    supportRequest?: boolean;
    problemType?: string;
    problemLabel?: string;
    description?: string;
  };
}): Promise<any> => {
  const response = await api.post('/messages/conversations', data);
  // Backend devuelve {success: true, data: {conversation: {...}, isNew: boolean}}
  const backendData = response.data as any;
  return {
    success: backendData?.success ?? true,
    data: backendData?.data ?? backendData ?? {},
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

// ============================================
// SUPPORT REQUESTS (Admin only)
// ============================================

export interface SupportRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerAvatar: string | null;
  problemType: string;
  problemLabel: string;
  problemDescription: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: string;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  unreadCount: number;
  totalMessages: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  resolvedAt: string | null;
}

export interface SupportRequestStats {
  totalPending: number;
  totalActive: number;
  totalResolvedToday: number;
  totalAll: number;
  byType: Record<string, number>;
}

/**
 * Get all support requests (Admin only)
 */
export const getSupportRequests = async (params: {
  status?: string;
  problemType?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ supportRequests: SupportRequest[]; pagination: any }> => {
  const queryParams: Record<string, string> = {
    page: String(params.page || 1),
    limit: String(params.limit || 20),
    ...(params.status && { status: params.status }),
    ...(params.problemType && { problemType: params.problemType }),
  };
  const response = await api.get('/messages/support-requests', queryParams);
  const data = response.data as any;
  return {
    supportRequests: data?.data?.supportRequests || [],
    pagination: data?.data?.pagination || {},
  };
};

/**
 * Get support request statistics (Admin only)
 */
export const getSupportRequestStats = async (): Promise<SupportRequestStats> => {
  const response = await api.get('/messages/support-requests/stats');
  const data = response.data as any;
  return data?.data || {
    totalPending: 0,
    totalActive: 0,
    totalResolvedToday: 0,
    totalAll: 0,
    byType: {},
  };
};

/**
 * Assign support request to admin
 */
export const assignSupportRequest = async (conversationId: string, adminId?: string) => {
  const response = await api.put(`/messages/support-requests/${conversationId}/assign`, {
    adminId,
  });
  return response.data;
};

/**
 * Resolve support request
 */
export const resolveSupportRequest = async (conversationId: string) => {
  const response = await api.put(`/messages/support-requests/${conversationId}/resolve`);
  return response.data;
};

/**
 * Update support request priority
 */
export const updateSupportRequestPriority = async (
  conversationId: string,
  priority: 'low' | 'normal' | 'high' | 'urgent'
) => {
  const response = await api.put(`/messages/support-requests/${conversationId}/priority`, {
    priority,
  });
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
  // Support requests
  getSupportRequests,
  getSupportRequestStats,
  assignSupportRequest,
  resolveSupportRequest,
  updateSupportRequestPriority,
};

export default messageService;
