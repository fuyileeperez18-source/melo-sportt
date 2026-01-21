import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Shield, Lock, Mail, Home, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Clear any old tokens first
      localStorage.removeItem('melo-sportt-auth');
      localStorage.removeItem('melo_sportt_token');

      console.log('🔐 [AdminLoginPage] Intentando login admin para:', email);

      // Login using authStore
      const user = await signIn(email, password);

      console.log('🔐 [AdminLoginPage] Login response - User:', user);
      console.log('🔐 [AdminLoginPage] User role:', user?.role);

      // Verificar que el usuario sea admin o super_admin
      if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        console.log('❌ [AdminLoginPage] Acceso denegado - Role:', user?.role);
        toast.error('No tienes permisos de administrador', {
          duration: 5000,
          icon: '🚫',
        });
        // Logout si no es admin - actualizar estado explícitamente
        await useAuthStore.getState().signOut();
        // Forzar actualización del estado
        useAuthStore.setState({
          user: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false
        });
        return;
      }

      console.log('✅ [AdminLoginPage] Acceso concedido - Redirigiendo a /admin');
      toast.success(
        `Bienvenido ${user?.role === 'super_admin' ? 'Super Administrador' : 'Administrador'}`,
        {
          duration: 3000,
          icon: '🛡️',
        }
      );

      navigate('/admin');
    } catch (error: any) {
      console.error('❌ [AdminLoginPage] Error de autenticación:', error);
      toast.error(
        error.response?.data?.message || error.message || 'Credenciales inválidas',
        {
          duration: 5000,
          icon: '❌',
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md border border-slate-700 bg-slate-800/50 backdrop-blur rounded-lg shadow-2xl">
        <div className="p-8 space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-full">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white">
              Panel de Administración
            </h1>
            <p className="text-slate-400">
              Acceso restringido - Solo administradores
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-slate-200 text-sm font-medium">
                Email de administrador
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="admin@melosportt.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 w-full px-4 py-3 bg-slate-900/50 border border-slate-600 text-white placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-slate-200 text-sm font-medium">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 w-full px-4 py-3 bg-slate-900/50 border border-slate-600 text-white placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Verificando...' : 'Acceder al panel'}
            </Button>
          </form>

          {/* Warning */}
          <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400 text-center">
              ⚠️ Este panel es solo para administradores autorizados.
              <br />
              Todos los accesos quedan registrados.
            </p>
          </div>

          {/* Links */}
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors">
                <Home className="h-4 w-4" />
                Ir al sitio principal
              </button>
            </Link>
            <Link to="/login">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Iniciar sesión como usuario
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
