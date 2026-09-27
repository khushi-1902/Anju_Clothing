import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { ShopProvider } from './context/ShopContext'
import { AnnouncementBar } from './components/AnnouncementBar'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { CartDrawer } from './components/CartDrawer'
import { WishlistDrawer } from './components/WishlistDrawer'
import { QuickViewModal } from './components/QuickViewModal'

import { HomePage } from './pages/HomePage'
import { AllProductsPage } from './pages/AllProductsPage'
import { BestsellersPage } from './pages/BestsellersPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ContactUsPage } from './pages/ContactUsPage'
import { AuthPage } from './pages/AuthPage'
import { TrackOrderPage } from './pages/TrackOrderPage'
import { OrdersPage } from './pages/OrdersPage'

// Admin Module (Phase 1 & Phase 2)
import { AdminRouteGuard } from './admin/AdminRouteGuard'
import { AdminLayout } from './admin/AdminLayout'
import { AdminDashboardPage } from './admin/pages/AdminDashboardPage'
import { AdminProductsPage } from './admin/pages/AdminProductsPage'
import { AdminOrdersPage } from './admin/pages/AdminOrdersPage'
import { AdminCustomersPage } from './admin/pages/AdminCustomersPage'
import { AdminSettingsPage } from './admin/pages/AdminSettingsPage'

function SeoHandler() {
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname
    if (path.startsWith('/admin')) {
      document.title = 'Store Admin | Anju Clothing Management'
    } else if (path === '/') {
      document.title = 'Anju Clothing | Luxury Indian Ethnic Wear & Handcrafted Festive Outfits'
    } else if (path.startsWith('/all-products') || path.startsWith('/category')) {
      document.title = 'Explore All Collections | Anju Clothing'
    } else if (path.startsWith('/bestsellers')) {
      document.title = 'Best Sellers - Most Loved Outfits | Anju Clothing'
    } else if (path.startsWith('/contact')) {
      document.title = 'Contact Us & International Orders | Anju Clothing'
    } else if (path.startsWith('/sign-in') || path.startsWith('/login')) {
      document.title = 'Log In | Anju Clothing Luxury Club'
    } else if (path.startsWith('/sign-up') || path.startsWith('/signup')) {
      document.title = 'Create Account | Anju Clothing Luxury Club'
    } else if (path.startsWith('/track')) {
      document.title = 'Live Courier & Order Tracking | Anju Clothing'
    } else if (path.startsWith('/orders') || path.startsWith('/account')) {
      document.title = 'My Orders & Account | Anju Clothing'
    }
  }, [location.pathname])

  return null
}

function MainContent() {
  return (
    <main className="flex-1">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/all-products" element={<AllProductsPage />} />
        <Route path="/category/:categorySlug" element={<AllProductsPage />} />
        <Route path="/bestsellers" element={<BestsellersPage />} />
        <Route path="/product/:productId" element={<ProductDetailPage />} />
        <Route path="/contact" element={<ContactUsPage />} />

        {/* E-Commerce Auth (Clerk Integrated) */}
        <Route path="/sign-in" element={<AuthPage initialMode="sign-in" />} />
        <Route path="/sign-up" element={<AuthPage initialMode="sign-up" />} />
        <Route path="/sign-in/*" element={<AuthPage initialMode="sign-in" />} />
        <Route path="/sign-up/*" element={<AuthPage initialMode="sign-up" />} />
        <Route path="/login" element={<AuthPage initialMode="sign-in" />} />
        <Route path="/signup" element={<AuthPage initialMode="sign-up" />} />

        {/* Live Order Tracking & Management */}
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/track/:orderNumber" element={<TrackOrderPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/account" element={<OrdersPage />} />

        <Route path="*" element={<HomePage />} />
      </Routes>
    </main>
  )
}

export default function App() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  if (isAdminRoute) {
    return (
      <>
        <SeoHandler />
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRouteGuard>
                <AdminLayout />
              </AdminRouteGuard>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Routes>
      </>
    )
  }

  return (
    <ShopProvider>
      <SeoHandler />
      <div className="min-h-screen flex flex-col font-body bg-ivory text-charcoal selection:bg-olive selection:text-white">
        {/* Top Announcement Bar */}
        <AnnouncementBar />

        {/* Sticky Header with Navigation, Wishlist & Cart */}
        <Header />

        {/* Active Page View via React Router */}
        <MainContent />

        {/* Global Footer */}
        <Footer />

        {/* Slide-over Interactive Drawers & Modals */}
        <CartDrawer />
        <WishlistDrawer />
        <QuickViewModal />
      </div>
    </ShopProvider>
  )
}
