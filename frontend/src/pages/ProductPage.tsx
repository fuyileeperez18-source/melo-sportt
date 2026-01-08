import { useState, useRef } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

import { AnimatedSection, StaggerContainer, StaggerItem } from '@/components/animations/AnimatedSection';
import { Button, IconButton } from '@/components/ui/Button';
import { ProductCard } from '@/components/ui/ProductCard';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useToggleWishlist, useWishlistIds } from '@/hooks/useWishlist';
import { cn, formatCurrency, calculateDiscount } from '@/lib/utils';
import type { Product, ProductVariant } from '@/types';

// Mock product data - replace with Supabase query
const mockProduct: Product = {
  id: '1',
  name: 'Essential Cotton Tee',
  slug: 'essential-cotton-tee',
  description: `Our Essential Cotton Tee is crafted from 100% premium organic cotton, offering unmatched comfort and durability. The relaxed fit and soft fabric make it perfect for everyday wear.

Features:
• 100% Organic Cotton
• Pre-shrunk fabric
• Reinforced stitching
• Classic crew neck
• Available in multiple colors

Care Instructions:
Machine wash cold with similar colors. Tumble dry low. Do not bleach. Iron on low heat if needed.`,
  short_description: 'Premium organic cotton t-shirt with a relaxed fit',
  price: 49.00,
  compare_at_price: 65.00,
  sku: 'ECT-001',
  quantity: 100,
  track_quantity: true,
  continue_selling_when_out_of_stock: false,
  category_id: '1',
  category: { id: '1', name: 'T-Shirts', slug: 't-shirts', position: 1, is_active: true },
  brand: 'WALMER',
  tags: ['essential', 'cotton', 'new', 'organic'],
  images: [
    { id: '1', product_id: '1', url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200', alt_text: 'Cotton Tee Front', position: 1, is_primary: true },
    { id: '2', product_id: '1', url: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=1200', alt_text: 'Cotton Tee Back', position: 2, is_primary: false },
    { id: '3', product_id: '1', url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200', alt_text: 'Cotton Tee Detail', position: 3, is_primary: false },
    { id: '4', product_id: '1', url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200', alt_text: 'Cotton Tee Lifestyle', position: 4, is_primary: false },
  ],
  variants: [
    { id: 'v1', product_id: '1', name: 'Small / White', sku: 'ECT-001-S-W', price: 49.00, quantity: 25, options: [{ name: 'Size', value: 'S' }, { name: 'Color', value: 'White' }], is_active: true },
    { id: 'v2', product_id: '1', name: 'Medium / White', sku: 'ECT-001-M-W', price: 49.00, quantity: 30, options: [{ name: 'Size', value: 'M' }, { name: 'Color', value: 'White' }], is_active: true },
    { id: 'v3', product_id: '1', name: 'Large / White', sku: 'ECT-001-L-W', price: 49.00, quantity: 20, options: [{ name: 'Size', value: 'L' }, { name: 'Color', value: 'White' }], is_active: true },
    { id: 'v4', product_id: '1', name: 'XL / White', sku: 'ECT-001-XL-W', price: 49.00, quantity: 15, options: [{ name: 'Size', value: 'XL' }, { name: 'Color', value: 'White' }], is_active: true },
    { id: 'v5', product_id: '1', name: 'Small / Black', sku: 'ECT-001-S-B', price: 49.00, quantity: 20, options: [{ name: 'Size', value: 'S' }, { name: 'Color', value: 'Black' }], is_active: true },
    { id: 'v6', product_id: '1', name: 'Medium / Black', sku: 'ECT-001-M-B', price: 49.00, quantity: 25, options: [{ name: 'Size', value: 'M' }, { name: 'Color', value: 'Black' }], is_active: true },
    { id: 'v7', product_id: '1', name: 'Large / Black', sku: 'ECT-001-L-B', price: 49.00, quantity: 18, options: [{ name: 'Size', value: 'L' }, { name: 'Color', value: 'Black' }], is_active: true },
    { id: 'v8', product_id: '1', name: 'XL / Black', sku: 'ECT-001-XL-B', price: 49.00, quantity: 12, options: [{ name: 'Size', value: 'XL' }, { name: 'Color', value: 'Black' }], is_active: true },
  ],
  is_active: true,
  is_featured: true,
  seo_title: 'Essential Cotton Tee | WALMER Store',
  seo_description: 'Premium organic cotton t-shirt with relaxed fit. Perfect for everyday wear.',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const relatedProducts: Product[] = [
  {
    id: '2',
    name: 'Urban Denim Jacket',
    slug: 'urban-denim-jacket',
    description: 'Classic denim jacket',
    short_description: 'Classic denim',
    price: 189.00,
    sku: 'UDJ-001',
    quantity: 50,
    track_quantity: true,
    continue_selling_when_out_of_stock: false,
    category_id: '2',
    category: { id: '2', name: 'Jackets', slug: 'jackets', position: 2, is_active: true },
    tags: ['denim', 'urban'],
    images: [{ id: '2', product_id: '2', url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800', alt_text: 'Denim Jacket', position: 1, is_primary: true }],
    variants: [],
    is_active: true,
    is_featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Slim Fit Chinos',
    slug: 'slim-fit-chinos',
    description: 'Comfortable slim fit chinos',
    short_description: 'Slim fit',
    price: 89.00,
    sku: 'SFC-001',
    quantity: 75,
    track_quantity: true,
    continue_selling_when_out_of_stock: false,
    category_id: '3',
    category: { id: '3', name: 'Pants', slug: 'pants', position: 3, is_active: true },
    tags: ['chinos', 'slim'],
    images: [{ id: '3', product_id: '3', url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800', alt_text: 'Chinos', position: 1, is_primary: true }],
    variants: [],
    is_active: true,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Premium Leather Belt',
    slug: 'premium-leather-belt',
    description: 'Genuine leather belt',
    short_description: 'Genuine leather',
    price: 59.00,
    compare_at_price: 79.00,
    sku: 'PLB-001',
    quantity: 120,
    track_quantity: true,
    continue_selling_when_out_of_stock: false,
    category_id: '4',
    category: { id: '4', name: 'Accessories', slug: 'accessories', position: 4, is_active: true },
    tags: ['leather', 'accessory'],
    images: [{ id: '4', product_id: '4', url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', alt_text: 'Leather Belt', position: 1, is_primary: true }],
    variants: [],
    is_active: true,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Graphic Print Hoodie',
    slug: 'graphic-print-hoodie',
    description: 'Street style hoodie',
    short_description: 'Street style',
    price: 79.00,
    sku: 'GPH-001',
    quantity: 60,
    track_quantity: true,
    continue_selling_when_out_of_stock: false,
    category_id: '1',
    category: { id: '1', name: 'T-Shirts', slug: 't-shirts', position: 1, is_active: true },
    tags: ['hoodie', 'street'],
    images: [{ id: '5', product_id: '5', url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800', alt_text: 'Hoodie', position: 1, is_primary: true }],
    variants: [],
    is_active: true,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const reviews = [
  { id: 1, user: 'John D.', rating: 5, title: 'Perfect fit!', content: 'This tee fits perfectly and the fabric is so soft. Will definitely buy more colors.', date: '2025-01-15', verified: true },
  { id: 2, user: 'Sarah M.', rating: 4, title: 'Great quality', content: 'Love the quality of this shirt. Only wish it came in more colors.', date: '2025-01-10', verified: true },
  { id: 3, user: 'Mike R.', rating: 5, title: 'Best tee I own', content: 'The organic cotton is amazing. So comfortable for everyday wear.', date: '2025-01-05', verified: true },
];

export function ProductPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [isZoomed, setIsZoomed] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  const { user, profile, isAuthenticated } = useAuthStore();
  const currentUser = user || profile;
  const userId = currentUser?.id;

  // In real app, fetch product by slug from Supabase
  const product = mockProduct;

  const { data: wishlistIds } = useWishlistIds(userId);
  const { toggle } = useToggleWishlist(userId);
  const isWishlisted = !!wishlistIds?.includes(product.id);

  // Extract unique sizes and colors from variants
  const sizes = [...new Set(product.variants.map((v) => v.options.find((o) => o.name === 'Size')?.value).filter(Boolean))];
  const colors = [...new Set(product.variants.map((v) => v.options.find((o) => o.name === 'Color')?.value).filter(Boolean))];

  // Find selected variant
  const selectedVariant = product.variants.find(
    (v) =>
      v.options.find((o) => o.name === 'Size')?.value === selectedSize &&
      v.options.find((o) => o.name === 'Color')?.value === selectedColor
  );

  const discount = product.compare_at_price
    ? calculateDiscount(product.compare_at_price, product.price)
    : 0;

  const isInStock = selectedVariant ? selectedVariant.quantity > 0 : product.quantity > 0;

  const handleAddToCart = () => {
    if (sizes.length > 0 && !selectedSize) {
      toast.error('Please select a size');
      return;
    }
    if (colors.length > 0 && !selectedColor) {
      toast.error('Please select a color');
      return;
    }

    addItem(product, quantity, selectedVariant || undefined);
    toast.success('Added to cart!');
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

  const averageRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;

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
            {product.category?.name}
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
                    {product.images.map((image) => (
                      <SwiperSlide key={image.id}>
                        <div className="swiper-zoom-container h-full">
                          <img
                            src={image.url}
                            alt={image.alt_text}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </SwiperSlide>
                    ))}
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
                        FEATURED
                      </span>
                    )}
                  </div>

                  {/* Zoom hint */}
                  <div className="absolute bottom-4 right-4 z-10">
                    <span className="flex items-center gap-1 px-3 py-1 bg-black/50 backdrop-blur text-white text-xs rounded-full">
                      <ZoomIn className="h-3 w-3" /> Pinch to zoom
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
                  {product.images.map((image) => (
                    <SwiperSlide key={image.id}>
                      <div className="aspect-square bg-primary-900 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-white transition-colors">
                        <img
                          src={image.url}
                          alt={image.alt_text}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </AnimatedSection>

            {/* Product info */}
            <AnimatedSection animation="fadeUp" delay={0.2}>
              <div>
                {/* Brand & category */}
                <div className="flex items-center gap-4 mb-2">
                  {product.brand && (
                    <span className="text-sm text-gray-400">{product.brand}</span>
                  )}
                  <span className="text-sm text-gray-500">|</span>
                  <Link
                    to={`/shop?category=${product.category?.slug}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {product.category?.name}
                  </Link>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  {product.name}
                </h1>

                {/* Rating */}
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

                {/* Price */}
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-3xl font-bold text-white">
                    {formatCurrency(selectedVariant?.price || product.price)}
                  </span>
                  {product.compare_at_price && (
                    <span className="text-xl text-gray-500 line-through">
                      {formatCurrency(product.compare_at_price)}
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
                        const variant = product.variants.find(
                          (v) =>
                            v.options.find((o) => o.name === 'Size')?.value === size &&
                            (selectedColor
                              ? v.options.find((o) => o.name === 'Color')?.value === selectedColor
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

                {/* Quantity */}
                <div className="mb-8">
                  <span className="text-sm font-medium text-white block mb-3">Quantity</span>
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
                        {selectedVariant.quantity} in stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 mb-8">
                  <Button
                    onClick={handleAddToCart}
                    disabled={!isInStock}
                    className="flex-1"
                    size="lg"
                    leftIcon={<ShoppingBag className="h-5 w-5" />}
                  >
                    {isInStock ? 'Add to Cart' : 'Out of Stock'}
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
                    <span className="text-sm text-gray-300">Free shipping over $100</span>
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

                {/* SKU */}
                <p className="text-sm text-gray-500">
                  SKU: {selectedVariant?.sku || product.sku}
                </p>
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
              Description
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
              Reviews ({reviews.length})
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
                      const count = reviews.filter((r) => r.rating === rating).length;
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
                  {reviews.map((review) => (
                    <div key={review.id} className="p-6 bg-primary-900 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-800 rounded-full flex items-center justify-center text-white font-medium">
                            {review.user[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{review.user}</span>
                              {review.verified && (
                                <span className="text-xs text-green-400 flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Verified
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    'h-3 w-3',
                                    i < review.rating
                                      ? 'text-yellow-400 fill-yellow-400'
                                      : 'text-gray-600'
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{review.date}</span>
                      </div>
                      <h4 className="font-medium text-white mb-2">{review.title}</h4>
                      <p className="text-gray-400">{review.content}</p>
                    </div>
                  ))}
                </div>
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
