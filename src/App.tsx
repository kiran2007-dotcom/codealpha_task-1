import { AccountView } from './components/AccountView';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { CatalogView } from './components/CatalogView';
import { CheckoutView } from './components/CheckoutView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { OrdersView } from './components/OrdersView';
import { ProductDetailView } from './components/ProductDetailView';
import { ToastContainer } from './components/ToastContainer';
import { WishlistView } from './components/WishlistView';
import { StoreProvider, useStore } from './context/StoreContext';

function StorefrontShell() {
  const { activeView } = useStore();

  return (
    <div className="min-h-screen flex flex-col ambient-canvas text-zinc-900 relative overflow-x-clip">
      {/* Subtle architectural tonal light orbs behind frosted glass surfaces */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden -z-0"
      >
        <div className="absolute -top-32 -left-24 w-[36rem] h-[36rem] rounded-full bg-white/80 blur-3xl" />
        <div className="absolute top-1/4 -right-28 w-[34rem] h-[34rem] rounded-full bg-zinc-300/45 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[40rem] h-[28rem] rounded-full bg-zinc-200/50 blur-3xl" />
      </div>

      <Header />
      <main className="flex-1 relative z-10">
        {activeView === 'home' && <HomeView />}
        {activeView === 'catalog' && <CatalogView />}
        {activeView === 'product' && <ProductDetailView />}
        {activeView === 'checkout' && <CheckoutView />}
        {activeView === 'orders' && <OrdersView />}
        {activeView === 'account' && <AccountView />}
        {activeView === 'wishlist' && <WishlistView />}
        {activeView === 'admin' && <AdminDashboard />}
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
      <CartDrawer />
      <AuthModal />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <StorefrontShell />
      </StoreProvider>
    </ErrorBoundary>
  );
}
