import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function CheckoutFailurePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const paymentId = searchParams.get('payment_id');
  const statusDetail = searchParams.get('status_detail');

  const getErrorMessage = () => {
    switch (statusDetail) {
      case 'cc_rejected_insufficient_amount':
        return 'Tu tarjeta no tiene fondos suficientes.';
      case 'cc_rejected_bad_filled_security_code':
        return 'El código de seguridad de tu tarjeta es incorrecto.';
      case 'cc_rejected_bad_filled_date':
        return 'La fecha de vencimiento de tu tarjeta es incorrecta.';
      case 'cc_rejected_bad_filled_other':
        return 'Revisa los datos de tu tarjeta.';
      case 'cc_rejected_blacklist':
        return 'No pudimos procesar tu pago.';
      case 'cc_rejected_call_for_authorize':
        return 'Debes autorizar el pago con tu banco.';
      case 'cc_rejected_card_disabled':
        return 'Tu tarjeta está deshabilitada.';
      case 'cc_rejected_duplicated_payment':
        return 'Ya realizaste un pago por este monto recientemente.';
      case 'cc_rejected_high_risk':
        return 'Tu pago fue rechazado por seguridad.';
      case 'cc_rejected_max_attempts':
        return 'Superaste el número de intentos permitidos.';
      default:
        return 'Tu pago fue rechazado. Por favor, intenta con otro método de pago.';
    }
  };

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-8"
          >
            <XCircle className="h-12 w-12 text-white" />
          </motion.div>

          <h1 className="text-4xl font-bold text-white mb-4">
            Pago Rechazado
          </h1>

          <p className="text-gray-400 text-lg mb-8">
            {getErrorMessage()}
          </p>

          <div className="p-6 bg-primary-900 rounded-xl text-left mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-white mb-2">Qué puedes hacer:</h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li>• Verifica que los datos de tu tarjeta sean correctos</li>
                  <li>• Asegúrate de tener fondos suficientes</li>
                  <li>• Intenta con otro método de pago</li>
                  <li>• Contacta a tu banco si el problema persiste</li>
                </ul>
              </div>
            </div>
          </div>

          {paymentId && (
            <p className="text-gray-500 text-sm mb-6">
              ID de referencia: {paymentId}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/cart')}>
              Volver al Carrito
            </Button>
            <Button onClick={() => navigate('/checkout')}>
              Intentar de Nuevo
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
