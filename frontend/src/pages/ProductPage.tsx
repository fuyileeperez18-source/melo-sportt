import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Thumbs, Zoom, FreeMode } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/thumbs';
import 'swiper/css/zoom';
import 'swiper/css/free-mode';
import {
  Heart,
  Share2,
  Minus,
  Plus,
  ShoppingBag,
  Truck,
  Shield,
  RefreshCw,
  Star,
  ChevronRight,
  Check,
  ZoomIn,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { AnimatedSection, StaggerContainer, StaggerItem } from '@/components/animations/AnimatedSection';
import { Button, IconButton } from '@/components/ui/Button';
import { ProductCard } from '@/components/ui/ProductCard';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useToggleWishlist, useWishlistIds } from '@/hooks/useWishlist';
import { useProduct, useRelatedProducts } from '@/hooks/useProducts';
import { cn, formatCurrency, calculateDiscount, formatCategoryName } from '@/lib/utils';
import type { Product, ProductVariant } from '@/types';

export function ProductPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [isZoomed, setIsZoomed] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  const { user, profile, isAuthenticated } = useAuthStore();
  const currentUser = user || profile;
  const userId = currentUser?.id;

  // Fetch product by slug from API
  const { data: product, isLoading, error } = useProduct(slug || '');

  const { data: wishlistIds } = useWishlistIds(userId);
  const { toggle } = useToggleWishlist(userId);
  const isWishlisted = !!wishlistIds?.includes(product?.id || '');

  // Fetch related products
  const { data: relatedProducts = [] } = useRelatedProducts(
    product?.id || '',
    product?.category_id || ''
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  // Show error state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Producto no encontrado</h1>
          <p className="text-gray-400 mb-6">El producto que buscas no existe.</p>
          <Button onClick={() => navigate('/shop')}>Volver a la tienda</Button>
        </div>
      </div>
    );
  }

  // Extract unique sizes and colors from variants
  const variants = product.variants || [];
  const variantSizes = [...new Set(variants.map((v) => v.options?.find((o) => o.name === 'Size')?.value).filter(Boolean))];
  const colors = [...new Set(variants.map((v) => v.options?.find((o) => o.name === 'Color')?.value).filter(Boolean))];
  
  // Combine sizes from product.sizes and variant sizes (product sizes take priority)
  const sizes = product.sizes && product.sizes.length > 0 
    ? product.sizes 
    : variantSizes;

  // Find selected variant
  const selectedVariant = variants.find(
    (v) =>
      v.options?.find((o) => o.name === 'Size')?.value === selectedSize &&
      v.options?.find((o) => o.name === 'Color')?.value === selectedColor
  );

  const discount = product.compare_at_price
    ? calculateDiscount(product.compare_at_price, product.price)
    : 0;

  const isInStock = selectedVariant ? selectedVariant.quantity > 0 : product.quantity > 0;

  const handleAddToCart = () => {
    if (sizes.length > 0 && !selectedSize) {
      toast.error('Por favor selecciona una talla');
      return;
    }
    if (colors.length > 0 && !selectedColor) {
      toast.error('Por favor selecciona un color');
      return;
    }

    addItem(product, quantity, selectedVariant || undefined, selectedAccessories);
    toast.success('¡Añadido al carrito!');
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product.name,
        text: product.short_description,
        url: window.location.href,
      });
    } catch {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  // Get reviews from product (if available)
  const reviews = (product as any).reviews || [];
  const averageRating = reviews.length > 0
    ? reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviews.length
    : 0;

  return (
    <div className="min-h-screen bg-black">
      {/* Breadcrumb */}
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/shop" className="hover:text-white transition-colors">Shop</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to={`/shop?category=${product.category?.slug}`} className="hover:text-white transition-colors">
            {formatCategoryName(product.category?.name)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-white">{product.name}</span>
        </nav>
      </div>

      {/* Product section */}
      <section className="py-8">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Images */}
            <AnimatedSection animation="fadeIn">
              <div className="sticky top-28">
                {/* Main image */}
                <div className="relative aspect-[3/4] bg-primary-900 rounded-2xl overflow-hidden mb-4">
                  <Swiper
                    modules={[Thumbs, Zoom]}
                    thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                    zoom={{ maxRatio: 2 }}
                    className="h-full"
                  >
                    {(product.images || []).length > 0 ? (
                      (product.images || []).map((image) => (
                      <SwiperSlide key={image.id}>
                        <div className="swiper-zoom-container h-full">
                          <img
                            src={image.url}
                            alt={image.alt_text}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </SwiperSlide>
                    ))
                    ) : (
                      <SwiperSlide>
                        <div className="w-full h-full bg-primary-900 flex items-center justify-center">
                          <span className="text-gray-500">Imagen no disponible</span>
                        </div>
                      </SwiperSlide>
                    )}
                  </Swiper>

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                    {discount > 0 && (
                      <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
                        -{discount}%
                      </span>
                    )}
                    {product.is_featured && (
                      <span className="px-3 py-1 bg-white text-black text-sm font-bold rounded-full">
                        DESTACADO
                      </span>
                    )}
                  </div>

                  {/* Zoom hint */}
                  <div className="absolute bottom-4 right-4 z-10">
                    <span className="flex items-center gap-1 px-3 py-1 bg-black/50 backdrop-blur text-white text-xs rounded-full">
                      <ZoomIn className="h-3 w-3" /> Pellizca para hacer zoom
                    </span>
                  </div>
                </div>

                {/* Thumbnails */}
                <Swiper
                  modules={[FreeMode, Thumbs]}
                  onSwiper={setThumbsSwiper}
                  spaceBetween={12}
                  slidesPerView={4}
                  freeMode
                  watchSlidesProgress
                  className="!px-1"
                >
                  {(product.images || []).length > 0 ? (
                    (product.images || []).map((image) => (
                    <SwiperSlide key={image.id}>
                      <div className="aspect-square bg-primary-900 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-white transition-colors">
                        <img
                          src={image.url}
                          alt={image.alt_text}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </SwiperSlide>
                  ))
                  ) : null}
                </Swiper>
              </div>
            </AnimatedSection>

            {/* Product info */}
            <AnimatedSection animation="fadeUp" delay={0.2}>
              <div>
                {/* Brand & category */}
                <div className="flex items-center gap-4 mb-2 flex-wrap">
                  {product.brand && (
                    <>
                      <span className="text-sm text-gray-400">{product.brand}</span>
                      <span className="text-sm text-gray-500">|</span>
                    </>
                  )}
                  {product.gender && (
                    <>
                      <span className="text-sm text-gray-400 capitalize">{product.gender}</span>
                      <span className="text-sm text-gray-500">|</span>
                    </>
                  )}
                  {product.product_type && (
                    <>
                      <span className="text-sm text-gray-400 capitalize">{product.product_type}</span>
                      <span className="text-sm text-gray-500">|</span>
                    </>
                  )}
                  <Link
                    to={`/shop?category=${product.category?.slug}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {formatCategoryName(product.category?.name)}
                  </Link>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  {product.name}
                </h1>

                {/* Rating */}
                {reviews.length > 0 && (
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-5 w-5',
                            i < Math.round(averageRating)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-600'
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-gray-400">{averageRating.toFixed(1)}</span>
                    <button
                      onClick={() => setActiveTab('reviews')}
                      className="text-gray-400 hover:text-white transition-colors underline"
                    >
                      {reviews.length} reviews
                    </button>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center gap-4 mb-6">
                  <div>
                    <span className="text-3xl font-bold text-white">
                      {formatCurrency(
                        (selectedVariant?.price || product.price) +
                        (product.accessories || [])
                          .filter(acc => selectedAccessories.includes(acc.type))
                          .reduce((sum, acc) => sum + acc.price, 0)
                      )}
                    </span>
                    {selectedAccessories.length > 0 && (
                      <div className="text-sm text-gray-400 mt-1">
                        {formatCurrency(selectedVariant?.price || product.price)} + {formatCurrency(
                          (product.accessories || [])
                            .filter(acc => selectedAccessories.includes(acc.type))
                            .reduce((sum, acc) => sum + acc.price, 0)
                        )} accesorios
                      </div>
                    )}
                  </div>
                  {product.compare_at_price && (
                    <span className="text-xl text-gray-500 line-through">
                      {formatCurrency(
                        product.compare_at_price +
                        (product.accessories || [])
                          .filter(acc => selectedAccessories.includes(acc.type))
                          .reduce((sum, acc) => sum + acc.price, 0)
                      )}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-sm font-medium rounded">
                      Save {formatCurrency(product.compare_at_price! - product.price)}
                    </span>
                  )}
                </div>

                {/* Short description */}
                <p className="text-gray-400 mb-8">{product.short_description}</p>

                {/* Color selector */}
                {colors.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-white">Color</span>
                      {selectedColor && (
                        <span className="text-sm text-gray-400">{selectedColor}</span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color!)}
                          className={cn(
                            'w-10 h-10 rounded-full border-2 transition-all',
                            selectedColor === color
                              ? 'border-white scale-110'
                              : 'border-transparent hover:border-gray-500'
                          )}
                          style={{
                            backgroundColor: color?.toLowerCase() === 'white' ? '#ffffff' : '#000000',
                          }}
                          title={color}
                        >
                          {selectedColor === color && (
                            <Check className={cn(
                              'h-5 w-5 mx-auto',
                              color?.toLowerCase() === 'white' ? 'text-black' : 'text-white'
                            )} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size selector */}
                {sizes.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-white">Size</span>
                      <button className="text-sm text-gray-400 hover:text-white underline">
                        Size guide
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {sizes.map((size) => {
                        const variant = variants.find(
                          (v) =>
                            v.options?.find((o) => o.name === 'Size')?.value === size &&
                            (selectedColor
                              ? v.options?.find((o) => o.name === 'Color')?.value === selectedColor
                              : true)
                        );
                        const inStock = variant ? variant.quantity > 0 : true;

                        return (
                          <button
                            key={size}
                            onClick={() => inStock && setSelectedSize(size!)}
                            disabled={!inStock}
                            className={cn(
                              'min-w-[60px] h-12 px-4 rounded-lg border transition-all font-medium',
                              selectedSize === size
                                ? 'bg-white text-black border-white'
                                : inStock
                                ? 'bg-transparent text-white border-primary-700 hover:border-white'
                                : 'bg-transparent text-gray-600 border-primary-800 cursor-not-allowed line-through'
                            )}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Accessory Selection - Solo para conjuntos con accesorios */}
                {product.is_set && product.accessories && product.accessories.length > 0 && (
                  <div className="mb-8 p-6 bg-primary-900 rounded-xl border border-primary-800">
                    <div className="mb-4">
                      <span className="text-sm font-medium text-white block mb-2">Accesorios Opcionales</span>
                      <p className="text-xs text-gray-400">Selecciona los accesorios que deseas agregar al conjunto</p>
                    </div>
                    <div className="space-y-3">
                      {product.accessories.map((accessory, index) => {
                        const isSelected = selectedAccessories.includes(accessory.type);
                        return (
                          <label key={index} className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg hover:bg-primary-800/50 transition-colors">
                            <div className={cn(
                              'relative w-12 h-6 rounded-full transition-colors',
                              isSelected ? 'bg-emerald-500' : 'bg-white/20'
                            )}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAccessories([...selectedAccessories, accessory.type]);
                                  } else {
                                    setSelectedAccessories(selectedAccessories.filter(t => t !== accessory.type));
                                  }
                                }}
                                className="sr-only"
                              />
                              <div className={cn(
                                'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                                isSelected ? 'left-7' : 'left-1'
                              )} />
                            </div>
                            <div className="flex-1">
                              <span className="text-sm text-gray-300 group-hover:text-white transition-colors capitalize">
                                {accessory.type}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-white">
                              +{formatCurrency(accessory.price)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {selectedAccessories.length > 0 && (
                      <p className="text-xs text-emerald-400 mt-4 pt-3 border-t border-primary-800">
                        ✓ El conjunto incluirá: camisa, pantalón y {selectedAccessories.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {/* Quantity */}
                <div className="mb-8">
                  <span className="text-sm font-medium text-white block mb-3">Cantidad</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-primary-900 rounded-lg">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-3 text-gray-400 hover:text-white transition-colors"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <span className="w-12 text-center text-white font-medium">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-3 text-gray-400 hover:text-white transition-colors"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                    {selectedVariant && (
                      <span className="text-sm text-gray-400">
                        {selectedVariant.quantity} en stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 mb-8">
                  <Button
                    onClick={handleAddToCart}
                    className="flex-1"
                    size="lg"
                    disabled={!isInStock}
                    leftIcon={<ShoppingBag className="h-5 w-5" />}
                  >
                    {isInStock ? 'Añadir al carrito' : 'Sin stock'}
                  </Button>
                  <IconButton
                    onClick={() => {
                      if (!isAuthenticated || !userId) {
                        navigate('/login', { state: { from: { pathname: window.location.pathname } } });
                        return;
                      }
                      toggle(product.id);
                    }}
                    className={cn(
                      'h-14 w-14 border border-primary-700',
                      isWishlisted && 'bg-red-500 border-red-500'
                    )}
                  >
                    <Heart className={cn('h-6 w-6', isWishlisted && 'fill-current')} />
                  </IconButton>
                  <IconButton
                    onClick={handleShare}
                    className="h-14 w-14 border border-primary-700"
                  >
                    <Share2 className="h-6 w-6" />
                  </IconButton>
                </div>

                {/* Benefits */}
                <div className="grid grid-cols-2 gap-4 p-6 bg-primary-900 rounded-xl mb-8">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-300">Envío gratis sobre $100</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-300">Secure checkout</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-300">30-day returns</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-300">Quality guaranteed</span>
                  </div>
                </div>

                {/* Product Information */}
                <div className="space-y-2 mb-8">
                  {/* SKU */}
                  {product.sku && (
                    <p className="text-sm text-gray-500">
                      SKU: <span className="text-gray-400">{selectedVariant?.sku || product.sku}</span>
                    </p>
                  )}
                  
                  {/* Additional product info */}
                  {(product.material || product.weight) && (
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {product.material && (
                        <span>Material: <span className="text-gray-400">{product.material}</span></span>
                      )}
                      {product.weight && (
                        <span>Peso: <span className="text-gray-400">{product.weight}g</span></span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Description & Reviews tabs */}
      <section className="py-16 bg-primary-950">
        <div className="container mx-auto px-6">
          {/* Tabs */}
          <div className="flex gap-8 border-b border-primary-800 mb-8">
            <button
              onClick={() => setActiveTab('description')}
              className={cn(
                'pb-4 text-lg font-medium transition-colors relative',
                activeTab === 'description' ? 'text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              Descripción
              {activeTab === 'description' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={cn(
                'pb-4 text-lg font-medium transition-colors relative',
                activeTab === 'reviews' ? 'text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              Reviews {reviews.length > 0 && `(${reviews.length})`}
              {activeTab === 'reviews' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                />
              )}
            </button>
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {activeTab === 'description' ? (
              <motion.div
                key="description"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="prose prose-invert max-w-none"
              >
                <div className="whitespace-pre-line text-gray-300 leading-relaxed">
                  {product.description}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="reviews"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {reviews.length > 0 ? (
                  <>
                    {/* Reviews summary */}
                    <div className="flex items-center gap-8 mb-8 p-6 bg-primary-900 rounded-xl">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-white mb-2">{averageRating.toFixed(1)}</div>
                        <div className="flex justify-center gap-1 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                'h-4 w-4',
                                i < Math.round(averageRating)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-600'
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-gray-400">{reviews.length} reviews</p>
                      </div>
                      <div className="flex-1">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = reviews.filter((r: any) => r.rating === rating).length;
                          const percentage = (count / reviews.length) * 100;
                          return (
                            <div key={rating} className="flex items-center gap-3 mb-1">
                              <span className="text-sm text-gray-400 w-8">{rating}</span>
                              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                              <div className="flex-1 h-2 bg-primary-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-yellow-400 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-400 w-8">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reviews list */}
                    <div className="space-y-6">
                      {reviews.map((review: any) => {
                        const userName = review.user?.full_name || review.user || 'Anonymous';
                        const userInitial = userName[0]?.toUpperCase() || 'A';
                        return (
                          <div key={review.id} className="p-6 bg-primary-900 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-800 rounded-full flex items-center justify-center text-white font-medium">
                                  {userInitial}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{userName}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={cn(
                                          'h-3 w-3',
                                          i < (review.rating || 0)
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-600'
                                        )}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <span className="text-sm text-gray-500">
                                {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                              </span>
                            </div>
                            {review.title && <h4 className="font-medium text-white mb-2">{review.title}</h4>}
                            <p className="text-gray-400">{review.content || review.text || ''}</p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-lg mb-4">No reviews yet</p>
                    <p className="text-gray-500">Be the first to review this product!</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Related products */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-6">
          <AnimatedSection animation="fadeUp">
            <h2 className="text-3xl font-bold text-white mb-8">You May Also Like</h2>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((product) => (
              <StaggerItem key={product.id}>
                <ProductCard product={product} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </div>
  );
}
