import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';

import { AnimatedSection } from '@/components/animations/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistItems, useRemoveFromWishlist } from '@/hooks/useWishlist';
import { formatCurrency } from '@/lib/utils';

export function WishlistPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addItem } = useCartStore();

  const userId = user?.id;

  const { data, isLoading, isError, error } = useWishlistItems(userId);
  const remove = useRemoveFromWishlist(userId);

  const items = data?.data || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black py-20">
        <div className="container mx-auto px-6">
          <AnimatedSection animation="fadeUp" className="text-center max-w-md mx-auto">
            <div className="w-32 h-32 bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-8">
              <Heart className="h-16 w-16 text-gray-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Cargando wishlist...</h1>
            <p className="text-gray-400">Espera un momento.</p>
          </AnimatedSection>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-black py-20">
        <div className="container mx-auto px-6">
          <AnimatedSection animation="fadeUp" className="text-center max-w-md mx-auto">
            <div className="w-32 h-32 bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-8">
              <Heart className="h-16 w-16 text-gray-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">No se pudo cargar</h1>
            <p className="text-gray-400 mb-8">{error instanceof Error ? error.message : 'Error desconocido'}</p>
            <Button onClick={() => navigate('/shop')} size="lg">
              Ir a la tienda
            </Button>
          </AnimatedSection>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black py-20">
        <div className="container mx-auto px-6">
          <AnimatedSection animation="fadeUp" className="text-center max-w-md mx-auto">
            <div className="w-32 h-32 bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-8">
              <Heart className="h-16 w-16 text-gray-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Tu wishlist está vacía</h1>
            <p className="text-gray-400 mb-8">
              Guarda tus productos favoritos para encontrarlos rápido más tarde.
            </p>
            <Button onClick={() => navigate('/shop')} size="lg">
              Ir a la tienda
            </Button>
          </AnimatedSection>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-6">
        <AnimatedSection animation="fadeUp">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">Wishlist</h1>
        </AnimatedSection>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="divide-y divide-primary-800">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.product.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="py-6 grid md:grid-cols-12 gap-4 items-center"
                  >
                    <div className="md:col-span-7 flex gap-4">
                      <Link to={`/product/${item.product.slug}`} className="flex-shrink-0">
                        <div className="w-24 h-28 md:w-28 md:h-32 bg-primary-900 rounded-lg overflow-hidden">
                          <img
                            src={
                              item.product.images?.[0]?.url ||
                              'https://via.placeholder.com/112x128/1a1a1a/ffffff?text=WALMER'
                            }
                            alt={item.product.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                      </Link>

                      <div className="flex flex-col justify-center">
                        <Link
                          to={`/product/${item.product.slug}`}
                          className="text-white font-medium hover:text-gray-300 transition-colors"
                        >
                          {item.product.name}
                        </Link>
                        <p className="text-gray-400 text-sm mt-1">SKU: {item.product.sku}</p>
                        <p className="text-white font-medium mt-2 md:hidden">
                          {formatCurrency(item.product.price)}
                        </p>
                      </div>
                    </div>

                    <div className="hidden md:block md:col-span-2 text-center text-white">
                      {formatCurrency(item.product.price)}
                    </div>

                    <div className="md:col-span-3 flex items-center justify-end gap-3">
                      <Button
                        size="sm"
                        onClick={() => addItem(item.product, 1)}
                        leftIcon={<ShoppingBag className="h-4 w-4" />}
                      >
                        Agregar
                      </Button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => remove.mutate(item.product.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Quitar de wishlist"
                        disabled={remove.isPending}
                      >
                        <Trash2 className="h-5 w-5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex justify-start gap-4 mt-8 pt-8 border-t border-primary-800">
              <Button
                variant="ghost"
                onClick={() => navigate('/shop')}
                leftIcon={<ArrowRight className="h-4 w-4 rotate-180" />}
              >
                Seguir comprando
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              <div className="bg-primary-900 rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-2">Tus favoritos</h2>
                <p className="text-gray-400 text-sm">
                  Tienes <span className="text-white font-medium">{items.length}</span> producto(s) guardados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
