import { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  MessageSquare,
  Tag,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  DollarSign,
  TrendingUp,
  Package as PackageIcon,
  AlertTriangle,
  Clock,
  RefreshCw,
  UserCog,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency } from '@/lib/utils';
import { analyticsService, orderService } from '@/lib/services';
import { StatCard, MiniStat } from '@/components/admin/StatCard';
import { RevenueChart, OrdersChart, CategoryChart, MonthlyChart, GenderChart } from '@/components/admin/Charts';
import type { DashboardMetrics, Order, SalesOverview, CategoryRevenue, MonthlyRevenue, SalesByGender } from '@/types';
import { useOrdersRealtime, useProductRealtime } from '@/hooks/useRealtime';
import toast from 'react-hot-toast';

// Sidebar navigation
const getSidebarItems = (userRole: string | undefined) => {
  const items = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Pedidos', href: '/admin/orders', icon: ShoppingCart, badge: 5 },
    { name: 'Productos', href: '/admin/products', icon: Package },
    { name: 'Clientes', href: '/admin/customers', icon: Users },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Mensajes', href: '/admin/messages', icon: MessageSquare, badge: 3 },
    { name: 'Cupones', href: '/admin/coupons', icon: Tag },
    { name: 'Configuración', href: '/admin/settings', icon: Settings },
  ];

  // Solo mostrar "Gestión de Admins" para super_admin
  if (userRole === 'super_admin') {
    items.splice(items.length - 1, 0, {
      name: 'Gestión de Admins',
      href: '/account/admins',
      icon: UserCog,
    });
  }

  return items;
};

// Order status badge
function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400',
    confirmed: 'bg-blue-500/20 text-blue-400',
    processing: 'bg-purple-500/20 text-purple-400',
    shipped: 'bg-cyan-500/20 text-cyan-400',
    delivered: 'bg-emerald-500/20 text-emerald-400',
    cancelled: 'bg-red-500/20 text-red-400',
    refunded: 'bg-gray-500/20 text-gray-400',
  };

  const labels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    processing: 'Procesando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
  };

  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', styles[status] || 'bg-gray-500/20 text-gray-400')}>
      {labels[status] || status}
    </span>
  );
}

// Sidebar component
function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation();
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();
  const sidebarItems = getSidebarItems(user?.role);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-white border-r border-gray-200 flex flex-col shadow-xl',
          'lg:translate-x-0 lg:static',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-white">
          <Link to="/admin" className="flex items-center gap-2" onClick={onClose}>
            <span className="text-xl font-bold text-black">
              MELO SPORTT
            </span>
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">Admin</span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto bg-white">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-black text-white shadow-lg'
                    : 'text-gray-600 hover:text-black hover:bg-gray-100'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1 font-medium">{item.name}</span>
                {item.badge && (
                  <span className={cn(
                    'px-2 py-0.5 text-xs font-bold rounded-full',
                    isActive ? 'bg-white text-black' : 'bg-red-500 text-white'
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-3 px-4 py-2">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold">
              {user?.full_name?.[0] || user?.email?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-black truncate">
                {user?.full_name || 'Administrador'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 hover:text-black hover:bg-gray-100 rounded-xl transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}

// Main Dashboard component
export function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isMainDashboard = location.pathname === '/admin';

  // Real data state
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [salesOverview, setSalesOverview] = useState<SalesOverview[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<{ status: string; count: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [revenueByCategory, setRevenueByCategory] = useState<CategoryRevenue[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [salesByGender, setSalesByGender] = useState<SalesByGender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        metricsData,
        salesData,
        ordersStatus,
        ordersData,
        productsData,
        categoriesData,
        monthlyData,
        genderData,
      ] = await Promise.all([
        analyticsService.getDashboardMetrics().catch(() => null),
        analyticsService.getSalesOverview(30).catch(() => []),
        analyticsService.getOrdersByStatus().catch(() => []),
        analyticsService.getRecentOrders(5).catch(() => []),
        analyticsService.getTopProducts(5).catch(() => []),
        analyticsService.getRevenueByCategory().catch(() => []),
        analyticsService.getMonthlyRevenue().catch(() => []),
        analyticsService.getSalesByGender().catch(() => []),
      ]);

      if (metricsData) setMetrics(metricsData);
      setSalesOverview(salesData);
      setOrdersByStatus(ordersStatus);
      setRecentOrders(ordersData);
      setTopProducts(productsData);
      setRevenueByCategory(categoriesData);
      setMonthlyRevenue(monthlyData);
      setSalesByGender(genderData);
    } catch (err) {
      setError('Error al cargar datos');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh cada 30 segundos
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Realtime: Escuchar nuevos pedidos
  useOrdersRealtime((payload) => {
    console.log('[Realtime] Nuevo pedido:', payload);
    // Mostrar notificación
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white text-black px-4 py-3 rounded-xl shadow-lg flex items-center gap-3`}>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <div>
          <p className="font-medium">Nuevo pedido!</p>
          <p className="text-sm text-gray-500">Se actualizará el dashboard</p>
        </div>
      </div>
    ));
    // Refrescar datos
    fetchData();
  });

  // Realtime: Escuchar cambios en productos (stock)
  useProductRealtime((payload) => {
    console.log('[Realtime] Cambio en producto:', payload);
    if (payload.eventType === 'UPDATE' && payload.new.quantity !== payload.old?.quantity) {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white text-black px-4 py-3 rounded-xl shadow-lg flex items-center gap-3`}>
          <PackageIcon className="w-5 h-5 text-blue-500" />
          <div>
            <p className="font-medium">Stock actualizado</p>
            <p className="text-sm text-gray-500">Producto: {payload.new.name?.slice(0, 30)}...</p>
          </div>
        </div>
      ));
    }
    fetchData();
  });

  // Calculate total revenue from sales overview
  const totalRevenue = salesOverview.reduce((acc, item) => acc + (item.revenue || 0), 0);
  const totalOrders = salesOverview.reduce((acc, item) => acc + (item.orders || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex">{/* Fondo gris claro para contraste elegante */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-800" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos, pedidos..."
                className="w-72 h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 text-gray-800 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Bell className="h-5 w-5 text-gray-800" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-black rounded-full" />
            </button>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-white font-bold text-sm">
                A
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </div>
          </div>
        </header>

        {/* Content */}
        {isMainDashboard ? (
          <main className="flex-1 p-6 overflow-y-auto">
            {loading && !metrics ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-black mx-auto mb-4" />
                  <p className="text-gray-600">Cargando estadísticas...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <p className="text-black font-medium mb-2">{error}</p>
                  <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Page title */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-black">Dashboard</h1>
                    <p className="text-gray-600 mt-1">Bienvenido de nuevo. Aquí están tus estadísticas en tiempo real.</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    Última actualización: {new Date().toLocaleTimeString('es-CO')}
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <StatCard
                    title="Ingresos Hoy"
                    value={metrics?.today_revenue || 0}
                    change={metrics?.revenue_change}
                    icon={DollarSign}
                    iconColor="text-black"
                    iconBg="bg-gray-100"
                    format="currency"
                    delay={0}
                  />
                  <StatCard
                    title="Pedidos Hoy"
                    value={metrics?.today_orders || 0}
                    change={metrics?.orders_change}
                    icon={ShoppingCart}
                    iconColor="text-black"
                    iconBg="bg-gray-100"
                    delay={0.1}
                  />
                  <StatCard
                    title="Pedidos Pendientes"
                    value={metrics?.pending_orders || 0}
                    icon={Clock}
                    iconColor="text-black"
                    iconBg="bg-gray-100"
                    delay={0.2}
                  />
                  <StatCard
                    title="Stock Bajo"
                    value={metrics?.low_stock_products || 0}
                    icon={AlertTriangle}
                    iconColor="text-black"
                    iconBg="bg-gray-100"
                    delay={0.3}
                  />
                </div>

                {/* Mini stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <MiniStat
                    title="Ingresos Totales"
                    value={formatCurrency(totalRevenue)}
                    icon={DollarSign}
                    color="black"
                  />
                  <MiniStat
                    title="Total Pedidos"
                    value={totalOrders}
                    icon={ShoppingCart}
                    color="black"
                  />
                  <MiniStat
                    title="Nuevos Clientes"
                    value={metrics?.new_customers_today || 0}
                    icon={Users}
                    color="black"
                  />
                  <MiniStat
                    title="Productos Activos"
                    value={topProducts.length}
                    icon={PackageIcon}
                    color="black"
                  />
                </div>

                {/* Charts row */}
                <div className="grid lg:grid-cols-3 gap-6 mb-8">
                  <div className="lg:col-span-2">
                    <RevenueChart
                      data={salesOverview.map(item => ({
                        date: item.date,
                        revenue: item.revenue,
                        orders: item.orders,
                      }))}
                      title="Ingresos de los últimos 30 días"
                    />
                  </div>
                  <OrdersChart data={ordersByStatus} />
                </div>

                {/* Category and Gender charts */}
                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                  <CategoryChart data={revenueByCategory} />
                  <GenderChart data={salesByGender} />
                </div>

                {/* Monthly Revenue */}
                {monthlyRevenue.length > 0 && (
                  <div className="mb-8">
                    <MonthlyChart data={monthlyRevenue} />
                  </div>
                )}

                {/* Tables row */}
                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                  {/* Recent orders */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-black">Pedidos Recientes</h2>
                      <Link
                        to="/admin/orders"
                        className="text-sm text-gray-600 hover:text-black flex items-center gap-1 font-medium transition-colors"
                      >
                        Ver todos <TrendingUp className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {recentOrders.length > 0 ? recentOrders.map((order) => (
                        <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-100">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                              {order.user?.full_name?.[0] || order.user?.email?.[0] || 'C'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-black truncate">
                                {order.user?.full_name || 'Cliente'}
                              </p>
                              <p className="text-sm text-gray-500 truncate">{order.order_number}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-black">{formatCurrency(order.total)}</p>
                            <OrderStatusBadge status={order.status} />
                          </div>
                        </div>
                      )) : (
                        <p className="text-center text-gray-500 py-8">No hay pedidos recientes</p>
                      )}
                    </div>
                  </motion.div>

                  {/* Top products */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-black">Productos Más Vendidos</h2>
                      <Link
                        to="/admin/products"
                        className="text-sm text-gray-600 hover:text-black flex items-center gap-1 font-medium transition-colors"
                      >
                        Ver todos <TrendingUp className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {topProducts.length > 0 ? topProducts.map((product, index) => (
                        <div key={product.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-100">
                          <span className="text-gray-500 font-bold w-6 flex-shrink-0">{index + 1}</span>
                          <img
                            src={product.images?.[0]?.url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=100'}
                            alt={product.name}
                            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-black truncate">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.total_sold || 0} vendidos</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-black">{formatCurrency(product.total_revenue || 0)}</p>
                            <p className="text-xs text-gray-500">{formatCurrency(product.price)} c/u</p>
                          </div>
                        </div>
                      )) : (
                        <p className="text-center text-gray-500 py-8">No hay productos vendidos aún</p>
                      )}
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </main>
        ) : (
          <main className="flex-1 p-6 overflow-y-auto">
            <Outlet />
          </main>
        )}
      </div>
    </div>
  );
}
