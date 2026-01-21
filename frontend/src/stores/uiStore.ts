import { create } from 'zustand';

interface UIState {
  // Mobile menu
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;

  // Search
  isSearchOpen: boolean;
  searchQuery: string;
  toggleSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;

  // Modals
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Quick view
  quickViewProduct: string | null;
  openQuickView: (productId: string) => void;
  closeQuickView: () => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Loading states
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Scroll
  isScrolled: boolean;
  setIsScrolled: (scrolled: boolean) => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export const useUIStore = create<UIState>((set) => ({
  // Mobile menu
  isMobileMenuOpen: false,
  toggleMobileMenu: () =>
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),

  // Search
  isSearchOpen: false,
  searchQuery: '',
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
  closeSearch: () => set({ isSearchOpen: false, searchQuery: '' }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Modals
  activeModal: null,
  modalData: null,
  openModal: (modalId, data) =>
    set({ activeModal: modalId, modalData: data || null }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Quick view
  quickViewProduct: null,
  openQuickView: (productId) => set({ quickViewProduct: productId }),
  closeQuickView: () => set({ quickViewProduct: null }),

  // Notifications
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: Date.now().toString() },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),

  // Theme
  theme: 'dark',
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),

  // Loading states
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  // Scroll
  isScrolled: false,
  setIsScrolled: (scrolled) => set({ isScrolled: scrolled }),
}));
