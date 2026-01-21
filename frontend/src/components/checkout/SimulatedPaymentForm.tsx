import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  CreditCard,
  Shield,
  AlertCircle,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';

interface SimulatedPaymentFormProps {
  onSuccess: (paymentId: string) => void;
  onBack: () => void;
  total: number;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}

// Fake credit card validation
const validateCardNumber = (number: string) => {
  const cleaned = number.replace(/\s/g, '');
  return /^\d{16}$/.test(cleaned);
};

const validateCVV = (cvv: string) => {
  return /^\d{3,4}$/.test(cvv);
};

const validateExpiry = (expiry: string) => {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;

  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);

  if (month < 1 || month > 12) return false;

  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return false;
  }

  return true;
};

export function SimulatedPaymentForm({
  onSuccess,
  onBack,
  total,
  isProcessing,
  setIsProcessing,
}: SimulatedPaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState<string | null>(null);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(' ') : '';
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate all fields
    if (!cardNumber || !cardName || !expiry || !cvv) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (!validateCardNumber(cardNumber)) {
      setError('Número de tarjeta inválido (debe tener 16 dígitos)');
      return;
    }

    if (!validateExpiry(expiry)) {
      setError('Fecha de vencimiento inválida o expirada');
      return;
    }

    if (!validateCVV(cvv)) {
      setError('CVV inválido');
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing delay
    setTimeout(() => {
      const fakePaymentId = `sim_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🧪 [SIMULATED PAYMENT] Payment successful:', fakePaymentId);
      onSuccess(fakePaymentId);
    }, 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Simulated mode warning */}
      <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="text-yellow-400 font-medium mb-1">Modo de Prueba Activo</p>
          <p className="text-yellow-500/80">
            Este es un entorno de prueba. Usa cualquier número de tarjeta de 16 dígitos,
            CVV de 3 dígitos, y fecha futura. Las compras reducirán el stock real, pero
            no se procesará ningún pago real.
          </p>
        </div>
      </div>

      {/* Card number */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Número de Tarjeta
        </label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <Input
            type="text"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            maxLength={19}
            className="pl-10"
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* Card name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Nombre en la Tarjeta
        </label>
        <Input
          type="text"
          placeholder="JUAN PEREZ"
          value={cardName}
          onChange={(e) => setCardName(e.target.value.toUpperCase())}
          disabled={isProcessing}
        />
      </div>

      {/* Expiry and CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Fecha de Vencimiento
          </label>
          <Input
            type="text"
            placeholder="MM/AA"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            maxLength={5}
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            CVV
          </label>
          <Input
            type="text"
            placeholder="123"
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
            maxLength={4}
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
        >
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}

      {/* Security badge */}
      <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
        <Shield className="h-5 w-5 text-green-500" />
        <p className="text-green-400 text-sm">
          Pagos simulados seguros para testing
        </p>
      </div>

      {/* Test cards info */}
      <div className="p-4 bg-primary-800/50 rounded-lg">
        <p className="text-xs text-gray-400 mb-2 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Tarjetas de prueba sugeridas:
        </p>
        <div className="text-xs text-gray-500 space-y-1">
          <p>Visa: 4242 4242 4242 4242</p>
          <p>Mastercard: 5555 5555 5555 4444</p>
          <p>AmEx: 3782 822463 10005</p>
          <p>CVV: 123 | Exp: cualquier fecha futura (ej: 12/25)</p>
        </div>
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
          type="submit"
          className="flex-1"
          isLoading={isProcessing}
          disabled={isProcessing}
          leftIcon={<Lock className="h-4 w-4" />}
        >
          {isProcessing ? 'Procesando...' : `Pagar ${formatCurrency(total)}`}
        </Button>
      </div>
    </form>
  );
}
