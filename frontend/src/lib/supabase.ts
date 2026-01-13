import { createClient } from '@supabase/supabase-js';
import type { User, Product, Category, Order, Conversation, ChatMessage } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Using demo mode.');
}

export const supabase = createClient(
  supabaseUrl || 'https://demo.supabase.co',
  supabaseAnonKey || 'demo-key'
);

// ============================================
// AUTH FUNCTIONS
// ============================================

export const authService = {
  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ============================================
// PRODUCTS FUNCTIONS
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
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*),
        variants:product_variants(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('category_id', filters.category);
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters?.minPrice) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters?.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Product[];
  },

  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*),
        variants:product_variants(*),
        reviews:product_reviews(
          *,
          user:users(id, full_name, avatar_url)
        )
      `)
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data as Product;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*),
        variants:product_variants(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Product;
  },

  async getFeatured() {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*)
      `)
      .eq('is_active', true)
      .eq('is_featured', true)
      .limit(8);

    if (error) throw error;
    return data as Product[];
  },

  async getRelated(productId: string, categoryId: string) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        images:product_images(*)
      `)
      .eq('category_id', categoryId)
      .neq('id', productId)
      .eq('is_active', true)
      .limit(4);

    if (error) throw error;
    return data as Product[];
  },

  async search(query: string) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        images:product_images(*)
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
      .eq('is_active', true)
      .limit(20);

    if (error) throw error;
    return data as Product[];
  },

  // Admin functions
  async create(product: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  async update(id: string, updates: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// ============================================
// CATEGORIES FUNCTIONS
// ============================================

export const categoryService = {
  async getAll() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('position');

    if (error) throw error;
    return data as Category[];
  },

  async getAllWithProductCount() {
    // Obtener todas las categorías activas
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('position');

    if (categoriesError) throw categoriesError;

    // Para cada categoría, obtener el conteo de productos y la primera imagen
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        // Obtener conteo de productos activos
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id)
          .eq('is_active', true);

        // Si la categoría no tiene image_url, obtener la primera imagen del primer producto
        let image_url = category.image_url;
        if ((!image_url || image_url.trim() === '') && (count || 0) > 0) {
          const { data: products } = await supabase
            .from('products')
            .select(`
              id,
              images:product_images(url, is_primary, position)
            `)
            .eq('category_id', category.id)
            .eq('is_active', true)
            .limit(1);

          if (products && products.length > 0) {
            const firstProduct = products[0] as any;
            if (firstProduct.images && firstProduct.images.length > 0) {
              // Ordenar imágenes: primero las primarias, luego por posición
              const sortedImages = [...firstProduct.images].sort((a: any, b: any) => {
                if (a.is_primary && !b.is_primary) return -1;
                if (!a.is_primary && b.is_primary) return 1;
                return (a.position || 0) - (b.position || 0);
              });
              image_url = sortedImages[0].url;
            }
          }
        }

        return {
          ...category,
          products_count: count || 0,
          image_url,
        };
      })
    );

    return categoriesWithCount as (Category & { products_count: number })[];
  },

  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data as Category;
  },

  async create(category: Partial<Category>) {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async update(id: string, updates: Partial<Category>) {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// ============================================
// ORDERS FUNCTIONS
// ============================================

export const orderService = {
  async create(order: Partial<Order>) {
    const { data, error } = await supabase
      .from('orders')
      .insert(order)
      .select()
      .single();

    if (error) throw error;
    return data as Order;
  },

  async getByUser(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Order[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        user:users(*),
        items:order_items(
          *,
          product:products(*),
          variant:product_variants(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Order;
  },

  async getAll(filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('orders')
      .select(`
        *,
        user:users(id, full_name, email),
        items:order_items(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data as Order[], count };
  },

  async updateStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Order;
  },

  async updateTracking(id: string, trackingNumber: string, trackingUrl?: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        status: 'shipped',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Order;
  },
};

// ============================================
// USER FUNCTIONS
// ============================================

export const userService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        addresses:user_addresses(*)
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data as User;
  },

  async updateProfile(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  },

  async getAll(filters?: { role?: string; search?: string; limit?: number; offset?: number }) {
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data as User[], count };
  },
};

// ============================================
// CHAT/CONVERSATION FUNCTIONS
// ============================================

export const chatService = {
  async getConversations(userId?: string) {
    let query = supabase
      .from('conversations')
      .select(`
        *,
        user:users(id, full_name, email, avatar_url),
        messages:chat_messages(*)
      `)
      .order('updated_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Conversation[];
  },

  async getMessages(conversationId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as ChatMessage[];
  },

  async sendMessage(message: Partial<ChatMessage>) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', message.conversation_id);

    return data as ChatMessage;
  },

  async createConversation(conversation: Partial<Conversation>) {
    const { data, error } = await supabase
      .from('conversations')
      .insert(conversation)
      .select()
      .single();

    if (error) throw error;
    return data as Conversation;
  },

  subscribeToMessages(conversationId: string, callback: (message: ChatMessage) => void) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          callback(payload.new as ChatMessage);
        }
      )
      .subscribe();
  },

  subscribeToConversations(callback: (conversation: Conversation) => void) {
    return supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          callback(payload.new as Conversation);
        }
      )
      .subscribe();
  },
};

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

export const analyticsService = {
  async getDashboardMetrics() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Get today's orders
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', today);

    // Get yesterday's orders
    const { data: yesterdayOrders } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', yesterday)
      .lt('created_at', today);

    // Get pending orders
    const { count: pendingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get low stock products
    const { count: lowStockProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lt('quantity', 10)
      .eq('track_quantity', true);

    // Get today's new customers
    const { count: newCustomers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    const todayRevenue = todayOrders?.reduce((sum, o) => sum + o.total, 0) || 0;
    const yesterdayRevenue = yesterdayOrders?.reduce((sum, o) => sum + o.total, 0) || 0;
    const revenueChange = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 0;

    const todayOrderCount = todayOrders?.length || 0;
    const yesterdayOrderCount = yesterdayOrders?.length || 0;
    const ordersChange = yesterdayOrderCount > 0
      ? ((todayOrderCount - yesterdayOrderCount) / yesterdayOrderCount) * 100
      : 0;

    return {
      today_revenue: todayRevenue,
      today_orders: todayOrderCount,
      pending_orders: pendingOrders || 0,
      low_stock_products: lowStockProducts || 0,
      new_customers_today: newCustomers || 0,
      revenue_change: revenueChange,
      orders_change: ordersChange,
    };
  },

  async getRevenueByPeriod(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('created_at, total')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('payment_status', 'paid');

    if (error) throw error;

    // Group by date
    const revenueByDate = data.reduce((acc, order) => {
      const date = order.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + order.total;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(revenueByDate).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  },

  async getTopProducts(limit = 10) {
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        product_id,
        product:products(id, name, price, images:product_images(url)),
        quantity
      `)
      .order('quantity', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getOrdersByStatus() {
    const { data, error } = await supabase
      .from('orders')
      .select('status');

    if (error) throw error;

    const statusCounts = data.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));
  },
};

// ============================================
// STORAGE FUNCTIONS
// ============================================

export const storageService = {
  async uploadImage(file: File, bucket = 'products') {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async deleteImage(url: string, bucket = 'products') {
    const fileName = url.split('/').pop();
    if (!fileName) return;

    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) throw error;
  },
};

export default supabase;
