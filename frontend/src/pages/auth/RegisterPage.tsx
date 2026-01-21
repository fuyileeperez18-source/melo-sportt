import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Check } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';

const registerSchema = z.object({
  fullName: z.string().min(2, 'El nombre completo es requerido'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Debes aceptar los términos y condiciones',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const passwordRequirements = [
  { regex: /.{8,}/, text: 'Al menos 8 caracteres' },
  { regex: /[A-Z]/, text: 'Una letra mayúscula' },
  { regex: /[a-z]/, text: 'Una letra minúscula' },
  { regex: /[0-9]/, text: 'Un número' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const { signUp, signInWithGoogle, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await signUp(data.email, data.password, data.fullName);
      toast.success('¡Cuenta creada! Ya puedes iniciar sesión.');
      navigate('/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear la cuenta';

      if (message.toLowerCase().includes('email already registered')) {
        toast.error('Ese correo ya está registrado. Intenta iniciar sesión.');
      } else if (message.toLowerCase().includes('validation error')) {
        toast.error(message);
      } else {
        toast.error(message);
      }

      console.error('[RegisterPage] Sign up error:', error);
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
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920"
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
              Únete a la familia MELO SPORTT
            </h2>
            <p className="text-gray-300 mb-8">
              Crea una cuenta para disfrutar de beneficios exclusivos, compras más rápidas y seguimiento de pedidos.
            </p>
            <div className="space-y-4 text-left max-w-sm mx-auto">
              {[
                'Descuentos exclusivos para miembros',
                'Acceso anticipado a nuevas colecciones',
                'Seguimiento e historial de pedidos',
                'Lista de deseos y artículos guardados',
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-black" />
                  </div>
                  <span className="text-gray-300">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md py-8"
        >
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden block text-center mb-8">
            <span className="text-3xl font-bold text-white tracking-wider">MELO SPORTT</span>
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">Crear Cuenta</h1>
          <p className="text-gray-400 mb-8">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-white hover:underline">
              Iniciar sesión
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
              <span className="px-4 bg-black text-gray-400">o registrarse con correo</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Nombre Completo"
              type="text"
              placeholder="Juan Pérez"
              leftIcon={<User className="h-5 w-5" />}
              error={errors.fullName?.message}
              {...register('fullName')}
            />

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
                placeholder="Crea una contraseña"
                leftIcon={<Lock className="h-5 w-5" />}
                error={errors.password?.message}
                {...register('password', {
                  onChange: (e) => setPassword(e.target.value),
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[42px] text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Password requirements */}
            {password && (
              <div className="grid grid-cols-2 gap-2">
                {passwordRequirements.map((req) => (
                  <div
                    key={req.text}
                    className={`flex items-center gap-2 text-sm ${
                      req.regex.test(password) ? 'text-green-400' : 'text-gray-500'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    {req.text}
                  </div>
                ))}
              </div>
            )}

            <Input
              label="Confirmar Contraseña"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirma tu contraseña"
              leftIcon={<Lock className="h-5 w-5" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 mt-0.5 rounded border-primary-700 bg-primary-900 text-white focus:ring-white"
                {...register('acceptTerms')}
              />
              <span className="text-gray-400 text-sm">
                Acepto los{' '}
                <Link to="/terms" className="text-white hover:underline">
                  Términos de Servicio
                </Link>{' '}
                y la{' '}
                <Link to="/privacy" className="text-white hover:underline">
                  Política de Privacidad
                </Link>
              </span>
            </label>
            {errors.acceptTerms && (
              <p className="text-red-500 text-sm">{errors.acceptTerms.message}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="h-5 w-5" />}
            >
              Crear Cuenta
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
