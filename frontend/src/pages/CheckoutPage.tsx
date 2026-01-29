import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Truck,
  Package,
  Shield,
  Check,
  Lock,
  MapPin,
  User,
  Mail,
  Phone,
  Building,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { AnimatedSection } from '@/components/animations/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import PhoneInput from '@/components/ui/PhoneInput';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, generateOrderNumber } from '@/lib/utils';
import { orderService } from '@/lib/services';
import { cn } from '@/lib/utils';
import { WompiPayment } from '@/components/checkout/WompiPayment';
import type { CartItem } from '@/types';


// Form schemas
const shippingSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  firstName: z.string().min(2, 'El nombre es requerido'),
  lastName: z.string().min(2, 'El apellido es requerido'),
  phone: z.string().min(7, 'Número de teléfono válido requerido'),
  address: z.string().min(4, 'La dirección debe tener al menos 4 caracteres'),
  apartment: z.string().optional(),
  city: z.string().min(4, 'La ciudad debe tener al menos 4 caracteres'),
  state: z.string().min(2, 'El departamento es requerido'),
  postalCode: z.string().min(4, 'El código postal es requerido'),
  country: z.string().min(2, 'El país es requerido'),
  saveInfo: z.boolean().optional(),
});

type ShippingFormData = z.infer<typeof shippingSchema>;

const steps = [
  { id: 'shipping', name: 'Envío', icon: Truck },
  { id: 'payment', name: 'Pago', icon: CreditCard },
  { id: 'confirmation', name: 'Confirmación', icon: Check },
];

const shippingMethods = [
  { id: 'standard', name: 'Envío Estándar', price: 15000, days: '5-7 días hábiles' },
  { id: 'express', name: 'Envío Express', price: 35000, days: '2-3 días hábiles' },
  { id: 'overnight', name: 'Envío Prioritario', price: 60000, days: '1 día hábil' },
];

const countries = [
  { value: 'CO', label: 'Colombia' },
  { value: 'MX', label: 'México' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Perú' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'VE', label: 'Venezuela' },
  { value: 'PA', label: 'Panamá' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'ES', label: 'España' },
];


export function CheckoutPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [shippingData, setShippingData] = useState<ShippingFormData | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wompi' | 'cash_on_delivery'>('wompi');
  const [usedPaymentMethod, setUsedPaymentMethod] = useState<'wompi' | 'cash_on_delivery' | null>(null);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);

  // Ref to capture order data when payment starts (prevents stale data in callback)
  const orderDataRef = useRef<{
    subtotal: number;
    shippingCost: number;
    tax: number;
    total: number;
    items: CartItem[];
  } | null>(null);

  const { items, getSubtotal, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  const subtotal = getSubtotal();
  const selectedShipping = shippingMethods.find((m) => m.id === shippingMethod);
  const shippingCost = subtotal >= 200000 ? 0 : (selectedShipping?.price || 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shippingCost + tax;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      country: 'CO',
    },
  });

  // Pre-fill form if user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setValue('email', user.email || '');
    }
  }, [isAuthenticated, user, setValue]);

  // Redirect if cart is empty (but not after payment success)
  useEffect(() => {
    if (items.length === 0 && currentStep !== 2 && !isPaymentSuccess) {
      navigate('/shop');
    }
  }, [items, currentStep, navigate, isPaymentSuccess]);

  const onShippingSubmit = (data: ShippingFormData) => {
    setShippingData(data);
    // Capture order data when moving to payment step to prevent stale data in callbacks
    orderDataRef.current = {
      subtotal,
      shippingCost,
      tax,
      total,
      items: [...items], // Clone items to preserve them
    };
    setCurrentStep(1);
  };

  const handleCashOnDelivery = async () => {
    if (!shippingData) {
      toast.error('Por favor completa la información de envío');
      return;
    }

    const newOrderNumber = generateOrderNumber();
    setOrderNumber(newOrderNumber);
    setIsProcessing(true);

    try {
      const subtotal = getSubtotal();
      const selectedShipping = shippingMethods.find((m) => m.id === shippingMethod);
      const shippingCost = subtotal >= 200000 ? 0 : (selectedShipping?.price || 0);
      const tax = subtotal * 0.08;
      const total = subtotal + shippingCost + tax;

      const orderData = {
        user_id: user?.id,
        order_number: newOrderNumber,
        subtotal,
        discount: 0,
        shipping_cost: shippingCost,
        tax,
        total,
        status: 'pending' as const,
        payment_status: 'pending' as const,
        payment_method: 'cash_on_delivery',
        shipping_address: {
          email: shippingData.email,
          firstName: shippingData.firstName,
          lastName: shippingData.lastName,
          phone: shippingData.phone,
          address: shippingData.address,
          apartment: shippingData.apartment,
          city: shippingData.city,
          state: shippingData.state,
          postalCode: shippingData.postalCode,
          country: shippingData.country,
        },
        items: items.map((item) => ({
          product_id: item.product.id,
          variant_id: item.variant?.id,
          quantity: item.quantity,
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price),
        })),
      } as any;

      await orderService.create(orderData);

      setCurrentStep(2);
      setUsedPaymentMethod('cash_on_delivery');
      clearCart();
      toast.success('¡Pedido creado! Pagarás cuando recibas tu pedido.');
    } catch (error: any) {
      console.error('Error saving order:', error);
      toast.error('Hubo un error creando tu pedido. Por favor intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    // The order was already created by the backend during prepareTransaction
    // and will be updated to 'paid' status by the webhook.
    // We need to navigate to the success page with all required parameters.
    toast.success('¡Pago exitoso! Tu pedido ha sido confirmado.');

    // Generate or get the order number (external reference)
    const orderNumber = `ORD-${Date.now()}`; // Simple order number generation

    // Navigate to success page with ALL required parameters
    // This ensures the success page shows immediately without backend verification issues
    navigate(`/checkout/success?payment_id=${paymentId}&external_reference=${orderNumber}&collection_status=approved`);

    // Clear cart after navigation to prevent race conditions
    setTimeout(() => {
      clearCart();
    }, 1000);

    // Note: The internal confirmation step (currentStep === 2) is no longer used for Wompi payments,
    // unifying the success experience.
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="MELO SPORTT" className="h-10 w-auto" />
            <span className="text-xl font-bold text-white">MELO SPORTT</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Lock className="h-4 w-4" />
            Pago Seguro
          </div>
        </div>

        {/* Progress steps - Optimizado para móviles */}
        <div className="mb-8 sm:mb-10 md:mb-12">
          <div className="flex items-center justify-center overflow-x-auto pb-2 sm:pb-0">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <div className="flex flex-col sm:flex-row items-center">
                  <motion.div
                    className={cn(
                      'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0',
                      index <= currentStep
                        ? 'bg-white text-black'
                        : 'bg-primary-800 text-gray-400'
                    )}
                    animate={{
                      scale: index === currentStep ? 1.1 : 1,
                    }}
                  >
                    {index < currentStep ? (
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                    ) : (
                      <step.icon className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                    )}
                  </motion.div>
                  <span
                    className={cn(
                      'mt-1 sm:mt-0 sm:ml-2 md:ml-3 text-xs sm:text-sm font-medium text-center sm:text-left truncate max-w-[60px] sm:max-w-none',
                      index <= currentStep ? 'text-white' : 'text-gray-400'
                    )}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-8 sm:w-12 md:w-16 lg:w-24 h-0.5 mx-2 sm:mx-3 md:mx-4',
                      index < currentStep ? 'bg-white' : 'bg-primary-800'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10 lg:gap-12">
          {/* Main content - Optimizado para móviles */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Step 1: Shipping - Simplificado para móviles */}
              {currentStep === 0 && (
                <motion.div
                  key="shipping"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                    Información de Envío
                  </h2>

                  <form onSubmit={handleSubmit(onShippingSubmit)} className="space-y-4 sm:space-y-6">
                    {/* Contact - Optimizado para móviles */}
                    <div>
                      <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Contacto</h3>
                      <div className="space-y-3 sm:space-y-4">
                        <Input
                          label="Correo Electrónico"
                          type="email"
                          placeholder="tu@correo.com"
                          leftIcon={<Mail className="h-4 w-4 sm:h-5 sm:w-5" />}
                          error={errors.email?.message}
                        {...register('email')}
                      />
                    </div>

                    {/* Name - Optimizado para móviles */}
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                      <Input
                        label="Nombre"
                        placeholder="Juan"
                        leftIcon={<User className="h-4 w-4 sm:h-5 sm:w-5" />}
                        error={errors.firstName?.message}
                        {...register('firstName')}
                      />
                      <Input
                        label="Apellido"
                        placeholder="Pérez"
                        error={errors.lastName?.message}
                        {...register('lastName')}
                      />
                    </div>

                    {/* Phone - Simplificado */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                        Teléfono
                      </label>
                      <Input
                        placeholder="+57 300 123 4567"
                        leftIcon={<Phone className="h-4 w-4 sm:h-5 sm:w-5" />}
                        error={errors.phone?.message}
                        {...register('phone')}
                      />
                    </div>

                    {/* Address - Mejor distribución móvil */}
                    <div>
                      <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4 mt-6 sm:mt-8">
                        Dirección de Envío
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        <Input
                          label="Dirección"
                          placeholder="Calle 123 #45-67"
                          leftIcon={<MapPin className="h-4 w-4 sm:h-5 sm:w-5" />}
                          error={errors.address?.message}
                          {...register('address')}
                        />
                        <Input
                          label="Apartamento (opcional)"
                          placeholder="Apto 401"
                          leftIcon={<Building className="h-4 w-4 sm:h-5 sm:w-5" />}
                          {...register('apartment')}
                        />
                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                          <Input
                            label="Ciudad"
                            placeholder="Bogotá"
                            error={errors.city?.message}
                            {...register('city')}
                          />
                          <Input
                            label="Departamento / Estado"
                            placeholder="Cundinamarca"
                            error={errors.state?.message}
                            {...register('state')}
                          />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Input
                            label="Código Postal"
                            placeholder="110111"
                            error={errors.postalCode?.message}
                            {...register('postalCode')}
                          />
                          <Select
                            label="País"
                            options={countries}
                            error={errors.country?.message}
                            {...register('country')}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Shipping method */}
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4 mt-8">
                        Método de Envío
                      </h3>
                      <div className="space-y-3">
                        {shippingMethods.map((method) => (
                          <label
                            key={method.id}
                            className={cn(
                              'flex items-center justify-between p-4 bg-primary-900 rounded-lg cursor-pointer border-2 transition-colors',
                              shippingMethod === method.id
                                ? 'border-white'
                                : 'border-transparent hover:border-primary-700'
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <input
                                type="radio"
                                name="shippingMethod"
                                value={method.id}
                                checked={shippingMethod === method.id}
                                onChange={() => setShippingMethod(method.id)}
                                className="sr-only"
                              />
                              <div
                                className={cn(
                                  'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                                  shippingMethod === method.id
                                    ? 'border-white bg-white'
                                    : 'border-gray-500'
                                )}
                              >
                                {shippingMethod === method.id && (
                                  <div className="w-2 h-2 rounded-full bg-black" />
                                )}
                              </div>
                              <div>
                                <p className="text-white font-medium">{method.name}</p>
                                <p className="text-gray-400 text-sm">{method.days}</p>
                              </div>
                            </div>
                            <span className="text-white font-medium">
                              {subtotal >= 200000 && method.id === 'standard'
                                ? 'GRATIS'
                                : formatCurrency(method.price)}
                            </span>
                          </label>
                        ))}
                      </div>
                      {subtotal < 200000 && (
                        <p className="text-sm text-gray-400 mt-2">
                          Agrega {formatCurrency(200000 - subtotal)} más para envío estándar gratis
                        </p>
                      )}
                    </div>

                    {/* Save info checkbox */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-primary-700 bg-primary-900 text-white focus:ring-white"
                        {...register('saveInfo')}
                      />
                      <span className="text-gray-300">
                        Guardar esta información para la próxima vez
                      </span>
                    </label>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/cart')}
                        leftIcon={<ChevronLeft className="h-4 w-4" />}
                      >
                        Volver al Carrito
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        rightIcon={<ChevronRight className="h-4 w-4" />}
                      >
                        Continuar al Pago
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 2: Payment */}
              {currentStep === 1 && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="text-2xl font-bold text-white mb-6">Pago</h2>

                  {/* Shipping summary */}
                  {shippingData && (
                    <div className="p-4 bg-primary-900 rounded-lg mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Enviar a:</span>
                        <button
                          onClick={() => setCurrentStep(0)}
                          className="text-sm text-white hover:underline"
                        >
                          Editar
                        </button>
                      </div>
                      <p className="text-white">
                        {shippingData.firstName} {shippingData.lastName}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {shippingData.address}
                        {shippingData.apartment && `, ${shippingData.apartment}`}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {shippingData.city}, {shippingData.state} {shippingData.postalCode}
                      </p>
                    </div>
                  )}

                  {/* Payment method selection */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-white mb-4">Método de Pago</h3>
                    <div className="grid gap-4">
                      {/* Wompi - PRINCIPAL */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setPaymentMethod('wompi');
                        }}
                        className={cn(
                          'p-4 rounded-lg border-2 transition-all text-left relative overflow-hidden',
                          paymentMethod === 'wompi'
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-primary-700 bg-primary-800 hover:border-primary-600'
                        )}
                      >
                        {/* Badge de recomendado */}
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                          RECOMENDADO
                        </div>

                        <div className="flex items-start justify-between mt-2">
                          <div className="flex items-start gap-3 flex-1 pr-4">
                            <CreditCard className="h-5 w-5 text-white mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-bold text-white text-lg mb-1">Wompi</p>
                              <p className="text-sm text-gray-300 mb-2">
                                Paga con tarjeta, Nequi, DaviPlata, PSE o Bancolombia
                              </p>
                              <ul className="text-xs text-gray-400 space-y-1">
                                <li>✓ Propiedad de Bancolombia</li>
                                <li>✓ DaviPlata con 17M+ usuarios</li>
                                <li>✓ Cuotas con Bancolombia BNPL</li>
                                <li>✓ Redime Puntos Colombia</li>
                                <li>✓ Pago seguro y protegido</li>
                              </ul>
                            </div>
                          </div>
                          {paymentMethod === 'wompi' && (
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      </motion.button>

                      {/* Pago Contra Entrega */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPaymentMethod('cash_on_delivery')}
                        className={cn(
                          'p-4 rounded-lg border-2 transition-all text-left',
                          paymentMethod === 'cash_on_delivery'
                            ? 'border-white bg-white/10'
                            : 'border-primary-700 bg-primary-800 hover:border-primary-600'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <Truck className="h-5 w-5 text-white mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium text-white mb-1">Pago Contra Entrega</p>
                              <p className="text-sm text-gray-300 mb-2">
                                Paga en efectivo cuando recibas tu pedido
                              </p>
                              <ul className="text-xs text-gray-400 space-y-1">
                                <li>✓ Paga al recibir tu producto</li>
                                <li>✓ Solo efectivo</li>
                                <li>✓ Verifica antes de pagar</li>
                              </ul>
                            </div>
                          </div>
                          {paymentMethod === 'cash_on_delivery' && (
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      </motion.button>
                    </div>
                  </div>

                  {paymentMethod === 'cash_on_delivery' ? (
                    <div>
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-6">
                        <p className="text-blue-400 text-sm">
                          ⚠️ Con el pago contra entrega, pagarás el total de tu pedido en efectivo cuando lo recibas.
                          {user?.role === 'super_admin' && ' Tu comisión del 12% se registrará automáticamente una vez el pedido sea entregado.'}
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentStep(0)}
                          disabled={isProcessing}
                          leftIcon={<ChevronLeft className="h-4 w-4" />}
                        >
                          Volver
                        </Button>
                        <Button
                          type="button"
                          className="flex-1"
                          isLoading={isProcessing}
                          disabled={isProcessing}
                          onClick={handleCashOnDelivery}
                          leftIcon={<Package className="h-4 w-4" />}
                        >
                          Confirmar Pedido - {formatCurrency(total)}
                        </Button>
                      </div>
                    </div>
                  ) : paymentMethod === 'wompi' ? (
                    <WompiPayment
                      total={total}
                      items={items.map((item) => ({
                        title: item.product.name,
                        quantity: item.quantity,
                        unit_price: item.price,
                        product_id: item.product.id, // Para crear orden en backend
                        variant_id: item.variant?.id,
                      }))}
                      customerEmail={shippingData?.email || ''}
                      shippingAddress={shippingData ? {
                        address: shippingData.address,
                        apartment: shippingData.apartment,
                        city: shippingData.city,
                        state: shippingData.state,
                        country: shippingData.country,
                        firstName: shippingData.firstName,
                        lastName: shippingData.lastName,
                        phone: shippingData.phone,
                      } : undefined}
                      subtotal={subtotal}
                      shippingCost={shippingCost}
                      tax={tax}
                      onSuccess={handlePaymentSuccess}
                      onBack={() => setCurrentStep(0)}
                      isProcessing={isProcessing}
                      setIsProcessing={setIsProcessing}
                    />
                  ) : (
                    <>
                      <div className="p-8 bg-primary-800/50 rounded-lg text-center">
                        <p className="text-gray-300 mb-4">Solo Wompi disponible como método de pago en línea</p>
                        <Button
                          onClick={() => {
                            setPaymentMethod('wompi');
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Seleccionar Wompi
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Payment methods icons */}
                  <div className="flex items-center justify-center gap-4 mt-8 pt-8 border-t border-primary-800">
                    <span className="text-gray-500 text-sm">Aceptamos:</span>
                    {['Visa', 'Mastercard', 'Amex', 'PayPal'].map((method) => (
                      <div
                        key={method}
                        className="px-3 py-1 bg-primary-800 rounded text-xs text-gray-400"
                      >
                        {method}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Confirmation */}
              {currentStep === 2 && (
                <motion.div
                  key="confirmation"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="max-w-6xl mx-auto">
                    {/* Contenido Principal */}
                    <div className="max-w-5xl mx-auto">
                      <div className="text-center py-8 sm:py-12 px-4">

                        {/* Icono de Check Grande */}
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: 'spring' }}
                          className="w-20 h-20 sm:w-24 sm:h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg shadow-green-500/50"
                        >
                          <Check className="h-12 w-12 text-white" />
                        </motion.div>

                        {/* Título Principal */}
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
                          ¡Gracias por tu compra!
                        </h2>

                        {/* Subtítulo */}
                        <p className="text-gray-400 mb-2 text-sm sm:text-base">
                          Tu pedido ha sido confirmado y será enviado pronto.
                        </p>

                        {/* Mensaje adicional para pago contra entrega */}
                        {usedPaymentMethod === 'cash_on_delivery' && (
                          <p className="text-blue-400 mb-4 font-medium">
                            Te llamaremos pronto para confirmar que tu pedido ha sido exitoso.
                          </p>
                        )}

                        {/* Número de Pedido */}
                        <div className="mb-8">
                          <p className="text-white font-medium text-sm sm:text-base">
                            Número de Pedido:
                            <span className="text-green-400 font-bold block sm:inline mt-1 sm:mt-0">
                              {orderNumber}
                            </span>
                          </p>
                        </div>

                        {/* Caja de Información "¿Qué sigue?" */}
                        <div className="p-6 sm:p-8 bg-blue-950/50 rounded-2xl mb-8 max-w-2xl mx-auto border border-blue-900/50">
                          <h3 className="font-semibold text-white mb-6 text-center text-lg sm:text-xl">
                            ¿Qué sigue?
                          </h3>
                          <ul className="space-y-4 sm:space-y-5 text-left">
                            {/* Email */}
                            <li className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center ring-1 ring-blue-800">
                                <Mail className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-gray-300 text-sm sm:text-base">
                                  Recibirás una confirmación por correo en
                                  <span className="text-white font-medium"> {shippingData?.email}</span>
                                </p>
                              </div>
                            </li>

                            {/* Actualizaciones */}
                            <li className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center ring-1 ring-blue-800">
                                <Package className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-gray-300 text-sm sm:text-base">
                                  Te enviaremos actualizaciones de envío por correo y WhatsApp
                                </p>
                              </div>
                            </li>

                            {/* Tiempo de Entrega */}
                            <li className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center ring-1 ring-blue-800">
                                <Truck className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-gray-300 text-sm sm:text-base">
                                  Tiempo estimado de entrega:
                                  <span className="text-white font-medium"> {selectedShipping?.days}</span>
                                </p>
                              </div>
                            </li>
                          </ul>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
                          <Button
                            variant="outline"
                            onClick={() => navigate('/account/orders')}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg font-medium bg-transparent text-white border-2 border-white hover:bg-white hover:text-black px-6 py-3"
                          >
                            Ver Pedido
                          </Button>

                          <Button
                            onClick={() => navigate('/shop')}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg font-medium bg-white text-black hover:bg-gray-100 px-6 py-3"
                          >
                            Seguir Comprando
                          </Button>
                        </div>

                        {/* Mensaje Adicional */}
                        <div className="mt-8 pt-8 border-t border-gray-800 max-w-2xl mx-auto">
                          <p className="text-gray-400 text-sm">
                            ¿Tienes alguna pregunta? Contáctanos en
                            <a href="mailto:soporte@melosportt.com" className="text-white hover:text-green-400 underline transition-colors ml-1">
                              soporte@melosportt.com
                            </a>
                          </p>
                        </div>

                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-16 pt-8 border-t border-gray-800 max-w-6xl mx-auto">
                      <div className="text-center text-gray-500 text-sm">
                        <p>&copy; {new Date().getFullYear()} MELO SPORTT. Todos los derechos reservados.</p>
                        <div className="mt-2 flex justify-center gap-4">
                          <a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a>
                          <span>•</span>
                          <a href="#" className="hover:text-white transition-colors">Política de Privacidad</a>
                          <span>•</span>
                          <a href="#" className="hover:text-white transition-colors">Política de Envíos</a>
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order summary */}
          {currentStep < 2 && (
            <div className="lg:col-span-1">
              <div className="sticky top-28 bg-primary-900 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Resumen del Pedido</h3>

                {/* Items */}
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="relative w-16 h-20 bg-primary-800 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={
                            item.product.images?.[0]?.url ||
                            'https://via.placeholder.com/64x80/1a1a1a/ffffff?text=WALMER'
                          }
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-black text-xs font-bold rounded-full flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{item.product.name}</p>
                        {item.variant && (
                          <p className="text-gray-400 text-sm">
                            {item.variant.options.map((o) => o.value).join(' / ')}
                          </p>
                        )}
                        <p className="text-white font-medium mt-1">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon */}
                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    placeholder="Código de cupón"
                    className="flex-1 h-11 px-4 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                  />
                  <Button variant="outline" size="sm">
                    Aplicar
                  </Button>
                </div>

                {/* Totals */}
                <div className="space-y-3 pt-6 border-t border-primary-800">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Envío</span>
                    <span>{shippingCost === 0 ? 'GRATIS' : formatCurrency(shippingCost)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Impuestos</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-semibold text-white pt-3 border-t border-primary-800">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
