import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Check, ShieldCheck, PackageOpen, Truck, Clock, Store, HeadsetIcon, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'error'>('pending');
  const [orderNumber, setOrderNumber] = useState('');

  const paymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference');
  const collectionStatus = searchParams.get('collection_status');

  useEffect(() => {
    // Set order number from external reference if available
    if (externalReference) {
      setOrderNumber(externalReference);
    }

    const verifyPayment = async () => {
      // First check if we have approval status from URL params
      if (collectionStatus === 'approved') {
        setPaymentStatus('success');
        setIsVerifying(false);
        return;
      }

      // If no token, check URL params for status
      if (!localStorage.getItem('token')) {
        if (collectionStatus === 'pending' || collectionStatus === 'in_process') {
          setPaymentStatus('pending');
        } else if (collectionStatus !== 'approved') {
          setPaymentStatus('error');
        }
        setIsVerifying(false);
        return;
      }

      // Only try backend verification if we have both token and paymentId
      if (!paymentId || !localStorage.getItem('token')) {
        // Without paymentId but with approved status, show success
        if (collectionStatus === 'approved') {
          setPaymentStatus('success');
        } else {
          setPaymentStatus('error');
        }
        setIsVerifying(false);
        return;
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const token = localStorage.getItem('token');

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
          if (result.data.status === 'APPROVED') {
            setPaymentStatus('success');
            // Update order number from backend response if available
            if (result.data.reference) {
              setOrderNumber(result.data.reference);
            }
          } else if (result.data.status === 'PENDING' || result.data.status === 'IN_PROCESS') {
            setPaymentStatus('pending');
          } else {
            setPaymentStatus('error');
          }
        } else {
          // API error but collectionStatus approved means success
          if (collectionStatus === 'approved') {
            setPaymentStatus('success');
          } else {
            setPaymentStatus('error');
          }
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        // On API error, trust URL params
        if (collectionStatus === 'approved') {
          setPaymentStatus('success');
        } else if (collectionStatus === 'pending' || collectionStatus === 'in_process') {
          setPaymentStatus('pending');
        } else {
          setPaymentStatus('error');
        }
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [paymentId, collectionStatus, externalReference]);

  if (isVerifying) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Verificando tu pago...</p>
        </div>
      </div>
    );
  }

  // Show error page for actual errors
  if (paymentStatus === 'error' && collectionStatus !== 'approved') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-8"
              >
                <Package className="h-12 w-12 text-white" />
              </motion.div>

              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Algo salió mal
              </h1>
              <p className="text-gray-400 text-lg mb-8">
                Hubo un problema al verificar tu pago. Por favor, contacta a soporte.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => navigate('/shop')}>
                  Intentar de Nuevo
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show success confirmation page
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-4xl px-4 sm:px-6"
        >
          {/* Header Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-white">Pago Seguro</span>
            </div>
          </motion.div>

          {/* Progress Steps */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-12 sm:mb-16 flex justify-center"
          >
            <div className="flex items-center justify-center">
              {/* Step 1: Shipping */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white text-black shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                </div>
                <span className="text-xs sm:text-sm font-medium text-white">Envío</span>
              </motion.div>

              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "5rem" }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="w-12 sm:w-20 md:w-24 h-0.5 mx-2 sm:mx-3 bg-white"
              />

              {/* Step 2: Payment */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white text-black shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                </div>
                <span className="text-xs sm:text-sm font-medium text-white">Pago</span>
              </motion.div>

              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "5rem" }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="w-12 sm:w-20 md:w-24 h-0.5 mx-2 sm:mx-3 bg-white"
              />

              {/* Step 3: Confirmation */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center gap-2"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-green-500 text-white shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                </motion.div>
                <span className="text-xs sm:text-sm font-medium text-green-400">Confirmación</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Success Icon and Message */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="w-24 h-24 sm:w-32 sm:h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg shadow-green-500/50"
            >
              <motion.div
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 sm:h-16 sm:w-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 L9 17 L4 12"></path>
                </svg>
              </motion.div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl sm:text-4xl font-bold text-white mb-2"
            >
              ¡Gracias por tu compra!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-400 mb-4"
            >
              {paymentStatus === 'pending' ? 'Tu pago está siendo procesado' : 'Tu pedido ha sido confirmado'}
            </motion.p>

            {orderNumber && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-green-400 font-medium"
              >
                Número de pedido: {orderNumber}
              </motion.p>
            )}
          </div>

          {/* Next Steps Box */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-12 sm:mt-16 max-w-2xl mx-auto"
          >
            <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 backdrop-blur-sm border border-gray-800">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-6 flex items-center gap-3">
                <PackageOpen className="h-6 w-6 text-green-400" />
                ¿Qué sigue?
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Truck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">Envío</h3>
                    <p className="text-gray-400 text-sm">Prepararemos tu pedido para envío. Recibirás un correo cuando sea enviado.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">Tiempo de entrega</h3>
                    <p className="text-gray-400 text-sm">La entrega estimada es de 3 a 7 días hábiles dependiendo de tu ubicación.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Store className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">Seguimiento</h3>
                    <p className="text-gray-400 text-sm">Podrás rastrear tu pedido en tiempo real desde tu cuenta.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 sm:mt-12 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              onClick={() => navigate('/account/orders')}
              className="min-w-[12rem]"
            >
              Ver Pedido
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/shop')}
              className="min-w-[12rem]"
            >
              Seguir Comprando
            </Button>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-8 sm:mt-12 text-center"
          >
            <p className="text-gray-400 text-sm mb-4">¿Necesitas ayuda? Contáctanos</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-gray-400 text-sm">
              <motion.a
                whileHover={{ scale: 1.05, color: '#fff' }}
                href="mailto:soporte@melosportt.com"
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                soporte@melosportt.com
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.05, color: '#fff' }}
                href="tel:+573001234567"
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                +57 300 123 4567
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.05, color: '#fff' }}
                href="https://wa.me/573001234567"
                className="flex items-center gap-2"
              >
                <HeadsetIcon className="h-4 w-4" />
                WhatsApp
              </motion.a>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}