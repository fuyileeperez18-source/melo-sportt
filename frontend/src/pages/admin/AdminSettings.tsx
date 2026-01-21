import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Store,
  Bell,
  CreditCard,
  Truck,
  Globe,
  Shield,
  Mail,
  Smartphone,
  Save,
  Upload,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'general', label: 'General', icon: Store },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'payments', label: 'Pagos', icon: CreditCard },
  { id: 'shipping', label: 'Envíos', icon: Truck },
  { id: 'seo', label: 'SEO', icon: Globe },
  { id: 'security', label: 'Seguridad', icon: Shield },
];

const currencies = [
  { value: 'COP', label: 'COP - Peso Colombiano' },
  { value: 'USD', label: 'USD - Dólar Estadounidense' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
];

const timezones = [
  { value: 'America/Bogota', label: 'Colombia (COT)' },
  { value: 'America/New_York', label: 'Hora del Este (ET)' },
  { value: 'America/Chicago', label: 'Hora Central (CT)' },
  { value: 'America/Denver', label: 'Hora de Montaña (MT)' },
  { value: 'America/Los_Angeles', label: 'Hora del Pacífico (PT)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (CST)' },
];

export function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success('Configuración guardada exitosamente');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Ajustes</h1>
          <p className="text-gray-600">Administra la configuración de tu tienda</p>
        </div>
        <Button
          onClick={handleSave}
          isLoading={isSaving}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Guardar Cambios
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                  activeTab === tab.id
                    ? 'bg-black text-white'
                    : 'text-gray-700 hover:text-black hover:bg-gray-100'
                )}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-black mb-6">Configuración General</h2>

                {/* Store logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Logo de la Tienda</label>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                      <span className="text-3xl font-bold text-black">M</span>
                    </div>
                    <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />}>
                      Subir Logo
                    </Button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Nombre de la Tienda" defaultValue="MELO SPORTT" />
                  <Input label="Email de Contacto" type="email" defaultValue="contacto@melosportt.com" />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Teléfono" type="tel" defaultValue="+57 300 123 4567" />
                  <Input label="WhatsApp" type="tel" defaultValue="+57 300 123 4567" />
                </div>

                <Textarea
                  label="Descripción de la Tienda"
                  defaultValue="Moda deportiva premium. Descubre piezas atemporales diseñadas con atención al detalle."
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <Select label="Moneda" options={currencies} defaultValue="COP" />
                  <Select label="Zona Horaria" options={timezones} defaultValue="America/Bogota" />
                </div>

                <Input label="Dirección de la Tienda" defaultValue="Calle 123 #45-67, Bogotá, Colombia" />
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-black mb-6">Configuración de Notificaciones</h2>

                <div className="space-y-4">
                  {[
                    { label: 'Notificaciones de nuevos pedidos', description: 'Recibe email cuando se realiza un nuevo pedido', icon: Mail },
                    { label: 'Alertas de stock bajo', description: 'Recibe notificaciones cuando los productos tengan poco stock', icon: Bell },
                    { label: 'Mensajes de clientes', description: 'Recibe notificaciones de nuevos mensajes', icon: Smartphone },
                    { label: 'Notificaciones de reseñas', description: 'Recibe notificaciones cuando los clientes dejen reseñas', icon: Bell },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <item.icon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-black font-medium">{item.label}</p>
                          <p className="text-gray-600 text-sm">{item.description}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-primary-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <Input
                  label="Email de Notificaciones"
                  type="email"
                  defaultValue="admin@melosportt.com"
                  hint="Todas las notificaciones se enviarán a este correo"
                />
              </div>
            )}

            {/* Payments */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-black mb-6">Configuración de Pagos</h2>



                {/* Wompi */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#00C389] rounded-lg">
                        <CreditCard className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-black font-medium">Wompi</p>
                        <p className="text-green-600 text-sm flex items-center gap-1">
                          <Check className="h-3 w-3" /> Conectado
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Configurar</Button>
                  </div>
                  <Input
                    label="Wompi Public Key"
                    type="password"
                    defaultValue="pub_test_xxxxxxxxxxxxxxxxxxxx"
                  />
                </div>

                {/* PSE */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#0033A0] rounded-lg">
                        <CreditCard className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-black font-medium">PSE</p>
                        <p className="text-green-600 text-sm flex items-center gap-1">
                          <Check className="h-3 w-3" /> Disponible via Wompi
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Tax Rate (%)" type="number" defaultValue="8" />
                  <Select
                    label="Tax Calculation"
                    options={[
                      { value: 'inclusive', label: 'Tax Inclusive' },
                      { value: 'exclusive', label: 'Tax Exclusive' },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* Shipping */}
            {activeTab === 'shipping' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6">Shipping Settings</h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Free Shipping Threshold ($)" type="number" defaultValue="100" />
                  <Input label="Default Shipping Cost ($)" type="number" defaultValue="10" />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Shipping Methods</h3>

                  {[
                    { name: 'Standard Shipping', price: 10, days: '5-7 days' },
                    { name: 'Express Shipping', price: 25, days: '2-3 days' },
                    { name: 'Overnight Shipping', price: 50, days: '1 day' },
                  ].map((method) => (
                    <div key={method.name} className="flex items-center justify-between p-4 bg-primary-800 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{method.name}</p>
                        <p className="text-gray-400 text-sm">{method.days}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-white font-medium">${method.price}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-primary-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEO */}
            {activeTab === 'seo' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6">SEO Settings</h2>

                <Input
                  label="Título del Sitio"
                  defaultValue="MELO SPORTT - Moda Deportiva Premium"
                  hint="Aparece en resultados de búsqueda y pestañas del navegador"
                />

                <Textarea
                  label="Meta Descripción"
                  defaultValue="Descubre moda deportiva premium en MELO SPORTT. Compra las últimas tendencias en ropa, accesorios y más con envío gratis en compras mayores a $200.000."
                  hint="Recomendado: 150-160 caracteres"
                />

                <Input
                  label="Palabras Clave"
                  defaultValue="moda, ropa, deportiva, tienda, accesorios, Colombia"
                  hint="Separa las palabras clave con comas"
                />

                <div className="p-4 bg-primary-800 rounded-lg">
                  <h3 className="text-white font-medium mb-3">Vista Previa en Redes</h3>
                  <div className="border border-primary-700 rounded-lg overflow-hidden">
                    <div className="h-32 bg-primary-700"></div>
                    <div className="p-4">
                      <p className="text-blue-400 text-sm">melosportt.com</p>
                      <p className="text-white font-medium">MELO SPORTT - Moda Deportiva Premium</p>
                      <p className="text-gray-400 text-sm">Descubre moda deportiva premium en MELO SPORTT...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6">Security Settings</h2>

                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-white font-medium">SSL Certificate Active</p>
                      <p className="text-gray-400 text-sm">Your store is protected with HTTPS encryption</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Two-factor authentication', description: 'Add an extra layer of security to admin accounts', enabled: true },
                    { label: 'Login notifications', description: 'Get notified of new admin logins', enabled: true },
                    { label: 'IP restriction', description: 'Limit admin access to specific IP addresses', enabled: false },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-4 bg-primary-800 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{item.label}</p>
                        <p className="text-gray-400 text-sm">{item.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={item.enabled} className="sr-only peer" />
                        <div className="w-11 h-6 bg-primary-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="text-red-400 border-red-400 hover:bg-red-400/10">
                  Change Admin Password
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
