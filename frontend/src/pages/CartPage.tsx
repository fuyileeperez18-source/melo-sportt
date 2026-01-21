import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Tag,
  Truck,
  Shield,
  RefreshCw,
} from 'lucide-react';

import { AnimatedSection } from '@/components/animations/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { useCartStore } from '@/stores/cartStore';
import { formatCurrency } from '@/lib/utils';

const benefits = [
  { icon: Truck, text: 'Free shipping on orders over $100' },
  { icon: Shield, text: 'Secure payment processing' },
  { icon: RefreshCw, text: '30-day hassle-free returns' },
];

export function CartPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, getSubtotal, clearCart } = useCartStore();

  const subtotal = getSubtotal();
  const shipping = subtotal >= 100 ? 0 : 10;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black py-20">
        <div className="container mx-auto px-6">
          <AnimatedSection animation="fadeUp" className="text-center max-w-md mx-auto">
            <div className="w-32 h-32 bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-8">
              <ShoppingBag className="h-16 w-16 text-gray-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Your cart is empty</h1>
            <p className="text-gray-400 mb-8">
              Looks like you haven't added any items to your cart yet.
              Start shopping to fill it up!
            </p>
            <Button onClick={() => navigate('/shop')} size="lg">
              Start Shopping
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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">Shopping Cart</h1>
        </AnimatedSection>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Cart items */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 pb-4 border-b border-primary-800 text-sm text-gray-400">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-center">Price</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {/* Items */}
            <div className="divide-y divide-primary-800">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="py-6 grid md:grid-cols-12 gap-4 items-center"
                  >
                    {/* Product */}
                    <div className="md:col-span-6 flex gap-4">
                      <Link
                        to={`/product/${item.product.slug}`}
                        className="flex-shrink-0"
                      >
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
                        {item.variant && (
                          <p className="text-gray-400 text-sm mt-1">
                            {item.variant.options.map((o) => o.value).join(' / ')}
                          </p>
                        )}
                        <p className="text-gray-500 text-sm mt-1">
                          SKU: {item.variant?.sku || item.product.sku}
                        </p>
                        {/* Mobile price */}
                        <p className="text-white font-medium mt-2 md:hidden">
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>

                    {/* Price (desktop) */}
                    <div className="hidden md:block md:col-span-2 text-center text-white">
                      {formatCurrency(item.price)}
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2 flex items-center justify-between md:justify-center gap-4">
                      <div className="flex items-center bg-primary-900 rounded-lg">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </motion.button>
                        <span className="w-10 text-center text-white font-medium">
                          {item.quantity}
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </motion.button>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors md:hidden"
                      >
                        <Trash2 className="h-5 w-5" />
                      </motion.button>
                    </div>

                    {/* Total */}
                    <div className="hidden md:flex md:col-span-2 items-center justify-end gap-4">
                      <span className="text-white font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8 pt-8 border-t border-primary-800">
              <Button
                variant="ghost"
                onClick={() => navigate('/shop')}
                leftIcon={<ArrowRight className="h-4 w-4 rotate-180" />}
              >
                Continue Shopping
              </Button>
              <Button
                variant="ghost"
                onClick={clearCart}
                className="text-red-400 hover:text-red-300"
              >
                Clear Cart
              </Button>
            </div>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              {/* Summary card */}
              <div className="bg-primary-900 rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Order Summary</h2>

                {/* Coupon */}
                <div className="flex gap-2 mb-6">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Coupon code"
                      className="w-full h-11 pl-10 pr-4 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    Apply
                  </Button>
                </div>

                {/* Totals */}
                <div className="space-y-3 pb-6 border-b border-primary-800">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal ({items.length} items)</span>
                    <span className="text-white">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Shipping estimate</span>
                    <span className="text-white">
                      {shipping === 0 ? 'FREE' : formatCurrency(shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Tax estimate</span>
                    <span className="text-white">{formatCurrency(tax)}</span>
                  </div>
                </div>

                {/* Free shipping progress */}
                {subtotal < 100 && (
                  <div className="py-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Free shipping progress</span>
                      <span className="text-white">{formatCurrency(subtotal)} / $100</span>
                    </div>
                    <div className="h-2 bg-primary-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-white rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((subtotal / 100) * 100, 100)}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      Add {formatCurrency(100 - subtotal)} more for free shipping!
                    </p>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between text-xl font-semibold text-white py-6 border-t border-primary-800">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>

                {/* Checkout button */}
                <Button
                  onClick={() => navigate('/checkout')}
                  className="w-full"
                  size="lg"
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  Proceed to Checkout
                </Button>

                {/* Secure checkout */}
                <p className="text-center text-gray-500 text-sm mt-4 flex items-center justify-center gap-2">
                  <Shield className="h-4 w-4" />
                  Secure checkout powered by Stripe
                </p>
              </div>

              {/* Benefits */}
              <div className="bg-primary-900 rounded-2xl p-6">
                <div className="space-y-4">
                  {benefits.map((benefit) => (
                    <div key={benefit.text} className="flex items-center gap-3">
                      <benefit.icon className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-300 text-sm">{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
