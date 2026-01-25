import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';

interface Collection {
  id: string;
  name: string;
  description: string;
  image: string;
  productCount: number;
  slug: string;
}

const mockCollections: Collection[] = [
  {
    id: '1',
    name: 'Verano 2025',
    description: 'Descubre las últimas tendencias para esta temporada de verano.',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=300&fit=crop',
    productCount: 45,
    slug: 'summer-2025'
  },
  {
    id: '2',
    name: 'Esenciales de Invierno',
    description: 'Ropa abrigada perfecta para los días más fríos.',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=500&h=300&fit=crop',
    productCount: 32,
    slug: 'winter-essentials'
  },
  {
    id: '3',
    name: 'Estilo Urbano',
    description: 'Urban wear para el día a día en la ciudad.',
    image: 'https://images.unsplash.com/photo-1473966958969-9e4db6c36285?w=500&h=300&fit=crop',
    productCount: 28,
    slug: 'street-style'
  },
  {
    id: '4',
    name: 'Minimalista',
    description: 'Colección de diseños limpios y modernos.',
    image: 'https://images.unsplash.com/photo-1513827379601-9dba5099a3f9?w=500&h=300&fit=crop',
    productCount: 22,
    slug: 'minimalist'
  }
];

export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // For now, use mock data
    // In the future, fetch from API: /api/collections
    setCollections(mockCollections);
    setIsLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header />

      <div className="flex-1 py-12 px-4 sm:px-6">
        <div className="container mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Colecciones
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Explora nuestras colecciones cuidadosamente seleccionadas para diferentes estilos y temporadas
            </p>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <Package className="h-12 w-12 text-white animate-spin" />
            </div>
          )}

          {/* Collections Grid */}
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-8 max-w-6xl mx-auto"
            >
              {collections.map((collection, index) => (
                <motion.div
                  key={collection.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="group"
                >
                  <Link to={`/collections/${collection.slug}`}>
                    <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-300">
                      {/* Image */}
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={collection.image}
                          alt={collection.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-2xl font-bold text-white mb-2">
                          {collection.name}
                        </h3>
                        <p className="text-gray-400 mb-4">
                          {collection.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Package className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-400">
                              {collection.productCount} productos
                            </span>
                          </div>

                          <motion.div
                            whileHover={{ x: 5 }}
                            className="flex items-center text-green-400 font-medium"
                          >
                            Ver colección
                            <ChevronRight className="h-5 w-5 ml-1" />
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 text-center"
          >
            <h2 className="text-2xl font-bold text-white mb-4">
              ¿No encuentras lo que buscas?
            </h2>
            <p className="text-gray-400 mb-6">
              Explora todos nuestros productos en la tienda
            </p>
            <Button size="lg" onClick={() => window.location.href = '/shop'}>
              Ver Todos los Productos
            </Button>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
