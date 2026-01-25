import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Layouts
import { Layout, SimpleLayout } from '@/components/layout/Layout';

// Components
import { AccountRouter } from '@/components/AccountRouter';

// Pages
import { HomePage } from '@/pages/HomePage';
import { ShopPage } from '@/pages/ShopPage';
import { ProductPage } from '@/pages/ProductPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { CheckoutSuccessPage } from '@/pages/CheckoutSuccessPage';
import { CheckoutFailurePage } from '@/pages/CheckoutFailurePage';
import { WompiCallbackPage } from '@/pages/WompiCallbackPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminOrders } from '@/pages/admin/AdminOrders';
import { AdminProducts } from '@/pages/admin/AdminProducts';
import { AdminCustomers } from '@/pages/admin/AdminCustomers';
import { AdminAnalytics } from '@/pages/admin/AdminAnalytics';
import { AdminSettings } from '@/pages/admin/AdminSettings';
import { AdminMessages } from '@/pages/admin/AdminMessages';
import { AdminCoupons } from '@/pages/admin/AdminCoupons';
import { AdminManagement } from '@/pages/admin/AdminManagement';
import { SellerCallback } from '@/pages/SellerCallback';
import { DebugPage } from '@/pages/DebugPage';
import { WishlistPage } from '@/pages/WishlistPage';

// Account Pages
import {
  AccountPage,
  AdminDashboardPage,
  EditProfilePage,
  MyOrdersPage,
  OrderDetailPage,
  MyCommissionsPage,
  OwnerDashboardPage,
  TeamManagementPage,
  CommissionsManagementPage
} from '@/pages/account';
import { MessagesPage } from '@/pages/account/MessagesPage';

// Stores
import { useAuthStore } from '@/stores/authStore';

// Contexts
import { SocketProvider } from '@/contexts/SocketContext';

// Styles
import './index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Protected route wrapper
function ProtectedRoute({
  children,
  adminOnly = false,
  ownerOnly = false,
  teamOnly = false,
  superAdminOnly = false
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  ownerOnly?: boolean;
  teamOnly?: boolean;
  superAdminOnly?: boolean;
}) {
  const { isAuthenticated, user, profile, isLoading } = useAuthStore();

  // Usar user o profile, lo que esté disponible
  const currentUser = user || profile;

  console.log('🔐 [ProtectedRoute] Check - isAuthenticated:', isAuthenticated);
  console.log('🔐 [ProtectedRoute] isLoading:', isLoading);
  console.log('🔐 [ProtectedRoute] User:', user);
  console.log('🔐 [ProtectedRoute] Profile:', profile);
  console.log('🔐 [ProtectedRoute] Current user role:', currentUser?.role);
  console.log('🔐 [ProtectedRoute] Flags - adminOnly:', adminOnly, 'ownerOnly:', ownerOnly, 'teamOnly:', teamOnly, 'superAdminOnly:', superAdminOnly);

  if (isLoading) {
    console.log('⏳ [ProtectedRoute] Loading...');
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    console.log('❌ [ProtectedRoute] Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Solo super_admin
  if (superAdminOnly && currentUser?.role !== 'super_admin') {
    console.log('❌ [ProtectedRoute] Super admin only - redirecting to account');
    return <Navigate to="/account" replace />;
  }

  // Solo propietario (super_admin)
  if (ownerOnly && currentUser?.role !== 'super_admin') {
    console.log('❌ [ProtectedRoute] Owner only - redirecting to account');
    return <Navigate to="/account" replace />;
  }

  // Admin o superior
  if (adminOnly && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
    console.log('❌ [ProtectedRoute] Admin only - Role is:', currentUser?.role, '- redirecting to home');
    return <Navigate to="/" replace />;
  }

  // Miembro del equipo (developer, admin, super_admin)
  if (teamOnly && currentUser?.role === 'customer') {
    console.log('❌ [ProtectedRoute] Team only - redirecting to account');
    return <Navigate to="/account" replace />;
  }

  console.log('✅ [ProtectedRoute] Access granted for role:', currentUser?.role);
  return <>{children}</>;
}

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Initialize auth state from stored token
    initialize();

    const onUnauthorized = () => {
      // Asegura que el estado global se alinee con el token (si se limpió por 401)
      useAuthStore.getState().signOut();

      // Si el usuario estaba dentro de una ruta protegida, hacemos hard-redirect
      // para evitar estados intermedios con data cacheada (React Query) y sockets.
      if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/account')) {
        window.location.replace('/login');
      }
    };

    window.addEventListener('melo:unauthorized', onUnauthorized as EventListener);
    return () => {
      window.removeEventListener('melo:unauthorized', onUnauthorized as EventListener);
    };
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
          {/* Public routes with main layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/about" element={<div className="min-h-screen bg-black py-20 text-center text-white">About Page</div>} />
            <Route path="/contact" element={<div className="min-h-screen bg-black py-20 text-center text-white">Contact Page</div>} />
            {/* Checkout status pages */}
            <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
            <Route path="/checkout/failure" element={<CheckoutFailurePage />} />
            <Route path="/checkout/pending" element={<CheckoutSuccessPage />} />
          </Route>

          {/* Auth routes */}
          <Route element={<SimpleLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/forgot-password" element={<div className="min-h-screen bg-black py-20 text-center text-white">Forgot Password</div>} />
          </Route>

          {/* Checkout (separate layout) */}
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/wompi/callback" element={<WompiCallbackPage />} />
          <Route path="/seller/callback" element={<SellerCallback />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          >
            <Route path="orders" element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Account routes */}
          <Route element={<Layout />}>
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountRouter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/edit"
              element={
                <ProtectedRoute>
                  <EditProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/orders"
              element={
                <ProtectedRoute>
                  <MyOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/addresses"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-black py-20 text-center text-white">Mis Direcciones</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/notifications"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-black py-20 text-center text-white">Notificaciones</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/messages"
              element={
                <ProtectedRoute>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/settings"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-black py-20 text-center text-white">Configuración</div>
                </ProtectedRoute>
              }
            />
            {/* Developer/Team member routes */}
            <Route
              path="/account/my-commissions"
              element={
                <ProtectedRoute teamOnly>
                  <MyCommissionsPage />
                </ProtectedRoute>
              }
            />
            {/* Owner only routes */}
            <Route
              path="/account/owner-dashboard"
              element={
                <ProtectedRoute ownerOnly>
                  <OwnerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/team"
              element={
                <ProtectedRoute ownerOnly>
                  <TeamManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/commissions"
              element={
                <ProtectedRoute ownerOnly>
                  <CommissionsManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/admins"
              element={
                <ProtectedRoute superAdminOnly>
                  <AdminManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/debug"
              element={
                <ProtectedRoute>
                  <DebugPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wishlist"
              element={
                <ProtectedRoute>
                  <WishlistPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <div className="text-center">
                  <h1 className="text-6xl font-bold mb-4">404</h1>
                  <p className="text-gray-400 mb-8">Page not found</p>
                  <a href="/" className="px-6 py-3 bg-white text-black rounded-full font-medium">
                    Go Home
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#18181b',
              color: '#fff',
              border: '1px solid #27272a',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        </BrowserRouter>
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;