import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from '@/components/sections/CartDrawer';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { LiveSupportChat } from '@/components/chat/LiveSupportChat';
import { WhatsAppButton } from '@/components/chat/WhatsAppButton';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { PageTransition } from '@/components/animations/PageTransition';

export function Layout() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
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

      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="flex-1">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      {/* Footer */}
      <Footer />

      {/* Cart drawer */}
      <CartDrawer />

      {/* Chat widget */}
      <ChatWidget />

      {/* Live Support Chat */}
      <LiveSupportChat />

      {/* WhatsApp button */}
      <WhatsAppButton />

      {/* Scroll to top button */}
      <ScrollToTop />
    </div>
  );
}

// Simple layout without header/footer (for auth pages, etc.)
export function SimpleLayout() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333',
          },
        }}
      />
      <Outlet />
    </div>
  );
}

// Admin layout
export function AdminLayout() {
  return (
    <div className="min-h-screen bg-primary-950 text-white">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333',
          },
        }}
      />
      <Outlet />
    </div>
  );
}
