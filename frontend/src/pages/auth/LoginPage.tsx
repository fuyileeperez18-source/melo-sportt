import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signInWithGoogle, isLoading } = useAuthStore();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      console.log('🔐 [LoginPage] Iniciando login...');

      // Limpiar estado anterior antes de hacer login
      localStorage.removeItem('melo-sportt-auth');
      localStorage.removeItem('melo_sportt_token');

      const user = await signIn(data.email, data.password);

      console.log('🔐 [LoginPage] Usuario recibido:', JSON.stringify(user, null, 2));
      console.log('🔐 [LoginPage] user?.role:', user?.role);
      console.log('🔐 [LoginPage] typeof user?.role:', typeof user?.role);

      // Verificar explícitamente el role
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      console.log('🔐 [LoginPage] isAdmin:', isAdmin);

      toast.success(`¡Bienvenido ${user?.full_name || user?.email}!`);

      // Redirect based on user role (EXACTLY like tutorías Login.tsx lines 79-84)
      if (isAdmin) {
        console.log('✅ [LoginPage] ES ADMIN - Redirigiendo a /admin');
        navigate('/admin', { replace: true });
      } else {
        console.log('👤 [LoginPage] Usuario regular - Redirigiendo a:', from);
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('❌ [LoginPage] Error:', error);
      toast.error('Correo o contraseña inválidos');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error('Error al iniciar sesión con Google');
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920"
          alt="Fashion"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg text-center">
            <Link to="/" className="inline-block mb-8">
              <span className="text-4xl font-bold text-white tracking-wider">MELO SPORTT</span>
            </Link>
            <h2 className="text-3xl font-bold text-white mb-4">
              Bienvenido de nuevo a MELO SPORTT
            </h2>
            <p className="text-gray-300">
              Inicia sesión para acceder a tu cuenta, rastrear pedidos y disfrutar de una experiencia de compra personalizada.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden block text-center mb-8">
            <span className="text-3xl font-bold text-white tracking-wider">MELO SPORTT</span>
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">Iniciar Sesión</h1>
          <p className="text-gray-400 mb-8">
            ¿No tienes una cuenta?{' '}
            <Link to="/register" className="text-white hover:underline">
              Crear una
            </Link>
          </p>

          {/* Google sign in */}
          <Button
            variant="outline"
            className="w-full mb-6"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </Button>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-black text-gray-400">o continuar con correo</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="tu@correo.com"
              leftIcon={<Mail className="h-5 w-5" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                leftIcon={<Lock className="h-5 w-5" />}
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[42px] text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-primary-700 bg-primary-900 text-white focus:ring-white"
                  {...register('rememberMe')}
                />
                <span className="text-gray-400 text-sm">Recordarme</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="h-5 w-5" />}
            >
              Iniciar Sesión
            </Button>
          </form>

          {/* Terms */}
          <p className="text-center text-gray-500 text-sm mt-8">
            Al iniciar sesión, aceptas nuestros{' '}
            <Link to="/terms" className="text-gray-400 hover:text-white">
              Términos de Servicio
            </Link>{' '}
            y{' '}
            <Link to="/privacy" className="text-gray-400 hover:text-white">
              Política de Privacidad
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
