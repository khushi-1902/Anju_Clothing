import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import {
  SignIn,
  SignUp,
  UserProfile,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
} from '@clerk/clerk-react'
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

function SeoHandler() {
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname
    if (path === '/') {
      document.title = 'Anju Clothing | Luxury Indian Ethnic Wear & Handcrafted Festive Outfits'
    } else if (path.startsWith('/all-products') || path.startsWith('/category')) {
      document.title = 'Explore All Collections | Anju Clothing'
    } else if (path.startsWith('/bestsellers')) {
      document.title = 'Best Sellers - Most Loved Outfits | Anju Clothing'
    } else if (path.startsWith('/contact')) {
      document.title = 'Contact Us & International Orders | Anju Clothing'
    } else if (path.startsWith('/sign-in')) {
      document.title = 'Log In | Anju Clothing'
    } else if (path.startsWith('/sign-up')) {
      document.title = 'Create Account | Anju Clothing'
    } else if (path.startsWith('/account')) {
      document.title = 'My Account & Orders | Anju Clothing'
    }
  }, [location.pathname])

  return null
}

function ClerkSignInPage() {
  return (
    <div className="min-h-[calc(100vh-180px)] py-14 sm:py-20 bg-ivory flex items-start justify-center px-4">
      <div className="w-full max-w-md">
        <SignIn
          path="/sign-in"
          signUpUrl="/sign-up"
          afterSignInUrl="/"
          afterSignUpUrl="/"
          appearance={{
            layout: {
              socialButtonsVariant: 'blockButton',
            },
          }}
        />
      </div>
    </div>
  )
}

function ClerkSignUpPage() {
  return (
    <div className="min-h-[calc(100vh-180px)] py-14 sm:py-20 bg-ivory flex items-start justify-center px-4">
      <div className="w-full max-w-md">
        <SignUp
          path="/sign-up"
          signInUrl="/sign-in"
          afterSignInUrl="/"
          afterSignUpUrl="/"
          appearance={{
            layout: {
              socialButtonsVariant: 'blockButton',
            },
          }}
        />
      </div>
    </div>
  )
}

function ClerkAccountPage() {
  return (
    <div className="min-h-[calc(100vh-180px)] py-10 sm:py-14 bg-ivory px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-charcoal mb-1">
            My Account
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Manage your profile, security settings, and sign-in sessions.
          </p>
        </div>
        <div className="bg-white border border-border/60 shadow-sm">
          <UserProfile path="/account" />
        </div>
      </div>
    </div>
  )
}

function ProtectedAccount() {
  return (
    <>
      <SignedIn>
        <ClerkAccountPage />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/account" />
      </SignedOut>
    </>
  )
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

        {/* Clerk-hosted sign-in & sign-up pages. */}
        <Route path="/sign-in" element={<ClerkSignInPage />} />
        <Route path="/sign-up" element={<ClerkSignUpPage />} />
        <Route path="/sign-in/*" element={<ClerkSignInPage />} />
        <Route path="/sign-up/*" element={<ClerkSignUpPage />} />

        {/* Old URL paths: /login /signup /account → redirect to Clerk equivalents.
            Kept so existing bookmards still work and any lingering navigateTo('login') /
            navigateTo('signup') / navigateTo('account') calls go to the right place. */}
        <Route path="/login" element={<ClerkSignInPage />} />
        <Route path="/signup" element={<ClerkSignUpPage />} />
        <Route path="/account" element={<ProtectedAccount />} />

        <Route path="*" element={<HomePage />} />
      </Routes>
    </main>
  )
}

export default function App() {
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
