import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Tag,
  Calendar,
  DollarSign,
  TrendingUp,
  Edit,
  Trash2,
  Copy,
  Percent,
  X,
  Check,
  AlertCircle,
  Filter,
  X as XIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, IconButton } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { cn, formatCurrency } from '@/lib/utils';
import { couponService, type Coupon, type CreateCouponData } from '@/services/coupon.service';

export function AdminCoupons() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState<CreateCouponData>({
    code: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_purchase: undefined,
    max_discount: undefined,
    usage_limit: undefined,
    expires_at: undefined,
    starts_at: undefined,
    applicable_to: 'all',
    product_ids: [],
    active: true,
  });

  useEffect(() => {
    loadCoupons();
  }, [statusFilter]);

  const loadCoupons = async () => {
    setIsLoading(true);
    try {
      const response = await couponService.getAll({
        status: statusFilter,
        limit: 100,
      });
      setCoupons(response.data.coupons);
    } catch (error) {
      console.error('Error loading coupons:', error);
      toast.error('Error al cargar los cupones');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCoupons = coupons.filter((coupon) =>
    coupon.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: coupons.length,
    active: coupons.filter((c) => c.active && (!c.expires_at || new Date(c.expires_at) > new Date())).length,
    used: coupons.reduce((sum, c) => sum + c.used_count, 0),
    totalDiscount: 0,
  };

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Code validation
    if (!formData.code.trim()) {
      newErrors.code = 'El código del cupón es requerido';
    } else if (formData.code.trim().length < 3) {
      newErrors.code = 'El código debe tener al menos 3 caracteres';
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code.trim())) {
      newErrors.code = 'El código solo puede contener letras, números, guiones y guiones bajos';
    }

    // Discount value validation
    if (formData.discount_value <= 0) {
      newErrors.discount_value = 'El valor del descuento debe ser mayor a 0';
    }

    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      newErrors.discount_value = 'El porcentaje no puede ser mayor a 100';
    }

    // Date validation
    if (formData.starts_at && formData.expires_at) {
      const startDate = new Date(formData.starts_at);
      const endDate = new Date(formData.expires_at);
      if (startDate >= endDate) {
        newErrors.expires_at = 'La fecha de expiración debe ser posterior a la fecha de inicio';
      }
    }

    // Min purchase validation
    if (formData.min_purchase !== undefined && formData.min_purchase < 0) {
      newErrors.min_purchase = 'La compra mínima no puede ser negativa';
    }

    // Max discount validation
    if (formData.max_discount !== undefined && formData.max_discount < 0) {
      newErrors.max_discount = 'El descuento máximo no puede ser negativo';
    }

    // Usage limit validation
    if (formData.usage_limit !== undefined && formData.usage_limit < 1) {
      newErrors.usage_limit = 'El límite de usos debe ser al menos 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_purchase: undefined,
      max_discount: undefined,
      usage_limit: undefined,
      expires_at: undefined,
      starts_at: undefined,
      applicable_to: 'all',
      product_ids: [],
      active: true,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_purchase: coupon.min_purchase,
      max_discount: coupon.max_discount,
      usage_limit: coupon.usage_limit,
      expires_at: coupon.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 16) : undefined,
      starts_at: coupon.starts_at ? new Date(coupon.starts_at).toISOString().slice(0, 16) : undefined,
      applicable_to: coupon.applicable_to,
      product_ids: coupon.product_ids || [],
      active: coupon.active,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openDeleteDialog = (coupon: Coupon) => {
    setCouponToDelete(coupon);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      if (editingCoupon) {
        await couponService.update(editingCoupon.id, formData);
        toast.success('Cupón actualizado exitosamente');
      } else {
        await couponService.create(formData);
        toast.success('Cupón creado exitosamente');
      }
      setIsModalOpen(false);
      loadCoupons();
    } catch (error: any) {
      console.error('Error saving coupon:', error);
      const errorMessage = error.response?.data?.message || 'Error al guardar el cupón';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!couponToDelete) return;

    setIsSaving(true);
    try {
      await couponService.delete(couponToDelete.id);
      toast.success('Cupón eliminado exitosamente');
      setIsDeleteDialogOpen(false);
      setCouponToDelete(null);
      loadCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Error al eliminar el cupón');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado al portapapeles');
  };

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date();
    if (!coupon.active) {
      return { label: 'Inactivo', color: 'bg-gray-100 text-gray-800' };
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return { label: 'Expirado', color: 'bg-red-100 text-red-800' };
    }
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return { label: 'Programado', color: 'bg-blue-100 text-blue-800' };
    }
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return { label: 'Límite alcanzado', color: 'bg-orange-100 text-orange-800' };
    }
    return { label: 'Activo', color: 'bg-green-100 text-green-800' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Cupones de Descuento</h1>
          <p className="text-gray-600">Crea y gestiona códigos de descuento</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
          Crear Cupón
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Tag className="h-5 w-5 text-blue-600" />
            <p className="text-gray-600 text-sm font-medium">Total Cupones</p>
          </div>
          <p className="text-2xl font-bold text-black">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <p className="text-gray-600 text-sm font-medium">Activos</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Percent className="h-5 w-5 text-purple-600" />
            <p className="text-gray-600 text-sm font-medium">Usos Totales</p>
          </div>
          <p className="text-2xl font-bold text-black">{stats.used}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-red-600" />
            <p className="text-gray-600 text-sm font-medium">Descuento Total</p>
          </div>
          <p className="text-2xl font-bold text-black">{formatCurrency(stats.totalDiscount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cupones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'active', 'expired', 'scheduled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize',
                  statusFilter === status
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {status === 'all' ? 'Todos' :
                 status === 'active' ? 'Activos' :
                 status === 'expired' ? 'Expirados' : 'Programados'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Coupons List - Empty State or Cards */}
      {filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-black mb-2">
            {searchQuery || statusFilter !== 'all' ? 'No hay cupones que coincidan' : 'No hay cupones disponibles'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Intenta con otros filtros de búsqueda'
              : 'Crea tu primer cupón de descuento para atraer más clientes.'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
              Crear Primer Cupón
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCoupons.map((coupon) => {
            const status = getStatusBadge(coupon);
            return (
              <motion.div
                key={coupon.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Tag className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-black font-mono font-bold text-lg">{coupon.code}</span>
                        <IconButton
                          onClick={() => handleCopyCode(coupon.code)}
                          size="sm"
                          variant="ghost"
                        >
                          <Copy className="h-4 w-4" />
                        </IconButton>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-black">
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}% OFF`
                            : formatCurrency(coupon.discount_value) + ' OFF'}
                        </span>
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                          status.color
                        )}>
                          {status.label}
                        </span>
                      </div>
                      {coupon.expires_at && (
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(coupon.expires_at).toLocaleDateString('es-CO')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {coupon.used_count}
                        {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ' / ∞'} usos
                      </p>
                      {coupon.min_purchase && (
                        <p className="text-xs text-gray-500">
                          Mínimo: {formatCurrency(coupon.min_purchase)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <IconButton onClick={() => openEditModal(coupon)}>
                        <Edit className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        onClick={() => openDeleteDialog(coupon)}
                        className="hover:bg-red-500/20 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCoupon ? 'Editar Cupón' : 'Crear Cupón'}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código del Cupón *
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="VERANO2024"
                className={cn(
                  'w-full h-11 px-4 bg-gray-50 border rounded-lg text-black placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors uppercase font-mono',
                  errors.code ? 'border-red-500' : 'border-gray-200'
                )}
              />
            </div>
            {errors.code && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {errors.code}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">Solo letras, números, guiones y guiones bajos</p>
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo de Descuento"
              options={[
                { value: 'percentage', label: 'Porcentaje (%)' },
                { value: 'fixed', label: 'Monto Fijo ($)' },
              ]}
              value={formData.discount_type}
              onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor del Descuento *
              </label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                placeholder={formData.discount_type === 'percentage' ? '10' : '5000'}
                className={cn(
                  'w-full h-11 px-4 bg-gray-50 border rounded-lg text-black placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors',
                  errors.discount_value ? 'border-red-500' : 'border-gray-200'
                )}
              />
              {errors.discount_value && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> {errors.discount_value}
                </p>
              )}
            </div>
          </div>

          {/* Min Purchase & Max Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compra Mínima (opcional)
              </label>
              <input
                type="number"
                value={formData.min_purchase || ''}
                onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="50000"
                className={cn(
                  'w-full h-11 px-4 bg-gray-50 border rounded-lg text-black placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors',
                  errors.min_purchase ? 'border-red-500' : 'border-gray-200'
                )}
              />
              {errors.min_purchase && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> {errors.min_purchase}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descuento Máximo (opcional)
              </label>
              <input
                type="number"
                value={formData.max_discount || ''}
                onChange={(e) => setFormData({ ...formData, max_discount: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="20000"
                className={cn(
                  'w-full h-11 px-4 bg-gray-50 border rounded-lg text-black placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors',
                  errors.max_discount ? 'border-red-500' : 'border-gray-200'
                )}
              />
              {errors.max_discount && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> {errors.max_discount}
                </p>
              )}
            </div>
          </div>

          {/* Usage Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Límite de Usos (opcional)
            </label>
            <input
              type="number"
              value={formData.usage_limit || ''}
              onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="100"
              className={cn(
                'w-full h-11 px-4 bg-gray-50 border rounded-lg text-black placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors',
                errors.usage_limit ? 'border-red-500' : 'border-gray-200'
              )}
            />
            {errors.usage_limit && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {errors.usage_limit}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Inicio (opcional)
              </label>
              <input
                type="datetime-local"
                value={formData.starts_at || ''}
                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value || undefined })}
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-lg text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Expiración (opcional)
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at || ''}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value || undefined })}
                className={cn(
                  'w-full h-11 px-4 bg-gray-50 border rounded-lg text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors',
                  errors.expires_at ? 'border-red-500' : 'border-gray-200'
                )}
              />
              {errors.expires_at && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> {errors.expires_at}
                </p>
              )}
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, active: !formData.active })}
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative',
                formData.active ? 'bg-black' : 'bg-gray-300'
              )}
            >
              <div className={cn(
                'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                formData.active ? 'left-7' : 'left-1'
              )} />
            </button>
            <label className="text-sm font-medium text-gray-700 cursor-pointer" onClick={() => setFormData({ ...formData, active: !formData.active })}>
              Cupón {formData.active ? 'activo' : 'inactivo'}
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setIsModalOpen(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            isLoading={isSaving}
            leftIcon={<Check className="h-4 w-4" />}
          >
            {editingCoupon ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Cupón"
        message={`¿Estás seguro de que deseas eliminar el cupón "${couponToDelete?.code}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={isSaving}
        variant="danger"
      />
    </div>
  );
}
