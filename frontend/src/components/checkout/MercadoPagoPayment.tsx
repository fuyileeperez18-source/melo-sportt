import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, DollarSign, Lock, ChevronLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

interface MercadoPagoPaymentProps {
  total: number;
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  onSuccess: (paymentId: string) => void;
  onBack: () => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}

export function MercadoPagoPayment({
  total,
  items,
  onSuccess,
  onBack,
  isProcessing,
  setIsProcessing,
}: MercadoPagoPaymentProps) {
  const [error, setError] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const token = localStorage.getItem('melo_sportt_token');

      // Create preference with seller's cart if available
      const cartData = localStorage.getItem('melo_sportt_cart');
      const itemsFromCart = cartData ? JSON.parse(cartData) : items;

      const response = await fetch(`${API_URL}/orders/mercadopago/create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          items,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear la preferencia de pago');
      }

      const result = await response.json();
      const { id, init_point, sandbox_init_point } = result.data;

      setPreferenceId(id);

      // Redirect to Mercado Pago checkout
      // In production, use init_point. In sandbox/testing, use sandbox_init_point
      const checkoutUrl = sandbox_init_point || init_point;

      // Open in new window or redirect
      window.location.href = checkoutUrl;

      // Note: The success callback will be handled by the success page
      // which should verify the payment and call onSuccess
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Error al procesar el pago. Por favor intenta de nuevo.');
      setIsProcessing(false);
    }
  };

  return (
    <div>
      {/* Payment methods info */}
      <div className="mb-6 space-y-4">
        <div className="p-4 bg-primary-800 rounded-lg border border-primary-700">
          <div className="flex items-start gap-3 mb-3">
            <CreditCard className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-white mb-1">Tarjetas de Débito y Crédito</h4>
              <p className="text-sm text-gray-400">
                Visa, Mastercard, American Express y más. Pago instantáneo y seguro.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-primary-800 rounded-lg border border-primary-700">
          <div className="flex items-start gap-3 mb-3">
            <Smartphone className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-white mb-1">Billeteras Digitales</h4>
              <p className="text-sm text-gray-400">
                Nequi, Daviplata y otras billeteras digitales disponibles.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-primary-800 rounded-lg border border-primary-700">
          <div className="flex items-start gap-3 mb-3">
            <DollarSign className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-white mb-1">Transferencia Bancaria (PSE)</h4>
              <p className="text-sm text-gray-400">
                Paga directamente desde tu banco con PSE.
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-6"
        >
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}

      <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg mb-6">
        <Lock className="h-5 w-5 text-green-500" />
        <p className="text-green-400 text-sm">
          Tu pago está protegido por Mercado Pago. Todos los métodos de pago son seguros.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
        >
          Volver
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={handlePayment}
          isLoading={isProcessing}
          disabled={isProcessing}
          leftIcon={<Lock className="h-4 w-4" />}
        >
          Pagar {formatCurrency(total)} con Mercado Pago
        </Button>
      </div>

      {/* Info about payment process */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-blue-400 text-sm">
          <strong>ℹ️ Importante:</strong> Serás redirigido a Mercado Pago para completar tu pago de forma segura.
          Una vez completado el pago, regresarás automáticamente a nuestra tienda.
        </p>
      </div>
    </div>
  );
}
