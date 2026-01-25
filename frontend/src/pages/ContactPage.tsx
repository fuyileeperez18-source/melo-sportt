import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, MessageSquare, Truck, Package, HeadphonesIcon, Shield } from 'lucide-react';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para enviar el formulario
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-primary-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <img
            src="https://res.cloudinary.com/dpqtlalhr/image/upload/v1767113974/MELO_SPORTT_logo_1_dxnwcv.svg"
            alt="Melo Sportt Logo"
            className="h-20 mx-auto mb-6"
          />
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-primary-400 bg-clip-text text-transparent">
            Contáctanos
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Estamos aquí para ayudarte con cualquier pregunta sobre nuestros productos y servicios
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-primary-900/50 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <HeadphonesIcon className="w-6 h-6 text-primary-500" />
                Información de Contacto
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Phone className="w-5 h-5 text-primary-500 mt-1" />
                  <div>
                    <p className="font-semibold">Teléfonos</p>
                    <p className="text-gray-400">+57 301 234 5678</p>
                    <p className="text-gray-400">+57 304 567 8901</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Mail className="w-5 h-5 text-primary-500 mt-1" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-gray-400">hola@melosportt.com</p>
                    <p className="text-gray-400">soporte@melosportt.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-primary-500 mt-1" />
                  <div>
                    <p className="font-semibold">Dirección</p>
                    <p className="text-gray-400">Bogotá, Colombia</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-primary-500 mt-1" />
                  <div>
                    <p className="font-semibold">Horario de Atención</p>
                    <p className="text-gray-400">Lunes a Viernes: 9:00 AM - 7:00 PM</p>
                    <p className="text-gray-400">Sábados: 10:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-primary-900/50 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-4">Preguntas Frecuentes</h3>
              <div className="space-y-3 text-gray-400">
                <p className="text-sm">¿Cuánto tarda el envío?</p>
                <p className="text-sm">¿Cómo puedo hacer una devolución?</p>
                <p className="text-sm">¿Los productos son originales?</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-primary-900/50 rounded-2xl p-8 backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-primary-500" />
                Envíanos un mensaje
              </h2>

              {isSubmitted ? (
                <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-6 text-center">
                  <p className="text-lg font-semibold text-green-400 mb-2">¡Mensaje enviado con éxito!</p>
                  <p className="text-gray-300">Nos pondremos en contacto contigo pronto.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Nombre *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-primary-900/30 border border-primary-700 rounded-lg focus:outline-none focus:border-primary-500 text-white placeholder-gray-500"
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-primary-900/30 border border-primary-700 rounded-lg focus:outline-none focus:border-primary-500 text-white placeholder-gray-500"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Asunto *</label>
                    <select
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-3 bg-primary-900/30 border border-primary-700 rounded-lg focus:outline-none focus:border-primary-500 text-white"
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="informacion">Información de productos</option>
                      <option value="envio">Información de envío</option>
                      <option value="pedido">Mi pedido</option>
                      <option value="devolucion">Devoluciones</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Mensaje *</label>
                    <textarea
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 bg-primary-900/30 border border-primary-700 rounded-lg focus:outline-none focus:border-primary-500 text-white placeholder-gray-500 resize-none"
                      placeholder="Escribe tu mensaje aquí..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-700 text-white font-semibold py-3 px-6 rounded-lg hover:from-primary-600 hover:to-primary-800 transition-all duration-200 transform hover:scale-105"
                  >
                    Enviar Mensaje
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-12">Nuestros Servicios</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: 'Envío Nacional', description: 'Envíos a todo el país en 2-5 días hábiles' },
              { icon: Package, title: 'Empaque Seguro', description: 'Todos los productos empacados con cuidado' },
              { icon: Shield, title: 'Pago Seguro', description: 'Múltiples métodos de pago disponibles' },
              { icon: HeadphonesIcon, title: 'Soporte Personalizado', description: 'Atención especializada para cada cliente' }
            ].map((service, index) => {
              const Icon = service.icon;
              return (
                <div key={index} className="bg-primary-900/30 rounded-2xl p-6 text-center hover:bg-primary-900/50 transition-colors">
                  <Icon className="w-12 h-12 mx-auto mb-4 text-primary-500" />
                  <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                  <p className="text-gray-400">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
