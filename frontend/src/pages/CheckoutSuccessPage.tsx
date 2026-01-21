import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Package, Mail, Truck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'error'>('pending');

  const paymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference');
  const collectionStatus = searchParams.get('collection_status');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentId) {
        setPaymentStatus('error');
        setIsVerifying(false);
        return;
      }

      try {
        // Optional: Verify payment with your backend
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const token = localStorage.getItem('token');

        if (token) {
          const response = await fetch(
            `${API_URL}/orders/wompi/transaction/${paymentId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result.data.status === 'approved') {
              setPaymentStatus('success');
            } else if (result.data.status === 'pending') {
              setPaymentStatus('pending');
            } else {
              setPaymentStatus('error');
            }
          }
        } else {
          // If no token, trust the URL params
          if (collectionStatus === 'approved') {
            setPaymentStatus('success');
          } else if (collectionStatus === 'pending' || collectionStatus === 'in_process') {
            setPaymentStatus('pending');
          } else {
            setPaymentStatus('error');
          }
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        // On error, trust the URL params as fallback
        if (collectionStatus === 'approved') {
          setPaymentStatus('success');
        } else {
          setPaymentStatus('pending');
        }
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [paymentId, collectionStatus]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Verificando tu pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          {paymentStatus === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8"
              >
                <Check className="h-12 w-12 text-white" />
              </motion.div>

              <h1 className="text-4xl font-bold text-white mb-4">
                ¡Pago Exitoso!
              </h1>
              <p className="text-gray-400 text-lg mb-2">
                Tu pago ha sido procesado correctamente.
              </p>
              {externalReference && (
                <p className="text-white font-medium mb-8">
                  Número de Pedido:{' '}
                  <span className="text-green-400">{externalReference}</span>
                </p>
              )}

              <div className="p-6 bg-primary-900 rounded-xl mb-8">
                <h3 className="font-medium text-white mb-4 text-center">¿Qué sigue?</h3>
                <ul className="space-y-3 max-w-sm mx-auto">
                  <li className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">
                      Recibirás una confirmación por correo electrónico
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">
                      Te enviaremos actualizaciones sobre tu pedido
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">
                      Prepararemos tu envío lo antes posible
                    </span>
                  </li>
                </ul>
              </div>
            </>
          )}

          {paymentStatus === 'pending' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-8"
              >
                <Package className="h-12 w-12 text-white" />
              </motion.div>

              <h1 className="text-4xl font-bold text-white mb-4">
                ¡Pago Pendiente!
              </h1>
              <p className="text-gray-400 text-lg mb-8">
                Tu pago está siendo procesado. Te notificaremos cuando se confirme.
              </p>

              <div className="p-6 bg-primary-900 rounded-xl mb-8">
                <p className="text-gray-300 text-sm text-center">
                  Algunos métodos de pago pueden tardar hasta 2 días hábiles en procesarse.
                  Recibirás un correo cuando tu pago sea confirmado.
                </p>
              </div>
            </>
          )}

          {paymentStatus === 'error' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-8"
              >
                <Package className="h-12 w-12 text-white" />
              </motion.div>

              <h1 className="text-4xl font-bold text-white mb-4">
                Algo salió mal
              </h1>
              <p className="text-gray-400 text-lg mb-8">
                Hubo un problema al verificar tu pago. Por favor, contacta a soporte.
              </p>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {paymentStatus === 'success' && (
              <Button variant="outline" onClick={() => navigate('/account/orders')}>
                Ver Mis Pedidos
              </Button>
            )}
            <Button onClick={() => navigate('/shop')}>
              {paymentStatus === 'error' ? 'Intentar de Nuevo' : 'Seguir Comprando'}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
