import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  Package,
  Calendar,
  ChevronDown,
  Filter
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { userService } from '@/lib/services';
import type { Commission, CommissionSummary, TeamMember } from '@/types';
import { formatCurrency } from '@/lib/utils';

export function MyCommissionsPage() {
  const { user } = useAuthStore();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [user, filter]);

  async function loadData() {
    if (!user) return;
    setIsLoading(true);
    try {
      const [commissionsData, summaryData, teamMemberData] = await Promise.all([
        userService.getMyCommissions({ status: filter === 'all' ? undefined : filter }),
        userService.getCommissionSummary(),
        userService.getMyTeamMember()
      ]);
      setCommissions(commissionsData.data);
      setSummary(summaryData);
      setTeamMember(teamMemberData || null);
    } catch (error) {
      console.error('Error loading commissions:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/20 text-green-400';
      case 'approved': return 'bg-blue-500/20 text-blue-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagada';
      case 'approved': return 'Aprobada';
      case 'cancelled': return 'Cancelada';
      default: return 'Pendiente';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/account"
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Mis Comisiones</h1>
            <p className="text-zinc-500">
              {teamMember ? `${teamMember.commission_percentage}% de cada venta` : 'Developer - 12% de ventas'}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-800/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-sm text-green-400">Total Ganado</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(summary.total_earned)}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border border-yellow-800/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-yellow-400">Pendiente</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(summary.total_pending)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-800/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-blue-400">Pagado</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(summary.total_paid)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-800/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-purple-400">Órdenes</span>
              </div>
              <p className="text-2xl font-bold">{summary.orders_count}</p>
            </div>
          </div>
        )}

        {/* Comparativo mensual */}
        {summary && (
          <div className="bg-zinc-900 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Resumen Mensual</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400">Este Mes</span>
                  <Calendar className="w-4 h-4 text-zinc-500" />
                </div>
                <p className="text-3xl font-bold text-green-400">{formatCurrency(summary.this_month_earned)}</p>
                <p className="text-sm text-zinc-500 mt-1">
                  {summary.this_month_earned > summary.last_month_earned ? (
                    <span className="text-green-400">
                      +{formatCurrency(summary.this_month_earned - summary.last_month_earned)} vs mes anterior
                    </span>
                  ) : summary.this_month_earned < summary.last_month_earned ? (
                    <span className="text-red-400">
                      -{formatCurrency(summary.last_month_earned - summary.this_month_earned)} vs mes anterior
                    </span>
                  ) : (
                    'Igual al mes anterior'
                  )}
                </p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400">Mes Anterior</span>
                  <TrendingUp className="w-4 h-4 text-zinc-500" />
                </div>
                <p className="text-3xl font-bold">{formatCurrency(summary.last_month_earned)}</p>
                <p className="text-sm text-zinc-500 mt-1">Comisiones totales del mes pasado</p>
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Historial de Comisiones</h2>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobadas</option>
              <option value="paid">Pagadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* Commissions List */}
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          {commissions.length > 0 ? (
            <div className="divide-y divide-zinc-800">
              {commissions.map((commission) => (
                <div key={commission.id} className="p-4 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-medium">
                          Orden #{commission.order?.order_number || commission.order_id?.slice(0, 8)}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {new Date(commission.created_at).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-400">+{formatCurrency(commission.commission_amount)}</p>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <span className="text-xs text-zinc-500">
                          {commission.commission_percentage}% de {formatCurrency(commission.order_total)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(commission.status)}`}>
                          {getStatusLabel(commission.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {commission.paid_at && (
                    <p className="text-xs text-zinc-500 mt-2 ml-16">
                      Pagado el {new Date(commission.paid_at).toLocaleDateString('es-CO')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-500">No hay comisiones {filter !== 'all' ? 'con este filtro' : 'todavía'}</p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="text-white hover:underline text-sm mt-2"
                >
                  Ver todas las comisiones
                </button>
              )}
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-blue-400">Cómo funcionan las comisiones</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Recibes el {teamMember?.commission_percentage || 12}% de cada venta completada. Las comisiones se generan cuando un pedido
                es marcado como "entregado" y quedan pendientes hasta que el propietario las aprueba y paga.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
