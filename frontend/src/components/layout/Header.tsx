import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShoppingBag,
  User,
  Menu,
  X,
  Heart,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { IconButton } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';

const navigation = [
  { name: 'Inicio', href: '/' },
  {
    name: 'Tienda',
    href: '/shop',
    children: [
      { name: 'Todos los Productos', href: '/shop' },
      { name: 'Nuevos Ingresos', href: '/shop?filter=new' },
      { name: 'Más Vendidos', href: '/shop?filter=best' },
      { name: 'Ofertas', href: '/shop?filter=sale' },
    ],
  },
  { name: 'Nosotros', href: '/about' },
  { name: 'Contacto', href: '/contact' },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const { items, toggleCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const { isMobileMenuOpen, toggleMobileMenu, isSearchOpen, toggleSearch, closeSearch } = useUIStore();

  const cartItemsCount = items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    if (isMobileMenuOpen) {
      toggleMobileMenu();
    }
    closeSearch();
  }, [location.pathname]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/shop?search=${encodeURIComponent(query)}`);
      closeSearch();
    }
  };

  return (
    <>
      <motion.header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 transition-all duration-500',
          isScrolled
            ? 'bg-black/95 backdrop-blur-lg shadow-lg'
            : 'bg-gradient-to-b from-black/70 to-transparent'
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Top bar */}
        <div className="hidden lg:block border-b border-white/10">
          <div className="container mx-auto px-6 py-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <p>Envío gratis en compras mayores a $200.000 COP</p>
              <div className="flex items-center gap-6">
                <Link to="/track-order" className="hover:text-white transition-colors">
                  Rastrear Pedido
                </Link>
                <Link to="/help" className="hover:text-white transition-colors">
                  Ayuda
                </Link>
                <span>COP $</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main header */}
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Mobile menu button */}
            <IconButton
              className="lg:hidden"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </IconButton>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <motion.div
                className="relative flex items-center gap-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <img
                  src="/logo.svg"
                  alt="MELO SPORTT"
                  className="h-10 md:h-12 w-auto"
                />
                <span className="text-xl md:text-2xl font-bold text-white tracking-wider">
                  MELO SPORTT
                </span>
                <motion.span
                  className="absolute -bottom-1 left-0 h-0.5 bg-white"
                  initial={{ width: '0%' }}
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navigation.map((item) => (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => setActiveDropdown(item.name)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center gap-1 text-sm font-medium transition-colors',
                      location.pathname === item.href
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    {item.name}
                    {item.children && (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Link>

                  {/* Dropdown */}
                  {item.children && (
                    <AnimatePresence>
                      {activeDropdown === item.name && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-0 pt-4"
                        >
                          <div className="bg-primary-900 border border-primary-800 rounded-xl shadow-2xl p-4 min-w-[200px]">
                            {item.children.map((child) => (
                              <Link
                                key={child.name}
                                to={child.href}
                                className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              <IconButton
                onClick={toggleSearch}
                aria-label="Search"
                className="text-white"
              >
                <Search className="h-5 w-5" />
              </IconButton>

              <IconButton
                onClick={() => navigate('/wishlist')}
                aria-label="Wishlist"
                className="text-white"
              >
                <Heart className="h-5 w-5" />
              </IconButton>

              <IconButton
                onClick={() => navigate(isAuthenticated ? '/account' : '/login')}
                aria-label="Account"
                className="text-white"
              >
                <User className="h-5 w-5" />
              </IconButton>

              <motion.button
                onClick={toggleCart}
                className="relative p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Cart"
              >
                <ShoppingBag className="h-5 w-5" />
                {cartItemsCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-5 w-5 bg-white text-black text-xs font-bold rounded-full flex items-center justify-center"
                  >
                    {cartItemsCount}
                  </motion.span>
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Search overlay */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/10 bg-black/95 backdrop-blur-lg"
            >
              <div className="container mx-auto px-6 py-6">
                <div className="max-w-2xl mx-auto">
                  <SearchInput
                    placeholder="Buscar productos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onSearch={handleSearch}
                    onClear={() => setSearchQuery('')}
                    autoFocus
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm lg:hidden"
              onClick={toggleMobileMenu}
            />
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed top-0 left-0 bottom-0 z-40 w-80 bg-primary-900 lg:hidden overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <img src="/logo.svg" alt="MELO SPORTT" className="h-8 w-auto" />
                    <span className="text-xl font-bold text-white">MELO SPORTT</span>
                  </div>
                  <IconButton onClick={toggleMobileMenu}>
                    <X className="h-6 w-6" />
                  </IconButton>
                </div>

                {/* Mobile search */}
                <div className="mb-8">
                  <SearchInput
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onSearch={handleSearch}
                    onClear={() => setSearchQuery('')}
                  />
                </div>

                {/* Mobile navigation */}
                <div className="space-y-2">
                  {navigation.map((item) => (
                    <div key={item.name}>
                      <Link
                        to={item.href}
                        className={cn(
                          'block py-3 text-lg font-medium transition-colors',
                          location.pathname === item.href
                            ? 'text-white'
                            : 'text-gray-400 hover:text-white'
                        )}
                      >
                        {item.name}
                      </Link>
                      {item.children && (
                        <div className="pl-4 mt-2 space-y-2">
                          {item.children.map((child) => (
                            <Link
                              key={child.name}
                              to={child.href}
                              className="block py-2 text-gray-500 hover:text-white transition-colors"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mobile actions */}
                <div className="mt-8 pt-8 border-t border-primary-800">
                  <div className="space-y-4">
                    <Link
                      to="/wishlist"
                      className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
                    >
                      <Heart className="h-5 w-5" />
                      Lista de Deseos
                    </Link>
                    <Link
                      to={isAuthenticated ? '/account' : '/login'}
                      className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
                    >
                      <User className="h-5 w-5" />
                      {isAuthenticated ? 'Mi Cuenta' : 'Iniciar Sesión'}
                    </Link>
                  </div>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div className="h-20 lg:h-28" />
    </>
  );
}
