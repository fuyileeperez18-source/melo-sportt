import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Copy,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  DollarSign,
  Calendar,
  Hash,
  User,
  MessageSquare
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { orderService } from '@/lib/services';
import type { Order } from '@/types';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  async function loadOrder() {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await orderService.getById(id);
      setOrder(data);
    } catch (err: any) {
      console.error('Error loading order:', err);
      setError(err.message || 'Error al cargar el pedido');
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  // Status helpers
  const getOrderStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'shipped': return <Truck className="w-6 h-6 text-blue-400" />;
      case 'processing': return <RefreshCw className="w-6 h-6 text-purple-400" />;
      case 'confirmed': return <CheckCircle className="w-6 h-6 text-blue-400" />;
      case 'cancelled': return <XCircle className="w-6 h-6 text-red-400" />;
      case 'refunded': return <DollarSign className="w-6 h-6 text-orange-400" />;
      default: return <Clock className="w-6 h-6 text-yellow-400" />;
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'shipped': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'processing': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'confirmed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'refunded': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getOrderStatusLabel = (status: string) => {
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'refunded': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'partially_refunded': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagado';
      case 'failed': return 'Fallido';
      case 'refunded': return 'Reembolsado';
      case 'partially_refunded': return 'Reembolso Parcial';
      default: return 'Pendiente';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'wompi': return 'Wompi';
      case 'card': return 'Tarjeta';
      case 'cash_on_delivery': return 'Contra Entrega';
      case 'prepaid': return 'Prepago';
      case 'CARD': return 'Tarjeta';
      case 'PSE': return 'PSE';
      case 'NEQUI': return 'Nequi';
      case 'BANCOLOMBIA_TRANSFER': return 'Bancolombia';
      default: return method || 'No especificado';
    }
  };

  // Timeline steps based on order status
  const getTimelineSteps = (order: Order) => {
    const steps = [
      { key: 'pending', label: 'Pedido Creado', icon: Clock },
      { key: 'confirmed', label: 'Pago Confirmado', icon: CreditCard },
      { key: 'processing', label: 'Preparando', icon: Package },
      { key: 'shipped', label: 'Enviado', icon: Truck },
      { key: 'delivered', label: 'Entregado', icon: CheckCircle },
    ];

    const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(order.status);

    // Handle special cases
    if (order.status === 'cancelled' || order.status === 'refunded') {
      return steps.map((step, index) => ({
        ...step,
        completed: false,
        current: false,
        cancelled: true,
      }));
    }

    return steps.map((step, index) => ({
      ...step,
      completed: index < currentIndex,
      current: index === currentIndex,
      cancelled: false,
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Cargando detalles del pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-black text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/account/orders"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver a Mis Pedidos
          </Link>
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-semibold mb-2">Pedido no encontrado</h2>
            <p className="text-zinc-500 mb-6">{error || 'No se pudo cargar el pedido'}</p>
            <button
              onClick={loadOrder}
              className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shippingAddress = typeof order.shipping_address === 'string'
    ? JSON.parse(order.shipping_address)
    : order.shipping_address;

  const timelineSteps = getTimelineSteps(order);

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/account/orders"
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">Pedido #{order.order_number}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getOrderStatusColor(order.status)}`}>
                {getOrderStatusLabel(order.status)}
              </span>
            </div>
            <p className="text-zinc-500 mt-1">
              {new Date(order.created_at).toLocaleDateString('es-CO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* Status Timeline */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && (
          <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-6">Estado del Pedido</h2>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-zinc-800" />
              <div
                className="absolute top-5 left-5 h-0.5 bg-white transition-all duration-500"
                style={{
                  width: `${Math.max(0, (timelineSteps.findIndex(s => s.current) / (timelineSteps.length - 1)) * 100)}%`
                }}
              />

              {/* Steps */}
              <div className="relative flex justify-between">
                {timelineSteps.map((step, index) => (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors ${
                        step.completed
                          ? 'bg-white text-black'
                          : step.current
                          ? 'bg-white text-black ring-4 ring-white/20'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      <step.icon className="w-5 h-5" />
                    </div>
                    <p className={`mt-2 text-xs text-center ${
                      step.completed || step.current ? 'text-white' : 'text-zinc-500'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Cancelled/Refunded Alert */}
        {(order.status === 'cancelled' || order.status === 'refunded') && (
          <div className={`rounded-2xl p-6 mb-6 ${
            order.status === 'cancelled' ? 'bg-red-500/10 border border-red-500/20' : 'bg-orange-500/10 border border-orange-500/20'
          }`}>
            <div className="flex items-center gap-3">
              {getOrderStatusIcon(order.status)}
              <div>
                <h2 className="font-semibold">
                  {order.status === 'cancelled' ? 'Pedido Cancelado' : 'Pedido Reembolsado'}
                </h2>
                <p className="text-sm text-zinc-400">
                  {order.status === 'cancelled'
                    ? 'Este pedido ha sido cancelado.'
                    : 'Este pedido ha sido reembolsado.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Status Card */}
        <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Información de Pago
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
              <span className="text-zinc-400">Estado del Pago</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(order.payment_status)}`}>
                {getPaymentStatusLabel(order.payment_status)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
              <span className="text-zinc-400">Método de Pago</span>
              <span className="font-medium">{getPaymentMethodLabel(order.payment_method)}</span>
            </div>
            {order.payment_id && (
              <div className="sm:col-span-2 flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                <span className="text-zinc-400">ID de Transacción</span>
                <button
                  onClick={() => copyToClipboard(order.payment_id!, 'ID de transacción')}
                  className="flex items-center gap-2 text-sm font-mono text-zinc-300 hover:text-white transition-colors"
                >
                  {order.payment_id.slice(0, 20)}...
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tracking Info */}
        {order.tracking_number && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-400">
              <Truck className="w-5 h-5" />
              Información de Envío
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-zinc-400 mb-1">Número de Seguimiento</p>
                <button
                  onClick={() => copyToClipboard(order.tracking_number!, 'Número de seguimiento')}
                  className="flex items-center gap-2 font-mono text-white hover:text-blue-400 transition-colors"
                >
                  {order.tracking_number}
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  Rastrear Envío
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Products */}
          <div className="bg-zinc-900 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Productos ({order.items?.length || 0})
            </h2>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex gap-4 p-3 bg-zinc-800/50 rounded-xl">
                  <div className="w-20 h-20 bg-zinc-700 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product?.images?.[0]?.url ? (
                      <img
                        src={item.product.images[0].url}
                        alt={item.product?.name || 'Producto'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-zinc-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.product?.slug || item.product_id}`}
                      className="font-medium hover:text-zinc-300 transition-colors line-clamp-2"
                    >
                      {item.product?.name || 'Producto'}
                    </Link>
                    {item.variant && (
                      <p className="text-sm text-zinc-400 mt-1">
                        {item.variant.name ||
                          item.variant.options?.map(o => o.value).join(' / ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-zinc-400">Cant: {item.quantity}</span>
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-zinc-900 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Dirección de Envío
            </h2>
            {shippingAddress ? (
              <div className="space-y-3">
                {shippingAddress.name && (
                  <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                    <User className="w-5 h-5 text-zinc-500" />
                    <span>{shippingAddress.name}</span>
                  </div>
                )}
                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-xl">
                  <MapPin className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>{shippingAddress.address || shippingAddress.street}</p>
                    {shippingAddress.apartment && (
                      <p className="text-zinc-400">{shippingAddress.apartment}</p>
                    )}
                    <p className="text-zinc-400">
                      {shippingAddress.city}{shippingAddress.state && `, ${shippingAddress.state}`}
                    </p>
                    {shippingAddress.postal_code && (
                      <p className="text-zinc-400">{shippingAddress.postal_code}</p>
                    )}
                    <p className="text-zinc-400">{shippingAddress.country || 'Colombia'}</p>
                  </div>
                </div>
                {shippingAddress.phone && (
                  <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                    <Phone className="w-5 h-5 text-zinc-500" />
                    <span>{shippingAddress.phone}</span>
                  </div>
                )}
                {shippingAddress.email && (
                  <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                    <Mail className="w-5 h-5 text-zinc-500" />
                    <span>{shippingAddress.email}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-zinc-500">No hay información de dirección disponible</p>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Resumen del Pedido</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Descuento</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-400">
              <span>Envío</span>
              <span>{order.shipping_cost > 0 ? formatCurrency(order.shipping_cost) : 'Gratis'}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>Impuestos</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
            )}
            {order.coupon_code && (
              <div className="flex justify-between text-zinc-400">
                <span>Cupón aplicado</span>
                <span className="font-mono text-xs bg-zinc-800 px-2 py-1 rounded">{order.coupon_code}</span>
              </div>
            )}
            <div className="border-t border-zinc-800 pt-3 mt-3">
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Notas del Pedido</h2>
            <p className="text-zinc-400">{order.notes}</p>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-zinc-900 rounded-2xl p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">¿Necesitas ayuda?</h2>
          <p className="text-zinc-400 mb-4">
            Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                // Open chat with order context
                // This assumes useChatStore is available or we navigate to a chat page with order data
                navigate('/account/messages', {
                  state: {
                    orderId: order.id,
                    orderNumber: order.order_number
                  }
                });
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              Chat sobre este pedido
            </button>
            <a
              href={`https://wa.me/573001234567?text=Hola,%20tengo%20una%20consulta%20sobre%20mi%20pedido%20%23${order.order_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors"
            >
              <Phone className="w-5 h-5" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
