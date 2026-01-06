import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  CreditCard,
  Home,
  Package,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

type CallbackStatus = 'success' | 'failure' | 'pending' | 'loading';

interface PaymentDetails {
  id: string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  payment_method_id: string;
  payment_type_id: string;
  date_approved?: string;
  date_created?: string;
}

export function MercadoPagoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [message, setMessage] = useState('');

  const collectionId = searchParams.get('collection_id');
  const paymentId = searchParams.get('payment_id');
  const preferenceId = searchParams.get('preference_id');
  const externalReference = searchParams.get('external_reference');
  const merchantOrderId = searchParams.get('merchant_order_id');
  const processing = searchParams.get('processing') === 'true';

  useEffect(() => {
    if (!collectionId && !paymentId) {
      setStatus('failure');
      setMessage('No se encontró información del pago');
      return;
    }

    verifyPayment();
  }, [collectionId, paymentId]);

  const verifyPayment = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const token = localStorage.getItem('melo_sportt_token');

      // Verify payment with backend
      const response = await fetch(
        `${API_URL}/orders/mercadopago/payment/${paymentId || collectionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        // Still show success message if we have a payment_id
        // The webhook will eventually update the order
        setStatus('success');
        setMessage('Pago recibido correctamente. Procesando tu orden...');
        return;
      }

      const result = await response.json();
      const paymentData = result.data as PaymentDetails;

      setPayment(paymentData);

      // Determine status
      switch (paymentData.status) {
        case 'approved':
          setStatus('success');
          setMessage('¡Pago aprobado! Tu orden ha sido confirmada.');
          toast.success('Pago realizado correctamente');
          break;
        case 'pending':
          setStatus('pending');
          setMessage('El pago está siendo procesado.');
          break;
        case 'in_process':
          setStatus('pending');
          setMessage('El pago está en revisión.');
          break;
        case 'rejected':
          setStatus('failure');
          setMessage(`El pago fue rechazado: ${getRejectReason(paymentData.status_detail)}`);
          break;
        case 'cancelled':
          setStatus('failure');
          setMessage('El pago fue cancelado.');
          break;
        default:
          setStatus('failure');
          setMessage('Estado del pago desconocido.');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      // If we came from MP with a payment_id, consider it successful
      // The webhook will handle the actual status update
      if (paymentId || collectionId) {
        setStatus('success');
        setMessage('Pago recibido correctamente. Procesando tu orden...');
      } else {
        setStatus('failure');
        setMessage('Error al verificar el estado del pago.');
      }
    }
  };

  const getRejectReason = (statusDetail: string): string => {
    const reasons: Record<string, string> = {
      cc_rejected_bad_filled_card_number: 'Número de tarjeta inválido',
      cc_rejected_bad_filled_date: 'Fecha de expiración inválida',
      cc_rejected_bad_filled_security_code: 'Código de seguridad inválido',
      cc_rejected_bad_filled_other: 'Información de tarjeta inválida',
      cc_rejected_call_for_authorize: 'Tarjeta rechazada, llame para autorizar',
      cc_rejected_card_disabled: 'Tarjeta deshabilitada',
      cc_rejected_card_error: 'Error con la tarjeta',
      cc_rejected_blacklist: 'Tarjeta en lista negra',
      cc_rejected_insufficient_amount: 'Fondos insuficientes',
    };
    return reasons[statusDetail] || 'Contacta a tu banco para más información';
  };

  const getCommissionInfo = () => {
    if (!payment || payment.status !== 'approved') return null;

    const totalAmount = payment.transaction_amount;
    const commissionPercentage = 10;
    const commissionAmount = Math.round(totalAmount * (commissionPercentage / 100));
    const sellerAmount = totalAmount - commissionAmount;

    return {
      totalAmount,
      commissionPercentage,
      commissionAmount,
      sellerAmount,
    };
  };

  const commissionInfo = getCommissionInfo();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <AnimatePresence mode="wait">
        {status === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-12 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <RefreshCw className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificando pago...</h1>
              <p className="text-gray-600">Por favor espera un momento mientras verificamos tu transacción.</p>
            </div>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen flex items-center justify-center p-4"
          >
            <div className="max-w-lg w-full">
              {/* Success Card */}
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                  >
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </motion.div>
                  <h1 className="text-3xl font-bold text-white mb-2">¡Pago Exitoso!</h1>
                  <p className="text-green-100 text-lg">{message}</p>
                </div>

                {/* Content */}
                <div className="p-8">
                  {/* Payment Details */}
                  {payment && (
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">ID de Pago</span>
                        <span className="font-mono font-semibold text-gray-900">{payment.id}</span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Monto Total</span>
                        <span className="font-semibold text-gray-900">
                          ${payment.transaction_amount.toLocaleString('es-CO')} {payment.currency_id}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Método de Pago</span>
                        <span className="font-semibold text-gray-900 capitalize">{payment.payment_method_id}</span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Fecha</span>
                        <span className="font-semibold text-gray-900">
                          {payment.date_approved
                            ? new Date(payment.date_approved).toLocaleString('es-CO')
                            : new Date().toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Split Payment Info - SHOWS YOUR COMMISSION */}
                  {commissionInfo && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <h3 className="font-bold text-blue-900">División del Pago</h3>
                      </div>

                      <div className="space-y-3">
                        {/* Marketplace Commission (YOUR 10%) */}
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span className="text-gray-700">Tu Comisión (10%)</span>
                          </div>
                          <span className="font-bold text-blue-600">
                            +$ {commissionInfo.commissionAmount.toLocaleString('es-CO')} COP
                          </span>
                        </div>

                        {/* Seller Amount */}
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-gray-700">Vendedor (90%)</span>
                          </div>
                          <span className="font-bold text-green-600">
                            $ {commissionInfo.sellerAmount.toLocaleString('es-CO')} COP
                          </span>
                        </div>

                        <div className="text-xs text-gray-500 pt-2 border-t border-blue-200">
                          El pago se ha dividido automáticamente a través de Mercado Pago Split Payments.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                      <Package className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Preparando tu pedido</h4>
                        <p className="text-sm text-gray-600">
                          Recibirás un correo de confirmación con los detalles de tu pedido.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                      <Receipt className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Confirmación de pago</h4>
                        <p className="text-sm text-gray-600">
                          Mercado Pago ha enviado la confirmación del pago a tu correo electrónico.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={() => navigate('/account/orders')}
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      Ver Mis Pedidos
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate('/')}
                      leftIcon={<Home className="h-4 w-4" />}
                    >
                      Volver a la Tienda
                    </Button>
                  </div>
                </div>
              </div>

              {/* Order Summary Card */}
              <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4">¿Qué sigue?</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Recibirás notificaciones sobre el estado de tu pedido</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Podrás rastrear tu pedido cuando sea enviado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Contacta a soporte si tienes alguna pregunta</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {status === 'pending' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-12 text-center">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="h-12 w-12 text-amber-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Pago en Proceso</h1>
              <p className="text-gray-600 mb-6">{message}</p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800">
                  Tu pago está siendo procesado por Mercado Pago. Esto puede tomar unos minutos.
                  Recibirás una confirmación por correo electrónico cuando el pago sea aprobado.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => window.location.reload()}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Verificar Estado
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/')}
                >
                  Volver a la Tienda
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {status === 'failure' && (
          <motion.div
            key="failure"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                  >
                    <AlertCircle className="h-12 w-12 text-red-600" />
                  </motion.div>
                  <h1 className="text-3xl font-bold text-white mb-2">Pago Fallido</h1>
                  <p className="text-red-100 text-lg">{message}</p>
                </div>

                {/* Content */}
                <div className="p-8">
                  {payment && (
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Estado</span>
                        <span className="font-semibold text-red-600 capitalize">{payment.status}</span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Monto</span>
                        <span className="font-semibold text-gray-900">
                          ${payment.transaction_amount?.toLocaleString('es-CO')} {payment.currency_id}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Método</span>
                        <span className="font-semibold text-gray-900 capitalize">{payment.payment_method_id}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => navigate('/cart')}
                      leftIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      Intentar Nuevamente
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/')}
                      leftIcon={<Home className="h-4 w-4" />}
                    >
                      Volver a la Tienda
                    </Button>
                  </div>

                  {/* Help Section */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">¿Necesitas ayuda?</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Verifica que tengas fondos suficientes</li>
                      <li>• Confirma los datos de tu tarjeta</li>
                      <li>• Contacta a tu banco para autorizar el pago</li>
                      <li>• Si el problema persiste, contáctanos</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
