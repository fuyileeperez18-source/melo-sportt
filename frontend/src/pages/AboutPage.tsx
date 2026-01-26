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
            Tu destino para la moda deportiva y ropa urbana de la mejor calidad
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
                En Melo Sportt, somos apasionados de la moda deportiva y la ropa urbana. Nuestra misión es proporcionar
                a nuestros clientes colombianos acceso a ropa de la mejor calidad, con diseños modernos y
                tendencias actuales para todos los estilos.
              </p>
              <p className="text-lg leading-relaxed">
                Nos especializamos en ropa deportiva, urbana y casual. Ofrecemos una amplia variedad de
                prendas como camisetas, sudaderas, pantalones, gorras y accesorios que se adaptan a tu estilo
                de vida, ya sea para el día a día o para actividades deportivas.
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-lg leading-relaxed">
                Nuestra colección está cuidadosamente seleccionada para asegurar que cada pieza cumpla con los
                más altos estándares de calidad y moda. Trabajamos directamente con fabricantes reconocidos
                para garantizar que cada prenda combine estilo, comodidad y durabilidad.
              </p>
              <p className="text-lg leading-relaxed font-medium text-white">
                ¡Expresa tu estilo único con Melo Sportt!
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
            { icon: Shield, title: 'Calidad Garantizada', description: 'Ropa de primera calidad con materiales duraderos' }
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
                Seleccionamos cada prenda con cuidado para ofrecer ropa que refleje las últimas tendencias y estilos.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Pasión</h3>
              <p className="text-gray-400">
                Comprendemos lo importante que es sentirse cómodo y a la moda en cualquier ocasión.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Calidad</h3>
              <p className="text-gray-400">
                Priorizamos materiales de alta calidad y acabados perfectos en cada prenda que ofrecemos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
