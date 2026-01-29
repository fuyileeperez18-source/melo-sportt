import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Smartphone,
  CreditCard,
  MessageSquare,
  Mail,
  Filter,
  X,
  RefreshCw,
  User,
} from 'lucide-react';

import { Button, IconButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { orderService } from '@/lib/services';
import type { Order } from '@/types';
import toast from 'react-hot-toast';

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  processing: { label: 'Procesando', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  shipped: { label: 'Enviado', color: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered: { label: 'Entregado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const paymentConfig = {
  pending: { label: 'Pendiente', color: 'text-yellow-600' },
  paid: { label: 'Pagado', color: 'text-green-600' },
  failed: { label: 'Fallido', color: 'text-red-600' },
  refunded: { label: 'Reembolsado', color: 'text-gray-600' },
};

export function AdminOrders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await orderService.getAll({
        limit: itemsPerPage,
        offset: (page - 1) * itemsPerPage,
        search: searchQuery,
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      setOrders(response.data || []);
      setTotalCount(response.count || 0);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error al cargar los pedidos');
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedOrders = orders;

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const handleContactCustomer = () => {
    setIsContactModalOpen(true);
  };

  const sendContactMessage = () => {
    toast.success('Mensaje enviado al cliente');
    setContactMessage('');
    setIsContactModalOpen(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await orderService.updateStatus(orderId, newStatus);
      toast.success(`Estado actualizado a ${statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus}`);
      loadOrders(); // Recargar lista
      setIsDetailOpen(false); // Cerrar modal
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Pedidos</h1>
          <p className="text-gray-600">Gestiona y rastrea los pedidos de los clientes</p>
        </div>
        <Button leftIcon={<Download className="h-4 w-4" />} variant="outline">
          Exportar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['all', 'pending', 'confirmed', 'shipped', 'delivered'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'p-4 rounded-xl border transition-all text-left',
              statusFilter === status
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            )}
          >
            <p className={cn(
              'text-2xl font-bold',
              statusFilter === status ? 'text-white' : 'text-black'
            )}>
              {status === 'all'
                ? orders.length
                : orders.filter(o => o.status === status).length}
            </p>
            <p className={cn(
              'text-sm',
              statusFilter === status ? 'text-gray-300' : 'text-gray-500'
            )}>
              {status === 'all' ? 'Total' : statusConfig[status as keyof typeof statusConfig]?.label || status}
            </p>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número de pedido..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="h-4 w-4" />}
            >
              Filtros
            </Button>
            <IconButton onClick={() => loadOrders(currentPage)} disabled={isLoading}>
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </IconButton>
          </div>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setCurrentPage(1);
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
                        statusFilter === status
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {status === 'all' ? 'Todos' : statusConfig[status as keyof typeof statusConfig]?.label || status}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <p>{paginatedOrders.length} pedido{paginatedOrders.length !== 1 ? 's' : ''} encontrado{paginatedOrders.length !== 1 ? 's' : ''}</p>
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="text-black hover:underline flex items-center gap-1"
          >
            <X className="h-4 w-4" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Orders List - Compact Cards instead of large table */}
      <div className="space-y-3">
        {paginatedOrders.length > 0 ? (
          paginatedOrders.map((order) => {
            const StatusIcon = statusConfig[order.status as keyof typeof statusConfig]?.icon || Clock;
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openOrderDetail(order)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-black">#{order.order_number}</span>
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          statusConfig[order.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'
                        )}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {order.user_id?.slice(0, 8)}... • {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="text-right">
                      <p className="font-bold text-black">{formatCurrency(order.total)}</p>
                      <span className={cn(
                        'text-xs font-medium',
                        paymentConfig[order.payment_status as keyof typeof paymentConfig]?.color || 'text-gray-600'
                      )}>
                        {paymentConfig[order.payment_status as keyof typeof paymentConfig]?.label || order.payment_status}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openOrderDetail(order);
                      }}
                    >
                      Ver detalles
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-black mb-2">No hay pedidos</h3>
            <p className="text-gray-600">No se encontraron pedidos con los filtros actuales</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Pedido #${selectedOrder?.order_number}`}
        size="lg"
        className="max-h-[90vh] overflow-y-auto"  // Mejor scroll
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
                statusConfig[selectedOrder.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'
              )}>
                {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.label || selectedOrder.status}
              </span>
              <span className="text-gray-600 text-sm">
                {formatDate(selectedOrder.created_at)}
              </span>
            </div>

            {/* Customer info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-black font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cliente
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">Nombre</p>
                    <p className="font-medium text-black">
                      {selectedOrder.shipping_address?.firstName} {selectedOrder.shipping_address?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">Email</p>
                    <p className="font-medium text-black break-all">{selectedOrder.shipping_address?.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">Teléfono de Contacto</p>
                    <p className="font-medium text-black">{selectedOrder.shipping_address?.phone}</p>
                  </div>
                  {/* Display user ID if linked */}
                  {selectedOrder.user_id && (
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider">ID Usuario</p>
                      <p className="font-mono text-xs text-gray-700">{selectedOrder.user_id}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-black font-semibold mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Envío
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">Dirección</p>
                    <p className="font-medium text-black">{selectedOrder.shipping_address?.address}</p>
                    {selectedOrder.shipping_address?.apartment && (
                      <p className="text-gray-600 text-sm">{selectedOrder.shipping_address?.apartment}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">Ubicación</p>
                    <p className="font-medium text-black">
                      {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {selectedOrder.shipping_address?.postalCode}, {selectedOrder.shipping_address?.country}
                    </p>
                  </div>
                  {selectedOrder.tracking_number && (
                    <div className="pt-2 border-t border-gray-200 mt-2">
                      <p className="text-gray-500 text-xs uppercase tracking-wider">Guía de Rastreo</p>
                      <p className="font-medium text-blue-600">{selectedOrder.tracking_number}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-black font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Detalles del Pago
              </h3>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Método</p>
                  <div className="flex flex-col">
                    <p className="font-medium text-black capitalize">
                      {selectedOrder.payment_method?.replace(/_/g, ' ') || 'No especificado'}
                    </p>
                    {/* Check if payment method is Nequi based on string or custom logic if available */}
                    {(selectedOrder.payment_method?.toLowerCase().includes('nequi') ||
                      // Fallback: check raw data if stored in custom fields, for now rely on payment_method string
                      false) && (
                      <span className="text-xs text-purple-600 font-medium flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        Nequi
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Estado</p>
                  <span className={cn(
                    'font-medium',
                    paymentConfig[selectedOrder.payment_status as keyof typeof paymentConfig]?.color
                  )}>
                    {paymentConfig[selectedOrder.payment_status as keyof typeof paymentConfig]?.label}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">ID Transacción</p>
                  <p className="font-mono text-sm text-gray-700 break-all">
                    {selectedOrder.payment_id || selectedOrder.mp_preference_id || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Total</p>
                  <p className="font-bold text-black">{formatCurrency(selectedOrder.total)}</p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="text-black font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Productos ({selectedOrder.items?.length || 0})
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="p-4 flex gap-4 items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                      <img
                        src={item.product?.images?.[0]?.url || 'https://via.placeholder.com/64'}
                        alt={item.product?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-black truncate">{item.product?.name}</p>
                      {item.variant && (
                        <p className="text-sm text-gray-500">
                          {item.variant.options?.map(opt => `${opt.name}: ${opt.value}`).join(' | ')}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        SKU: {item.variant?.sku || item.product?.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-black">
                        {formatCurrency(item.price)} x {item.quantity}
                      </p>
                      <p className="font-bold text-black">
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order summary */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-black font-semibold mb-3">Resumen del Pedido</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="text-black">{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Descuento</span>
                    <span className="text-green-600">-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Envío</span>
                  <span className="text-black">{formatCurrency(selectedOrder.shipping_cost)}</span>
                </div>
                {selectedOrder.tax > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Impuesto</span>
                    <span className="text-black">{formatCurrency(selectedOrder.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="text-black font-semibold">Total</span>
                  <span className="text-black font-bold text-lg">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Contact Customer Button */}
            <Button
              onClick={handleContactCustomer}
              className="w-full"
              leftIcon={<MessageSquare className="h-4 w-4" />}
            >
              Contactar Cliente sobre este Pedido
            </Button>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              {selectedOrder.status === 'pending' && (
                <Button
                  className="flex-1"
                  onClick={() => updateOrderStatus(selectedOrder.id, 'processing')}
                >
                  Procesar Pedido
                </Button>
              )}
              {selectedOrder.status === 'processing' && (
                <Button
                  className="flex-1"
                  leftIcon={<Truck className="h-4 w-4" />}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'shipped')}
                >
                  Marcar como Enviado
                </Button>
              )}
              {selectedOrder.status === 'shipped' && (
                <Button
                  className="flex-1"
                  leftIcon={<Package className="h-4 w-4" />}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                >
                  Marcar como Entregado
                </Button>
              )}
              <Button variant="outline" className="flex-1">
                Imprimir Factura
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsDetailOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Contact Modal */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="Contactar Cliente"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Envía un mensaje al cliente sobre el pedido #{selectedOrder?.order_number}
          </p>
          <textarea
            className="w-full h-32 px-4 py-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:border-black resize-none"
            placeholder="Escribe tu mensaje aquí..."
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsContactModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={sendContactMessage}
              leftIcon={<Mail className="h-4 w-4" />}
              disabled={!contactMessage.trim()}
            >
              Enviar Mensaje
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
