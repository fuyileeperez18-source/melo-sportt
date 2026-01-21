import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, ProductVariant, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (product: Product, quantity?: number, variant?: ProductVariant, selectedAccessories?: string[]) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Computed
  getItemCount: () => number;
  getSubtotal: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, quantity = 1, variant, selectedAccessories = []) => {
        set((state) => {
          // Para conjuntos con accesorios, considerar los accesorios al buscar items existentes
          const accessoriesKey = selectedAccessories.sort().join(',');
          const itemKey = product.is_set && selectedAccessories.length > 0
            ? `${product.id}-${variant?.id || 'default'}-${accessoriesKey}`
            : `${product.id}-${variant?.id || 'default'}`;

          const existingItemIndex = state.items.findIndex(
            (item) => {
              const itemIdMatch = item.product.id === product.id &&
                (variant ? item.variant?.id === variant.id : !item.variant);

              // Para conjuntos, también verificar si los accesorios coinciden
              if (product.is_set && product.accessories && product.accessories.length > 0) {
                const itemAccessoriesKey = (item.selected_accessories || []).sort().join(',');
                return itemIdMatch && itemAccessoriesKey === accessoriesKey;
              }

              return itemIdMatch;
            }
          );

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += quantity;
            return { items: newItems, isOpen: true };
          }

          // Calcular precio base + accesorios si aplica
          const basePrice = Number(variant?.price || product.price);

          // Debug: Log accessories calculation
          console.log('🛒 Adding to cart:', {
            productName: product.name,
            basePrice,
            selectedAccessories,
            availableAccessories: product.accessories,
          });

          const accessoriesPrice = (product.accessories || [])
            .filter(acc => {
              const isSelected = selectedAccessories.includes(acc.type);
              console.log(`  Accessory "${acc.type}": ${isSelected ? 'SELECTED' : 'not selected'} - Price: ${acc.price}`);
              return isSelected;
            })
            .reduce((sum, acc) => sum + Number(acc.price), 0);

          const finalPrice = basePrice + accessoriesPrice;

          console.log('💰 Price calculation:', {
            basePrice,
            accessoriesPrice,
            finalPrice,
          });

          const newItem: CartItem = {
            id: `${itemKey}-${Date.now()}`,
            product,
            variant,
            quantity,
            price: finalPrice,
            selected_accessories: product.is_set ? selectedAccessories : undefined,
          };

          return { items: [...state.items, newItem], isOpen: true };
        });
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      openCart: () => {
        set({ isOpen: true });
      },

      closeCart: () => {
        set({ isOpen: false });
      },

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },

      getTotal: () => {
        // Add shipping and taxes here if needed
        return get().getSubtotal();
      },
    }),
    {
      name: 'walmer-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
