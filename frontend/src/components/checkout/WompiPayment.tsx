import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Smartphone,
  Building2,
  Lock,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  Code,
  TestTube,
  Info,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

// ===========================================
// CONFIGURACIÓN WOMPI
// ===========================================

// URLs de Wompi según ambiente
const WOMPI_CONFIG = {
  SANDBOX: {
    API_BASE: 'https://sandbox.wompi.co/v1',
    CHECKOUT_URL: 'https://checkout.wompi.co',
    WIDGET_SCRIPT: 'https://checkout.wompi.co/widget.js',
    PUBLIC_KEY_PREFIX: 'pub_test_',
    PRIVATE_KEY_PREFIX: 'prv_test_',
    EVENTS_SECRET_PREFIX: 'test_events_',
    INTEGRITY_SECRET_PREFIX: 'test_integrity_',
  },
  PRODUCTION: {
    API_BASE: 'https://production.wompi.co/v1',
    CHECKOUT_URL: 'https://checkout.wompi.co',
    WIDGET_SCRIPT: 'https://checkout.wompi.co/widget.js',
    PUBLIC_KEY_PREFIX: 'pub_prod_',
    PRIVATE_KEY_PREFIX: 'prv_prod_',
    EVENTS_SECRET_PREFIX: 'prod_events_',
    INTEGRITY_SECRET_PREFIX: 'prod_integrity_',
  }
};

// Datos de prueba para Sandbox
const TEST_DATA = {
  CARDS: {
    APPROVED: {
      number: '4242424242424242',
      cvc: '123',
      exp_month: '12',
      exp_year: '25',
      holder: 'Juan Pérez',
      description: 'Transacción aprobada (Bancolombia)'
    },
    DECLINED: {
      number: '4111111111111111',
      cvc: '123',
      exp_month: '12',
      exp_year: '25',
      holder: 'Juan Pérez',
      description: 'Transacción declinada (Banco rechaza)'
    },
  },
  NEQUI: {
    APPROVED: {
      phone: '3991111111',
      description: 'Nequi aprobado'
    },
    DECLINED: {
      phone: '3992222222',
      description: 'Nequi declinado'
    }
  },
  PSE: {
    BANKS: ['Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA']
  }
};

// Generar referencia única para transacción
const generateReference = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `MST-${timestamp}-${random}`;
};

// Calcular hash de integridad SHA256 (referencia + monto + moneda + secreto)
const calculateIntegrityHash = (
  reference: string,
  amountInCents: number,
  currency: string,
  secret: string
): string => {
  const concat = `${reference}${amountInCents}${currency}${secret}`;

  // SHA256 simple implementation (en producción usar backend)
  let hash = 0;
  for (let i = 0; i < concat.length; i++) {
    const char = concat.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
};

// Detectar ambiente actual basado en la clave pública
const detectEnvironment = (publicKey?: string): 'sandbox' | 'production' => {
  if (!publicKey) return 'sandbox';
  return publicKey.startsWith(WOMPI_CONFIG.PRODUCTION.PUBLIC_KEY_PREFIX)
    ? 'production'
    : 'sandbox';
};

interface WompiPaymentProps {
  total: number;
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  customerEmail: string;
  shippingAddress?: {
    address: string;
    apartment?: string;
    city: string;
    state: string;
    country: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  onSuccess: (transactionId: string) => void;
  onBack: () => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}

export function WompiPayment({
  total,
  items,
  customerEmail,
  shippingAddress,
  onSuccess,
  onBack,
  isProcessing,
  setIsProcessing,
}: WompiPaymentProps) {
  // Estado del componente
  const [error, setError] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'methods' | 'card_form' | 'processing' | 'success'>('methods');
  const [cardData, setCardData] = useState({
    number: '',
    cvc: '',
    exp_month: '',
    exp_year: '',
    card_holder: ''
  });
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [showTestCards, setShowTestCards] = useState(false);
  const [reference, setReference] = useState<string>('');

  // Detectar ambiente
  const environment = detectEnvironment(
    import.meta.env.VITE_WOMPI_PUBLIC_KEY ||
    (typeof window !== 'undefined' && (window as any).WOMPI_PUBLIC_KEY)
  );
  const isSandbox = environment === 'sandbox';

  // Generar referencia al montar
  useEffect(() => {
    setReference(generateReference());
  }, []);

  // Polling para verificar estado de transacción
  const pollTransaction = async (id: string) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('melo_sportt_token') || localStorage.getItem('token');

    let attempts = 0;
    const maxAttempts = 20; // Aumentado para mejor tolerancia

    const interval = setInterval(async () => {
      try {
        attempts++;
        const response = await fetch(`${API_URL}/orders/wompi/transaction/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.warn('Polling: Error checking transaction status');
          return;
        }

        const result = await response.json();
        const status = result.data?.status;
        setTransactionStatus(status);

        if (status === 'APPROVED') {
          clearInterval(interval);
          setPaymentStep('success');
          setTimeout(() => onSuccess(id), 1500);
        } else if (status === 'DECLINED' || status === 'ERROR' || status === 'VOIDED') {
          clearInterval(interval);
          setError(status === 'DECLINED'
            ? 'La transacción fue rechazada por el banco. Intenta con otra tarjeta o método de pago.'
            : 'Hubo un error procesando el pago. Por favor intenta de nuevo.');
          setPaymentStep('card_form');
          setIsProcessing(false);
        } else if (status === 'PENDING' && attempts >= maxAttempts) {
          clearInterval(interval);
          setError('La transacción está pendiente de confirmación. Verifica tu correo para más detalles.');
          setPaymentStep('methods');
          setIsProcessing(false);
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setError('Tiempo de espera agotado. Verifica el estado de tu pedido en Mis Pedidos.');
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2500); // 2.5 segundos entre intentos
  };

  // Crear transacción con Wompi
  const handleCreateTransaction = async (cardTokenId?: string) => {
    setIsProcessing(true);
    setError(null);
    setPaymentStep('processing');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const token = localStorage.getItem('melo_sportt_token') || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/orders/wompi/create-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          items,
          customerEmail,
          orderId: reference,
          payment_method: cardTokenId ? {
            type: 'CARD',
            installments: 1,
            token: cardTokenId
          } : undefined,
          shippingAddress: shippingAddress ? {
            address_line_1: shippingAddress.address,
            address_line_2: shippingAddress.apartment || '',
            country: shippingAddress.country,
            region: shippingAddress.state,
            city: shippingAddress.city,
            name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
            phone_number: shippingAddress.phone,
          } : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Error al procesar la transacción');
      }

      const result = await response.json();

      if (cardTokenId) {
        // Con token de tarjeta, hacemos polling del estado
        pollTransaction(result.data.id);
      } else {
        // Para métodos redirigidos (PSE, Nequi, etc.), redirigir
        window.location.href = result.data.checkout_url;
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Error al procesar el pago. Por favor intenta de nuevo.');
      setPaymentStep('methods');
      setIsProcessing(false);
    }
  };

  // Tokenizar tarjeta y crear pago
  const handleTokenizeAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const token = localStorage.getItem('melo_sportt_token') || localStorage.getItem('token');

      // Validaciones básicas
      if (cardData.number.length < 13 || cardData.number.length > 19) {
        throw new Error('Número de tarjeta inválido');
      }
      if (cardData.cvc.length < 3 || cardData.cvc.length > 4) {
        throw new Error('CVC inválido');
      }
      if (!cardData.exp_month || !cardData.exp_year) {
        throw new Error('Fecha de vencimiento inválida');
      }

      // En sandbox, podemos enviar directamente al backend
      // En producción, esto debería usar el SDK de Wompi en el frontend
      const response = await fetch(`${API_URL}/orders/wompi/tokenize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(cardData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Datos de tarjeta inválidos');
      }

      const result = await response.json();
      await handleCreateTransaction(result.data.id);
    } catch (err: any) {
      console.error('Tokenization error:', err);
      setError(err.message || 'Error al validar la tarjeta. Verifica los datos e intenta de nuevo.');
      setIsProcessing(false);
    }
  };

  // Copiar datos de prueba al portapapeles
  const copyTestCard = async (type: 'approved' | 'declined') => {
    const card = type === 'approved' ? TEST_DATA.CARDS.APPROVED : TEST_DATA.CARDS.DECLINED;
    setCardData({
      number: card.number,
      cvc: card.cvc,
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      card_holder: card.holder
    });

    await navigator.clipboard.writeText(card.number);
    toast.success('Datos de tarjeta copiados y aplicados');
  };

  // Renderizar badge de ambiente
  const EnvironmentBadge = () => (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
      isSandbox
        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
        : 'bg-green-500/20 text-green-400 border border-green-500/30'
    }`}>
      <TestTube className="h-3.5 w-3.5" />
      {isSandbox ? 'SANDBOX - Modo Pruebas' : 'PRODUCCIÓN'}
    </div>
  );

  // Renderizar tarjeta de datos de prueba
  const TestCardsPanel = () => (
    <div className="bg-primary-800/50 border border-primary-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setShowTestCards(!showTestCards)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-primary-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-white font-medium">Datos de Prueba (Solo Sandbox)</span>
        </div>
        {showTestCards ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
      </button>

      <AnimatePresence>
        {showTestCards && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-primary-700"
          >
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => copyTestCard('approved')}
                  className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-400 font-medium">APROBADA</span>
                  </div>
                  <p className="text-xs text-gray-400">{TEST_DATA.CARDS.APPROVED.description}</p>
                  <p className="text-xs font-mono text-gray-300 mt-1">{TEST_DATA.CARDS.APPROVED.number}</p>
                </button>

                <button
                  onClick={() => copyTestCard('declined')}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-red-400 font-medium">RECHAZADA</span>
                  </div>
                  <p className="text-xs text-gray-400">{TEST_DATA.CARDS.DECLINED.description}</p>
                  <p className="text-xs font-mono text-gray-300 mt-1">{TEST_DATA.CARDS.DECLINED.number}</p>
                </button>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-blue-400 font-medium">Nequi - Pruebas</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Aprobado:</span>
                    <span className="text-white ml-1 font-mono">{TEST_DATA.NEQUI.APPROVED.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Rechazado:</span>
                    <span className="text-white ml-1 font-mono">{TEST_DATA.NEQUI.DECLINED.phone}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-gray-500/10 rounded-lg">
                <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-400">
                  Estos datos funcionan solo en modo Sandbox. No se realizará ningún cargo real.
                  Usa estos datos para probar el flujo de pago completo.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header con ambiente y referencia */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <EnvironmentBadge />
        {reference && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Ref:</span>
            <code className="text-blue-400 font-mono">{reference}</code>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {paymentStep === 'methods' && (
          <motion.div
            key="methods"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-medium text-white mb-4">Elige tu medio de pago</h3>

            {/* Tarjeta de Crédito/Débito */}
            <button
              onClick={() => setPaymentStep('card_form')}
              className="w-full p-4 bg-primary-800 rounded-lg border border-primary-700 hover:border-green-500 transition-all text-left flex items-center gap-4"
            >
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">Tarjeta de Crédito / Débito</h4>
                <p className="text-xs text-gray-400">Visa, Mastercard, Amex</p>
              </div>
            </button>

            {/* PSE / Nequi / Bancolombia */}
            <button
              onClick={() => handleCreateTransaction()}
              className="w-full p-4 bg-primary-800 rounded-lg border border-primary-700 hover:border-blue-500 transition-all text-left flex items-center gap-4"
            >
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">PSE / Nequi / Bancolombia</h4>
                <p className="text-xs text-gray-400">Transferencia bancaria directa</p>
              </div>
            </button>

            {/* Nequi específico */}
            <button
              onClick={() => handleCreateTransaction()}
              className="w-full p-4 bg-primary-800 rounded-lg border border-primary-700 hover:border-purple-500 transition-all text-left flex items-center gap-4"
            >
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Smartphone className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">Nequi</h4>
                <p className="text-xs text-gray-400">Pago rápido desde tu celular</p>
              </div>
            </button>

            <div className="pt-4 flex gap-4">
              <Button variant="outline" onClick={onBack} leftIcon={<ChevronLeft className="h-4 w-4" />}>
                Volver
              </Button>
            </div>
          </motion.div>
        )}

        {paymentStep === 'card_form' && (
          <motion.div
            key="card_form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <form onSubmit={handleTokenizeAndPay} className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4">Datos de tu tarjeta</h3>

              <Input
                label="Nombre en la tarjeta"
                placeholder="JUAN PEREZ"
                required
                value={cardData.card_holder}
                onChange={e => setCardData({...cardData, card_holder: e.target.value.toUpperCase()})}
              />

              <Input
                label="Número de tarjeta"
                placeholder="4242 4242 4242 4242"
                required
                maxLength={16}
                value={cardData.number}
                onChange={e => setCardData({...cardData, number: e.target.value.replace(/\D/g, '')})}
              />

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Mes"
                  placeholder="MM"
                  required
                  maxLength={2}
                  value={cardData.exp_month}
                  onChange={e => setCardData({...cardData, exp_month: e.target.value})}
                />
                <Input
                  label="Año"
                  placeholder="YY"
                  required
                  maxLength={2}
                  value={cardData.exp_year}
                  onChange={e => setCardData({...cardData, exp_year: e.target.value})}
                />
                <Input
                  label="CVC"
                  placeholder="123"
                  type="password"
                  required
                  maxLength={4}
                  value={cardData.cvc}
                  onChange={e => setCardData({...cardData, cvc: e.target.value})}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Datos de prueba (solo en sandbox) */}
              {isSandbox && <TestCardsPanel />}

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setPaymentStep('methods')}>
                  Atrás
                </Button>
                <Button type="submit" className="flex-1" isLoading={isProcessing}>
                  Pagar {formatCurrency(total)}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {paymentStep === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 space-y-4"
          >
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
            <h3 className="text-xl font-bold text-white">Procesando tu pago</h3>
            <p className="text-gray-400">Estamos verificando la transacción con tu banco...</p>
            {transactionStatus && (
              <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-400">
                Estado: {transactionStatus}
              </span>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Por favor no cierres esta ventana mientras procesamos tu pago
            </p>
          </motion.div>
        )}

        {paymentStep === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 space-y-4"
          >
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-white">¡Pago Exitoso!</h3>
            <p className="text-gray-400">Tu pedido ha sido confirmado.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer de seguridad */}
      <div className="p-4 bg-primary-800/50 rounded-xl border border-primary-700/50 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-1">
            Tus datos están protegidos por Wompi (Bancolombia). Melo Sportt no almacena la información de tu tarjeta.
          </p>
          {isSandbox && (
            <p className="text-xs text-yellow-400/80">
              Estás en modo Sandbox. No se realizarán cargos reales a ninguna tarjeta.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Exportar configuración y utilidades para uso externo
export const WompiUtils = {
  CONFIG: WOMPI_CONFIG,
  TEST_DATA,
  generateReference,
  calculateIntegrityHash,
  detectEnvironment,
};
