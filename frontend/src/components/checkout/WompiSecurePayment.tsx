import React, { useState, useEffect, useCallback } from 'react';
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
  Shield,
  CircleDollarSign,
  User,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface WompiSecurePaymentProps {
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
  onSuccess: (transactionId: string, reference: string) => void;
  onBack: () => void;
}

interface PreparedTransaction {
  publicKey: string;
  integrity: string; // Firma SHA256 generada por backend
  reference: string;
  amountInCents: number;
  currency: string;
  environment: 'sandbox' | 'production';
  customerEmail: string;
  customerFullName: string;
  acceptanceToken: string;
  acceptancePolicyLink: string;
  paymentType: string;
  redirectUrl: string;
  acceptanceTimestamp?: string;
  shippingAddress?: {
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    region?: string;
    country?: string;
    name?: string;
    phone?: string;
  };
}

export function WompiSecurePayment({
  total,
  items,
  customerEmail,
  shippingAddress,
  onSuccess,
  onBack,
}: WompiSecurePaymentProps) {
  const { isAuthenticated } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preparedTransaction, setPreparedTransaction] = useState<PreparedTransaction | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const environment = import.meta.env.VITE_WOMPI_PUBLIC_KEY?.startsWith('pub_prod_')
    ? 'production'
    : 'sandbox';

  const isSandbox = environment === 'sandbox';

  // Preparar transacción con el backend (FASE 1)
  const prepareTransaction = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const token = localStorage.getItem('melo_sportt_token') || localStorage.getItem('token');

      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

      // 1. Llamar al backend para preparar transacción segura
      const response = await fetch(`${API_URL}/wompi/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          items,
          customer: {
            email: customerEmail,
            fullName: shippingAddress
              ? `${shippingAddress.firstName} ${shippingAddress.lastName}`
              : 'Cliente',
            phone: shippingAddress?.phone,
          },
          shippingAddress: shippingAddress && {
            addressLine1: shippingAddress.address,
            addressLine2: shippingAddress.apartment,
            city: shippingAddress.city,
            region: shippingAddress.state,
            country: shippingAddress.country,
            name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
            phone: shippingAddress.phone,
          },
          redirectUrl: `${window.location.origin}/checkout/success`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al preparar la transacción');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al preparar la transacción');
      }

      setPreparedTransaction(result.data);
      console.log('✅ Transacción preparada:', {
        reference: result.data.reference,
        amountInCents: result.data.amountInCents,
      });

    } catch (err: any) {
      console.error('Error preparing transaction:', err);
      setError(err.message || 'Error al preparar el pago. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  }, [customerEmail, items, shippingAddress]);

  useEffect(() => {
    prepareTransaction();
  }, [prepareTransaction]);

  // Abrir widget de Wompi con datos del backend
  const openWompiWidget = () => {
    if (!preparedTransaction || !acceptedTerms) return;

    // Crear formulario dinámico para el widget de Wompi
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://checkout.wompi.co/l/pay';
    form.style.display = 'none';

    // Campos requeridos (según docs de Wompi)
    const fields = {
      'public-key': preparedTransaction.publicKey,
      'currency': preparedTransaction.currency,
      'amount-in-cents': preparedTransaction.amountInCents.toString(),
      'reference': preparedTransaction.reference,
      'signature:integrity': preparedTransaction.integrity,
      'redirect-url': preparedTransaction.redirectUrl,
      'customer-data:email': preparedTransaction.customerEmail,
      'customer-data:full-name': preparedTransaction.customerFullName,
      'acceptance-token': preparedTransaction.acceptanceToken,
    };

    // Agregar campos al formulario
    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    // Agregar dirección de envío si existe
    if (preparedTransaction.shippingAddress) {
      const shipping = preparedTransaction.shippingAddress as any;
      if (shipping.address_line_1) {
        const addrInput = document.createElement('input');
        addrInput.type = 'hidden';
        addrInput.name = 'shipping-address:address-line-1';
        addrInput.value = shipping.address_line_1;
        form.appendChild(addrInput);
      }
      if (shipping.city) {
        const cityInput = document.createElement('input');
        cityInput.type = 'hidden';
        cityInput.name = 'shipping-address:city';
        cityInput.value = shipping.city;
        form.appendChild(cityInput);
      }
    }

    document.body.appendChild(form);
    form.submit();
  };

  // Verificar el estado de la transacción después del pago
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const transactionId = urlParams.get('id');
    const reference = urlParams.get('reference');

    if (transactionId && reference) {
      verifyTransaction(transactionId, reference);
    }
  }, []);

  const verifyTransaction = async (transactionId: string, reference: string) => {
    setIsProcessing(true);

    try {
      const token = localStorage.getItem('melo_sportt_token') || localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

      const response = await fetch(
        `${API_URL}/wompi/transaction/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al verificar la transacción');
      }

      const result = await response.json();

      if (result.data.status === 'APPROVED') {
        onSuccess(transactionId, reference);
      } else {
        setError(
          result.data.status === 'DECLINED'
            ? 'Tu pago fue rechazado. Intenta con otro método.'
            : 'Tu pago está pendiente de confirmación.'
        );
      }
    } catch (err: any) {
      console.error('Error verifying transaction:', err);
      setError('Error al verificar el pago. Contacta soporte.');
    } finally {
      setIsProcessing(false);
    }
  };

  const EnvironmentBadge = () => (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
        isSandbox
          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          : 'bg-green-500/20 text-green-400 border border-green-500/30'
      }`}
    >
      <Shield className="h-3.5 w-3.5" />
      {isSandbox ? 'SANDBOX - Modo Pruebas' : 'PRODUCCIÓN'}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <EnvironmentBadge />
        {preparedTransaction && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Ref:</span>
            <code className="text-blue-400 font-mono">
              {preparedTransaction.reference}
            </code>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Transaction Summary */}
      <div className="bg-primary-800 rounded-lg p-4 border border-primary-700">
        <h3 className="font-medium text-white mb-3 flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5 text-green-400" />
          Resumen de Pago
        </h3>

        <div className="space-y-2 text-sm">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-gray-300">
              <span>{item.title} (x{item.quantity})</span>
              <span>${(item.unit_price * item.quantity).toLocaleString()}</span>
            </div>
          ))}

          <div className="pt-2 border-t border-primary-700">
            <div className="flex justify-between font-medium text-white">
              <span>Total:</span>
              <span className="text-lg">${total.toLocaleString()} COP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-primary-800 rounded-lg p-4 border border-primary-700">
        <h3 className="font-medium text-white mb-3 flex items-center gap-2">
          <User className="h-5 w-5 text-blue-400" />
          Información del Cliente
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Email:</span>
            <span className="text-white">{customerEmail}</span>
          </div>
          {shippingAddress && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Nombre:</span>
                <span className="text-white">
                  {shippingAddress.firstName} {shippingAddress.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Teléfono:</span>
                <span className="text-white">{shippingAddress.phone}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="bg-primary-800 rounded-lg p-4 border border-primary-700">
        <h3 className="font-medium text-white mb-3 flex items-center gap-2">
          <Lock className="h-5 w-5 text-yellow-400" />
          Términos y Condiciones
        </h3>

        <div className="space-y-4">
          {preparedTransaction && (
            <div className="text-sm text-gray-300">
              <p className="mb-2 line-clamp-3">
                Al completar este pago, aceptas los{' '}
                <a
                  href={preparedTransaction.acceptancePolicyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  términos y condiciones de Wompi
                </a>{' '}
                y autorizas el procesamiento de tu pago de forma segura.
              </p>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 accent-green-500"
                />
                <span className="text-sm text-gray-200">
                  Acepto los términos y condiciones y autorizo el cargo a mi
                  método de pago.
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={onBack} className="w-full">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>

        <Button
          onClick={openWompiWidget}
          disabled={!preparedTransaction || !acceptedTerms || isProcessing}
          isLoading={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Preparando...
            </>
          ) : (
            'Pagar con Wompi'
          )}
        </Button>
      </div>

      {/* Security Notice */}
      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
        <Shield className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-green-400">
          <p className="font-medium">Pago 100% Seguro</p>
          <p>
            Tu información está protegida por{' '}
            <span className="font-mono">SHA256</span> y certificaciones PCI DSS.
          </p>
        </div>
      </div>

      {/* Sandbox Notice */}
      {isSandbox && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-400">
            ⚠️ Modo Sandbox activo. No se realizarán cargos reales durante las
            pruebas.
          </p>
        </div>
      )}
    </div>
  );
}
