import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AccountPage } from '@/pages/account/AccountPage';
import { AdminDashboardPage } from '@/pages/account/AdminDashboardPage';

export function AccountRouter() {
  const { profile, user } = useAuthStore();
  const navigate = useNavigate();

  // Debug: Log para ver qué está pasando
  console.log('========== ACCOUNT ROUTER DEBUG ==========');
  console.log('User:', user);
  console.log('Profile:', profile);
  console.log('User role:', user?.role);
  console.log('Profile role:', profile?.role);
  console.log('==========================================');

  // Determinar el rol del usuario (usar profile o user)
  const userRole = profile?.role || user?.role;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  // Si es admin, redirigir directamente al panel /admin
  useEffect(() => {
    if (isAdmin) {
      console.log('🚀 Usuario es ADMIN - Redirigiendo a /admin');
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, navigate]);

  // Si es admin, mostrar el AdminDashboardPage mientras redirige
  if (isAdmin) {
    console.log('✅ AccountRouter - Mostrando panel admin para:', profile?.email || user?.email);
    return <AdminDashboardPage />;
  }

  // Si no es admin, mostrar la página de cuenta normal
  console.log('👤 AccountRouter - Mostrando cuenta de cliente para:', profile?.email || user?.email);
  return <AccountPage />;
}
