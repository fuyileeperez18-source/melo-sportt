import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Edit2,
  Trash2,
  Eye,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  MoreVertical,
  Star,
} from 'lucide-react';
import type { ProductWithStats } from '@/types';

interface ProductCardAdminProps {
  product: ProductWithStats;
  onEdit: (product: ProductWithStats) => void;
  onDelete: (product: ProductWithStats) => void;
  onView: (product: ProductWithStats) => void;
}

export function ProductCardAdmin({ product, onEdit, onDelete, onView }: ProductCardAdminProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];
  const imageUrl = primaryImage?.url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=400&fit=crop';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const stockStatus = product.quantity <= 0
    ? { label: 'Sin stock', color: 'bg-red-500/20 text-red-400' }
    : product.quantity <= 5
    ? { label: `Stock bajo (${product.quantity})`, color: 'bg-orange-500/20 text-orange-400' }
    : { label: `En stock (${product.quantity})`, color: 'bg-emerald-500/20 text-emerald-400' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden group relative hover:border-white/20 transition-all duration-300"
    >
      {/* Image Section */}
      <div className="relative h-48 bg-white/5 overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
        />

        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
            {stockStatus.label}
          </span>
          {product.is_featured && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 flex items-center gap-1">
              <Star className="w-3 h-3" /> Destacado
            </span>
          )}
        </div>

        {/* Active/Inactive Badge */}
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium ${
          product.is_active
            ? 'bg-white text-black'
            : 'bg-white/20 text-white'
        }`}>
          {product.is_active ? 'Activo' : 'Inactivo'}
        </div>

        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-3 transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onView(product)}
            className="p-3 bg-white rounded-full text-black hover:bg-gray-200 transition-colors"
          >
            <Eye className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onEdit(product)}
            className="p-3 bg-white rounded-full text-black hover:bg-gray-200 transition-colors"
          >
            <Edit2 className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onDelete(product)}
            className="p-3 bg-white rounded-full text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate text-lg">{product.name}</h3>
            <p className="text-sm text-gray-500">SKU: {product.sku}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-gray-900 rounded-xl shadow-lg border border-white/10 py-2 z-20">
                  <button
                    onClick={() => { onEdit(product); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                  <button
                    onClick={() => { onDelete(product); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <p className="text-2xl font-bold text-white">{formatCurrency(product.price)}</p>
          {product.price < product.total_revenue && product.total_sold > 0 && (
            <p className="text-sm text-gray-500">
              Ingresos: <span className="font-medium text-emerald-400">{formatCurrency(product.total_revenue)}</span>
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
            <div className="flex items-center justify-center gap-1 text-white mb-1">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold text-white">{product.total_sold}</p>
            <p className="text-xs text-gray-500">Vendidos</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
            <div className="flex items-center justify-center gap-1 text-white mb-1">
              <DollarSign className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold text-white">{product.order_count}</p>
            <p className="text-xs text-gray-500">Pedidos</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
            <div className="flex items-center justify-center gap-1 text-white mb-1">
              <Package className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold text-white">{product.quantity}</p>
            <p className="text-xs text-gray-500">Stock</p>
          </div>
        </div>

        {/* Revenue Bar */}
        {product.total_revenue > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Ingresos totales</span>
              <span className="font-semibold text-emerald-400">{formatCurrency(product.total_revenue)}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-white to-white/60 rounded-full"
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface ProductStatsDetailProps {
  product: ProductWithStats;
}

export function ProductStatsDetail({ product }: ProductStatsDetailProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const profit = product.total_revenue - (product.total_sold * product.price * 0.7);

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-4 mb-6">
        <img
          src={product.images?.[0]?.url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=100&h=100&fit=crop'}
          alt={product.name}
          className="w-16 h-16 rounded-xl object-cover"
        />
        <div>
          <h3 className="font-semibold text-white text-lg">{product.name}</h3>
          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-white mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Vendidos</span>
          </div>
          <p className="text-2xl font-bold text-white">{product.total_sold}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-white mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium">Ingresos</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(product.total_revenue)}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-white mb-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="text-sm font-medium">Pedidos</span>
          </div>
          <p className="text-2xl font-bold text-white">{product.order_count}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-white mb-2">
            <Package className="w-5 h-5" />
            <span className="text-sm font-medium">Stock</span>
          </div>
          <p className="text-2xl font-bold text-white">{product.quantity}</p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white/10">
        <h4 className="font-medium text-white mb-4">Rendimiento de Ventas</h4>
        <div className="relative h-48">
          <div className="absolute inset-0 flex items-end justify-between gap-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const height = Math.random() * 100;
              return (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex-1 bg-gradient-to-t from-white to-white/60 rounded-t-lg opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                />
              );
            })}
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Lunes</span>
          <span>Martes</span>
          <span>Miércoles</span>
          <span>Jueves</span>
          <span>Viernes</span>
          <span>Sábado</span>
          <span>Domingo</span>
        </div>
      </div>
    </div>
  );
}
