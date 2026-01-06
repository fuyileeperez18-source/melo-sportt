import { useState, useEffect } from 'react';
import {
  CreditCard,
  TrendingUp,
  DollarSign,
  Calendar,
  RefreshCw,
  Download,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  ArrowDown,
  ArrowUp,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface Commission {
  id: string;
  order_id: string;
  payment_id: string;
  total_amount: number;
  commission_amount: number;
  seller_amount: number;
  seller_mp_id?: number;
  created_at: string;
}

interface CommissionsSummary {
  total_commissions: number;
  total_orders: number;
  orders: Commission[];
}

export function MercadoPagoCommissions() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CommissionsSummary | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const token = localStorage.getItem('melo_sportt_token');

  useEffect(() => {
    fetchCommissions();
  }, []);

  useEffect(() => {
    if (startDate || endDate) {
      fetchCommissions();
    }
  }, [startDate, endDate]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(
        `${API_URL}/analytics/mercadopago-commissions?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setSummary(result.data);
      } else {
        toast.error('Error al cargar comisiones');
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
      toast.error('Error de conexión al cargar comisiones');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!summary?.orders) return;

    const csvContent = [
      'Fecha,ID de Orden,ID de Pago,Monto Total,Tu Comisión (10%),Monto Vendedor (90%)',
      ...summary.orders.map(order =>
        `${new Date(order.created_at).toLocaleDateString('es-CO')},${order.order_id},${order.payment_id},$${order.total_amount},$${order.commission_amount},$${order.seller_amount}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mercadopago-comisionses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('CSV exportado correctamente');
  };

  const setDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const totalAmount = summary?.orders.reduce((sum, order) => sum + order.total_amount, 0) || 0;
  const avgOrderAmount = summary?.total_orders ? totalAmount / summary.total_orders : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Commissions */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-6 w-6 text-green-100" />
            <span className="text-xs bg-green-400/30 px-2 py-1 rounded-full">TUS COMISIONES</span>
          </div>
          <p className="text-3xl font-bold">
            ${summary?.total_commissions.toLocaleString('es-CO')}
          </p>
          <p className="text-green-100 text-sm">Acumulado total del 10%</p>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <ShoppingCart className="h-6 w-6 text-gray-400" />
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">PEDIDOS</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {summary?.total_orders}
          </p>
          <p className="text-gray-500 text-sm">Pedidos procesados</p>
        </div>

        {/* Average Order */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-6 w-6 text-blue-400" />
            <span className="text-xs bg-blue-50 px-2 py-1 rounded-full text-blue-600">PROMEDIO</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${avgOrderAmount.toLocaleString('es-CO')}
          </p>
          <p className="text-gray-500 text-sm">Promedio por pedido</p>
        </div>

        {/* Total Volume */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <CreditCard className="h-6 w-6 text-purple-400" />
            <span className="text-xs bg-purple-50 px-2 py-1 rounded-full text-purple-600">VOLUMEN</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${totalAmount.toLocaleString('es-CO')}
          </p>
          <p className="text-gray-500 text-sm">Volumen total procesado</p>
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Filtrar por Fecha
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setDateRange(7)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
          >
            Últimos 7 días
          </button>
          <button
            onClick={() => setDateRange(30)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
          >
            Últimos 30 días
          </button>
          <button
            onClick={() => setDateRange(90)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
          >
            Últimos 90 días
          </button>
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
          >
            Todo el tiempo
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleExport}
          leftIcon={<Download className="h-4 w-4" />}
          disabled={loading || summary?.orders.length === 0}
        >
          Exportar CSV
        </Button>
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID de Orden</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID de Pago</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto Total</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-green-600 uppercase tracking-wider">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Tu 10%
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendedor (90%)</th>
              </tr>
            </thead>
            <tbody>
              {summary?.orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium text-gray-700">No hay comisiones registradas</p>
                    <p className="text-sm text-gray-500">
                      Vincula tu cuenta de Mercado Pago para comenzar a recibir comisiones.
                    </p>
                  </td>
                </tr>
              ) : (
                summary?.orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(order.created_at).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {order.order_id?.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {order.payment_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      ${order.total_amount.toLocaleString('es-CO')}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className="inline-flex items-center gap-1 font-bold text-green-600">
                        <ArrowUp className="h-3 w-3" />
                        ${order.commission_amount.toLocaleString('es-CO')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-700">
                      ${order.seller_amount.toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination / More Link */}
        {(summary?.orders?.length ?? 0) > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando los últimos {summary?.orders?.length ?? 0} registros
            </p>
            <a
              href="https://www.mercadopago.com.co/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver en Mercado Pago
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Cómo funciona Split Payments</h4>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">10%</span>
                <span>De cada pago se transfiere automáticamente a tu cuenta de Mercado Pago</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">90%</span>
                <span>Se transfiere al vendedor automáticamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-600">•</span>
                <span>Mercado Pago cobra su comisión separada sobre el monto del vendedor</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
