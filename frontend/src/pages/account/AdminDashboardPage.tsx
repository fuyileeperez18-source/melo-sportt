import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Plus,
  TrendingUp,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronRight,
  LogOut,
  Shield,
  Store,
  Truck,
  CreditCard,
  Bell,
  MessageSquare,
  Tag,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import {
  productService,
  orderService,
  userService,
  analyticsService,
} from '@/lib/services';
import { formatCurrency } from '@/lib/utils';
import type { Product, Order } from '@/types';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  pendingOrders: number;
  lowStockProducts: number;
}

export function AdminDashboardPage() {
  const { user, profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load analytics data
      const analyticsData = await analyticsService.getDashboardMetrics();

      // Load recent orders
      const ordersData = await orderService.getAll({ limit: 5 });
      setRecentOrders(ordersData.data);

      // Load recent products
      const productsData = await productService.getAllAdmin({ limit: 5 });
      setRecentProducts(productsData);

      // Calculate stats from analytics data
      const totalRevenue = analyticsData.today_revenue || 0;
      const totalOrders = analyticsData.today_orders || 0;
      const totalProducts = productsData.length || 0;
      const totalCustomers = analyticsData.new_customers_today || 0;

      // Count pending orders
      const pendingOrders = ordersData.data.filter(
        (order: Order) => order.status === 'pending'
      ).length;

      // Count low stock products (this would need to be calculated from products)
      const lowStockProducts = productsData.filter(
        (product: Product) => product.quantity > 0 && product.quantity <= 10
      ).length;

      setStats({
        totalRevenue,
        totalOrders,
        totalProducts,
        totalCustomers,
        pendingOrders,
        lowStockProducts,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const quickActions = [
    {
      title: 'Agregar Producto',
      description: 'Crear nuevo producto en la tienda',
      icon: Plus,
      href: '/admin/products',
      color: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30',
    },
    {
      title: 'Ver Pedidos',
      description: 'Gestionar pedidos pendientes',
      icon: ShoppingCart,
      href: '/admin/orders',
      color: 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30',
      badge: stats.pendingOrders > 0 ? stats.pendingOrders : null,
    },
    {
      title: 'Ver Analytics',
      description: 'Estadísticas de ventas y rendimiento',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30',
    },
    {
      title: 'Gestionar Clientes',
      description: 'Ver y administrar usuarios',
      icon: Users,
      href: '/admin/customers',
      color: 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black text-lg font-medium">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">{/* Fondo gris claro para elegancia */}
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-black">Panel de Administración</h1>
                <p className="text-gray-600">Bienvenido, {profile?.full_name}</p>
                {/* Debug Info */}
                <div className="text-xs text-gray-500 mt-1">
                  Rol: {profile?.role} | Email: {profile?.email}
                  {profile?.role !== 'admin' && profile?.role !== 'super_admin' && (
                    <span className="text-red-600 ml-2">⚠️ Este usuario NO tiene permisos de admin</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-full xs:max-w-xs sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats Grid - Mobile first con mejor adaptación */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8">
          <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow w-full">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-gray-100 rounded-md sm:rounded-lg">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
              </div>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <h3 className="text-gray-600 text-xs sm:text-sm mb-1 font-medium truncate">Ingresos Totales</h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-black truncate text-ellipsis overflow-hidden">{formatCurrency(stats.totalRevenue)}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow w-full">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-gray-100 rounded-md sm:rounded-lg">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
              </div>
              {stats.pendingOrders > 0 && (
                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-black text-white text-2xs sm:text-xs rounded-full font-medium truncate max-w-[80px] sm:max-w-none">
                  {stats.pendingOrders} pendientes
                </span>
              )}
            </div>
            <h3 className="text-gray-600 text-xs sm:text-sm mb-1 font-medium truncate">Total Pedidos</h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-black truncate text-ellipsis overflow-hidden">{stats.totalOrders}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow w-full">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-gray-100 rounded-md sm:rounded-lg">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
              </div>
              {stats.lowStockProducts > 0 && (
                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-600 text-white text-2xs sm:text-xs rounded-full font-medium truncate max-w-[80px] sm:max-w-none">
                  {stats.lowStockProducts} bajo stock
                </span>
              )}
            </div>
            <h3 className="text-gray-600 text-xs sm:text-sm mb-1 font-medium truncate">Productos</h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-black truncate text-ellipsis overflow-hidden">{stats.totalProducts}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow w-full">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-gray-100 rounded-md sm:rounded-lg">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
              </div>
            </div>
            <h3 className="text-gray-600 text-xs sm:text-sm mb-1 font-medium truncate">Clientes</h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-black truncate text-ellipsis overflow-hidden">{stats.totalCustomers}</p>
          </div>
        </div>

        {/* Quick Actions - Mejor adaptación móvil */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-black mb-3 sm:mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.href}
                className="bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 hover:border-black hover:shadow-lg transition-all duration-200 block group w-full"
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <action.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-black" />
                  {action.badge && (
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-black text-white text-2xs sm:text-xs rounded-full font-medium truncate max-w-[60px] sm:max-w-none">
                      {action.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-black text-sm sm:text-base mb-1 truncate">{action.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm line-clamp-2 min-h-[2.5em]">{action.description}</p>
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 group-hover:text-black mt-1 sm:mt-2 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity - Optimizado para móviles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Recent Orders - Scroll horizontal en móviles */}
          <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl overflow-hidden shadow-sm w-full">
            <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-black flex items-center gap-1 sm:gap-2 truncate">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-black flex-shrink-0" />
                <span className="truncate">Pedidos Recientes</span>
              </h3>
              <Link
                to="/admin/orders"
                className="text-gray-600 hover:text-black text-xs sm:text-sm flex items-center gap-1 font-medium transition-colors whitespace-nowrap"
              >
                Ver todos <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-1 sm:mb-2 gap-2">
                      <span className="text-black font-medium text-sm sm:text-base truncate">#{order.order_number}</span>
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-2xs sm:text-xs font-medium truncate max-w-[100px] sm:max-w-none ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.status === 'delivered' ? 'Entregado' :
                         order.status === 'shipped' ? 'Enviado' :
                         order.status === 'processing' ? 'Procesando' :
                         order.status === 'pending' ? 'Pendiente' :
                         order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                      <span className="text-gray-600 truncate">
                        {new Date(order.created_at).toLocaleDateString('es-ES')}
                      </span>
                      <span className="text-black font-medium truncate text-ellipsis overflow-hidden">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 sm:p-6 md:p-8 text-center text-gray-500">
                  <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                  <p className="text-sm sm:text-base">No hay pedidos recientes</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Products - Optimizado para móviles */}
          <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl overflow-hidden shadow-sm w-full">
            <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-black flex items-center gap-1 sm:gap-2 truncate">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-black flex-shrink-0" />
                <span className="truncate">Productos Recientes</span>
              </h3>
              <Link
                to="/admin/products"
                className="text-gray-600 hover:text-black text-xs sm:text-sm flex items-center gap-1 font-medium transition-colors whitespace-nowrap"
              >
                Ver todos <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
              {recentProducts.length > 0 ? (
                recentProducts.map((product) => (
                  <div key={product.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <img
                        src={product.images?.[0]?.url || 'https://via.placeholder.com/40'}
                        alt={product.name}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg object-cover border border-gray-200 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-black font-medium text-sm sm:text-base truncate">{product.name}</h4>
                        <p className="text-gray-600 text-xs sm:text-sm truncate">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-black font-medium text-sm sm:text-base truncate">{formatCurrency(product.price)}</span>
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-2xs sm:text-xs font-medium truncate max-w-[70px] sm:max-w-none ${
                          product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {product.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-2xs sm:text-xs font-medium truncate max-w-[90px] sm:max-w-none ${
                          product.quantity > 10 ? 'bg-green-100 text-green-700' :
                          product.quantity > 0 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          Stock: {product.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 sm:p-6 md:p-8 text-center text-gray-500">
                  <Package className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                  <p className="text-sm sm:text-base">No hay productos recientes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Admin Navigation - Optimizada para móviles */}
        <div className="mt-6 sm:mt-8 bg-white border border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-black mb-3 sm:mb-4">Navegación Rápida</h3>
          <div className="grid grid-cols-3 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            <Link
              to="/admin/products"
              className="flex flex-col items-center p-2 sm:p-3 md:p-4 bg-gray-50 hover:bg-black hover:text-white rounded-md sm:rounded-lg transition-all group border border-gray-200"
            >
              <Package className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-black group-hover:text-white mb-1 sm:mb-2 transition-colors" />
              <span className="text-gray-700 group-hover:text-white text-xs sm:text-sm font-medium transition-colors truncate text-center w-full">Productos</span>
            </Link>
            <Link
              to="/admin/orders"
              className="flex flex-col items-center p-2 sm:p-3 md:p-4 bg-gray-50 hover:bg-black hover:text-white rounded-md sm:rounded-lg transition-all group border border-gray-200"
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-black group-hover:text-white mb-1 sm:mb-2 transition-colors" />
              <span className="text-gray-700 group-hover:text-white text-xs sm:text-sm font-medium transition-colors truncate text-center w-full">Pedidos</span>
            </Link>
            <Link
              to="/admin/customers"
              className="flex flex-col items-center p-2 sm:p-3 md:p-4 bg-gray-50 hover:bg-black hover:text-white rounded-md sm:rounded-lg transition-all group border border-gray-200"
            >
              <Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-black group-hover:text-white mb-1 sm:mb-2 transition-colors" />
              <span className="text-gray-700 group-hover:text-white text-xs sm:text-sm font-medium transition-colors truncate text-center w-full">Clientes</span>
            </Link>
            <Link
              to="/admin/analytics"
              className="flex flex-col items-center p-2 sm:p-3 md:p-4 bg-gray-50 hover:bg-black hover:text-white rounded-md sm:rounded-lg transition-all group border border-gray-200"
            >
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-black group-hover:text-white mb-1 sm:mb-2 transition-colors" />
              <span className="text-gray-700 group-hover:text-white text-xs sm:text-sm font-medium transition-colors truncate text-center w-full">Analytics</span>
            </Link>
            <Link
              to="/admin/settings"
              className="flex flex-col items-center p-2 sm:p-3 md:p-4 bg-gray-50 hover:bg-black hover:text-white rounded-md sm:rounded-lg transition-all group border border-gray-200"
            >
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-black group-hover:text-white mb-1 sm:mb-2 transition-colors" />
              <span className="text-gray-700 group-hover:text-white text-xs sm:text-sm font-medium transition-colors truncate text-center w-full">Ajustes</span>
            </Link>
            <Link
              to="/shop"
              className="flex flex-col items-center p-2 sm:p-3 md:p-4 bg-gray-50 hover:bg-black hover:text-white rounded-md sm:rounded-lg transition-all group border border-gray-200"
            >
              <Store className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-black group-hover:text-white mb-1 sm:mb-2 transition-colors" />
              <span className="text-gray-700 group-hover:text-white text-xs sm:text-sm font-medium transition-colors truncate text-center w-full">Tienda</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}