import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, ProductVariant, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (product: Product, quantity?: number, variant?: ProductVariant, includeAccessory?: boolean) => void;
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

      addItem: (product, quantity = 1, variant, includeAccessory = false) => {
        set((state) => {
          // Para conjuntos con accesorios, considerar el accesorio al buscar items existentes
          const itemKey = product.is_set && product.has_accessory 
            ? `${product.id}-${variant?.id || 'default'}-${includeAccessory ? 'with-accessory' : 'without-accessory'}`
            : `${product.id}-${variant?.id || 'default'}`;

          const existingItemIndex = state.items.findIndex(
            (item) => {
              const itemIdMatch = item.product.id === product.id &&
                (variant ? item.variant?.id === variant.id : !item.variant);

              // Para conjuntos, también verificar si el accesorio coincide
              if (product.is_set && product.has_accessory) {
                return itemIdMatch && item.include_accessory === includeAccessory;
              }

              return itemIdMatch;
            }
          );

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += quantity;
            return { items: newItems, isOpen: true };
          }

          // Calcular precio base + accesorio si aplica
          const basePrice = variant?.price || product.price;
          const accessoryPrice = (product.is_set && product.has_accessory && includeAccessory && product.accessory_price) 
            ? product.accessory_price 
            : 0;
          const finalPrice = basePrice + accessoryPrice;

          const newItem: CartItem = {
            id: `${itemKey}-${Date.now()}`,
            product,
            variant,
            quantity,
            price: finalPrice,
            include_accessory: product.is_set && product.has_accessory ? includeAccessory : undefined,
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
