import React, { useEffect, useState } from 'react'
import { useShop } from '../context/ShopContext'
import { ImagePlaceholder } from './ImagePlaceholder'
import { CheckoutModal } from './CheckoutModal'
import { useUser } from '@clerk/clerk-react'

export function CartDrawer() {
  const {
    cart,
    isCartOpen,
    closeCart,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
    cartCount,
    navigateTo,
    shippingSettings,
    toggleWishlist,
    isInWishlist,
  } = useShop()

  const { user } = useUser()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  // Handle Esc key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCartOpen) {
        closeCart()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCartOpen, closeCart])

  if (!isCartOpen && !isCheckoutOpen) return null

  // Free shipping progress calculations
  const freeShippingThreshold = shippingSettings.freeThreshold || 1999
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal)
  const shippingProgress = Math.min(100, (cartSubtotal / freeShippingThreshold) * 100)

  // Price calculations
  const totalMRP = cart.reduce(
    (sum, item) => sum + (item.product.originalPrice || item.product.price) * item.quantity,
    0
  )
  const totalDiscount = Math.max(0, totalMRP - cartSubtotal)
  const isFreeShipping = cartSubtotal >= freeShippingThreshold || cartSubtotal === 0

  const clerkName =
    user?.fullName ||
    (user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : '') ||
    null
  const clerkEmail =
    (user?.primaryEmailAddress?.emailAddress as string | undefined) ??
    (user?.emailAddresses?.[0]?.emailAddress as string | undefined) ??
    null

  const handleGoToCatalog = () => {
    closeCart()
    navigateTo('all-products')
  }

  const handleMoveToWishlist = (productId: string, selectedSize: string) => {
    if (!isInWishlist(productId)) {
      toggleWishlist(productId)
    }
    removeFromCart(productId, selectedSize)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in cursor-pointer"
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-full sm:max-w-md flex z-50 pointer-events-none">
        <div className="w-full h-full bg-[#FAF9F6] shadow-2xl flex flex-col justify-between pointer-events-auto border-l border-gray-200 animate-in slide-in-from-right duration-300">
          
          {/* 1. Header (Sticky Top) */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-gray-900 uppercase font-serif">
                  Shopping Bag
                </h2>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#3e502a] text-white tabular-nums">
                  {cartCount} {cartCount === 1 ? 'ITEM' : 'ITEMS'}
                </span>
              </div>
              {(clerkName || clerkEmail) && (
                <span className="text-[11px] text-gray-500 truncate mt-0.5">
                  Logged in as <strong className="text-gray-800 font-medium">{clerkName || clerkEmail}</strong>
                </span>
              )}
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Close bag"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 2. Free Shipping Progress Bar (Slim & Compact) */}
          {cart.length > 0 && (
            <div className="px-4 py-2.5 sm:px-5 bg-[#FAF5EE] border-b border-[#E8D5C0]/60 shrink-0">
              <div className="flex items-center justify-between text-xs leading-tight">
                {amountToFreeShipping > 0 ? (
                  <span className="text-gray-700 text-[11px] sm:text-xs">
                    Shop for <strong className="text-gray-900 font-bold">₹{amountToFreeShipping.toLocaleString('en-IN')}</strong> more for Free Delivery
                  </span>
                ) : (
                  <span className="text-[#3e502a] font-bold text-[11px] sm:text-xs flex items-center gap-1.5">
                    <span>✨</span>
                    <span>Free Delivery unlocked on this order!</span>
                  </span>
                )}
                <span className="text-[10px] font-mono text-gray-500 tabular-nums font-semibold">
                  {Math.round(shippingProgress)}%
                </span>
              </div>
              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-gradient-to-r from-[#c49332] to-[#3e502a] transition-all duration-500 rounded-full"
                  style={{ width: `${shippingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* 3. Main Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-20 px-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#FAF5EE] border border-[#E8D5C0] flex items-center justify-center mx-auto text-[#c49332] text-2xl shadow-xs">
                  🛍️
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900 font-serif">Your bag is empty</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                    Explore our festive handcrafted suits, designer sarees, and luxury sets.
                  </p>
                </div>
                <button
                  onClick={handleGoToCatalog}
                  className="mt-3 inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-[#4d6333] via-[#3e502a] to-[#4d6333] hover:from-[#354523] hover:to-[#354523] text-white text-xs font-serif font-bold uppercase tracking-wider rounded-md shadow-sm transition-all cursor-pointer"
                >
                  Continue Shopping →
                </button>
              </div>
            ) : (
              <>
                {/* Item Cards List */}
                <div className="space-y-3">
                  {cart.map((item) => {
                    const originalItemPrice = item.product.originalPrice || item.product.price
                    const hasDiscount = originalItemPrice > item.product.price
                    const discountPercent = hasDiscount
                      ? Math.round(((originalItemPrice - item.product.price) / originalItemPrice) * 100)
                      : 0

                    return (
                      <div
                        key={`${item.product.id}-${item.selectedSize}`}
                        className="bg-white border border-gray-200 rounded-md p-3 relative shadow-xs hover:border-[#c9973a]/60 transition-colors"
                      >
                        {/* Top-Right Card Remove (X) Icon */}
                        <button
                          onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                          className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-700 p-1 rounded transition-colors cursor-pointer"
                          aria-label={`Remove ${item.product.name} from bag`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        <div className="flex gap-3 items-start pr-6">
                          {/* Left: Product Image (3:4 ratio) */}
                          <div className="w-[84px] sm:w-[90px] h-[112px] sm:h-[120px] shrink-0 rounded-xs overflow-hidden bg-gray-50 border border-gray-200/80">
                            <ImagePlaceholder
                              src={item.product.img}
                              alt={item.product.name}
                              aspectRatio="2/3"
                            />
                          </div>

                          {/* Right: Info Column */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                            <div>
                              <h4 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                                {item.product.name}
                              </h4>
                              <p className="text-[11px] text-gray-500 mt-0.5 truncate font-serif">
                                {item.product.category || 'Festive Couture'}
                              </p>

                              {/* Size & Quantity Selectors Side-by-Side */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {/* Size Pill */}
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-800 text-xs font-semibold rounded">
                                  <span className="text-gray-500 font-normal">Size:</span>
                                  <span>{item.selectedSize}</span>
                                </div>

                                {/* Qty Dropdown Selector */}
                                <div className="inline-flex items-center bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded text-xs font-semibold text-gray-800 transition-colors">
                                  <label
                                    htmlFor={`qty-${item.product.id}-${item.selectedSize}`}
                                    className="text-gray-500 font-normal mr-1 cursor-pointer"
                                  >
                                    Qty:
                                  </label>
                                  <select
                                    id={`qty-${item.product.id}-${item.selectedSize}`}
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newQty = parseInt(e.target.value, 10)
                                      const delta = newQty - item.quantity
                                      if (delta !== 0) {
                                        updateQuantity(item.product.id, item.selectedSize, delta)
                                      }
                                    }}
                                    className="bg-transparent font-bold cursor-pointer focus:outline-none pr-0.5 text-gray-900"
                                  >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                      <option key={num} value={num}>
                                        {num}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Price Row */}
                            <div className="flex items-baseline gap-2 mt-2.5 pt-1">
                              <span className="text-xs sm:text-sm font-bold text-gray-900 tabular-nums">
                                ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                              </span>
                              {hasDiscount && (
                                <>
                                  <span className="text-[11px] text-gray-400 line-through tabular-nums">
                                    ₹{(originalItemPrice * item.quantity).toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[10px] sm:text-[11px] font-bold text-[#b88628]">
                                    {discountPercent}% OFF
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom Actions: Move to Wishlist & Remove */}
                        <div className="border-t border-gray-100 mt-3 pt-2 flex items-center divide-x divide-gray-200 text-xs font-medium text-gray-600">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                            className="flex-1 py-1 text-center hover:text-red-600 transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveToWishlist(item.product.id, item.selectedSize)}
                            className="flex-1 py-1 text-center hover:text-[#3e502a] font-semibold transition-colors cursor-pointer"
                          >
                            Move to Wishlist
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Apply Coupons Row (UI-Only) */}
                <div className="border border-gray-200 rounded-md p-3 flex items-center justify-between bg-white text-xs font-semibold text-gray-800 cursor-pointer hover:bg-gray-50 transition-colors shadow-2xs">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#c49332]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>Apply Coupons</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#3e502a] font-bold uppercase tracking-wider">
                    <span>Apply</span>
                    <span aria-hidden="true">›</span>
                  </div>
                </div>

                {/* Price Details Section */}
                <div className="border border-gray-200 rounded-md p-3.5 bg-white space-y-2 text-xs shadow-2xs">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 pb-1 border-b border-gray-100">
                    Price Details ({cartCount} {cartCount === 1 ? 'Item' : 'Items'})
                  </h3>

                  <div className="flex justify-between text-gray-600 pt-1">
                    <span>Total MRP</span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      ₹{totalMRP.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Discount on MRP</span>
                      <span className="font-semibold text-emerald-700 tabular-nums">
                        -₹{totalDiscount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>Shipping Fee</span>
                    <span>
                      {isFreeShipping ? (
                        <span className="font-bold text-emerald-700 uppercase">FREE</span>
                      ) : (
                        <span className="font-medium text-gray-900 tabular-nums">₹{shippingSettings.flatFee || 99}</span>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-gray-200 text-sm">
                    <span className="font-bold text-gray-900">Total Amount</span>
                    <span className="font-bold text-base text-gray-900 tabular-nums">
                      ₹{cartSubtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 4. Compact Sticky Footer */}
          {cart.length > 0 && (
            <div className="p-3.5 sm:p-4 border-t border-gray-200 bg-white space-y-2.5 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
              {/* Primary Place Order CTA */}
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full py-3.5 bg-gradient-to-r from-[#4d6333] via-[#3e502a] to-[#4d6333] hover:from-[#354523] hover:to-[#354523] text-white text-xs sm:text-sm font-serif font-bold tracking-wider uppercase rounded-md shadow-sm hover:shadow-md active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Place Order • ₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </button>

              {/* Trust Badges: SSL Secure & 100% Authentic */}
              <div className="flex items-center justify-center gap-3 text-[11px] text-gray-400 font-medium">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  256-bit SSL Secure
                </span>
                <span>•</span>
                <span>100% Authentic</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
    </div>
  )
}
