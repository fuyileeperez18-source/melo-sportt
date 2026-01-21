import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Calendar,
  BarChart3,
  Wallet,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { userService, orderService } from '@/lib/services';
import type { Order, TeamMember } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface OwnerStats {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  total_products: number;
  pending_commissions: number;
  monthly_revenue: { month: string; revenue: number }[];
}

export function OwnerDashboardPage() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [statsData, ordersData, teamData] = await Promise.all([
        userService.getOwnerDashboardStats(),
        orderService.getAll({ limit: 5 }),
        userService.getAllTeamMembers().catch(() => [])
      ]);
      setStats(statsData);
      setRecentOrders(ordersData.data);
      setTeamMembers(teamData);
    } catch (error) {
      console.error('Error loading owner dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500/20 text-green-400';
      case 'shipped': return 'bg-blue-500/20 text-blue-400';
      case 'processing': return 'bg-yellow-500/20 text-yellow-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered': return 'Entregado';
      case 'shipped': return 'Enviado';
      case 'processing': return 'Procesando';
      case 'confirmed': return 'Confirmado';
      case 'cancelled': return 'Cancelado';
      default: return 'Pendiente';
    }
  };

  // Calcular el cambio porcentual
  const currentMonthRevenue = stats?.monthly_revenue?.[0]?.revenue || 0;
  const lastMonthRevenue = stats?.monthly_revenue?.[1]?.revenue || 0;
  const revenueChange = lastMonthRevenue > 0
    ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/account"
              className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Dashboard Propietario</h1>
                <Crown className="w-6 h-6 text-yellow-400" />
              </div>
              <p className="text-zinc-500">Bienvenido, {profile?.full_name}</p>
            </div>
          </div>
          <Link
            to="/admin"
            className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            Panel Admin Completo
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-800/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              {revenueChange !== 0 && (
                <div className={`flex items-center gap-1 text-xs ${revenueChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {revenueChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(revenueChange).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats?.total_revenue || 0)}</p>
            <p className="text-sm text-green-400/70 mt-1">Ingresos Totales</p>
          </div>

          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-800/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats?.total_orders || 0}</p>
            <p className="text-sm text-blue-400/70 mt-1">Pedidos Totales</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-800/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats?.total_customers || 0}</p>
            <p className="text-sm text-purple-400/70 mt-1">Clientes</p>
          </div>

          <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-800/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats?.total_products || 0}</p>
            <p className="text-sm text-orange-400/70 mt-1">Productos Activos</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Revenue Chart */}
            <div className="bg-zinc-900 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-zinc-400" />
                  Ingresos Mensuales
                </h2>
                <span className="text-sm text-zinc-500">Últimos 6 meses</span>
              </div>

              {stats?.monthly_revenue && stats.monthly_revenue.length > 0 ? (
                <div className="space-y-3">
                  {stats.monthly_revenue.slice(0, 6).reverse().map((item, index) => {
                    const maxRevenue = Math.max(...stats.monthly_revenue.map(m => m.revenue));
                    const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                    const monthName = new Date(item.month + '-01').toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });

                    return (
                      <div key={item.month} className="flex items-center gap-4">
                        <span className="w-16 text-sm text-zinc-500">{monthName}</span>
                        <div className="flex-1 h-8 bg-zinc-800 rounded-lg overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-lg flex items-center justify-end pr-3"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          >
                            {percentage > 30 && (
                              <span className="text-xs font-medium text-black">{formatCurrency(item.revenue)}</span>
                            )}
                          </div>
                        </div>
                        {percentage <= 30 && (
                          <span className="text-sm text-zinc-400 w-24 text-right">{formatCurrency(item.revenue)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay datos de ingresos aún</p>
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div className="bg-zinc-900 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-zinc-400" />
                  Pedidos Recientes
                </h2>
                <Link to="/admin/orders" className="text-sm text-white hover:text-zinc-300">
                  Ver todos
                </Link>
              </div>
              {recentOrders.length > 0 ? (
                <div className="divide-y divide-zinc-800">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="p-4 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">#{order.order_number}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-500">
                            {order.user?.full_name || 'Cliente'} • {new Date(order.created_at).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(order.total)}</p>
                          <p className="text-xs text-zinc-500">{order.items?.length || 0} items</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay pedidos aún</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pending Commissions Alert */}
            {stats && stats.pending_commissions > 0 && (
              <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border border-yellow-700/30 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-yellow-400">Comisiones Pendientes</h3>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(stats.pending_commissions)}</p>
                    <p className="text-sm text-zinc-400 mt-1">Por pagar a miembros del equipo</p>
                    <Link
                      to="/account/commissions"
                      className="inline-block mt-3 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                    >
                      Gestionar Pagos
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* This Month Summary */}
            <div className="bg-zinc-900 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-zinc-400" />
                <h3 className="font-semibold">Este Mes</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Ingresos</span>
                  <span className="font-bold text-green-400">{formatCurrency(currentMonthRevenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Mes Anterior</span>
                  <span className="font-medium">{formatCurrency(lastMonthRevenue)}</span>
                </div>
                <div className="h-px bg-zinc-800" />
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Diferencia</span>
                  <span className={`font-bold ${currentMonthRevenue >= lastMonthRevenue ? 'text-green-400' : 'text-red-400'}`}>
                    {currentMonthRevenue >= lastMonthRevenue ? '+' : ''}{formatCurrency(currentMonthRevenue - lastMonthRevenue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-zinc-900 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-zinc-400" />
                  Equipo
                </h3>
                <Link to="/account/team" className="text-sm text-white hover:text-zinc-300">
                  Gestionar
                </Link>
              </div>
              {teamMembers.length > 0 ? (
                <div className="divide-y divide-zinc-800">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold">
                          {member.user?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium">{member.user?.full_name}</p>
                          <p className="text-xs text-zinc-500 capitalize">{member.position}</p>
                        </div>
                      </div>
                      {member.commission_percentage > 0 && (
                        <span className="text-sm text-green-400">{member.commission_percentage}%</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-zinc-500">
                  <p className="text-sm">No hay miembros en el equipo</p>
                  <Link to="/account/team" className="text-white hover:underline text-sm mt-2 inline-block">
                    Agregar miembros
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-zinc-900 rounded-xl p-5">
              <h3 className="font-semibold mb-4">Acciones Rápidas</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/admin/products"
                  className="p-3 bg-zinc-800 rounded-lg text-center hover:bg-zinc-700 transition-colors"
                >
                  <Package className="w-5 h-5 mx-auto mb-1 text-zinc-400" />
                  <span className="text-sm">Productos</span>
                </Link>
                <Link
                  to="/admin/orders"
                  className="p-3 bg-zinc-800 rounded-lg text-center hover:bg-zinc-700 transition-colors"
                >
                  <ShoppingBag className="w-5 h-5 mx-auto mb-1 text-zinc-400" />
                  <span className="text-sm">Pedidos</span>
                </Link>
                <Link
                  to="/admin/customers"
                  className="p-3 bg-zinc-800 rounded-lg text-center hover:bg-zinc-700 transition-colors"
                >
                  <Users className="w-5 h-5 mx-auto mb-1 text-zinc-400" />
                  <span className="text-sm">Clientes</span>
                </Link>
                <Link
                  to="/admin/analytics"
                  className="p-3 bg-zinc-800 rounded-lg text-center hover:bg-zinc-700 transition-colors"
                >
                  <TrendingUp className="w-5 h-5 mx-auto mb-1 text-zinc-400" />
                  <span className="text-sm">Analytics</span>
                </Link>
              </div>
            </div>

            {/* Wallet Info */}
            <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Wallet className="w-6 h-6 text-white" />
                <h3 className="font-semibold">Tu Negocio</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-1">MELO SPORTT</p>
              <p className="text-sm text-zinc-400">Propietario: {profile?.full_name}</p>
              <div className="mt-4 pt-4 border-t border-zinc-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Ganancia Neta</span>
                  <span className="font-bold text-green-400">
                    {formatCurrency((stats?.total_revenue || 0) - (stats?.pending_commissions || 0))}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Después de comisiones pendientes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
