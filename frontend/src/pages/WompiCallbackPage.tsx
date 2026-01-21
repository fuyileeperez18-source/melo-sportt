import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCartStore } from '@/stores/cartStore';
import { orderService } from '@/lib/services';
import { generateOrderNumber } from '@/lib/utils';
import toast from 'react-hot-toast';

export function WompiCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCartStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu pago...');
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get transaction ID from URL params
        const transactionId = searchParams.get('id');

        if (!transactionId) {
          setStatus('error');
          setMessage('No se encontró información de la transacción');
          return;
        }

        // Verify transaction status with backend
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const token = localStorage.getItem('token');

        const response = await fetch(
          `${API_URL}/orders/wompi/transaction/${transactionId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Error al verificar el pago');
        }

        const result = await response.json();
        const transaction = result.data;

        // Check transaction status
        if (transaction.status === 'APPROVED') {
          // Payment successful
          const newOrderNumber = generateOrderNumber();
          setOrderNumber(newOrderNumber);

          // Create order (you may want to pass the order data from localStorage or state)
          // For now, we'll just show success
          setStatus('success');
          setMessage('¡Pago exitoso! Tu pedido ha sido confirmado.');
          clearCart();
          toast.success('¡Pago completado con éxito!');

          // Redirect to success page after 3 seconds
          setTimeout(() => {
            navigate('/checkout/success?order=' + newOrderNumber);
          }, 3000);
        } else if (transaction.status === 'DECLINED') {
          setStatus('error');
          setMessage('Tu pago fue rechazado. Por favor intenta de nuevo con otro método de pago.');
          toast.error('Pago rechazado');
        } else if (transaction.status === 'ERROR') {
          setStatus('error');
          setMessage('Hubo un error procesando tu pago. Por favor intenta de nuevo.');
          toast.error('Error en el pago');
        } else {
          // Pending or other status
          setStatus('loading');
          setMessage('Tu pago está siendo procesado. Por favor espera...');

          // Poll for status update
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        }
      } catch (error: any) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage('Error al verificar el pago. Por favor contacta soporte.');
        toast.error('Error verificando el pago');
      }
    };

    verifyPayment();
  }, [searchParams, navigate, clearCart]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-primary-900 rounded-2xl p-8 text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
              status === 'success'
                ? 'bg-green-500'
                : status === 'error'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}
          >
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-white animate-spin" />
            )}
            {status === 'success' && <Check className="h-12 w-12 text-white" />}
            {status === 'error' && <X className="h-12 w-12 text-white" />}
          </motion.div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-3">
            {status === 'success' && '¡Pago Exitoso!'}
            {status === 'error' && 'Pago Rechazado'}
            {status === 'loading' && 'Procesando Pago...'}
          </h2>

          {/* Message */}
          <p className="text-gray-400 mb-6">{message}</p>

          {/* Order number */}
          {orderNumber && (
            <div className="p-4 bg-primary-800 rounded-lg mb-6">
              <p className="text-gray-400 text-sm mb-1">Número de Pedido</p>
              <p className="text-white font-mono font-medium">{orderNumber}</p>
            </div>
          )}

          {/* Additional info for errors */}
          {status === 'error' && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-6">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-400 text-sm text-left">
                Si el dinero fue debitado de tu cuenta, será reembolsado automáticamente en 5-7 días hábiles.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {status === 'success' && (
              <>
                <Button onClick={() => navigate('/account/orders')}>
                  Ver Mis Pedidos
                </Button>
                <Button variant="outline" onClick={() => navigate('/shop')}>
                  Seguir Comprando
                </Button>
              </>
            )}
            {status === 'error' && (
              <>
                <Button onClick={() => navigate('/checkout')}>
                  Intentar de Nuevo
                </Button>
                <Button variant="outline" onClick={() => navigate('/shop')}>
                  Volver a la Tienda
                </Button>
              </>
            )}
            {status === 'loading' && (
              <Button disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </Button>
            )}
          </div>

          {/* Support */}
          <p className="text-gray-500 text-xs mt-6">
            ¿Necesitas ayuda? Contacta nuestro{' '}
            <a href="/contact" className="text-white hover:underline">
              soporte
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
