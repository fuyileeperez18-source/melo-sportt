import { Request } from 'express';

// User Types
export type UserRole = 'customer' | 'admin' | 'super_admin' | 'developer';
export type UserGender = 'masculino' | 'femenino' | 'otro' | 'prefiero_no_decir';
export type DocumentType = 'cc' | 'ce' | 'passport' | 'nit';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  // Extended profile fields
  bio?: string;
  birth_date?: string;
  document_type?: DocumentType;
  document_number?: string;
  preferred_size?: string;
  preferred_shoe_size?: string;
  gender?: UserGender;
  instagram_handle?: string;
  is_active: boolean;
  last_login?: string;
  preferences?: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  notifications_email?: boolean;
  notifications_sms?: boolean;
  notifications_push?: boolean;
  newsletter?: boolean;
  language?: string;
  currency?: string;
}

// Team member (for store staff like owner, developer, etc.)
export interface TeamMember {
  id: string;
  user_id: string;
  user?: User;
  position: string; // 'owner', 'developer', 'manager', etc
  commission_percentage: number;
  can_manage_products: boolean;
  can_manage_orders: boolean;
  can_view_analytics: boolean;
  can_manage_customers: boolean;
  can_manage_settings: boolean;
  can_manage_team: boolean;
  notes?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

// Commission tracking
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';

export interface Commission {
  id: string;
  team_member_id: string;
  team_member?: TeamMember;
  order_id?: string;
  order?: Order;
  order_total: number;
  commission_percentage: number;
  commission_amount: number;
  status: CommissionStatus;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CommissionPayment {
  id: string;
  team_member_id: string;
  team_member?: TeamMember;
  amount: number;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
  paid_by?: string;
  created_at: string;
}

export interface CommissionSummary {
  total_earned: number;
  total_pending: number;
  total_paid: number;
  this_month_earned: number;
  last_month_earned: number;
  orders_count: number;
}

// User notifications
export type NotificationType = 'order' | 'commission' | 'promotion' | 'system';

export interface UserNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

// Product Types
export type ProductGender = 'hombre' | 'mujer' | 'unisex' | 'nino' | 'nina';
export type ProductType = 'camiseta' | 'camisa' | 'pantalon' | 'chaqueta' | 'sudadera' | 'short' | 'accesorio' | 'zapato' | 'vestido' | 'falda' | 'otro';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  compare_at_price?: number | null;
  cost_per_item?: number | null;
  sku: string;
  barcode?: string;
  quantity: number;
  track_quantity: boolean;
  continue_selling_when_out_of_stock: boolean;
  category_id: string;
  category?: Category;
  brand?: string | null;
  tags: string[];
  images?: ProductImage[];
  variants?: ProductVariant[];
  is_active: boolean;
  is_featured: boolean;
  seo_title?: string;
  seo_description?: string;
  // Nuevos campos para filtrado
  gender?: ProductGender;
  product_type?: ProductType;
  sizes?: string[];  // ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  colors?: string[]; // ['Negro', 'Blanco', 'Azul']
  material?: string | null; // 'Algodón', 'Poliéster', etc.
  weight?: number | null; // Peso en gramos
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string;
  position: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price: number;
  compare_at_price?: number | null;
  quantity: number;
  options: VariantOption[];
  image_url?: string;
  is_active: boolean;
}

export interface VariantOption {
  name: string;
  value: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  position: number;
  is_active: boolean;
  products_count?: number;
}

// Order Types
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  user?: User;
  items?: OrderItem[];
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  payment_id?: string;
  shipping_address: Address;
  billing_address: Address;
  tracking_number?: string;
  tracking_url?: string;
  notes?: string;
  coupon_code?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product?: Product;
  variant_id?: string;
  variant?: ProductVariant;
  quantity: number;
  price: number;
  total: number;
}

// Chat Types
export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'bot' | 'agent';
  sender_id?: string;
  content: string;
  message_type: 'text' | 'image' | 'product' | 'order' | 'quick_reply';
  metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id?: string;
  user?: User;
  channel: 'website' | 'whatsapp' | 'instagram';
  status: 'active' | 'resolved' | 'pending';
  assigned_to?: string;
  messages?: ChatMessage[];
  unread_count: number;
  created_at: string;
  updated_at: string;
}

// Auth Types
export interface AuthRequest extends Request {
  user?: User;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Analytics Types
export interface DashboardMetrics {
  today_revenue: number;
  today_orders: number;
  pending_orders: number;
  low_stock_products: number;
  new_customers_today: number;
  revenue_change: number;
  orders_change: number;
}
