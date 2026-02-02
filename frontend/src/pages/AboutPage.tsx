import { ShoppingBag, Package, Users, Star, Truck, Shield, RefreshCw } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-primary-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="relative w-32 h-32 mx-auto mb-8">
            <img
              src="https://res.cloudinary.com/dpqtlalhr/image/upload/v1769987804/images_2_mxdqcu.jpg"
              alt="Melo Sportt Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-primary-400 bg-clip-text text-transparent">
            Melo Sportt
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Marca de moda urbana y juvenil con presencia sólida en la costa colombiana, específicamente en Cartagena
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
                Somos una marca de moda urbana y juvenil con una presencia muy sólida en la costa colombiana,
                específicamente en Cartagena. Nos hemos consolidado como un referente de estilo en la región,
                ofreciendo prendas que combinan diseño contemporáneo con la esencia juvenil del Caribe colombiano.
              </p>
              <p className="text-lg leading-relaxed">
                Nuestra propuesta incluye ropa urbana, casual y deportiva que resalta la identidad joven y
                moderna de quienes viven y disfrutan la cultura caribeña. Cada prenda está diseñada para
                expresar la autenticidad y el estilo único de nuestra comunidad.
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-lg leading-relaxed">
                Desde nuestros inicios en Cartagena, hemos trabajado para posicionar nuestra marca como
                sinónimo de moda juvenil de calidad. Nos enorgullece ser parte de la escena fashion de la costa
                colombiana, contribuyendo al desarrollo de tendencias locales con visión global.
              </p>
              <p className="text-lg leading-relaxed font-medium text-white">
                ¡Únete a la comunidad MELO SPORTT y expresa tu estilo único!
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
