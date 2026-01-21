import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Package,
  MapPin,
  Heart,
  Settings,
  LogOut,
  Edit3,
  Camera,
  Bell,
  ChevronRight,
  Shield,
  CreditCard,
  TrendingUp,
  Crown,
  Code,
  Star,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { userService, orderService, productService } from '@/lib/services';
import type { Order, Address, TeamMember, Product } from '@/types';
import { formatCurrency, calculateDiscount } from '@/lib/utils';
import { ProductCard } from '@/components/ui/ProductCard';
import { Button, IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function AccountPage() {
  const { user, profile, signOut, fetchProfile } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    setIsLoading(true);
    try {
      await fetchProfile();
      const [ordersData, profileData, productsData] = await Promise.all([
        orderService.getByUser(user.id).catch(() => []),
        userService.getProfile(user.id).catch(() => null),
        productService.getFeatured().catch(() => []),
      ]);
      setOrders(ordersData.slice(0, 3));
      if (profileData) {
        setAddresses(profileData.addresses || []);
        setTeamMember(profileData.team_member || null);
      }
      setFeaturedProducts(productsData.slice(0, 4));
    } catch (error) {
      console.error('Error loading account data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const isOwner = profile?.role === 'super_admin';
  const isDeveloper = profile?.role === 'developer' || teamMember?.position === 'developer';
  const isAdmin = profile?.role === 'admin' || isOwner;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header con avatar y info básica */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full bg-zinc-700 overflow-hidden ring-4 ring-white/20">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-400">
                    {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <Link
                to="/account/edit"
                className="absolute bottom-0 right-0 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <Camera className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
                {isOwner && (
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Propietario
                  </span>
                )}
                {isDeveloper && !isOwner && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full flex items-center gap-1">
                    <Code className="w-3 h-3" /> Developer
                  </span>
                )}
                {isAdmin && !isOwner && !isDeveloper && (
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
              <p className="text-zinc-400 mb-2">{profile?.email}</p>
              {profile?.bio && (
                <p className="text-zinc-500 text-sm max-w-md">{profile.bio}</p>
              )}
              <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-sm text-zinc-500">
                <span>Miembro desde {new Date(profile?.created_at || '').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</span>
                {profile?.instagram_handle && (
                  <a
                    href={`https://instagram.com/${profile.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-400 hover:text-pink-300"
                  >
                    @{profile.instagram_handle}
                  </a>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                to="/account/edit"
                className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" /> Editar Perfil
              </Link>
            </div>
          </div>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-zinc-500 text-sm">Pedidos</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{addresses.length}</p>
            <p className="text-zinc-500 text-sm">Direcciones</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{profile?.preferred_size || '-'}</p>
            <p className="text-zinc-500 text-sm">Talla</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{profile?.preferred_shoe_size || '-'}</p>
            <p className="text-zinc-500 text-sm">Calzado</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Menu principal */}
          <div className="md:col-span-2 space-y-4">
            {/* Productos Destacados */}
            {featuredProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 rounded-xl overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" /> Productos Destacados
                  </h2>
                  <Link to="/shop" className="text-sm text-white hover:text-zinc-300 flex items-center gap-1">
                    Ver tienda <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {featuredProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.slug}`}
                      className="group block"
                    >
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                        <img
                          src={product.images?.[0]?.url || 'https://via.placeholder.com/300x400'}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {product.compare_at_price && (
                          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                            -{calculateDiscount(product.compare_at_price, product.price)}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-sm text-zinc-400">{formatCurrency(product.price)}</p>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Últimos pedidos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900 rounded-xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-zinc-400" /> Mis Pedidos
                </h2>
                <Link to="/account/orders" className="text-sm text-white hover:text-zinc-300">
                  Ver todos
                </Link>
              </div>
              {orders.length > 0 ? (
                <div className="divide-y divide-zinc-800">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      to={`/account/orders/${order.id}`}
                      className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">#{order.order_number}</p>
                        <p className="text-sm text-zinc-500">
                          {new Date(order.created_at).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(order.total)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                          order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                          order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {order.status === 'delivered' ? 'Entregado' :
                           order.status === 'shipped' ? 'Enviado' :
                           order.status === 'processing' ? 'Procesando' :
                           order.status === 'cancelled' ? 'Cancelado' :
                           'Pendiente'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No tienes pedidos aún</p>
                  <Link to="/shop" className="text-white hover:underline text-sm mt-2 inline-block">
                    Explorar tienda
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Direcciones guardadas */}
            <div className="bg-zinc-900 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-zinc-400" /> Direcciones
                </h2>
                <Link to="/account/addresses" className="text-sm text-white hover:text-zinc-300">
                  Gestionar
                </Link>
              </div>
              {addresses.length > 0 ? (
                <div className="divide-y divide-zinc-800">
                  {addresses.slice(0, 2).map((address) => (
                    <div key={address.id} className="p-4 flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        address.is_default ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{address.label}</p>
                          {address.is_default && (
                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">Principal</span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500">
                          {address.street}, {address.city}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay direcciones guardadas</p>
                  <Link to="/account/addresses" className="text-white hover:underline text-sm mt-2 inline-block">
                    Agregar dirección
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Menú rápido */}
          <div className="space-y-4">
            {/* Accesos rápidos */}
            <div className="bg-zinc-900 rounded-xl overflow-hidden">
              <nav className="divide-y divide-zinc-800">
                <Link
                  to="/account/edit"
                  className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-zinc-400" />
                    <span>Editar Perfil</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                </Link>
                <Link
                  to="/account/orders"
                  className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-zinc-400" />
                    <span>Mis Pedidos</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                </Link>
                <Link
                  to="/account/addresses"
                  className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-zinc-400" />
                    <span>Direcciones</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                </Link>
                <Link
                  to="/wishlist"
                  className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5 text-zinc-400" />
                    <span>Lista de Deseos</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                </Link>
                <Link
                  to="/account/notifications"
                  className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-zinc-400" />
                    <span>Notificaciones</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                </Link>
                <Link
                  to="/account/settings"
                  className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-zinc-400" />
                    <span>Configuración</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                </Link>
              </nav>
            </div>

            {/* Panel especial para Team Members y Admins */}
            {(isOwner || isDeveloper || isAdmin || teamMember) && (
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
                <div className="p-4 border-b border-zinc-700">
                  <h3 className="font-semibold flex items-center gap-2">
                    {isOwner ? (
                      <><Crown className="w-5 h-5 text-yellow-400" /> Panel Propietario</>
                    ) : isAdmin && !isOwner ? (
                      <><Shield className="w-5 h-5 text-purple-400" /> Panel Admin</>
                    ) : isDeveloper ? (
                      <><Code className="w-5 h-5 text-blue-400" /> Panel Developer</>
                    ) : (
                      <><TrendingUp className="w-5 h-5 text-green-400" /> Panel Equipo</>
                    )}
                  </h3>
                </div>
                <nav className="divide-y divide-zinc-700">
                  {(isOwner || isAdmin) && (
                    <Link
                      to="/admin"
                      className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-purple-400" />
                        <span>Panel Admin</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-600" />
                    </Link>
                  )}

                  {isOwner && (
                    <>
                      <Link
                        to="/account/owner-dashboard"
                        className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-5 h-5 text-green-400" />
                          <span>Dashboard Ingresos</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                      </Link>
                      <Link
                        to="/account/team"
                        className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-blue-400" />
                          <span>Gestionar Equipo</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                      </Link>
                      <Link
                        to="/account/commissions"
                        className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-yellow-400" />
                          <span>Pagar Comisiones</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                      </Link>
                    </>
                  )}
                  {isDeveloper && (
                    <Link
                      to="/account/my-commissions"
                      className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <span>Mis Comisiones (12%)</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-600" />
                    </Link>
                  )}
                  {teamMember && teamMember.commission_percentage > 0 && !isDeveloper && (
                    <Link
                      to="/account/my-commissions"
                      className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <span>Mis Comisiones ({teamMember.commission_percentage}%)</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-600" />
                    </Link>
                  )}
                  {(isOwner || isAdmin || (teamMember?.can_view_analytics)) && (
                    <Link
                      to="/admin/analytics"
                      className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-zinc-400" />
                        <span>Analytics</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-600" />
                    </Link>
                  )}
                </nav>
              </div>
            )}

            {/* Cerrar sesión */}
            <button
              onClick={handleSignOut}
              className="w-full bg-zinc-900 rounded-xl p-4 flex items-center gap-3 text-red-400 hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
