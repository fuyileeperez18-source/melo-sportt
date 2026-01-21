import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export function SellerCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Procesando vinculación...');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(`Error al conectar cuenta: ${error}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('No se recibió el código de autorización');
      return;
    }

    exchangeCode(code);
  }, []);

  const exchangeCode = async (code: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const token = localStorage.getItem('melo_sportt_token');

      const response = await fetch(`${API_URL}/sellers/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('¡Cuenta vinculada exitosamente!');
        toast.success('Cuenta conectada correctamente');
      } else {
        setStatus('error');
        setMessage(result.message || 'Error al vincular cuenta');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Error de red al procesar la vinculación');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
      >
        {status === 'loading' && (
          <div className="space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <RefreshCw className="h-8 w-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h1 className="text-2xl font-bold text-black">Conectando con cuenta de pago</h1>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-black">¡Todo listo!</h1>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500">
              Ahora tu tienda puede recibir pagos correctamente.
            </p>
            <Button
              className="w-full"
              onClick={() => navigate('/admin/settings')}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Volver a Ajustes
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-black">Hubo un problema</h1>
            <p className="text-gray-600">{message}</p>
            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate('/admin/settings')}
              >
                Intentar de nuevo
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/admin')}
              >
                Ir al Dashboard
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
