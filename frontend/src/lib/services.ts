// ============================================
// WALMER STORE - API SERVICES
// ============================================
// Service layer that connects to the Node.js backend

import api from './api';
import type {
  User,
  Product,
  Category,
  Order,
  Conversation,
  ChatMessage,
  DashboardMetrics,
  Address,
  ProductStats,
  ProductWithStats,
  CategoryRevenue,
  MonthlyRevenue,
  SalesByGender,
  SalesOverview,
} from '@/types';

// ============================================
// AUTH SERVICE
// ============================================

export const authService = {
  async signUp(email: string, password: string, fullName: string) {
    const response = await api.post<{ user: User; token: string }>('/auth/signup', {
      email,
      password,
      fullName,
    });
    if (response.data?.token) {
      api.setToken(response.data.token);
    }
    return response.data!;
  },

  async signIn(email: string, password: string) {
    console.log('🔐 [authService.signIn] Llamando a /auth/signin con:', { email });
    const response = await api.post<{ user: User; token: string }>('/auth/signin', {
      email,
      password,
    });
    console.log('🔐 [authService.signIn] Respuesta del backend:', response);
    console.log('🔐 [authService.signIn] response.data:', response.data);

    // La respuesta viene en response.data porque el backend devuelve { success: true, data: { user, token } }
    if (response.data?.token) {
      console.log('🔐 [authService.signIn] Guardando token en localStorage');
      api.setToken(response.data.token);
    } else {
      console.error('❌ [authService.signIn] Token no encontrado en response.data');
    }

    console.log('🔐 [authService.signIn] Devolviendo:', response.data);
    return response.data!;
  },

  async signOut() {
    api.setToken(null);
  },

  async signInWithGoogle() {
    // OAuth flow - redirect to backend Google OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/google`;
  },

  async resetPassword(email: string) {
    await api.post('/auth/reset-password', { email });
  },

  async updatePassword(newPassword: string) {
    await api.put('/auth/password', { newPassword });
  },

  async getSession() {
    if (!api.getToken()) return null;
    try {
      const response = await api.get<{ user: User }>('/auth/me');
      return response.data?.user || null;
    } catch {
      api.setToken(null);
      return null;
    }
  },

  async getUser() {
    const session = await this.getSession();
    return session;
  },
};

// ============================================
// PRODUCTS SERVICE
// ============================================

export const productService = {
  async getAll(filters?: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  }) {
    const params: Record<string, string> = {};
    if (filters?.category) params.category = filters.category;
    if (filters?.search) params.search = filters.search;
    if (filters?.minPrice) params.minPrice = filters.minPrice.toString();
    if (filters?.maxPrice) params.maxPrice = filters.maxPrice.toString();
    if (filters?.limit) params.limit = filters.limit.toString();
    if (filters?.offset) params.offset = filters.offset.toString();

    const response = await api.get<Product[]>('/products', params);
    return response.data || [];
  },

  async getBySlug(slug: string) {
    const response = await api.get<Product>(`/products/slug/${slug}`);
    return response.data!;
  },

  async getById(id: string) {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data!;
  },

  async getFeatured() {
    const response = await api.get<Product[]>('/products/featured');
    return response.data || [];
  },

  async getRelated(productId: string, categoryId: string) {
    const response = await api.get<Product[]>(`/products/${productId}/related`, { categoryId });
    return response.data || [];
  },

  async search(query: string) {
    const response = await api.get<Product[]>('/products/search', { q: query });
    return response.data || [];
  },

  // Admin functions
  async create(product: Partial<Product>) {
    const response = await api.post<Product>('/products', product);
    return response.data!;
  },

  async update(id: string, updates: Partial<Product>) {
    const response = await api.put<Product>(`/products/${id}`, updates);
    return response.data!;
  },

  async delete(id: string) {
    await api.delete(`/products/${id}`);
  },

  // Image management
  async addImage(productId: string, imageData: { url: string; alt_text?: string; position?: number; is_primary?: boolean }) {
    const response = await api.post<any>(`/products/${productId}/images`, imageData);
    return response.data;
  },

  async deleteImage(imageId: string) {
    await api.delete(`/products/images/${imageId}`);
  },

  // Get all products for admin (includes inactive)
  async getAllAdmin(filters?: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
    includeInactive?: boolean;
  }) {
    const params: Record<string, string> = {};
    if (filters?.category) params.category = filters.category;
    if (filters?.search) params.search = filters.search;
    if (filters?.minPrice) params.minPrice = filters.minPrice.toString();
    if (filters?.maxPrice) params.maxPrice = filters.maxPrice.toString();
    if (filters?.limit) params.limit = filters.limit.toString();
    if (filters?.offset) params.offset = filters.offset.toString();
    if (filters?.includeInactive) params.includeInactive = 'true';

    const response = await api.get<Product[]>('/products/admin', params);
    return response.data || [];
  },
};

// ============================================
// CATEGORIES SERVICE
// ============================================

export const categoryService = {
  async getAll() {
    const response = await api.get<Category[]>('/categories');
    return response.data || [];
  },

  async getBySlug(slug: string) {
    const response = await api.get<Category>(`/categories/slug/${slug}`);
    return response.data!;
  },

  async create(category: Partial<Category>) {
    const response = await api.post<Category>('/categories', category);
    return response.data!;
  },

  async update(id: string, updates: Partial<Category>) {
    const response = await api.put<Category>(`/categories/${id}`, updates);
    return response.data!;
  },

  async delete(id: string) {
    await api.delete(`/categories/${id}`);
  },
};

// ============================================
// ORDERS SERVICE
// ============================================

export const orderService = {
  async create(order: Partial<Order> & { items: Array<{ product_id: string; variant_id?: string; quantity: number; price: number }> }) {
    const response = await api.post<Order>('/orders', order);
    return response.data!;
  },

  async getByUser(userId: string) {
    const response = await api.get<Order[]>('/orders/my-orders');
    return response.data || [];
  },

  async getById(id: string) {
    const response = await api.get<Order>(`/orders/${id}`);
    return response.data!;
  },

  async getAll(filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.limit) params.limit = filters.limit.toString();
    if (filters?.offset) params.offset = filters.offset.toString();

    const response = await api.get<Order[]>('/orders', params);
    return { data: response.data || [], count: (response as any).count || 0 };
  },

  async updateStatus(id: string, status: string) {
    const response = await api.patch<Order>(`/orders/${id}/status`, { status });
    return response.data!;
  },

  async updateTracking(id: string, trackingNumber: string, trackingUrl?: string) {
    const response = await api.patch<Order>(`/orders/${id}/tracking`, { trackingNumber, trackingUrl });
    return response.data!;
  },

  async createPaymentIntent(amount: number, orderId?: string): Promise<{ id: string; client_secret: string; amount: number; currency: string; status: string }> {
    const response = await api.post<{ id: string; client_secret: string; amount: number; currency: string; status: string }>('/orders/payment-intent', { amount, orderId });
    return response.data!;
  },

  async confirmPayment(paymentIntentId: string, orderId: string): Promise<any> {
    const response = await api.post('/orders/confirm-payment', { paymentIntentId, orderId });
    return response.data;
  },
};

// ============================================
// USER SERVICE
// ============================================

import type { TeamMember, Commission, CommissionSummary, UserNotification } from '@/types';

// ============================================
// WISHLIST SERVICE
// ============================================

import type { WishlistItem } from '@/types';

export const wishlistService = {
  async getIds() {
    const response = await api.get<string[]>('/wishlist/ids');
    return response.data || [];
  },

  async getAll(filters?: { limit?: number; offset?: number }) {
    const params: Record<string, string> = {};
    if (filters?.limit !== undefined) params.limit = String(filters.limit);
    if (filters?.offset !== undefined) params.offset = String(filters.offset);

    const response = await api.get<WishlistItem[]>('/wishlist', params);
    return { data: response.data || [], count: (response as any).count || 0 };
  },

  async add(productId: string) {
    const response = await api.post<{ added: boolean }>('/wishlist', { productId });
    return response.data || { added: true };
  },

  async remove(productId: string) {
    const response = await api.delete<{ removed: boolean }>(`/wishlist/${productId}`);
    return response.data || { removed: true };
  },
};

export const userService = {
  async getProfile(userId: string) {
    const response = await api.get<User & { addresses: Address[]; team_member?: TeamMember }>('/users/profile');
    return response.data!;
  },

  async updateProfile(userId: string, updates: Partial<User>) {
    const response = await api.put<User>('/users/profile', updates);
    return response.data!;
  },

  async getAll(filters?: { role?: string; search?: string; limit?: number; offset?: number }) {
    const params: Record<string, string> = {};
    if (filters?.role) params.role = filters.role;
    if (filters?.search) params.search = filters.search;
    if (filters?.limit) params.limit = filters.limit.toString();
    if (filters?.offset) params.offset = filters.offset.toString();

    const response = await api.get<User[]>('/users', params);
    return { data: response.data || [], count: (response as any).count || 0 };
  },

  async addAddress(address: Partial<Address>) {
    const response = await api.post<Address>('/users/addresses', address);
    return response.data!;
  },

  async updateAddress(addressId: string, updates: Partial<Address>) {
    const response = await api.put<Address>(`/users/addresses/${addressId}`, updates);
    return response.data!;
  },

  async deleteAddress(addressId: string) {
    await api.delete(`/users/addresses/${addressId}`);
  },

  // Team member functions
  async getMyTeamMember() {
    const response = await api.get<TeamMember>('/commissions/team-members/me');
    return response.data;
  },

  async getAllTeamMembers() {
    const response = await api.get<TeamMember[]>('/commissions/team-members');
    return response.data || [];
  },

  async createTeamMember(data: Partial<TeamMember>) {
    const response = await api.post<TeamMember>('/commissions/team-members', data);
    return response.data!;
  },

  async updateTeamMember(id: string, updates: Partial<TeamMember>) {
    const response = await api.put<TeamMember>(`/commissions/team-members/${id}`, updates);
    return response.data!;
  },

  // Commission functions
  async getAllCommissions(filters?: { team_member_id?: string; status?: string; limit?: number; offset?: number }) {
    const params: Record<string, string> = {};
    if (filters?.team_member_id) params.team_member_id = filters.team_member_id;
    if (filters?.status) params.status = filters.status;
    if (filters?.limit) params.limit = filters.limit.toString();
    if (filters?.offset) params.offset = filters.offset.toString();

    const response = await api.get<Commission[]>('/commissions', params);
    return response.data || [];
  },

  async getMyCommissions(filters?: { status?: string; limit?: number; offset?: number }) {
    // For team members to get their own commissions
    const myTeamMember = await this.getMyTeamMember();
    if (!myTeamMember) return { data: [], count: 0 };

    const commissions = await this.getAllCommissions({
      ...filters,
      team_member_id: myTeamMember.id,
    });
    return { data: commissions, count: commissions.length };
  },

  async getCommissionSummary(teamMemberId?: string) {
    const params: Record<string, string> = {};
    if (teamMemberId) params.team_member_id = teamMemberId;

    const response = await api.get<CommissionSummary>('/commissions/summary', params);
    return response.data!;
  },

  async updateCommissionStatus(commissionId: string, status: string) {
    const response = await api.put(`/commissions/${commissionId}/status`, { status });
    return response.data;
  },

  // Commission payments
  async recordCommissionPayment(data: any) {
    const response = await api.post('/commissions/payments', data);
    return response.data;
  },

  // Notifications
  async getNotifications(limit = 20) {
    const response = await api.get<UserNotification[]>('/users/notifications', { limit: limit.toString() });
    return { data: response.data || [], unread_count: (response as any).unread_count || 0 };
  },

  async markNotificationAsRead(notificationId: string) {
    await api.put(`/users/notifications/${notificationId}/read`);
  },

  async markAllNotificationsAsRead() {
    await api.put('/users/notifications/read-all');
  },

  // Debug endpoint
  async getUserDebugInfo() {
    const response = await api.get<{
      user_id: string;
      email: string;
      role: string;
      full_profile: any;
      team_member: any;
      is_admin: boolean;
      is_super_admin: boolean;
      has_team_member_record: boolean;
      commission_percentage: number;
    }>('/users/debug');
    return response.data!;
  },

  // Owner dashboard
  async getOwnerDashboardStats() {
    const response = await api.get<{
      total_revenue: number;
      total_orders: number;
      total_customers: number;
      total_products: number;
      pending_commissions: number;
      monthly_revenue: { month: string; revenue: number }[];
    }>('/commissions/dashboard-stats');
    return response.data!;
  },

  // Admin management (Super Admin only)
  async getAllAdmins() {
    const response = await api.get<User[]>('/users/admins');
    return response.data || [];
  },

  async createAdmin(data: { email: string; password: string; full_name: string }) {
    const response = await api.post<User>('/users/admins', data);
    return response.data!;
  },

  async updateAdmin(id: string, data: { email?: string; password?: string; full_name?: string }) {
    const response = await api.put<User>(`/users/admins/${id}`, data);
    return response.data!;
  },

  async deleteAdmin(id: string) {
    await api.delete(`/users/admins/${id}`);
  },

  async updateUser(id: string, updates: Partial<User>) {
    const response = await api.put<User>(`/users/${id}`, updates);
    return response.data!;
  },

  async deleteUser(id: string) {
    await api.delete(`/users/${id}`);
  },
};

// ============================================
// CHAT SERVICE
// ============================================

export const chatService = {
  async getConversations(userId?: string) {
    const endpoint = userId ? '/chat/conversations' : '/chat/admin/conversations';
    const response = await api.get<Conversation[]>(endpoint);
    return response.data || [];
  },

  async getMessages(conversationId: string) {
    const response = await api.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`);
    return response.data || [];
  },

  async sendMessage(message: Partial<ChatMessage>) {
    const response = await api.post<ChatMessage>(`/chat/conversations/${message.conversation_id}/messages`, {
      content: message.content,
      message_type: message.message_type || 'text',
      metadata: message.metadata,
    });
    return response.data!;
  },

  async createConversation(conversation: Partial<Conversation>) {
    const response = await api.post<Conversation>('/chat/conversations', {
      channel: conversation.channel || 'website',
    });
    return response.data!;
  },

  async markAsRead(conversationId: string) {
    await api.post(`/chat/conversations/${conversationId}/read`);
  },

  // Note: Real-time subscriptions would need WebSocket implementation
  // For now, these are stubs that can be implemented later
  subscribeToMessages(_conversationId: string, _callback: (message: ChatMessage) => void) {
    // TODO: Implement WebSocket subscription
    return { unsubscribe: () => {} };
  },

  subscribeToConversations(_callback: (conversation: Conversation) => void) {
    // TODO: Implement WebSocket subscription
    return { unsubscribe: () => {} };
  },
};

// ============================================
// ANALYTICS SERVICE
// ============================================

export const analyticsService = {
  async getDashboardMetrics() {
    const response = await api.get<DashboardMetrics>('/analytics/dashboard');
    return response.data!;
  },

  async getRevenueByPeriod(startDate: string, endDate: string) {
    const response = await api.get<Array<{ date: string; revenue: number }>>('/analytics/revenue', {
      startDate,
      endDate,
    });
    return response.data || [];
  },

  async getTopProducts(limit = 10) {
    const response = await api.get<Array<{ id: string; name: string; price: number; total_sold: number; total_revenue: number; images: any[] }>>('/analytics/top-products', {
      limit: limit.toString(),
    });
    return response.data || [];
  },

  async getOrdersByStatus() {
    const response = await api.get<Array<{ status: string; count: number }>>('/analytics/orders-by-status');
    return response.data || [];
  },

  async getSalesOverview(days = 30) {
    const response = await api.get<SalesOverview[]>('/analytics/sales-overview', {
      days: days.toString(),
    });
    return response.data || [];
  },

  // Get product stats for admin
  async getProductStats(productId: string) {
    const response = await api.get<ProductStats>(`/analytics/products/${productId}/stats`);
    return response.data;
  },

  // Get all products with stats for admin dashboard
  async getAllProductsWithStats(limit = 50, offset = 0) {
    const response = await api.get<ProductWithStats[]>('/analytics/products', {
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return response.data || [];
  },

  // Get revenue by category
  async getRevenueByCategory() {
    const response = await api.get<CategoryRevenue[]>('/analytics/revenue-by-category');
    return response.data || [];
  },

  // Get monthly revenue comparison
  async getMonthlyRevenue() {
    const response = await api.get<MonthlyRevenue[]>('/analytics/monthly-revenue');
    return response.data || [];
  },

  // Get recent orders
  async getRecentOrders(limit = 10) {
    const response = await api.get<Order[]>('/analytics/recent-orders', {
      limit: limit.toString(),
    });
    return response.data || [];
  },

  // Get sales by gender
  async getSalesByGender() {
    const response = await api.get<SalesByGender[]>('/analytics/sales-by-gender');
    return response.data || [];
  },
};

// ============================================
// STORAGE SERVICE (uses Supabase directly for file uploads)
// ============================================

// Note: For file uploads, you may want to keep using Supabase Storage
// or implement a file upload endpoint in your backend
export const storageService = {
  async uploadImage(_file: File, _bucket = 'products'): Promise<string> {
    // TODO: Implement file upload through backend or keep Supabase Storage
    throw new Error('File upload not implemented. Consider using Supabase Storage directly.');
  },

  async deleteImage(_url: string, _bucket = 'products'): Promise<void> {
    // TODO: Implement file deletion through backend
    throw new Error('File deletion not implemented.');
  },
};