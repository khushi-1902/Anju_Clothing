import { useShop } from '../context/ShopContext'
import { useAuth } from '@clerk/clerk-react'

export function MobileBottomNav() {
  const {
    currentPage,
    navigateTo,
    cartCount,
    wishlistCount,
    openCart,
    openWishlist,
    isCartOpen,
    isWishlistOpen,
  } = useShop()

  const { isSignedIn } = useAuth()

  const isShopActive = currentPage === 'all-products' || currentPage === 'bestsellers'
  const isAccountActive = currentPage === 'account' || currentPage === 'orders' || currentPage === 'login' || currentPage === 'signup'

  // On Product Detail Page, the PDP's own sticky Add-to-Cart bar takes full focus
  if (currentPage === 'product-detail') {
    return null
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-3 py-1.5 flex items-center justify-around"
      style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
      aria-label="Mobile Bottom Navigation"
    >
      {/* 1. Shop (All Products Grid) */}
      <button
        onClick={() => navigateTo('all-products')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-colors cursor-pointer ${
          isShopActive ? 'text-[#769055] font-bold' : 'text-[#2c2420] hover:text-[#769055]'
        }`}
        aria-label="Shop All Products"
      >
        <div className="relative flex items-center justify-center">
          {/* 4-Square Grid Icon like user screenshot */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isShopActive ? 2.2 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        </div>
        <span className="text-[10px] tracking-tight font-medium">Shop</span>
      </button>

      {/* 2. Wishlist */}
      <button
        onClick={openWishlist}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-colors cursor-pointer relative ${
          isWishlistOpen ? 'text-[#769055] font-bold' : 'text-[#2c2420] hover:text-[#769055]'
        }`}
        aria-label={`Wishlist (${wishlistCount} items)`}
      >
        <div className="relative flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isWishlistOpen ? 2.2 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span className="absolute -top-1.5 -right-2 bg-black text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {wishlistCount}
          </span>
        </div>
        <span className="text-[10px] tracking-tight font-medium">Wishlist</span>
      </button>

      {/* 3. Cart */}
      <button
        onClick={openCart}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-colors cursor-pointer relative ${
          isCartOpen ? 'text-[#769055] font-bold' : 'text-[#2c2420] hover:text-[#769055]'
        }`}
        aria-label={`Cart (${cartCount} items)`}
      >
        <div className="relative flex items-center justify-center">
          {/* Shopping Cart Icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isCartOpen ? 2.2 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <span className="absolute -top-1.5 -right-2 bg-black text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {cartCount}
          </span>
        </div>
        <span className="text-[10px] tracking-tight font-medium">Cart</span>
      </button>

      {/* 4. Account */}
      <button
        onClick={() => navigateTo(isSignedIn ? 'account' : 'login')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-colors cursor-pointer ${
          isAccountActive ? 'text-[#769055] font-bold' : 'text-[#2c2420] hover:text-[#769055]'
        }`}
        aria-label="Account"
      >
        <div className="relative flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isAccountActive ? 2.2 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <span className="text-[10px] tracking-tight font-medium">Account</span>
      </button>
    </nav>
  )
}
