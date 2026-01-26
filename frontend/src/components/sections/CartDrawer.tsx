import { Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { formatCurrency } from '@/lib/utils';
import { Button, IconButton } from '@/components/ui/Button';

export function CartDrawer() {
  const navigate = useNavigate();
  const { items, isOpen, closeCart, removeItem, updateQuantity, getSubtotal } = useCartStore();

  const subtotal = getSubtotal();
  const shipping = subtotal > 100 ? 0 : 10;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-[51] w-full max-w-md bg-primary-900 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-primary-800">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-6 w-6" />
                <h2 className="text-xl font-semibold">Tu Carrito</h2>
                <span className="px-2 py-0.5 bg-white text-black text-sm font-medium rounded-full">
                  {items.length}
                </span>
              </div>
              <IconButton onClick={closeCart}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <div className="w-24 h-24 bg-primary-800 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="h-12 w-12 text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Tu carrito está vacío</h3>
                  <p className="text-gray-400 mb-6">
                    Parece que aún no has agregado productos a tu carrito.
                  </p>
                  <Button onClick={() => { closeCart(); navigate('/shop'); }}>
                    Empezar a Comprar
                  </Button>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 100 }}
                      className="flex gap-4"
                    >
                      {/* Image */}
                      <Link
                        to={`/product/${item.product.slug}`}
                        onClick={closeCart}
                        className="flex-shrink-0"
                      >
                        <div className="w-24 h-28 bg-primary-800 rounded-lg overflow-hidden">
                          <img
                            src={
                              item.product.images?.[0]?.url ||
                              'https://via.placeholder.com/96x112/1a1a1a/ffffff?text=WALMER'
                            }
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </Link>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/product/${item.product.slug}`}
                          onClick={closeCart}
                          className="font-medium text-white hover:text-gray-300 transition-colors line-clamp-1"
                        >
                          {item.product.name}
                        </Link>

                        {item.variant && (
                          <p className="text-sm text-gray-400 mt-1">
                            {item.variant.options.map((o) => o.value).join(' / ')}
                          </p>
                        )}

                        {/* Mostrar información de los accesorios si es un conjunto */}
                        {item.product.is_set && item.selected_accessories && item.selected_accessories.length > 0 && (
                          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                            <span>✓</span>
                            <span>Incluye {item.selected_accessories.join(', ')}</span>
                          </p>
                        )}

                        <p className="text-white font-semibold mt-2">
                          {formatCurrency(item.price)}
                        </p>

                        {/* Quantity controls */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1.5 bg-primary-800 rounded-lg hover:bg-primary-700 transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </motion.button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1.5 bg-primary-800 rounded-lg hover:bg-primary-700 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </motion.button>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-primary-800 p-6 space-y-4">
                {/* Summary */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between text-lg font-semibold pt-4 border-t border-primary-800">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    onClick={handleCheckout}
                    className="w-full"
                    rightIcon={<ArrowRight className="h-5 w-5" />}
                  >
                    Finalizar Compra
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { closeCart(); navigate('/cart'); }}
                    className="w-full"
                  >
                    Ver Carrito
                  </Button>
                </div>

                {/* Secure checkout badge */}
                <p className="text-xs text-gray-500 text-center">
                  Pago seguro procesado por Wompi
                </p>
              </div>
            )}
          </motion.div>
        </Fragment>
      )}
    </AnimatePresence>
  );
}
