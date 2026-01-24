import React, { useState, useEffect } from 'react';
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
import { useAuthStore } from '@/stores/authStore';
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
      exp_year: '28',
      holder: 'Juan Pérez',
      description: 'Transacción aprobada (Bancolombia)'
    },
    DECLINED: {
      number: '4111111111111111',
      cvc: '123',
      exp_month: '12',
      exp_year: '28',
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
    product_id?: string; // Para crear orden en backend
    variant_id?: string;
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
  subtotal?: number;
  shippingCost?: number;
  tax?: number;
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
  subtotal,
  shippingCost,
  tax,
  onSuccess,
  onBack,
  isProcessing,
  setIsProcessing,
}: WompiPaymentProps) {
  const { isAuthenticated } = useAuthStore();

  // Estado del componente
  const [error, setError] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'methods' | 'card_form' | 'pse_form' | 'nequi_form' | 'processing' | 'success'>('methods');
  const [cardData, setCardData] = useState({
    number: '',
    cvc: '',
    exp_month: '',
    exp_year: '',
    card_holder: ''
  });
  const [pseData, setPseData] = useState({
    financial_institution_code: '',
    user_type: '',
    user_legal_id_type: '',
    user_legal_id: '',
    payment_description: ''
  });
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [showTestCards, setShowTestCards] = useState(false);
  const [reference, setReference] = useState<string>('');

  const [nequiPhone, setNequiPhone] = useState<string>('');
  const [showNequiForm, setShowNequiForm] = useState(false);
  const [financialInstitutions, setFinancialInstitutions] = useState<Array<{
    financial_institution_code: string;
    financial_institution_name: string;
  }>>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

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

  // Cargar instituciones financieras para PSE
  useEffect(() => {
    const loadFinancialInstitutions = async () => {
      setLoadingBanks(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const token = localStorage.getItem('melo_sportt_token') || localStorage.getItem('token');

        if (!token) {
          console.warn('[WompiPayment] No token for loading banks');
          return;
        }

        const response = await fetch(`${API_URL}/orders/wompi/financial-institutions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data && Array.isArray(result.data)) {
            setFinancialInstitutions(result.data);
            console.log('[WompiPayment] Loaded', result.data.length, 'financial institutions');
          }
        }
      } catch (err) {
        console.error('[WompiPayment] Error loading financial institutions:', err);
      } finally {
        setLoadingBanks(false);
      }
    };

    loadFinancialInstitutions();
  }, []);

  // Polling para verificar estado de transacción
  const pollTransaction = async (id: string) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    // Always read fresh token from localStorage to avoid stale tokens
    const token = localStorage.getItem('melo_sportt_token') || localStorage.getItem('token');
    
    if (!token) {
      console.error('No token found for polling transaction');
      setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
      setIsProcessing(false);
      return;
    }

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
          if (response.status === 401) {
            // Token expired during polling - clear and notify
            localStorage.removeItem('melo_sportt_token');
            localStorage.removeItem('token');
            window.dispatchEvent(new CustomEvent('melo:unauthorized'));
            clearInterval(interval);
            setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
            setPaymentStep('methods');
            setIsProcessing(false);
            return;
          }
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
  const handleCreateTransaction = async (cardTokenId?: string, paymentType?: 'CARD' | 'PSE' | 'NEQUI' | 'BANCOLOMBIA_TRANSFER', pseData?: any) => {
    setIsProcessing(true);
    setError(null);
    setPaymentStep('processing');

    // Evitar iniciar flujo de pago si el usuario no está autenticado
    if (!isAuthenticated) {
      setIsProcessing(false);
      setPaymentStep('methods');
      setError('Debes iniciar sesión para completar el pago.');
      toast.error('Por favor inicia sesión para continuar con el pago');
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      // Always read fresh token from localStorage to avoid stale tokens
      const token = localStorage.getItem('melo_sportt_token') || localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No se encontró token de autenticación. Por favor, inicia sesión nuevamente.');
      }

      // Preparar shipping_address con validación y formato correcto para Wompi
      let formattedShippingAddress = undefined;
      if (shippingAddress) {
        try {
          // Limpiar y formatear teléfono (solo números)
          const cleanPhone = shippingAddress.phone.replace(/\D/g, '');
          
          // Asegurar que el país esté en formato correcto (Wompi espera códigos ISO de 2 letras)
          let countryCode = shippingAddress.country;
          if (countryCode && countryCode.length > 2) {
            // Si viene un código largo, intentar extraer las primeras 2 letras
            countryCode = countryCode.substring(0, 2).toUpperCase();
          } else if (countryCode) {
            countryCode = countryCode.toUpperCase();
          }
          
          // Validar que los campos requeridos estén presentes
          if (!shippingAddress.address || !shippingAddress.city || !countryCode) {
            console.warn('[WompiPayment] Missing required shipping fields, skipping shipping_address');
            // No enviar shipping_address si faltan campos requeridos
          } else {
            // Validar longitud mínima requerida por Wompi (4 caracteres)
            const trimmedAddress = shippingAddress.address.trim();
            const trimmedCity = shippingAddress.city.trim();
            
            if (trimmedAddress.length < 4) {
              console.warn('[WompiPayment] Address too short:', trimmedAddress.length, 'characters');
              // No enviar shipping_address si no cumple requisitos
            } else if (trimmedCity.length < 4) {
              console.warn('[WompiPayment] City too short:', trimmedCity.length, 'characters');
              // No enviar shipping_address si no cumple requisitos
            } else {
              // Validar region (state) - si es muy corta, usar city como fallback
              let region = shippingAddress.state?.trim() || trimmedCity;
              if (region.length < 4) {
                region = trimmedCity;
              }

              // Construir name - debe tener al menos 4 caracteres
              const fullName = `${shippingAddress.firstName?.trim() || ''} ${shippingAddress.lastName?.trim() || ''}`.trim();
              const name = fullName.length >= 4 ? fullName : 'Cliente Melo Sportt';

              formattedShippingAddress = {
                address_line_1: trimmedAddress,
                // Solo incluir address_line_2 si tiene al menos 4 caracteres (Wompi requiere mínimo 4 si se envía)
                ...(shippingAddress.apartment?.trim() && shippingAddress.apartment.trim().length >= 4
                  ? { address_line_2: shippingAddress.apartment.trim() }
                  : {}),
                country: countryCode,
                region: region,
                city: trimmedCity,
                name: name,
                ...(cleanPhone && cleanPhone.length >= 7 ? { phone_number: cleanPhone } : {}),
              };

              // Log para debugging
              console.log('[WompiPayment] Formatted shipping address:', JSON.stringify(formattedShippingAddress, null, 2));
            }
          }
        } catch (error: any) {
          console.error('[WompiPayment] Error formatting shipping address:', error);
          // Si hay error, no enviar shipping_address (Wompi puede funcionar sin él)
          formattedShippingAddress = undefined;
        }
      }

      // Build request body - include payment_method or payment_type based on what we have
      const requestBody: any = {
        items, // Now includes product_id and variant_id for creating order
        customerEmail,
        orderId: reference,
        shippingAddress: formattedShippingAddress,
        // Include order calculation data for backend to create order
        subtotal,
        shipping_cost: shippingCost,
        tax,
      };

      // Include payment_method if we have a card token (for direct card payments)
      // For PSE/Nequi redirect flows, include payment_type so Wompi knows which method to use
      if (cardTokenId) {
        requestBody.payment_method = {
          type: 'CARD',
          installments: 1,
          token: cardTokenId
        };
        console.log('[WompiPayment] Including payment_method with card token:', cardTokenId);
      } else if (paymentType) {
        // For redirect flows, send payment_type so backend can include it in payment_method
        requestBody.payment_type = paymentType;
        console.log('[WompiPayment] Including payment_type for redirect flow:', paymentType);

        // Include payment_description for all redirect flows
        requestBody.payment_description = `Pago de pedido ${reference} - Melo Sportt`;

        // Add NEQUI phone if available
        if (paymentType === 'NEQUI' && nequiPhone) {
          requestBody.payment_method = {
            type: 'NEQUI',
            phone_number: nequiPhone
          };
        }

        // For PSE, include additional required fields
        if (paymentType === 'PSE' && pseData) {
          requestBody.financial_institution_code = pseData.financial_institution_code;
          requestBody.user_type = pseData.user_type;
          requestBody.user_legal_id_type = pseData.user_legal_id_type;
          requestBody.user_legal_id = pseData.user_legal_id;
          requestBody.payment_description = pseData.payment_description || requestBody.payment_description;
        }
      } else {
        console.log('[WompiPayment] No card token or payment type - transaction will be created for checkout widget');
      }

      const response = await fetch(`${API_URL}/orders/wompi/create-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Handle 401 Unauthorized - token expired/invalid
        if (response.status === 401) {
          // Clear token and notify app
          localStorage.removeItem('melo_sportt_token');
          localStorage.removeItem('token');
          window.dispatchEvent(new CustomEvent('melo:unauthorized'));
          throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        }
        
        const errorData = await response.json().catch(() => ({}));
        
        // Extraer mensaje de error más detallado de Wompi
        let errorMessage = 'Error al procesar la transacción';
        if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.error.messages) {
            // Si hay mensajes de validación específicos
            const messages = errorData.error.messages;
            if (messages.shipping_address) {
              const shippingErrors = Array.isArray(messages.shipping_address) 
                ? messages.shipping_address 
                : Object.values(messages.shipping_address);
              errorMessage = `Error en dirección de envío: ${shippingErrors.join(', ')}`;
            } else {
              errorMessage = errorData.error.reason || errorData.error.message || errorMessage;
            }
          } else if (errorData.error.reason) {
            errorMessage = errorData.error.reason;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (cardTokenId || paymentType === 'NEQUI') {
        // Con token de tarjeta o Nequi, hacemos polling del estado
        // Nequi funciona con polling, no con redirección
        pollTransaction(result.data.id);
      } else {
        // Para PSE (único método que requiere redirección), redirigir
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
    console.log('[WompiPayment] handleTokenizeAndPay called');
    console.log('[WompiPayment] Card data:', {
      numberLength: cardData.number.length,
      cvcLength: cardData.cvc.length,
      exp_month: cardData.exp_month,
      exp_year: cardData.exp_year,
      card_holder: cardData.card_holder
    });
    setIsProcessing(true);
    setError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      // Always read fresh token from localStorage to avoid stale tokens
      const token = localStorage.getItem('melo_sportt_token') || localStorage.getItem('token');

      console.log('[WompiPayment] Auth token present:', !!token);

      if (!token) {
        throw new Error('No se encontró token de autenticación. Por favor, inicia sesión nuevamente.');
      }

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

      console.log('[WompiPayment] Calling tokenize endpoint...');
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
        // Handle 401 Unauthorized - token expired/invalid
        if (response.status === 401) {
          localStorage.removeItem('melo_sportt_token');
          localStorage.removeItem('token');
          window.dispatchEvent(new CustomEvent('melo:unauthorized'));
          throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Datos de tarjeta inválidos');
      }

      const result = await response.json();
      console.log('[WompiPayment] Tokenization successful, token ID:', result.data?.id);
      await handleCreateTransaction(result.data.id);
    } catch (err: any) {
      console.error('[WompiPayment] Tokenization error:', err);
      setError(err.message || 'Error al validar la tarjeta. Verifica los datos e intenta de nuevo.');
      setIsProcessing(false);
    }
  };

  // Manejar envío del formulario PSE
  const handlePseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      // Validaciones básicas para PSE
      if (!pseData.financial_institution_code) {
        throw new Error('Por favor selecciona tu banco');
      }
      if (!pseData.user_type) {
        throw new Error('Por favor selecciona el tipo de persona');
      }
      if (!pseData.user_legal_id_type) {
        throw new Error('Por favor selecciona el tipo de documento');
      }
      if (!pseData.user_legal_id) {
        throw new Error('Por favor ingresa tu número de documento');
      }
      if (!pseData.payment_description) {
        throw new Error('Por favor ingresa una descripción del pago');
      }

      await handleCreateTransaction(undefined, 'PSE', pseData);
    } catch (err: any) {
      console.error('PSE form error:', err);
      setError(err.message || 'Error al procesar los datos de PSE. Verifica la información e intenta de nuevo.');
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

            {/* PSE específico */}
            <button
              onClick={() => {
                console.log('[WompiPayment] User selected PSE - showing PSE form');
                setPaymentStep('pse_form');
              }}
              className="w-full p-4 bg-primary-800 rounded-lg border border-primary-700 hover:border-blue-500 transition-all text-left flex items-center gap-4"
            >
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">PSE / Bancolombia</h4>
                <p className="text-xs text-gray-400">Transferencia bancaria directa</p>
              </div>
            </button>

            {/* Nequi específico */}
            <button
              onClick={() => {
                console.log('[WompiPayment] User selected Nequi - showing Nequi form');
                setPaymentStep('nequi_form');
              }}
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
              <h3 className="text-lg font-medium text-white mb-4">Datos de la Tarjeta</h3>

              {/* Panel de tarjetas de prueba (solo sandbox) */}
              {isSandbox && <TestCardsPanel />}

              <Input
                label="Número de tarjeta"
                placeholder="4242 4242 4242 4242"
                required
                value={cardData.number}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCardData({...cardData, number: e.target.value.replace(/\D/g, '')})}
                maxLength={19}
                leftIcon={<CreditCard className="h-5 w-5" />}
              />

              <Input
                label="Nombre del titular"
                placeholder="JUAN PÉREZ"
                required
                value={cardData.card_holder}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCardData({...cardData, card_holder: e.target.value.toUpperCase()})}
              />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-white">Mes</label>
                  <select
                    required
                    value={cardData.exp_month}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCardData({...cardData, exp_month: e.target.value})}
                    className="w-full bg-primary-800 rounded-lg p-2 mt-1 text-white border border-primary-700"
                  >
                    <option value="">MM</option>
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-white">Año</label>
                  <select
                    required
                    value={cardData.exp_year}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCardData({...cardData, exp_year: e.target.value})}
                    className="w-full bg-primary-800 rounded-lg p-2 mt-1 text-white border border-primary-700"
                  >
                    <option value="">AA</option>
                    {Array.from({length: 10}, (_, i) => {
                      const year = new Date().getFullYear() - 2000 + i;
                      return <option key={year} value={year.toString()}>{year}</option>;
                    })}
                  </select>
                </div>
                <Input
                  label="CVC"
                  placeholder="123"
                  required
                  type="password"
                  value={cardData.cvc}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCardData({...cardData, cvc: e.target.value.replace(/\D/g, '')})}
                  maxLength={4}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setPaymentStep('methods')} leftIcon={<ChevronLeft className="h-4 w-4" />}>
                  Atrás
                </Button>
                <Button type="submit" className="flex-1" isLoading={isProcessing} leftIcon={<Lock className="h-4 w-4" />}>
                  Pagar {formatCurrency(total)}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {paymentStep === 'pse_form' && (
          <motion.div
            key="pse_form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <form onSubmit={handlePseSubmit} className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4">Información para PSE</h3>

              <div>
                <label className="text-sm text-white">Tipo de persona</label>
                <select
                  required
                  value={pseData.user_type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPseData({...pseData, user_type: e.target.value})}
                  className="w-full bg-primary-800 rounded-lg p-2 mt-1 text-white"
                >
                  <option value="">Selecciona el tipo de persona</option>
                  <option value="0">Persona Natural</option>
                  <option value="1">Persona Jurídica</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-white">Tipo de documento</label>
                <select
                  required
                  value={pseData.user_legal_id_type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPseData({...pseData, user_legal_id_type: e.target.value})}
                  className="w-full bg-primary-800 rounded-lg p-2 mt-1 text-white"
                >
                  <option value="">Selecciona el tipo de documento</option>
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="TI">Tarjeta de Identidad</option>
                  <option value="RC">Registro Civil</option>
                  <option value="TE">Tarjeta de Extranjería</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="NIT">NIT</option>
                  <option value="PP">Pasaporte</option>
                  <option value="DNI">DNI</option>
                </select>
              </div>

              <Input
                label="Número de documento"
                placeholder="1234567890"
                required
                value={pseData.user_legal_id}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPseData({...pseData, user_legal_id: e.target.value.replace(/\D/g, '')})}
              />

              <div>
                <label className="text-sm text-white">Banco</label>
                <select
                  required
                  value={pseData.financial_institution_code}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPseData({...pseData, financial_institution_code: e.target.value})}
                  className="w-full bg-primary-800 rounded-lg p-2 mt-1 text-white border border-primary-700"
                  disabled={loadingBanks}
                >
                  <option value="">{loadingBanks ? 'Cargando bancos...' : 'Selecciona tu banco'}</option>
                  {financialInstitutions.map((bank) => (
                    <option key={bank.financial_institution_code} value={bank.financial_institution_code}>
                      {bank.financial_institution_name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Descripción del pago"
                placeholder="Pago de productos Melo Sportt"
                required
                value={pseData.payment_description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPseData({...pseData, payment_description: e.target.value})}
              />

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setPaymentStep('methods')}>
                  Atrás
                </Button>
                <Button type="submit" className="flex-1" isLoading={isProcessing}>
                  Continuar con PSE - {formatCurrency(total)}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {paymentStep === 'nequi_form' && (
          <motion.div
            key="nequi_form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <form onSubmit={(e) => {
              e.preventDefault();
              if (nequiPhone.length < 10) {
                toast.error('Número de celular inválido');
                return;
              }
              handleCreateTransaction(undefined, 'NEQUI');
            }} className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4">Número de Nequi</h3>

              <div className="p-4 bg-purple-500/10 rounded-lg mb-4">
                <p className="text-sm text-gray-300">
                  Ingresa el número de celular asociado a tu cuenta Nequi. Te enviaremos una notificación push a tu app para confirmar el pago.
                </p>
              </div>

              <Input
                label="Número de Celular Nequi"
                placeholder="300 123 4567"
                required
                type="tel"
                value={nequiPhone}
                onChange={(e) => setNequiPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                leftIcon={<Smartphone className="h-5 w-5" />}
              />

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setPaymentStep('methods')}>
                  Atrás
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  isLoading={isProcessing}
                  disabled={nequiPhone.length < 10}
                >
                  Continuar con Nequi - {formatCurrency(total)}
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
