import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  ChevronDown,
  User,
  CreditCard,
  AlertCircle,
  Check
} from 'lucide-react';
import { userService } from '@/lib/services';
import type { Commission, TeamMember } from '@/types';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export function CommissionsManagementPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      loadCommissions();
    }
  }, [selectedMember, filter]);

  async function loadTeamMembers() {
    try {
      const data = await userService.getAllTeamMembers();
      setTeamMembers(data.filter(m => m.commission_percentage > 0));
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  }

  async function loadCommissions() {
    setIsLoading(true);
    try {
      // Por ahora cargamos todas las comisiones de todos los miembros
      // En una implementación real, tendríamos un endpoint para esto
      const allCommissions: Commission[] = [];

      for (const member of teamMembers) {
        if (selectedMember === 'all' || selectedMember === member.user_id) {
          // Simulamos obtener las comisiones del miembro
          // En producción esto sería un endpoint específico
        }
      }

      setCommissions(allCommissions);
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

  const toggleCommission = (id: string) => {
    const newSelected = new Set(selectedCommissions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCommissions(newSelected);
  };

  const selectAll = () => {
    if (selectedCommissions.size === commissions.length) {
      setSelectedCommissions(new Set());
    } else {
      setSelectedCommissions(new Set(commissions.map(c => c.id)));
    }
  };

  async function handleBulkAction(action: 'approve' | 'pay' | 'cancel') {
    if (selectedCommissions.size === 0) {
      toast.error('Selecciona al menos una comisión');
      return;
    }

    setIsProcessing(true);
    try {
      const status = action === 'approve' ? 'approved' : action === 'pay' ? 'paid' : 'cancelled';

      for (const commissionId of selectedCommissions) {
        await userService.updateCommissionStatus(commissionId, status);
      }

      toast.success(`${selectedCommissions.size} comisiones ${
        action === 'approve' ? 'aprobadas' : action === 'pay' ? 'pagadas' : 'canceladas'
      }`);

      setSelectedCommissions(new Set());
      loadCommissions();
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar');
    } finally {
      setIsProcessing(false);
    }
  }

  // Calcular totales
  const pendingTotal = teamMembers.reduce((sum, m) => {
    // En producción, esto vendría del backend
    return sum;
  }, 0);

  if (isLoading && teamMembers.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/account"
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Comisiones</h1>
            <p className="text-zinc-500">Aprueba y paga las comisiones del equipo</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {teamMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedMember(selectedMember === member.user_id ? 'all' : member.user_id)}
              className={`p-4 rounded-xl text-left transition-all ${
                selectedMember === member.user_id
                  ? 'bg-white text-black ring-2 ring-white'
                  : 'bg-zinc-900 hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  selectedMember === member.user_id ? 'bg-black text-white' : 'bg-zinc-800'
                }`}>
                  {member.user?.full_name?.charAt(0) || '?'}
                </div>
                <span className="text-sm font-medium truncate">{member.user?.full_name}</span>
              </div>
              <p className={`text-xl font-bold ${selectedMember === member.user_id ? 'text-black' : 'text-green-400'}`}>
                {member.commission_percentage}%
              </p>
              <p className={`text-xs ${selectedMember === member.user_id ? 'text-zinc-600' : 'text-zinc-500'}`}>
                {member.position}
              </p>
            </button>
          ))}
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Comisiones</h2>
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

          {selectedCommissions.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">{selectedCommissions.size} seleccionadas</span>
              <button
                onClick={() => handleBulkAction('approve')}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 disabled:opacity-50"
              >
                Aprobar
              </button>
              <button
                onClick={() => handleBulkAction('pay')}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 disabled:opacity-50"
              >
                Marcar Pagadas
              </button>
              <button
                onClick={() => handleBulkAction('cancel')}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Commissions Table */}
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          {commissions.length > 0 ? (
            <>
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800 text-sm text-zinc-400">
                <div className="col-span-1">
                  <button
                    onClick={selectAll}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      selectedCommissions.size === commissions.length ? 'bg-white text-black' : 'bg-zinc-800'
                    }`}
                  >
                    {selectedCommissions.size === commissions.length && <Check className="w-3 h-3" />}
                  </button>
                </div>
                <div className="col-span-3">Miembro</div>
                <div className="col-span-2">Orden</div>
                <div className="col-span-2 text-right">Venta</div>
                <div className="col-span-2 text-right">Comisión</div>
                <div className="col-span-2 text-right">Estado</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-zinc-800">
                {commissions.map((commission) => (
                  <div
                    key={commission.id}
                    className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-zinc-800/50 transition-colors ${
                      selectedCommissions.has(commission.id) ? 'bg-zinc-800/30' : ''
                    }`}
                  >
                    <div className="col-span-1">
                      <button
                        onClick={() => toggleCommission(commission.id)}
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                          selectedCommissions.has(commission.id) ? 'bg-white text-black' : 'bg-zinc-800'
                        }`}
                      >
                        {selectedCommissions.has(commission.id) && <Check className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm">
                        {commission.team_member?.user?.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{commission.team_member?.user?.full_name}</p>
                        <p className="text-xs text-zinc-500">{commission.commission_percentage}%</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm">#{commission.order?.order_number?.slice(0, 8) || commission.order_id?.slice(0, 8)}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(commission.created_at).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="font-medium">{formatCurrency(commission.order_total)}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="font-bold text-green-400">{formatCurrency(commission.commission_amount)}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(commission.status)}`}>
                        {getStatusLabel(commission.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-500">
                {filter !== 'all'
                  ? `No hay comisiones ${getStatusLabel(filter).toLowerCase()}`
                  : 'No hay comisiones registradas'
                }
              </p>
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

        {/* Info Box */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-blue-400">Flujo de Comisiones</h3>
              <p className="text-sm text-zinc-400 mt-1">
                1. Las comisiones se generan automáticamente cuando un pedido es entregado.<br />
                2. Revisa y <strong>aprueba</strong> las comisiones que correspondan.<br />
                3. Cuando hagas el pago, márcalas como <strong>pagadas</strong> para llevar el registro.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
