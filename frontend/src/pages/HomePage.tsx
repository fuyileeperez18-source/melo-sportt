import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Star, Truck, Shield, RefreshCw, Headphones, ShoppingBag, MapPin, Clock, Phone, Navigation } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';

import { AnimatedSection, StaggerContainer, StaggerItem } from '@/components/animations/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/ui/ProductCard';
import { useFeaturedProducts } from '@/hooks/useProducts';
import { formatCategoryName } from '@/lib/utils';
import type { Category } from '@/types';

// Mock data - replace with real data from Supabase
const heroSlides = [
  {
    id: 1,
    title: 'Nueva Temporada',
    subtitle: 'Descubre las últimas tendencias',
    cta: 'Ver Colección',
    image: 'https://res.cloudinary.com/dpqtlalhr/image/upload/v1768413330/WhatsApp_Image_2026-01-13_at_12.40.52_PM_1_rmu3e9.jpg',
  },
  {
    id: 2,
    title: 'Esenciales Minimalistas',
    subtitle: 'Piezas atemporales para tu guardarropa',
    cta: 'Explorar Ahora',
    image: 'https://res.cloudinary.com/dpqtlalhr/image/upload/v1768413683/WhatsApp_Image_2026-01-14_at_1.01.06_PM_wwlf8z.jpg',
  },
  {
    id: 3,
    title: 'Estilo Urbano',
    subtitle: 'Moda urbana redefinida',
    cta: 'Comprar Ahora',
    image: 'https://res.cloudinary.com/dpqtlalhr/image/upload/v1768413731/WhatsApp_Image_2026-01-14_at_1.01.06_PM_1_qurdmt.jpg',
  },
];

// Categories will be loaded from database
const defaultCategories: (Category & { products_count: number })[] = [
  { id: '1', name: 'Conjuntos', slug: 'conjuntos', image_url: 'https://res.cloudinary.com/dpqtlalhr/image/upload/v1768417400/image_ku83qt.jpg', products_count: 0, position: 1, is_active: true },
  { id: '2', name: 'Camisas', slug: 'camisas', image_url: 'https://res.cloudinary.com/dpqtlalhr/image/upload/v1768418099/image_1_q3noez.jpg', products_count: 0, position: 2, is_active: true },
  { id: '3', name: 'Shorts', slug: 'shorts', image_url: 'https://res.cloudinary.com/dpqtlalhr/image/upload/v1768418503/image_2_wju1da.jpg', products_count: 0, position: 3, is_active: true },
  { id: '4', name: 'Pantalones', slug: 'pantalones', image_url: 'https://res.cloudinary.com/dpqtlalhr/image/upload/v1768421117/image_6_c6rosv.jpg', products_count: 0, position: 4, is_active: true },
  { id: '5', name: 'Zapatos', slug: 'zapatos', image_url: 'https://res.cloudinary.com/dpqtlalhr/image/upload/v1768418641/image_4_kscxfq.jpg', products_count: 0, position: 5, is_active: true },
  { id: '6', name: 'Accesorios', slug: 'accesorios', image_url: 'https://res.cloudinary.com/dpqtlalhr/image/upload/v1768418854/image_5_n4fcf4.jpg', products_count: 0, position: 6, is_active: true },
];

const benefits = [
  { icon: Truck, title: 'Envío Gratis', description: 'En compras mayores a $250.000' },
  { icon: Shield, title: 'Pago Seguro', description: 'Checkout 100% seguro' },
  { icon: RefreshCw, title: 'Devoluciones Fáciles', description: 'Política de 30 días' },
  { icon: Headphones, title: 'Soporte 24/7', description: 'Siempre listos para ayudarte' },
];

const testimonials = [
  { id: 1, name: 'María G.', rating: 5, text: '¡Excelente calidad y envío súper rápido! Definitivamente volveré a comprar.', avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
  { id: 2, name: 'Carlos R.', rating: 5, text: 'La mejor tienda de moda que he encontrado. Me encanta el estilo minimalista.', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
  { id: 3, name: 'Andrea P.', rating: 5, text: 'El servicio al cliente fue excelente. Me ayudaron a encontrar el outfit perfecto.', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
];

export function HomePage() {
  const navigate = useNavigate();
  // Usar directamente las categorías default con las imágenes de Cloudinary
  const categories = defaultCategories;
  const loadingCategories = false;
  const { data: featuredProducts, isLoading: loadingFeatured } = useFeaturedProducts();

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative h-screen">
        {/* Background Swiper - sin parallax */}
        <div className="absolute inset-0">
          <Swiper
            modules={[Autoplay, EffectFade, Pagination]}
            effect="fade"
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            loop
            className="h-full"
          >
            {heroSlides.map((slide) => (
              <SwiperSlide key={slide.id}>
                <div className="relative h-full">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Hero content - sin fade out al scroll */}
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-block px-4 py-1 bg-white/10 backdrop-blur text-white text-sm font-medium rounded-full mb-6"
              >
                Nueva Colección 2025
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-5xl md:text-7xl font-bold text-gray-50 mb-6 leading-tight drop-shadow-lg"
              >
                Descubre Tu Estilo
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-xl text-gray-300 mb-8 max-w-lg"
              >
                Explora nuestra colección de moda deportiva y ropa urbana de alta calidad.
                Encuentra el estilo que mejor se adapta a tu personalidad.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex flex-wrap gap-4"
              >
                <motion.button
                  onClick={() => navigate('/shop')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-black font-bold rounded-full overflow-hidden border-4 border-white shadow-[0_0_40px_rgba(255,255,255,0.8),0_10px_60px_rgba(255,255,255,0.6),0_0_0_4px_rgba(0,0,0,0.8)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(255,255,255,0.9),0_15px_80px_rgba(255,255,255,0.7),0_0_0_4px_rgba(0,0,0,0.9)] backdrop-blur-sm"
                >
                  <span className="relative z-10 flex items-center gap-2 text-xl">
                    <ShoppingBag className="h-6 w-6" />
                    Comprar Ahora
                    <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-white to-gray-50 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                </motion.button>
                <Button variant="outline" leftIcon={<Play className="h-4 w-4" />}>
                  Ver Lookbook
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center"
          >
            <motion.div className="w-1.5 h-3 bg-white rounded-full mt-2" />
          </motion.div>
        </motion.div>
      </section>

      {/* Marquee Banner */}
      <section className="py-4 bg-white text-black overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="mx-8 text-sm font-medium flex items-center gap-8">
              <span>ENVÍO GRATIS EN COMPRAS MAYORES A $250.000</span>
              <Star className="h-4 w-4 fill-black" />
              <span>NUEVOS PRODUCTOS CADA SEMANA</span>
              <Star className="h-4 w-4 fill-black" />
              <span>30 DÍAS DE DEVOLUCIÓN</span>
              <Star className="h-4 w-4 fill-black" />
              <span>PAGO SEGURO</span>
              <Star className="h-4 w-4 fill-black" />
            </span>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-6">
          <AnimatedSection animation="fadeUp">
            <div className="text-center mb-16">
              <span className="text-sm text-gray-400 uppercase tracking-wider">Explora por</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mt-2">Categorías</h2>
            </div>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {categories.map((category) => (
              <StaggerItem key={category.id}>
                <Link to={`/shop?category=${category.slug}`} className="group">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-primary-900"
                  >
                    {category.image_url && category.image_url.trim() !== '' ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={(e) => {
                          // Fallback si la imagen falla al cargar
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.parentElement?.querySelector('.category-fallback') as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <div className="category-fallback flex absolute inset-0 bg-gradient-to-br from-primary-800 to-primary-900 items-center justify-center">
                        <div className="text-center">
                          <ShoppingBag className="h-16 w-16 text-white/30 mx-auto mb-4" />
                          <p className="text-white/50 text-sm">{formatCategoryName(category.name)}</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <h3 className="text-2xl font-bold text-white mb-1">{formatCategoryName(category.name)}</h3>
                      <p className="text-gray-300 text-sm">
                        {loadingCategories ? (
                          <span className="inline-block w-8 h-4 bg-white/20 animate-pulse rounded" />
                        ) : (
                          `${category.products_count} Productos`
                        )}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* More categories message */}
          <AnimatedSection animation="fadeUp">
            <div className="mt-12 text-center">
              <p className="text-gray-400 text-lg mb-6">¡Tenemos más categorías disponibles para ti!!</p>
              <motion.button
                onClick={() => navigate('/shop')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-full border-2 border-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Ver más categorías
                <ArrowRight className="h-5 w-5" />
              </motion.button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-primary-950">
        <div className="container mx-auto px-6">
          <AnimatedSection animation="fadeUp">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16">
              <div>
                <span className="text-sm text-gray-400 uppercase tracking-wider">Nuestra Selección</span>
                <h2 className="text-4xl md:text-5xl font-bold text-white mt-2">Productos Destacados</h2>
              </div>
              <Link
                to="/shop"
                className="mt-4 md:mt-0 inline-flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
              >
                Ver Todo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loadingFeatured ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, index) => (
                <AnimatedSection key={index} animation="fadeUp" delay={index * 0.1}>
                  <div className="bg-primary-900 rounded-2xl overflow-hidden animate-pulse">
                    <div className="aspect-[3/4] bg-primary-800" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-primary-800 rounded w-3/4" />
                      <div className="h-4 bg-primary-800 rounded w-1/2" />
                    </div>
                  </div>
                </AnimatedSection>
              ))
            ) : featuredProducts && featuredProducts.length > 0 ? (
              featuredProducts.slice(0, 8).map((product, index) => (
                <AnimatedSection
                  key={product.id}
                  animation="fadeUp"
                  delay={index * 0.1}
                >
                  <ProductCard product={product} />
                </AnimatedSection>
              ))
            ) : (
              // Fallback cuando no hay productos destacados
              <div className="col-span-4 text-center py-12">
                <p className="text-gray-400 mb-4">No hay productos destacados disponibles</p>
                <Button onClick={() => navigate('/shop')} leftIcon={<ShoppingBag className="h-4 w-4" />}>
                  Ver Todos los Productos
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Split Banner */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Banner */}
            <AnimatedSection animation="slideLeft">
              <Link to="/shop?gender=hombre" className="block">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-primary-900"
                >
                  <img
                    src="https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800"
                    alt="Colección Hombre"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
                  <div className="absolute inset-0 flex items-center p-8">
                    <div>
                      <span className="text-sm text-gray-300 uppercase tracking-wider">Nuevo</span>
                      <h3 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">Colección Hombre</h3>
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-transparent text-white border-2 border-white rounded-full font-medium hover:bg-white hover:text-black transition-all duration-300"
                      >
                        Ver Hombre
                        <ArrowRight className="h-4 w-4" />
                      </motion.span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </AnimatedSection>

            {/* Right Banner */}
            <AnimatedSection animation="slideRight">
              <Link to="/shop?gender=mujer" className="block">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-primary-900"
                >
                  <img
                    src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800"
                    alt="Colección Mujer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
                  <div className="absolute inset-0 flex items-center p-8">
                    <div>
                      <span className="text-sm text-gray-300 uppercase tracking-wider">Tendencia</span>
                      <h3 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">Colección Mujer</h3>
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-transparent text-white border-2 border-white rounded-full font-medium hover:bg-white hover:text-black transition-all duration-300"
                      >
                        Ver Mujer
                        <ArrowRight className="h-4 w-4" />
                      </motion.span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <AnimatedSection key={benefit.title} animation="fadeUp" delay={index * 0.1}>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-black text-white rounded-full mb-4">
                    <benefit.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-black mb-1">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm">{benefit.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-primary-950">
        <div className="container mx-auto px-6">
          <AnimatedSection animation="fadeUp">
            <div className="text-center mb-16">
              <span className="text-sm text-gray-400 uppercase tracking-wider">Testimonios</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mt-2">Lo Que Dicen Nuestros Clientes</h2>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <AnimatedSection key={testimonial.id} animation="fadeUp" delay={index * 0.15}>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-primary-900 rounded-2xl p-8 border border-primary-800"
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6">&ldquo;{testimonial.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <span className="font-medium text-white">{testimonial.name}</span>
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram Feed */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-6">
          <AnimatedSection animation="fadeUp">
            <div className="text-center mb-16">
              <span className="text-sm text-gray-400 uppercase tracking-wider">Síguenos</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mt-2">@MeloSportt</h2>
            </div>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <StaggerItem key={i}>
                <motion.a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  className="block aspect-square overflow-hidden rounded-lg bg-primary-900"
                >
                  <img
                    src={`https://picsum.photos/400/400?random=${i}`}
                    alt={`Post de Instagram ${i}`}
                    className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                  />
                </motion.a>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-24 bg-primary-950">
        <div className="container mx-auto px-6">
          <AnimatedSection animation="fadeUp">
            <div className="text-center mb-16">
              <span className="text-sm text-gray-400 uppercase tracking-wider">Visítanos</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mt-2">Encuéntranos</h2>
            </div>
          </AnimatedSection>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Map Container */}
            <AnimatedSection animation="slideLeft">
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-primary-800"
              >
                {/* Street View iframe with fallback */}
                <div className="relative w-full h-[450px] bg-primary-900">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!4v1767125254299!6m8!1m7!1s1XMT5bRvBnHCpslJ_lwVWw!2m2!1d10.43711374619797!2d-75.51578191333984!3f177.19962735201298!4f-0.36276961538061414!5f0.7820865974627469"
                    width="100%"
                    height="100%"
                    style={{ border: 0, position: 'absolute', inset: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Street View - Melo Sportt"
                    onError={(e) => {
                      // Fallback to static image if embed fails
                      const target = e.target as HTMLIFrameElement;
                      target.style.display = 'none';
                      const fallback = target.parentElement?.querySelector('.map-fallback') as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  {/* Fallback placeholder when embed fails */}
                  <div className="map-fallback hidden absolute inset-0 bg-gradient-to-br from-primary-800 to-primary-900 flex-col items-center justify-center text-center p-6">
                    <MapPin className="h-12 w-12 text-white/50 mb-4" />
                    <p className="text-white font-semibold text-lg">Nuestra Tienda</p>
                    <p className="text-gray-400 text-sm mt-2">
                      741 Cra. 17, Cartagena de Indias<br />
                      Barrio San Francisco, cerca de la Urbanización Portal del Virrey
                    </p>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=10.43711374619797,-75.51578191333984"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                      Ver en Google Maps
                    </a>
                  </div>
                </div>
              </motion.div>
            </AnimatedSection>

            {/* Location Info */}
            <AnimatedSection animation="slideRight">
              <div className="space-y-8">
                <div>
                  <h3 className="text-3xl font-bold text-white mb-4">Nuestra Tienda Física</h3>
                  <p className="text-gray-400 text-lg">
                    Visítanos en nuestro local y descubre toda nuestra colección en persona.
                    Te esperamos para brindarte la mejor atención personalizada.
                  </p>
                </div>

                {/* Address */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4 p-6 bg-primary-900/50 rounded-xl border border-primary-800"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-black" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg mb-1">Dirección</h4>
                    <p className="text-gray-400">
                      741 Cra. 17, Cartagena de Indias, Bolívar<br />
                      <span className="text-gray-500 text-sm">Barrio San Francisco, cerca de la Urbanización Portal del Virrey</span>
                    </p>
                  </div>
                </motion.div>

                {/* Hours */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="flex items-start gap-4 p-6 bg-primary-900/50 rounded-xl border border-primary-800"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <Clock className="h-6 w-6 text-black" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg mb-1">Horarios de Atención</h4>
                    <div className="text-gray-400 space-y-1">
                      <p>Lunes - Sábado: 9:00 AM - 7:00 PM</p>
                      <p>Domingos: 10:00 AM - 5:00 PM</p>
                    </div>
                  </div>
                </motion.div>

                {/* Phone */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="flex items-start gap-4 p-6 bg-primary-900/50 rounded-xl border border-primary-800"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <Phone className="h-6 w-6 text-black" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg mb-1">Contáctanos</h4>
                    <p className="text-gray-400">
                      +57 304 415 5473<br />
                      <span className="text-gray-500 text-sm">WhatsApp disponible</span>
                    </p>
                  </div>
                </motion.div>

                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  <a
                    href="https://www.google.com/maps/dir//10.4371137,-75.5157819/@10.4371137,-75.5157819,17z"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-full border-2 border-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                  >
                    <Navigation className="h-5 w-5" />
                    Cómo Llegar
                  </a>
                </motion.div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1445205170230-053b83016050?w=1920"
            alt="Fondo CTA"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
        </div>

        <div className="relative container mx-auto px-6 text-center">
          <AnimatedSection animation="scale">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Únete a la Familia MELO SPORTT
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Sé el primero en conocer nuevas colecciones, ofertas exclusivas y consejos de estilo.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-full border-2 border-white shadow-lg shadow-white/20 transition-all duration-300 hover:shadow-xl hover:shadow-white/30"
            >
              <span className="flex items-center gap-2">
                Suscríbete Ahora
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </motion.button>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
