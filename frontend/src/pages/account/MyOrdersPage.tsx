import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  ChevronRight,
  Search,
  Filter,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ShoppingBag
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { orderService } from '@/lib/services';
import type { Order } from '@/types';
import { formatCurrency } from '@/lib/utils';

export function MyOrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, [user]);

  async function loadOrders() {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await orderService.getByUser(user.id);
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'shipped': return <Truck className="w-5 h-5 text-blue-400" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'shipped': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'processing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered': return 'Entregado';
      case 'shipped': return 'Enviado';
      case 'processing': return 'Procesando';
      case 'confirmed': return 'Confirmado';
      case 'cancelled': return 'Cancelado';
      case 'refunded': return 'Reembolsado';
      default: return 'Pendiente';
    }
  };

  // Filtrar pedidos
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            <h1 className="text-2xl font-bold">Mis Pedidos</h1>
            <p className="text-zinc-500">{orders.length} pedidos en total</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por número de orden..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? 'bg-white text-black'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {status === 'all' ? 'Todos' : getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Link
                key={order.id}
                to={`/account/orders/${order.id}`}
                className="block bg-zinc-900 rounded-xl p-4 hover:bg-zinc-800/80 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(order.status)}
                    <div>
                      <p className="font-semibold">Pedido #{order.order_number}</p>
                      <p className="text-sm text-zinc-500">
                        {new Date(order.created_at).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                  </div>
                </div>

                {/* Order Items Preview */}
                <div className="flex items-center gap-3 mb-4">
                  {order.items?.slice(0, 3).map((item, index) => (
                    <div
                      key={item.id}
                      className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden"
                    >
                      {item.product?.images?.[0]?.url ? (
                        <img
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-zinc-600" />
                        </div>
                      )}
                    </div>
                  ))}
                  {order.items && order.items.length > 3 && (
                    <div className="w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center text-sm text-zinc-400">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>

                {/* Order Summary */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  <p className="text-sm text-zinc-400">
                    {order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'producto' : 'productos'}
                  </p>
                  <p className="text-lg font-bold">{formatCurrency(order.total)}</p>
                </div>

                {/* Tracking Info */}
                {order.tracking_number && order.status === 'shipped' && (
                  <div className="mt-3 p-3 bg-blue-500/10 rounded-lg">
                    <p className="text-sm text-blue-400">
                      <Truck className="w-4 h-4 inline mr-2" />
                      Número de seguimiento: <span className="font-mono">{order.tracking_number}</span>
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No se encontraron pedidos' : 'No tienes pedidos aún'}
            </h3>
            <p className="text-zinc-500 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Intenta con otros filtros de búsqueda'
                : 'Cuando hagas tu primera compra, aparecerá aquí'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link
                to="/shop"
                className="inline-block px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors"
              >
                Explorar Tienda
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
