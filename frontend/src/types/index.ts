// ============================================
// MELO SPORTT - TYPE DEFINITIONS
// ============================================

// User Types
export type UserRole = 'customer' | 'admin' | 'super_admin' | 'developer';
export type UserGender = 'masculino' | 'femenino' | 'otro' | 'prefiero_no_decir';
export type DocumentType = 'cc' | 'ce' | 'passport' | 'nit';

export interface UserPreferences {
  notifications_email?: boolean;
  notifications_sms?: boolean;
  notifications_push?: boolean;
  newsletter?: boolean;
  language?: string;
  currency?: string;
}

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
  is_active?: boolean;
  last_login?: string;
  preferences?: UserPreferences;
  created_at: string;
  updated_at: string;
  // Relations
  addresses?: Address[];
  team_member?: TeamMember;
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
  // Extended fields for order snapshots
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  apartment?: string;
  postalCode?: string;
}

// Team member (for store staff like owner, developer, etc.)
export interface TeamMember {
  id: string;
  user_id: string;
  user?: User;
  position: string;
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

// Product Types
export type ProductGender = 'hombre' | 'mujer' | 'unisex' | 'nino' | 'nina';
export type ProductType = 'camiseta' | 'camisa' | 'pantalon' | 'chaqueta' | 'sudadera' | 'short' | 'accesorio' | 'zapato' | 'vestido' | 'falda' | 'otro';

export interface ProductAccessory {
  type: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  compare_at_price?: number;
  cost_per_item?: number;
  sku: string;
  barcode?: string;
  quantity: number;
  track_quantity: boolean;
  continue_selling_when_out_of_stock: boolean;
  category_id?: string;
  category?: Category;
  brand?: string;
  tags: string[];
  images: ProductImage[];
  variants: ProductVariant[];
  is_active: boolean;
  is_featured: boolean;
  seo_title?: string;
  seo_description?: string;
  // Nuevos campos para filtrado
  gender?: ProductGender;
  product_type?: ProductType;
  sizes?: string[];
  colors?: string[];
  material?: string;
  weight?: number;
  // Campos para conjuntos con accesorios
  is_set?: boolean; // Indica si es un conjunto
  accessories?: ProductAccessory[]; // Array de accesorios opcionales
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
  compare_at_price?: number;
  quantity: number;
  options: VariantOption[];
  image_url?: string;
  is_active: boolean;
}

export interface VariantOption {
  name: string; // e.g., "Size", "Color"
  value: string; // e.g., "XL", "Black"
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

// Cart Types
export interface WishlistItem {
  product: Product;
  added_at: string;
}

export interface CartItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  price: number;
  selected_accessories?: string[]; // Para conjuntos: tipos de accesorios seleccionados
}

export interface Cart {
  id: string;
  user_id?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  coupon_code?: string;
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
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  payment_id?: string;
  mp_preference_id?: string;
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
  product: Product;
  variant_id?: string;
  variant?: ProductVariant;
  quantity: number;
  price: number;
  total: number;
}

// Payment Types
export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

// Coupon Types
export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_purchase?: number;
  maximum_discount?: number;
  usage_limit?: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

// Review Types
export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user?: User;
  rating: number;
  title: string;
  content: string;
  images?: string[];
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
}

// Wishlist Types
export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  product: Product;
  added_at: string;
}

// Analytics Types
export interface AnalyticsData {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  average_order_value: number;
  conversion_rate: number;
  top_products: Product[];
  revenue_by_date: { date: string; revenue: number }[];
  orders_by_status: { status: OrderStatus; count: number }[];
}

export interface DashboardMetrics {
  today_revenue: number;
  today_orders: number;
  pending_orders: number;
  low_stock_products: number;
  new_customers_today: number;
  revenue_change: number;
  orders_change: number;
}

// Product Stats for Admin
export interface ProductStats {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  is_active: boolean;
  is_featured: boolean;
  images: ProductImage[];
  total_sold: number;
  order_count: number;
  total_revenue: number;
}

// Extended Product with Stats for Admin
export interface ProductWithStats extends Omit<Product, 'category'> {
  images: ProductImage[];
  total_sold: number;
  order_count: number;
  total_revenue: number;
}

// Category Revenue
export interface CategoryRevenue {
  id: string;
  name: string;
  slug: string;
  revenue: number;
  items_sold: number;
  orders_count: number;
}

// Monthly Revenue
export interface MonthlyRevenue {
  month: string;
  month_label: string;
  revenue: number;
  orders: number;
}

// Sales by Gender
export interface SalesByGender {
  gender: string;
  items_sold: number;
  revenue: number;
  orders: number;
}

// Sales Overview
export interface SalesOverview {
  date: string;
  orders: number;
  revenue: number;
}

// Chart Data Types
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface LineChartData {
  date: string;
  revenue: number;
  orders?: number;
}

// Chat/WhatsApp Types
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
  last_message?: ChatMessage;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuickReply {
  id: string;
  text: string;
  payload: string;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: 'order' | 'promotion' | 'stock' | 'system';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// Settings Types
export interface StoreSettings {
  store_name: string;
  store_description: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  address: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  currency: string;
  timezone: string;
  tax_rate: number;
  free_shipping_threshold?: number;
  default_shipping_cost: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
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

// Form Types
export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface NewsletterFormData {
  email: string;
}

// Filter Types
export interface ProductFilters {
  category?: string;
  min_price?: number;
  max_price?: number;
  sizes?: string[];
  colors?: string[];
  brands?: string[];
  sort_by?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';
  search?: string;
}

// SEO Types
export interface SEOData {
  title: string;
  description: string;
  canonical?: string;
  og_image?: string;
  og_type?: string;
  keywords?: string[];
  structured_data?: Record<string, unknown>;
}
