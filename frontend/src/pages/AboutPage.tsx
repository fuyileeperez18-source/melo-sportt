import { ShoppingBag, Package, Users, Star, Truck, Shield, RefreshCw } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-primary-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="relative w-32 h-32 mx-auto mb-8">
            <img
              src="/melo-sportt-logo-white.png"
              alt="Melo Sportt Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-primary-400 bg-clip-text text-transparent">
            Melo Sportt
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Tu destino para el merchandising oficial de fútbol más auténtico
          </p>
        </div>

        {/* About Section */}
        <div className="bg-primary-900/50 rounded-3xl p-8 md:p-12 mb-16 backdrop-blur-sm">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-primary-500" />
            Sobre nosotros
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-gray-300">
            <div className="space-y-4">
              <p className="text-lg leading-relaxed">
                En Melo Sportt, somos apasionados del fútbol y entendemos la importancia de llevar
                el escudo de tu equipo con orgullo. Nuestra misión es proporcionar a los aficionados
                colombianos acceso a merchandising oficial de la mejor calidad, directamente de los
                clubes más prestigiosos.
              </p>
              <p className="text-lg leading-relaxed">
                Nos especializamos en camisetas auténticas, gorras oficiales, ropa casual deportiva
                y accesorios que permiten a los seguidores demostrar su lealtad a sus equipos favoritos
                tanto dentro como fuera de la cancha.
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-lg leading-relaxed">
                Nuestra colección está cuidadosamente curada para asegurar que cada pieza cumpla con los
                estándares de calidad que los verdaderos aficionados esperan. Trabajamos directamente
                con fabricantes oficiales y clubes para garantizar la autenticidad de cada producto.
              </p>
              <p className="text-lg leading-relaxed font-medium text-white">
                ¡Lleva tu pasión a otro nivel con Melo Sportt!
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <h2 className="text-3xl font-bold text-center mb-12">¿Por qué elegirnos?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { icon: Truck, title: 'Envío Gratis', description: 'En compras mayores a $250.000 en toda Colombia' },
            { icon: Shield, title: 'Pago Seguro', description: 'Checkout 100% seguro con múltiples métodos de pago' },
            { icon: RefreshCw, title: 'Devoluciones Fáciles', description: 'Política de 30 días para tu tranquilidad' },
            { icon: Shield, title: 'Calidad Garantizada', description: 'Mercancía oficial auténtica y de primera calidad' }
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="bg-primary-900/30 rounded-2xl p-6 text-center hover:bg-primary-900/50 transition-colors">
                <Icon className="w-12 h-12 mx-auto mb-4 text-primary-500" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Values Section */}
        <div className="bg-primary-900/30 rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-8 text-center">Nuestros valores</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Autenticidad</h3>
              <p className="text-gray-400">
                Solo productos oficiales y auténticos de los clubes más grandes de Colombia y el mundo.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Pasión</h3>
              <p className="text-gray-400">
                Somos aficionados como tú, entendiendo lo que significa llevar los colores de tu equipo.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Calidad</h3>
              <p className="text-gray-400">
                Cada producto es seleccionado cuidadosamente para garantizar la mejor calidad y durabilidad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
