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
  const [userEmail, setUserEmail] = useState('');

  const paymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference');
  const collectionStatus = searchParams.get('collection_status');

  useEffect(() => {
    // Obtener email del usuario si está disponible
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.email) {
          setUserEmail(user.email);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

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

  if (paymentStatus === 'pending') {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <Package className="h-12 w-12 text-white" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              ¡Pago Pendiente!
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Tu pago está siendo procesado. Te notificaremos cuando se confirme.
            </p>

            <div className="p-6 bg-gray-900 rounded-xl mb-8 max-w-2xl mx-auto">
              <p className="text-gray-300 text-sm text-center">
                Algunos métodos de pago pueden tardar hasta 2 días hábiles en procesarse.
                Recibirás un correo cuando tu pago sea confirmado.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate('/shop')}>
                Seguir Comprando
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <Package className="h-12 w-12 text-white" />
            </div>

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
    );
  }

  // Pago exitoso - Mostrar el diseño proporcionado
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <a className="flex items-center gap-3 hover:opacity-80 transition-opacity" href="/">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-xl">M</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-white">MELO SPORTT</span>
            </a>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span className="hidden sm:inline">Pago Seguro</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          {/* Barra de Progreso */}
          <div className="mb-12 sm:mb-16">
            <div className="flex items-center justify-center">
              {/* Paso 1: Envío */}
              <div className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white text-black shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-white">Envío</span>
                </div>
                <div className="w-12 sm:w-20 md:w-24 h-0.5 mx-2 sm:mx-3 bg-white"></div>
              </div>

              {/* Paso 2: Pago */}
              <div className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white text-black shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-white">Pago</span>
                </div>
                <div className="w-12 sm:w-20 md:w-24 h-0.5 mx-2 sm:mx-3 bg-white"></div>
              </div>

              {/* Paso 3: Confirmación */}
              <div className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-green-500 text-white shadow-lg shadow-green-500/50 animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-green-400">Confirmación</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sección de Confirmación */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {/* Icono Grande de Check */}
            <div className="w-20 h-20 sm:w-28 sm:h-28 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-2xl shadow-green-500/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
            </div>

            {/* Título */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
              ¡Gracias por tu compra!
            </h1>

            {/* Descripción */}
            <p className="text-gray-400 mb-4 text-base sm:text-lg max-w-2xl mx-auto px-4">
              Tu pedido ha sido confirmado y será enviado pronto.
            </p>

            {/* Número de Pedido */}
            {externalReference && (
              <div className="mb-10 sm:mb-12">
                <p className="text-gray-400 text-sm sm:text-base mb-2">
                  Número de Pedido:
                </p>
                <p className="text-green-400 font-bold text-lg sm:text-xl">
                  Ref: {externalReference}
                </p>
              </div>
            )}

            {/* Caja de Información */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 mb-10 sm:mb-12 border border-gray-700 shadow-2xl max-w-2xl mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">
                ¿Qué sigue?
              </h2>

              <div className="space-y-5 sm:space-y-6 text-left">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </svg>
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                      Recibirás una confirmación por correo en
                      <span className="text-white font-semibold ml-1">{userEmail || 'tu correo registrado'}</span>
                    </p>
                  </div>
                </div>

                {/* Actualizaciones */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" x2="12" y1="15" y2="3"></line>
                    </svg>
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                      Te enviaremos actualizaciones de envío por correo y WhatsApp
                    </p>
                  </div>
                </div>

                {/* Tiempo de Entrega */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path>
                      <path d="M15 18H9"></path>
                      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path>
                      <circle cx="17" cy="18" r="2"></circle>
                      <circle cx="7" cy="18" r="2"></circle>
                    </svg>
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                      Tiempo estimado de entrega:
                      <span className="text-white font-semibold ml-1">5-7 días hábiles</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch max-w-lg mx-auto px-4">
              <button
                onClick={() => navigate('/account/orders')}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/20 bg-transparent text-white border-2 border-white hover:bg-white hover:text-black hover:scale-105 active:scale-95 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"></path>
                  <path d="m12 12 4 10 1.7-4.3L22 16Z"></path>
                </svg>
                Ver Pedido
              </button>

              <button
                onClick={() => navigate('/shop')}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/20 bg-white text-black hover:bg-gray-100 hover:scale-105 active:scale-95 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg shadow-2xl shadow-white/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="21" r="1"></circle>
                  <circle cx="19" cy="21" r="1"></circle>
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
                </svg>
                Seguir Comprando
              </button>
            </div>

            {/* Soporte */}
            <div className="mt-10 sm:mt-12 pt-8 border-t border-gray-800">
              <p className="text-gray-400 text-sm sm:text-base">
                ¿Tienes alguna pregunta? Contáctanos en
                <a href="mailto:soporte@melosportt.com" className="text-white font-medium hover:text-green-400 underline decoration-2 underline-offset-4 transition-colors ml-1">
                  soporte@melosportt.com
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl py-8">
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-3">
              © 2026 MELO SPORTT. Todos los derechos reservados.
            </p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a>
              <span className="hidden sm:inline">•</span>
              <a href="#" className="hover:text-white transition-colors">Política de Privacidad</a>
              <span className="hidden sm:inline">•</span>
              <a href="#" className="hover:text-white transition-colors">Política de Envíos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
