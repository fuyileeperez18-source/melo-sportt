import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Grid,
  List,
  Filter,
  X,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, IconButton } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { UploadedImage } from '@/components/ui/ImageUpload';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { productService, categoryService, analyticsService } from '@/lib/services';
import { ProductCardAdmin, ProductStatsDetail } from '@/components/admin/ProductCardAdmin';
import type { Product, Category, ProductWithStats, ProductAccessory } from '@/types';

const genderOptions = [
  { value: '', label: 'Seleccionar Género' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'nino', label: 'Niño' },
  { value: 'nina', label: 'Niña' },
];

const productTypeOptions = [
  { value: '', label: 'Seleccionar Tipo' },
  { value: 'camiseta', label: 'Camiseta' },
  { value: 'camisa', label: 'Camisa' },
  { value: 'pantalon', label: 'Pantalón' },
  { value: 'jean', label: 'Jean' },
  { value: 'chaqueta', label: 'Chaqueta' },
  { value: 'sudadera', label: 'Sudadera' },
  { value: 'short', label: 'Short' },
  { value: 'accesorio', label: 'Accesorio' },
  { value: 'zapato', label: 'Zapato' },
  { value: 'vestido', label: 'Vestido' },
  { value: 'falda', label: 'Falda' },
  { value: 'otro', label: 'Otro' },
];

const styleTypeOptions = [
  { value: '', label: 'Todos los estilos' },
  { value: 'aesthetic', label: 'Aesthetic' },
  { value: 'urbano', label: 'Urbano' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'deportivo', label: 'Deportivo' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'minimalista', label: 'Minimalista' },
  { value: 'streetwear', label: 'Streetwear' },
];

const sizeOptions = [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: 'XXL', label: 'XXL' },
];

const colorOptions = [
  { value: 'Negro', label: 'Negro', color: '#000000' },
  { value: 'Blanco', label: 'Blanco', color: '#FFFFFF' },
  { value: 'Gris', label: 'Gris', color: '#808080' },
  { value: 'Azul', label: 'Azul', color: '#0066CC' },
  { value: 'Rojo', label: 'Rojo', color: '#CC0000' },
  { value: 'Verde', label: 'Verde', color: '#006600' },
  { value: 'Amarillo', label: 'Amarillo', color: '#FFCC00' },
  { value: 'Rosa', label: 'Rosa', color: '#FF66B2' },
  { value: 'Morado', label: 'Morado', color: '#660099' },
  { value: 'Naranja', label: 'Naranja', color: '#FF6600' },
];

const materialOptions = [
  { value: '', label: 'Seleccionar Material' },
  { value: 'Algodon', label: 'Algodón' },
  { value: 'Poliester', label: 'Poliéster' },
  { value: 'Algodon/Poliester', label: 'Algodón/Poliéster' },
  { value: 'Lana', label: 'Lana' },
  { value: 'Seda', label: 'Seda' },
  { value: 'Lino', label: 'Lino' },
  { value: 'Denim', label: 'Denim' },
  { value: 'Cuero', label: 'Cuero' },
  { value: 'Sintetico', label: 'Sintético' },
];

const accessoryTypeOptions = [
  { value: '', label: 'Seleccionar Accesorio' },
  { value: 'gorra', label: 'Gorra' },
  { value: 'reloj', label: 'Reloj' },
  { value: 'cinturon', label: 'Cinturón' },
  { value: 'gafas', label: 'Gafas' },
  { value: 'bolso', label: 'Bolso' },
  { value: 'mochila', label: 'Mochila' },
  { value: 'gorro', label: 'Gorro' },
  { value: 'bufanda', label: 'Bufanda' },
  { value: 'guantes', label: 'Guantes' },
  { value: 'otro', label: 'Otro' },
];

interface Accessory {
  type: string;
  price: string;
}

interface FormData {
  name: string;
  sku: string;
  description: string;
  shortDescription: string;
  price: string;
  comparePrice: string;
  costPerItem: string;
  category_id: string;
  productType: string;
  gender: string;
  quantity: string;
  brand: string;
  material: string;
  weight: string;
  colors: string[];
  sizes: string[];
  tags: string;
  isFeatured: boolean;
  isActive: boolean;
  isSet: boolean;
  accessories: Accessory[];
}

const initialFormData: FormData = {
  name: '',
  sku: '',
  description: '',
  shortDescription: '',
  price: '',
  comparePrice: '',
  costPerItem: '',
  category_id: '',
  productType: '',
  gender: '',
  quantity: '',
  brand: '',
  material: '',
  weight: '',
  colors: [],
  sizes: [],
  tags: '',
  isFeatured: false,
  isActive: true,
  isSet: false,
  accessories: [],
};

export function AdminProducts() {
  const [products, setProducts] = useState<ProductWithStats[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState('');
  const [styleTypeFilter, setStyleTypeFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStats | null>(null);
  const [productImages, setProductImages] = useState<UploadedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const itemsPerPage = 12;

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        productService.getAllAdmin({ limit: 100 }),
        categoryService.getAll(),
      ]);

      // Convert products to ProductWithStats format if needed
      const formattedProducts = productsData.map((p: any) => ({
        ...p,
        total_sold: p.total_sold || 0,
        order_count: p.order_count || 0,
        total_revenue: p.total_revenue || 0,
        images: p.images || [],
      }));

      setProducts(formattedProducts);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !categoryFilter || product.category_id === categoryFilter;

    const matchesProductType = !productTypeFilter || product.product_type === productTypeFilter;

    const matchesStyleType = !styleTypeFilter ||
      product.tags?.some(tag => tag.toLowerCase() === styleTypeFilter.toLowerCase());

    const matchesGender = !genderFilter || product.gender === genderFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && product.is_active) ||
      (statusFilter === 'inactive' && !product.is_active);

    return matchesSearch && matchesCategory && matchesProductType &&
           matchesStyleType && matchesGender && matchesStatus;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleOpenAddModal = () => {
    setFormData(initialFormData);
    setProductImages([]);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (product: ProductWithStats) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      shortDescription: product.short_description || '',
      price: product.price.toString(),
      comparePrice: product.compare_at_price?.toString() || '',
      costPerItem: product.cost_per_item?.toString() || '',
      category_id: product.category_id || '',
      productType: product.product_type || '',
      gender: product.gender || '',
      quantity: product.quantity.toString(),
      brand: product.brand || '',
      material: product.material || '',
      weight: product.weight?.toString() || '',
      colors: product.colors || [],
      sizes: product.sizes || [],
      tags: product.tags?.join(', ') || '',
      isFeatured: product.is_featured,
      isActive: product.is_active,
      isSet: product.is_set || false,
      accessories: (product.accessories || []).map((acc: any) => ({
        type: acc.type || '',
        price: acc.price?.toString() || '',
      })),
    });
    setProductImages(
      (product.images || []).map((img: any, index: number) => ({
        id: img.id || `temp-${index}`,
        url: img.url,
        alt_text: img.alt_text || '',
        position: img.position || index,
        is_primary: img.is_primary || false,
        preview: img.url,
      }))
    );
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteDialog = (product: ProductWithStats) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenStats = (product: ProductWithStats) => {
    setSelectedProduct(product);
    setIsStatsModalOpen(true);
  };

  const handleSubmit = async (isEdit: boolean) => {
    if (!formData.name || !formData.sku || !formData.price) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      const productData: Record<string, unknown> = {
        name: formData.name,
        slug: formData.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        description: formData.description,
        short_description: formData.shortDescription,
        price: parseFloat(formData.price),
        sku: formData.sku,
        quantity: parseInt(formData.quantity) || 0,
        category_id: formData.category_id || undefined,
        brand: formData.brand,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        gender: formData.gender || undefined,
        product_type: formData.productType || undefined,
        sizes: formData.sizes,
        colors: formData.colors,
        material: formData.material || undefined,
        is_active: formData.isActive,
        is_featured: formData.isFeatured,
        is_set: formData.isSet,
        accessories: formData.accessories
          .filter(acc => {
            const price = parseFloat(acc.price);
            return acc.type && acc.type.trim() !== '' && !isNaN(price) && price > 0;
          })
          .map(acc => ({
            type: acc.type.trim(),
            price: parseFloat(acc.price),
          })),
      };

      if (formData.comparePrice) {
        productData.compare_at_price = parseFloat(formData.comparePrice);
      }
      if (formData.costPerItem) {
        productData.cost_per_item = parseFloat(formData.costPerItem);
      }
      if (formData.weight) {
        productData.weight = parseFloat(formData.weight);
      }

      let createdProduct: any;

      if (isEdit && selectedProduct) {
        await productService.update(selectedProduct.id, productData);

        // Sincronizar imágenes: comparar las originales con las actuales
        const originalImages = (selectedProduct.images || []).map((img: any) => ({
          id: img.id,
          url: img.url,
        }));
        
        // Identificar imágenes existentes (tienen ID que no es temporal ni public_id)
        const existingImageIds = productImages
          .filter(img => {
            // Las imágenes de BD tienen IDs UUID, no public_id de Cloudinary
            return img.id && 
                   !img.id.startsWith('temp-') && 
                   originalImages.some(orig => orig.id === img.id);
          })
          .map(img => img.id);
        
        // Eliminar imágenes que ya no están en la lista
        const imagesToDelete = originalImages.filter(
          origImg => !existingImageIds.includes(origImg.id)
        );
        
        for (const imgToDelete of imagesToDelete) {
          try {
            await productService.deleteImage(imgToDelete.id);
          } catch (error) {
            console.error('Error eliminando imagen:', error);
          }
        }
        
        // Agregar nuevas imágenes (las que no tienen ID de BD o tienen ID temporal/public_id)
        const newImages = productImages.filter(
          img => {
            // Es nueva si no tiene ID de BD
            return !img.id || 
                   img.id.startsWith('temp-') || 
                   !originalImages.some(orig => orig.id === img.id);
          }
        );
        
        for (let i = 0; i < productImages.length; i++) {
          const image = productImages[i];
          // Solo agregar si es nueva
          const isNew = !image.id || 
                       image.id.startsWith('temp-') || 
                       !originalImages.some(orig => orig.id === image.id);
          
          if (isNew && image.url) {
            try {
              await productService.addImage(selectedProduct.id, {
                url: image.url,
                alt_text: formData.name,
                position: i,
                is_primary: image.is_primary || i === 0,
              });
            } catch (imgError) {
              console.error('Error agregando imagen:', imgError);
            }
          }
        }
        
        toast.success('Producto actualizado exitosamente');
        setIsEditModalOpen(false);
      } else {
        // Crear producto primero
        createdProduct = await productService.create(productData);

        // Asociar todas las imágenes subidas al producto creado
        if (productImages.length > 0 && createdProduct?.id) {
          console.log('🖼️ Asociando', productImages.length, 'imágenes al producto:', createdProduct.id);
          for (let i = 0; i < productImages.length; i++) {
            const image = productImages[i];
            if (image.url) {
              try {
                await productService.addImage(createdProduct.id, {
                  url: image.url,
                  alt_text: formData.name,
                  position: i,
                  is_primary: i === 0, // La primera es la principal
                });
              } catch (imgError) {
                console.error('Error asociando imagen:', imgError);
              }
            }
          }
        }
        toast.success('Producto creado con todas sus imágenes');
        setIsAddModalOpen(false);
      }

      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(isEdit ? 'Error al actualizar producto' : 'Error al crear producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    setIsSubmitting(true);
    try {
      await productService.delete(selectedProduct.id);
      toast.success('Producto eliminado exitosamente');
      setIsDeleteDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Productos</h1>
          <p className="text-gray-600">Gestiona tu catálogo de productos</p>
        </div>
        <Button onClick={handleOpenAddModal} leftIcon={<Plus className="h-5 w-5" />}>
          Agregar Producto
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
        {/* Main Search & Actions */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar productos por nombre, SKU o marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-11 bg-gray-50 border border-gray-200 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'h-11 px-4 border rounded-xl transition-all flex items-center gap-2',
              showFilters
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            )}
          >
            <Filter className="h-5 w-5" />
            <span className="hidden sm:inline">Filtros</span>
            {(productTypeFilter || styleTypeFilter || genderFilter || categoryFilter) && (
              <span className="bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {[productTypeFilter, styleTypeFilter, genderFilter, categoryFilter].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'grid' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
              )}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'list' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
              )}
            >
              <List className="h-5 w-5" />
            </button>
          </div>

          {/* Refresh */}
          <IconButton onClick={loadData} disabled={isLoading} className="text-gray-500 hover:text-black hover:bg-gray-100">
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </IconButton>
        </div>

        {/* Advanced Filters (Collapsible) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-gray-200">
                {/* Product Type Filter */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Tipo de Producto</label>
                  <select
                    value={productTypeFilter}
                    onChange={(e) => {
                      setProductTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  >
                    <option value="">Todos</option>
                    {productTypeOptions.filter(opt => opt.value).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Style Type Filter */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Estilo</label>
                  <select
                    value={styleTypeFilter}
                    onChange={(e) => {
                      setStyleTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  >
                    {styleTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gender Filter */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Género</label>
                  <select
                    value={genderFilter}
                    onChange={(e) => {
                      setGenderFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  >
                    <option value="">Todos</option>
                    {genderOptions.filter(opt => opt.value).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Categoría</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  >
                    <option value="">Todas</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              {(productTypeFilter || styleTypeFilter || genderFilter || categoryFilter) && (
                <div className="pt-3 flex justify-end">
                  <button
                    onClick={() => {
                      setProductTypeFilter('');
                      setStyleTypeFilter('');
                      setGenderFilter('');
                      setCategoryFilter('');
                      setCurrentPage(1);
                    }}
                    className="text-sm text-gray-500 hover:text-black transition-colors flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Limpiar filtros
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
        >
          <p className="text-sm text-gray-500">Total Productos</p>
          <p className="text-2xl font-bold text-black">{filteredProducts.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
        >
          <p className="text-sm text-gray-500">Activos</p>
          <p className="text-2xl font-bold text-emerald-600">
            {filteredProducts.filter((p) => p.is_active).length}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
        >
          <p className="text-sm text-gray-500">Sin Stock</p>
          <p className="text-2xl font-bold text-red-600">
            {filteredProducts.filter((p) => p.quantity === 0).length}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
        >
          <p className="text-sm text-gray-500">Stock Bajo</p>
          <p className="text-2xl font-bold text-amber-500">
            {filteredProducts.filter((p) => p.quantity > 0 && p.quantity <= 5).length}
          </p>
        </motion.div>
      </div>

      {/* Products Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-black mx-auto mb-4" />
            <p className="text-gray-500">Cargando productos...</p>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-black mb-2">No se encontraron productos</h3>
          <p className="text-gray-500 mb-6">Intenta ajustar tus filtros o agrega un nuevo producto</p>
          <Button onClick={handleOpenAddModal} leftIcon={<Plus className="h-5 w-5" />}>
            Agregar Producto
          </Button>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedProducts.map((product, index) => (
                <ProductCardAdmin
                  key={product.id}
                  product={product}
                  onEdit={handleOpenEditModal}
                  onDelete={handleOpenDeleteDialog}
                  onView={handleOpenStats}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Producto</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">SKU</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Precio</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Stock</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Vendidos</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Estado</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedProducts.map((product) => {
                    const primaryImage = product.images?.find((img: any) => img.is_primary) || product.images?.[0];
                    return (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={primaryImage?.url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=100'}
                              alt={product.name}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                            />
                            <div>
                              <p className="font-medium text-black">{product.name}</p>
                              <p className="text-xs text-gray-500">{product.is_featured && '⭐ Destacado'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{product.sku}</td>
                        <td className="px-6 py-4 font-medium text-black">{formatCurrency(product.price)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-medium',
                              product.quantity === 0
                                ? 'bg-red-100 text-red-700'
                                : product.quantity <= 5
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            )}
                          >
                            {product.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{product.total_sold}</td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-medium',
                              product.is_active ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
                            )}
                          >
                            {product.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <IconButton onClick={() => handleOpenStats(product)} variant="ghost" className="text-gray-500 hover:text-black">
                              <Search className="h-4 w-4" />
                            </IconButton>
                            <IconButton onClick={() => handleOpenEditModal(product)} variant="ghost" className="text-gray-500 hover:text-black">
                              <Edit2 className="h-4 w-4" />
                            </IconButton>
                            <IconButton onClick={() => handleOpenDeleteDialog(product)} variant="ghost" className="text-gray-500 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de {filteredProducts.length}
              </p>
              <div className="flex items-center gap-2">
                <IconButton
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="text-gray-500 hover:text-black hover:bg-gray-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </IconButton>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        'w-10 h-10 rounded-lg font-medium transition-colors',
                        currentPage === pageNum
                          ? 'bg-black text-white'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-black'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <IconButton
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="text-gray-500 hover:text-black hover:bg-gray-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </IconButton>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal and other dialogs remain mostly the same but with light theme classes where needed */}

      <AnimatePresence>
        {(isAddModalOpen || isEditModalOpen) && (
          <Modal
            isOpen={isAddModalOpen || isEditModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
            }}
            title={isEditModalOpen ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            size="xl"
            showCloseButton={false}
          >
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Header Section with Image Upload */}
              <div className="bg-gradient-to-br from-primary-900/50 to-primary-800/30 rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  Imágenes del Producto
                </h3>
                <ImageUpload
                  images={productImages}
                  onChange={setProductImages}
                  maxImages={3}
                  className="bg-transparent"
                />
              </div>

              {/* Basic Info Section */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <Check className="h-4 w-4" />
                  </div>
                  Información Básica
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre del Producto *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Camiseta Oversize Aesthetic"
                      className="bg-white/5 border-white/10 text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">SKU *</label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="SKU-001"
                      className="bg-white/5 border-white/10 text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Precio *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <Input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        className="pl-7 bg-white/5 border-white/10 text-white placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Precio Anterior</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <Input
                        type="number"
                        value={formData.comparePrice}
                        onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                        placeholder="0.00"
                        className="pl-7 bg-white/5 border-white/10 text-white placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Stock</label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0"
                      className="bg-white/5 border-white/10 text-white placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <Check className="h-4 w-4" />
                  </div>
                  Descripción
                </h3>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe tu producto en detalle..."
                  rows={3}
                  className="bg-white/5 border-white/10 text-white placeholder-gray-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">Una buena descripción ayuda a tus clientes a conocer mejor el producto</p>
              </div>

              {/* Classification */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <Check className="h-4 w-4" />
                  </div>
                  Clasificación
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Categoría</label>
                    <div className="relative">
                      <select
                        value={formData.category_id}
                        onChange={(e) => {
                          const selectedCategoryId = e.target.value;
                          const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
                          const isConjuntoCategory = selectedCategory?.name?.toLowerCase() === 'conjuntos' || selectedCategory?.slug === 'conjuntos';
                          
                          setFormData({ 
                            ...formData, 
                            category_id: selectedCategoryId,
                            // Marcar automáticamente como conjunto si la categoría es conjuntos
                            isSet: isConjuntoCategory || formData.isSet
                          });
                        }}
                        className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-gray-900">Seleccionar categoría...</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id} className="bg-gray-900">
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Género</label>
                    <div className="relative">
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-gray-900">Seleccionar género...</option>
                        {genderOptions.filter(opt => opt.value).map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-gray-900">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Material</label>
                    <div className="relative">
                      <select
                        value={formData.material}
                        onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                        className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-gray-900">Seleccionar material...</option>
                        {materialOptions.filter(opt => opt.value).map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-gray-900">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Marca</label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="Marca del producto"
                      className="bg-white/5 border-white/10 text-white placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sizes & Colors */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <Check className="h-4 w-4" />
                  </div>
                  Tallas y Colores Disponibles
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tallas</label>
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map((size) => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => {
                          const newSizes = formData.sizes.includes(size.value)
                            ? formData.sizes.filter((s) => s !== size.value)
                            : [...formData.sizes, size.value];
                          setFormData({ ...formData, sizes: newSizes });
                        }}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                          formData.sizes.includes(size.value)
                            ? 'bg-white text-black'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                        )}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Colores</label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => {
                          const newColors = formData.colors.includes(color.value)
                            ? formData.colors.filter((c) => c !== color.value)
                            : [...formData.colors, color.value];
                          setFormData({ ...formData, colors: newColors });
                        }}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                          formData.colors.includes(color.value)
                            ? 'bg-white text-black'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                        )}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-white/20"
                          style={{ backgroundColor: color.color }}
                        />
                        {color.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <Check className="h-4 w-4" />
                  </div>
                  Etiquetas y Estilo
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Etiquetas (Tags)</label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="aesthetic, urbano, casual, streetwear"
                    className="bg-white/5 border-white/10 text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">Separa las etiquetas con comas para ayudar a categorizar el producto por estilo</p>
                </div>
              </div>

              {/* Set Configuration - Solo mostrar si la categoría es conjuntos */}
              {(() => {
                const selectedCategory = categories.find(cat => cat.id === formData.category_id);
                const isConjuntoCategory = selectedCategory?.name?.toUpperCase() === 'CONJUNTO' || selectedCategory?.slug === 'conjunto';
                
                if (!isConjuntoCategory) return null;

                return (
                  <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <div className="p-1.5 bg-white/10 rounded-lg">
                        <Check className="h-4 w-4" />
                      </div>
                      Configuración de Conjunto
                    </h3>
                    <div className="space-y-4">
                      {/* Marcar como conjunto */}
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={cn(
                          'relative w-12 h-6 rounded-full transition-colors',
                          formData.isSet ? 'bg-emerald-500' : 'bg-white/20'
                        )}>
                          <input
                            type="checkbox"
                            checked={formData.isSet}
                            onChange={(e) => setFormData({ ...formData, isSet: e.target.checked })}
                            className="sr-only"
                          />
                          <div className={cn(
                            'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                            formData.isSet ? 'left-7' : 'left-1'
                          )} />
                        </div>
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                          Este producto es un conjunto (camisa + pantalón)
                        </span>
                      </label>

                      {/* Accesorios opcionales */}
                      {formData.isSet && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-300">
                              Accesorios Opcionales
                            </label>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setFormData({
                                ...formData,
                                accessories: [...formData.accessories, { type: '', price: '' }]
                              })}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Agregar Accesorio
                            </Button>
                          </div>

                          {formData.accessories.length > 0 && (
                            <div className="space-y-3">
                              {formData.accessories.map((accessory, index) => (
                                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Tipo de Accesorio</label>
                                    <div className="relative">
                                      <select
                                        value={accessory.type}
                                        onChange={(e) => {
                                          const newAccessories = [...formData.accessories];
                                          newAccessories[index].type = e.target.value;
                                          setFormData({ ...formData, accessories: newAccessories });
                                        }}
                                        className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all appearance-none cursor-pointer"
                                      >
                                        {accessoryTypeOptions.map((opt) => (
                                          <option key={opt.value} value={opt.value} className="bg-gray-900">
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                      <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 rotate-90 pointer-events-none" />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Precio</label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                      <Input
                                        type="number"
                                        value={accessory.price}
                                        onChange={(e) => {
                                          const newAccessories = [...formData.accessories];
                                          newAccessories[index].price = e.target.value;
                                          setFormData({ ...formData, accessories: newAccessories });
                                        }}
                                        placeholder="0.00"
                                        className="h-10 pl-7 bg-white/5 border-white/10 text-white placeholder-gray-500 text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-end">
                                    <IconButton
                                      variant="ghost"
                                      onClick={() => {
                                        const newAccessories = formData.accessories.filter((_, i) => i !== index);
                                        setFormData({ ...formData, accessories: newAccessories });
                                      }}
                                      className="h-10 w-10 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    >
                                      <X className="h-4 w-4" />
                                    </IconButton>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {formData.accessories.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No hay accesorios configurados. Haz clic en "Agregar Accesorio" para añadir uno.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Status Toggles */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <Check className="h-4 w-4" />
                  </div>
                  Estado del Producto
                </h3>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={cn(
                      'relative w-12 h-6 rounded-full transition-colors',
                      formData.isActive ? 'bg-emerald-500' : 'bg-white/20'
                    )}>
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                        formData.isActive ? 'left-7' : 'left-1'
                      )} />
                    </div>
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      Producto activo
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={cn(
                      'relative w-12 h-6 rounded-full transition-colors',
                      formData.isFeatured ? 'bg-amber-500' : 'bg-white/20'
                    )}>
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                        formData.isFeatured ? 'left-7' : 'left-1'
                      )} />
                    </div>
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      Producto destacado
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-gray-400 hover:text-white"
              >
                Cancelar
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Preview logic could go here
                    toast.success('Vista previa disponible pronto');
                  }}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Vista Previa
                </Button>
                <Button
                  onClick={() => handleSubmit(isEditModalOpen)}
                  isLoading={isSubmitting}
                  className="min-w-[140px]"
                >
                  {isEditModalOpen ? 'Guardar Cambios' : 'Crear Producto'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Producto"
        message={`¿Estás seguro de que deseas eliminar "${selectedProduct?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={isSubmitting}
        variant="danger"
      />

      {/* Stats Modal */}
      <Modal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        title="Estadísticas del Producto"
        size="lg"
      >
        {selectedProduct && <ProductStatsDetail product={selectedProduct} />}
      </Modal>
    </div>
  );
}
