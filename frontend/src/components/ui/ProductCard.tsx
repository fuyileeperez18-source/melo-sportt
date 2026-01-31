import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Eye, Star } from 'lucide-react';
import { cn, formatCurrency, calculateDiscount, formatCategoryName } from '@/lib/utils';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useToggleWishlist, useWishlistIds } from '@/hooks/useWishlist';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'minimal' | 'detailed';
  className?: string;
}

export function ProductCard({
  product,
  variant = 'default',
  className,
}: ProductCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const addItem = useCartStore((state) => state.addItem);

  const { user, profile, isAuthenticated } = useAuthStore();
  const currentUser = user || profile;
  const userId = currentUser?.id;

  const { data: wishlistIds } = useWishlistIds(userId);
  const { toggle } = useToggleWishlist(userId);
  const isWishlisted = !!wishlistIds?.includes(product.id);

  const primaryImage = product.images?.find((img) => img.is_primary)?.url ||
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop';

  const secondaryImage = product.images?.length > 1 ? (product.images[1]?.url || null) : null;

  const discount = product.compare_at_price
    ? calculateDiscount(product.compare_at_price, product.price)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Verificar si el producto tiene tallas disponibles
    const hasSizes = (product.sizes && product.sizes.length > 0) || 
                     (product.variants && product.variants.some(v => 
                       v.options?.some(o => o.name === 'Size' || o.name === 'size')
                     ));
    
    // Si tiene tallas, redirigir a la página del producto para seleccionar talla
    if (hasSizes) {
      navigate(`/product/${product.slug}`);
      return;
    }
    
    addItem(product, 1);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || !userId) {
      navigate('/login', { state: { from: { pathname: window.location.pathname } } });
      return;
    }

    toggle(product.id);
  };

  if (variant === 'minimal') {
    return (
      <Link to={`/product/${product.slug}`} className={cn('group block', className)}>
        <motion.div
          className="relative overflow-hidden bg-primary-900 rounded-lg"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          <div className="aspect-[3/4]">
            <img
              src={primaryImage}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                console.warn(`Error loading minimal view image for product ${product.name}:`, e);
                target.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop';
              }}
            />
          </div>
        </motion.div>
        <div className="mt-3">
          <h3 className="text-white font-medium truncate">{product.name}</h3>
          <p className="text-gray-400">{formatCurrency(product.price)}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/product/${product.slug}`}
      className={cn('group block', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="relative overflow-hidden bg-primary-900 rounded-xl"
        layout
      >
        {/* Image container */}
        <div className="relative aspect-[3/4] overflow-hidden bg-primary-800">
          {/* Primary image */}
          <motion.img
            src={primaryImage}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
            animate={{ opacity: isHovered && secondaryImage ? 0 : 1 }}
            transition={{ duration: 0.5 }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              console.warn(`Error loading primary image for product ${product.name}:`, e);
              // Intentar con una imagen de fallback diferente
              target.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop';
            }}
          />

          {/* Secondary image (hover) */}
          {secondaryImage && (
            <motion.img
              src={secondaryImage}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.5 }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                console.warn(`Error loading secondary image for product ${product.name}:`, e);
                target.style.display = 'none';
              }}
            />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Badges */}
          <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-col gap-1 md:gap-2">
            {product.is_featured && (
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-2 py-0.5 md:px-3 md:py-1 bg-white text-black text-[10px] md:text-xs font-bold rounded-full"
              >
                DESTACADO
              </motion.span>
            )}
            {discount > 0 && (
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="px-2 py-0.5 md:px-3 md:py-1 bg-red-500 text-white text-[10px] md:text-xs font-bold rounded-full"
              >
                -{discount}%
              </motion.span>
            )}
            {product.quantity <= 5 && product.quantity > 0 && (
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="px-2 py-0.5 md:px-3 md:py-1 bg-amber-500 text-black text-[10px] md:text-xs font-bold rounded-full"
              >
                ÚLTIMAS UNIDADES
              </motion.span>
            )}
          </div>

          {/* Quick actions */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="absolute bottom-4 left-4 right-4 flex gap-2"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddToCart}
                  className="flex-1 py-3 bg-white text-black font-semibold rounded-full flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Agregar al Carrito
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleWishlist}
                  className={cn(
                    'p-3 rounded-full transition-colors',
                    isWishlisted
                      ? 'bg-red-500 text-white'
                      : 'bg-white/20 backdrop-blur text-white hover:bg-white/30'
                  )}
                >
                  <Heart
                    className={cn('h-5 w-5', isWishlisted && 'fill-current')}
                  />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image navigation dots */}
          {product.images && product.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
              {product.images.slice(0, 4).map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    setImageIndex(index);
                  }}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    index === imageIndex
                      ? 'bg-white w-4'
                      : 'bg-white/50 hover:bg-white/75'
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-2 md:p-4">
          {/* Category */}
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {formatCategoryName(product.category?.name) || 'Colección'}
          </p>

          {/* Name */}
          <h3 className="text-white font-medium text-xs sm:text-base md:text-lg mb-1 md:mb-2 truncate group-hover:text-gray-200 transition-colors">
            {product.name}
          </h3>

          {/* Rating (if available) */}
          {variant === 'detailed' && (
            <div className="flex items-center gap-1 mb-1 md:mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-3 w-3 md:h-4 md:w-4',
                    i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                  )}
                />
              ))}
              <span className="text-gray-500 text-xs sm:text-sm ml-1">(24)</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-xs sm:text-base md:text-lg">
              {formatCurrency(product.price)}
            </span>
            {product.compare_at_price && (
              <span className="text-gray-500 line-through text-[10px] sm:text-sm">
                {formatCurrency(product.compare_at_price)}
              </span>
            )}
          </div>

          {/* Color variants (if available) */}
          {variant === 'detailed' && product.variants && product.variants.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {product.variants.slice(0, 4).map((v, index) => (
                <button
                  key={v.id}
                  className="w-5 h-5 rounded-full border-2 border-primary-700 hover:border-white transition-colors"
                  style={{
                    backgroundColor:
                      v.options.find((o) => o.name.toLowerCase() === 'color')?.value || '#333',
                  }}
                />
              ))}
              {product.variants.length > 4 && (
                <span className="text-gray-500 text-sm">
                  +{product.variants.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// Grid component for product cards
interface ProductGridProps {
  products: Product[];
  columns?: 2 | 3 | 4;
  variant?: ProductCardProps['variant'];
}

export function ProductGrid({
  products,
  columns = 4,
  variant = 'default',
}: ProductGridProps) {
  const gridCols = {
    2: 'grid-cols-2 sm:grid-cols-2',
    3: 'grid-cols-3 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-2 sm:gap-4 md:gap-6', gridCols[columns])}>
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <ProductCard product={product} variant={variant} />
        </motion.div>
      ))}
    </div>
  );
}

// Featured product card (larger)
export function FeaturedProductCard({ product }: { product: Product }) {
  const primaryImage = product.images?.find((img) => img.is_primary)?.url ||
    product.images?.[0]?.url ||
    'https://via.placeholder.com/800x600/1a1a1a/ffffff?text=WALMER';

  return (
    <Link to={`/product/${product.slug}`} className="group">
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-primary-900"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.5 }}
      >
        <div className="aspect-[16/9] md:aspect-[21/9]">
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              console.warn(`Error loading featured image for product ${product.name}:`, e);
              target.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        </div>

        <div className="absolute inset-0 flex items-center p-8 md:p-12">
          <div className="max-w-lg">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-1 bg-white text-black text-sm font-bold rounded-full mb-4"
            >
              FEATURED
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-5xl font-bold text-white mb-4"
            >
              {product.name}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-300 mb-6 line-clamp-2"
            >
              {product.short_description || product.description}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-4"
            >
              <span className="text-3xl font-bold text-white">
                {formatCurrency(product.price)}
              </span>
              <span className="px-6 py-3 bg-white text-black font-semibold rounded-full group-hover:bg-gray-100 transition-colors">
                Comprar Ahora
              </span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
