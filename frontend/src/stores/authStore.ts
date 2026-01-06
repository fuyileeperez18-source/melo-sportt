import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User as AppUser } from '@/types';
import { authService, userService } from '@/lib/services';

interface AuthState {
  user: AppUser | null;
  profile: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: AppUser | null) => void;
  setProfile: (profile: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  signIn: (email: string, password: string) => Promise<AppUser | undefined>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<AppUser>) => Promise<void>;
  fetchProfile: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setProfile: (profile) => {
        set({ profile });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      signIn: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await authService.signIn(email, password);
          console.log('🔐 [authStore.signIn] Response COMPLETA from authService:', JSON.stringify(response, null, 2));
          console.log('🔐 [authStore.signIn] typeof response:', typeof response);
          console.log('🔐 [authStore.signIn] response.user:', response.user);
          console.log('🔐 [authStore.signIn] response.user?.role:', response.user?.role);
          console.log('🔐 [authStore.signIn] Token presente?', !!response.token);

          if (!response || !response.user) {
            console.error('❌ [authStore.signIn] PROBLEMA: Response sin user!', response);
            throw new Error('Respuesta inválida del servidor');
          }

          if (!response.user.role) {
            console.error('❌ [authStore.signIn] PROBLEMA: Usuario sin role!', response.user);
            throw new Error('Usuario sin role en la respuesta');
          }

          console.log('✅ [authStore.signIn] Datos válidos, guardando en estado...');

          // IMPORTANTE: Guardar user Y profile con el role
          set({
            user: response.user,
            profile: response.user,
            isAuthenticated: true,
            isLoading: false  // Importante: actualizar isLoading aquí
          });

          console.log('✅ [authStore.signIn] Estado actualizado:');
          console.log('   - User:', get().user);
          console.log('   - Profile:', get().profile);
          console.log('   - Role:', get().profile?.role);
          console.log('   - isAuthenticated:', get().isAuthenticated);
          console.log('✅ [authStore.signIn] Devolviendo user con role:', response.user.role);

          return response.user; // Devolver el user para que LoginPage lo use
        } catch (error) {
          console.error('❌ [authStore.signIn] Error capturado:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      signUp: async (email, password, fullName) => {
        set({ isLoading: true });
        try {
          const { user } = await authService.signUp(email, password, fullName);
          set({ user, profile: user, isAuthenticated: !!user });
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        set({ isLoading: true });
        try {
          await authService.signOut();
          // Limpiar localStorage completamente
          localStorage.removeItem('melo-sportt-auth');
          localStorage.removeItem('melo_sportt_token');
          set({ user: null, profile: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },

      signInWithGoogle: async () => {
        set({ isLoading: true });
        try {
          await authService.signInWithGoogle();
        } finally {
          set({ isLoading: false });
        }
      },

      resetPassword: async (email) => {
        await authService.resetPassword(email);
      },

      updateProfile: async (updates) => {
        const { profile } = get();
        if (!profile) return;

        const updatedProfile = await userService.updateProfile(profile.id, updates);
        set({ profile: updatedProfile, user: updatedProfile });
      },

      fetchProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const profile = await userService.getProfile(user.id);
          set({ profile });
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      },

      initialize: async () => {
        console.log('🔄 [authStore.initialize] Iniciando inicialización...');
        set({ isLoading: true });

        try {
          // Fuente de verdad: si no hay token, no hay sesión válida.
          const token = localStorage.getItem('melo_sportt_token');
          if (!token) {
            set({ user: null, profile: null, isAuthenticated: false });
            return;
          }

          // Validar token con el servidor para evitar que el estado persistido deje la app
          // en "logueado" cuando el token expiró/cambió.
          const user = await authService.getSession();

          if (user) {
            set({ user, profile: user, isAuthenticated: true });
          } else {
            localStorage.removeItem('melo-sportt-auth');
            localStorage.removeItem('melo_sportt_token');
            set({ user: null, profile: null, isAuthenticated: false });
          }
        } catch (error) {
          console.error('❌ [authStore.initialize] Error initializing auth:', error);
          localStorage.removeItem('melo-sportt-auth');
          localStorage.removeItem('melo_sportt_token');
          set({ user: null, profile: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
          console.log('🔄 [authStore.initialize] Inicialización completada');
        }
      },
    }),
    {
      name: 'melo-sportt-auth',
      // IMPORTANTE: Persistir TODO incluyendo profile con role
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
