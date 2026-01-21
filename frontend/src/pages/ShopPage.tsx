import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Filter,
  X,
  ChevronDown,
  Grid3X3,
  LayoutGrid,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';
import { AnimatedSection } from '@/components/animations/AnimatedSection';
import { ProductGrid } from '@/components/ui/ProductCard';
import { Button, IconButton } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/Modal';
import { cn, formatCategoryName } from '@/lib/utils';
import { api } from '@/lib/api';
import type { Product, ProductGender, ProductType, Category } from '@/types';

// Opciones de filtros
const genderOptions: { value: ProductGender | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'nino', label: 'Niño' },
  { value: 'nina', label: 'Niña' },
];

const productTypeOptions: { value: ProductType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'camiseta', label: 'Camisetas' },
  { value: 'camisa', label: 'Camisas' },
  { value: 'pantalon', label: 'Pantalones' },
  { value: 'chaqueta', label: 'Chaquetas' },
  { value: 'sudadera', label: 'Sudaderas' },
  { value: 'short', label: 'Shorts' },
  { value: 'vestido', label: 'Vestidos' },
  { value: 'falda', label: 'Faldas' },
  { value: 'zapato', label: 'Zapatos' },
  { value: 'accesorio', label: 'Accesorios' },
  { value: 'otro', label: 'Otros' },
];

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42'];

const colorOptions = [
  { value: 'Negro', color: '#000000' },
  { value: 'Blanco', color: '#FFFFFF' },
  { value: 'Gris', color: '#6B7280' },
  { value: 'Rojo', color: '#EF4444' },
  { value: 'Azul', color: '#3B82F6' },
  { value: 'Verde', color: '#22C55E' },
  { value: 'Amarillo', color: '#EAB308' },
  { value: 'Naranja', color: '#F97316' },
  { value: 'Rosa', color: '#EC4899' },
  { value: 'Morado', color: '#A855F7' },
  { value: 'Beige', color: '#D4A574' },
  { value: 'Marrón', color: '#92400E' },
  { value: 'Azul Marino', color: '#1E3A5F' },
];

const sortOptions = [
  { value: 'newest', label: 'Más Nuevos' },
  { value: 'price_asc', label: 'Precio: Menor a Mayor' },
  { value: 'price_desc', label: 'Precio: Mayor a Menor' },
  { value: 'popular', label: 'Más Populares' },
];

const priceRanges = [
  { value: 'all', label: 'Todos los Precios' },
  { value: '0-50000', label: 'Menos de $50.000' },
  { value: '50000-100000', label: '$50.000 - $100.000' },
  { value: '100000-200000', label: '$100.000 - $200.000' },
  { value: '200000+', label: 'Más de $200.000' },
];

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [gridView, setGridView] = useState<3 | 4>(4);
  const [totalProducts, setTotalProducts] = useState(0);

  // Filter states from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedSort, setSelectedSort] = useState(searchParams.get('sort') || 'newest');
  const [selectedPrice, setSelectedPrice] = useState(searchParams.get('price') || 'all');
  const [selectedGender, setSelectedGender] = useState<ProductGender | 'all'>(
    (searchParams.get('gender') as ProductGender) || 'all'
  );
  const [selectedProductType, setSelectedProductType] = useState<ProductType | 'all'>(
    (searchParams.get('type') as ProductType) || 'all'
  );
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    searchParams.get('sizes')?.split(',').filter(Boolean) || []
  );
  const [selectedColors, setSelectedColors] = useState<string[]>(
    searchParams.get('colors')?.split(',').filter(Boolean) || []
  );

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get<Category[]>('/categories');
        if (response.success && response.data) {
          setCategories([{ id: 'all', name: 'Todas', slug: 'all', position: 0, is_active: true }, ...response.data]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products with filters
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};

      if (searchQuery) params.search = searchQuery;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedSort !== 'newest') params.sort_by = selectedSort;
      if (selectedGender !== 'all') params.gender = selectedGender;
      if (selectedProductType !== 'all') params.product_type = selectedProductType;
      if (selectedSizes.length > 0) params.sizes = selectedSizes.join(',');
      if (selectedColors.length > 0) params.colors = selectedColors.join(',');

      if (selectedPrice !== 'all') {
        if (selectedPrice.includes('+')) {
          // Handle "200000+" case
          const min = selectedPrice.replace('+', '');
          if (min) params.minPrice = min;
        } else {
          // Handle ranges like "0-50000", "50000-100000"
          const [min, max] = selectedPrice.split('-');
          if (min) params.minPrice = min;
          if (max) params.maxPrice = max;
        }
      }

      const response = await api.get<Product[]>('/products', params);
      if (response.success && response.data) {
        setProducts(response.data);
        setTotalProducts(response.count || response.data.length);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedSort, selectedPrice, selectedGender, selectedProductType, selectedSizes, selectedColors]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (selectedSort !== 'newest') params.set('sort', selectedSort);
    if (selectedPrice !== 'all') params.set('price', selectedPrice);
    if (selectedGender !== 'all') params.set('gender', selectedGender);
    if (selectedProductType !== 'all') params.set('type', selectedProductType);
    if (selectedSizes.length > 0) params.set('sizes', selectedSizes.join(','));
    if (selectedColors.length > 0) params.set('colors', selectedColors.join(','));
    setSearchParams(params);
  }, [searchQuery, selectedCategory, selectedSort, selectedPrice, selectedGender, selectedProductType, selectedSizes, selectedColors, setSearchParams]);

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSort('newest');
    setSelectedPrice('all');
    setSelectedGender('all');
    setSelectedProductType('all');
    setSelectedSizes([]);
    setSelectedColors([]);
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCategory !== 'all' ||
    selectedSort !== 'newest' ||
    selectedPrice !== 'all' ||
    selectedGender !== 'all' ||
    selectedProductType !== 'all' ||
    selectedSizes.length > 0 ||
    selectedColors.length > 0;

  const activeFilterCount = [
    searchQuery,
    selectedCategory !== 'all',
    selectedPrice !== 'all',
    selectedGender !== 'all',
    selectedProductType !== 'all',
    selectedSizes.length > 0,
    selectedColors.length > 0,
  ].filter(Boolean).length;

  // Filter section component
  const FilterSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-b border-primary-700 pb-6 mb-6 last:border-b-0">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900 to-black" />
        <div className="relative container mx-auto px-6 text-center">
          <AnimatedSection animation="fadeUp">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">Tienda</h1>
            <p className="text-gray-400 text-lg">Descubre nuestra colección completa</p>
          </AnimatedSection>
        </div>
      </section>

      {/* Filters & Products */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          {/* Top bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            {/* Search */}
            <div className="w-full lg:w-80">
              <SearchInput
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Mobile filter button */}
              <Button
                variant="outline"
                className="lg:hidden"
                leftIcon={<Filter className="h-4 w-4" />}
                onClick={() => setIsFilterOpen(true)}
              >
                Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>

              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="h-11 pl-4 pr-10 bg-primary-900 border border-primary-700 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-white/30"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Grid toggle */}
              <div className="hidden md:flex items-center gap-1 bg-primary-900 rounded-lg p-1">
                <IconButton
                  onClick={() => setGridView(3)}
                  className={cn(gridView === 3 && 'bg-white text-black')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </IconButton>
                <IconButton
                  onClick={() => setGridView(4)}
                  className={cn(gridView === 4 && 'bg-white text-black')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </IconButton>
              </div>

              {/* Results count */}
              <span className="text-gray-400 text-sm hidden sm:inline">
                {totalProducts} productos
              </span>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Sidebar filters (desktop) */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-28 space-y-0 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4">
                {/* Gender */}
                <FilterSection title="Género">
                  <div className="space-y-2">
                    {genderOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedGender(option.value)}
                        className={cn(
                          'block w-full text-left px-3 py-2 rounded-lg transition-colors',
                          selectedGender === option.value
                            ? 'bg-white text-black'
                            : 'text-gray-400 hover:text-white hover:bg-primary-800'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </FilterSection>

                {/* Product Type */}
                <FilterSection title="Tipo de Producto">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {productTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedProductType(option.value)}
                        className={cn(
                          'block w-full text-left px-3 py-2 rounded-lg transition-colors',
                          selectedProductType === option.value
                            ? 'bg-white text-black'
                            : 'text-gray-400 hover:text-white hover:bg-primary-800'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </FilterSection>

                {/* Categories */}
                <FilterSection title="Categorías">
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.slug)}
                        className={cn(
                          'block w-full text-left px-3 py-2 rounded-lg transition-colors',
                          selectedCategory === category.slug
                            ? 'bg-white text-black'
                            : 'text-gray-400 hover:text-white hover:bg-primary-800'
                        )}
                      >
                        {formatCategoryName(category.name)}
                      </button>
                    ))}
                  </div>
                </FilterSection>

                {/* Price range */}
                <FilterSection title="Precio">
                  <div className="space-y-2">
                    {priceRanges.map((range) => (
                      <button
                        key={range.value}
                        onClick={() => setSelectedPrice(range.value)}
                        className={cn(
                          'block w-full text-left px-3 py-2 rounded-lg transition-colors',
                          selectedPrice === range.value
                            ? 'bg-white text-black'
                            : 'text-gray-400 hover:text-white hover:bg-primary-800'
                        )}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </FilterSection>

                {/* Sizes */}
                <FilterSection title="Tallas">
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map((size) => (
                      <button
                        key={size}
                        onClick={() => toggleSize(size)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm transition-colors border',
                          selectedSizes.includes(size)
                            ? 'bg-white text-black border-white'
                            : 'text-gray-400 border-primary-700 hover:border-white/50'
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </FilterSection>

                {/* Colors */}
                <FilterSection title="Colores">
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => toggleColor(color.value)}
                        title={color.value}
                        className={cn(
                          'w-8 h-8 rounded-full transition-all border-2',
                          selectedColors.includes(color.value)
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-black border-transparent'
                            : 'border-primary-600 hover:border-white/50'
                        )}
                        style={{ backgroundColor: color.color }}
                      />
                    ))}
                  </div>
                  {selectedColors.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                      Seleccionados: {selectedColors.join(', ')}
                    </p>
                  )}
                </FilterSection>

                {/* Clear filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="w-full mt-4"
                    leftIcon={<X className="h-4 w-4" />}
                  >
                    Limpiar Filtros
                  </Button>
                )}
              </div>
            </aside>

            {/* Products grid */}
            <div className="flex-1">
              {/* Active filters */}
              {hasActiveFilters && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap gap-2 mb-6"
                >
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-800 text-white rounded-full text-sm">
                      Búsqueda: {searchQuery}
                      <button onClick={() => setSearchQuery('')}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedGender !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-800 text-white rounded-full text-sm">
                      {genderOptions.find((g) => g.value === selectedGender)?.label}
                      <button onClick={() => setSelectedGender('all')}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedProductType !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-800 text-white rounded-full text-sm">
                      {productTypeOptions.find((t) => t.value === selectedProductType)?.label}
                      <button onClick={() => setSelectedProductType('all')}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedCategory !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-800 text-white rounded-full text-sm">
                      {formatCategoryName(categories.find((c) => c.slug === selectedCategory)?.name)}
                      <button onClick={() => setSelectedCategory('all')}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedPrice !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-800 text-white rounded-full text-sm">
                      {priceRanges.find((p) => p.value === selectedPrice)?.label}
                      <button onClick={() => setSelectedPrice('all')}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedSizes.map((size) => (
                    <span key={size} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-800 text-white rounded-full text-sm">
                      Talla: {size}
                      <button onClick={() => toggleSize(size)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {selectedColors.map((color) => (
                    <span key={color} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-800 text-white rounded-full text-sm">
                      <span
                        className="w-3 h-3 rounded-full border border-white/30"
                        style={{ backgroundColor: colorOptions.find((c) => c.value === color)?.color }}
                      />
                      {color}
                      <button onClick={() => toggleColor(color)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </motion.div>
              )}

              {/* Products */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              ) : products.length > 0 ? (
                <ProductGrid products={products} columns={gridView} />
              ) : (
                <div className="text-center py-20">
                  <SlidersHorizontal className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No se encontraron productos</h3>
                  <p className="text-gray-400 mb-6">
                    Intenta ajustar los filtros o la búsqueda
                  </p>
                  <Button onClick={clearFilters}>Limpiar Filtros</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile filters bottom sheet */}
      <BottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filtros"
      >
        <div className="space-y-8 max-h-[60vh] overflow-y-auto">
          {/* Gender */}
          <div>
            <h3 className="text-white font-semibold mb-4">Género</h3>
            <div className="grid grid-cols-3 gap-2">
              {genderOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedGender(option.value)}
                  className={cn(
                    'px-4 py-3 rounded-lg text-center transition-colors text-sm',
                    selectedGender === option.value
                      ? 'bg-white text-black'
                      : 'bg-primary-800 text-white'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Type */}
          <div>
            <h3 className="text-white font-semibold mb-4">Tipo de Producto</h3>
            <div className="grid grid-cols-3 gap-2">
              {productTypeOptions.slice(0, 9).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedProductType(option.value)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-center transition-colors text-sm',
                    selectedProductType === option.value
                      ? 'bg-white text-black'
                      : 'bg-primary-800 text-white'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-semibold mb-4">Categorías</h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.slug)}
                  className={cn(
                    'px-4 py-3 rounded-lg text-center transition-colors',
                    selectedCategory === category.slug
                      ? 'bg-white text-black'
                      : 'bg-primary-800 text-white'
                  )}
                >
                  {formatCategoryName(category.name)}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <h3 className="text-white font-semibold mb-4">Precio</h3>
            <div className="grid grid-cols-2 gap-2">
              {priceRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setSelectedPrice(range.value)}
                  className={cn(
                    'px-4 py-3 rounded-lg text-center transition-colors text-sm',
                    selectedPrice === range.value
                      ? 'bg-white text-black'
                      : 'bg-primary-800 text-white'
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div>
            <h3 className="text-white font-semibold mb-4">Tallas</h3>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((size) => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm transition-colors',
                    selectedSizes.includes(size)
                      ? 'bg-white text-black'
                      : 'bg-primary-800 text-white'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div>
            <h3 className="text-white font-semibold mb-4">Colores</h3>
            <div className="flex flex-wrap gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => toggleColor(color.value)}
                  title={color.value}
                  className={cn(
                    'w-10 h-10 rounded-full transition-all border-2',
                    selectedColors.includes(color.value)
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-black border-transparent'
                      : 'border-primary-600'
                  )}
                  style={{ backgroundColor: color.color }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 sticky bottom-0 bg-black pt-4 pb-2">
            <Button variant="outline" className="flex-1" onClick={clearFilters}>
              Limpiar Todo
            </Button>
            <Button className="flex-1" onClick={() => setIsFilterOpen(false)}>
              Ver {totalProducts} productos
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
