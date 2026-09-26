import { useState } from 'react'
import { useShop } from '../context/ShopContext'
import { STORE_INFO } from '../data/products'
import { ImagePlaceholder } from './ImagePlaceholder'
import { CheckoutModal } from './CheckoutModal'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
} from '@clerk/clerk-react'

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
  } = useShop()

  const { user } = useUser()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  if (!isCartOpen && !isCheckoutOpen) return null


  const freeShippingThreshold = 1499
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal)
  const shippingProgress = Math.min(100, (cartSubtotal / freeShippingThreshold) * 100)

  const clerkName =
    user?.fullName ||
    (user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : '') ||
    null
  const clerkEmail =
    (user?.primaryEmailAddress?.emailAddress as string | undefined) ??
    (user?.emailAddresses?.[0]?.emailAddress as string | undefined) ??
    null
  const clerkPhone =
    (user?.primaryPhoneNumber?.phoneNumber as string | undefined) ??
    (user?.phoneNumbers?.[0]?.phoneNumber as string | undefined) ??
    null

  const customerInfo = clerkName || clerkEmail
    ? `\n*Customer Name:* ${clerkName ?? '—'}\n*Contact:* ${clerkPhone ? clerkPhone + ' ' : ''}(${clerkEmail ?? '—'})\n`
    : ''

  const whatsappMessage = encodeURIComponent(
    `Hello Anju Clothings, I would like to place an order:${customerInfo}\n${cart
      .map(
        (item, index) =>
          `${index + 1}. ${item.product.name} (Size: ${item.selectedSize}) x ${item.quantity} = Rs. ${(
            item.product.price * item.quantity
          ).toLocaleString('en-IN')}.00`
      )
      .join('\n')}\n\n*Total Amount:* Rs. ${cartSubtotal.toLocaleString('en-IN')}.00\n\nPlease confirm availability and delivery details.`
  )

  const handleWhatsAppCheckout = () => {
    window.open(`https://wa.me/${STORE_INFO.phoneRaw}?text=${whatsappMessage}`, '_blank')
  }

  const handleGoToCatalog = () => {
    closeCart()
    navigateTo('all-products')
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Dark overlay backdrop */}
      <div
        onClick={closeCart}
        className="fixed inset-0 bg-charcoal/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-full sm:max-w-md flex pl-0 sm:pl-10 z-50 pointer-events-none">
        <div className="w-full h-full bg-white shadow-2xl flex flex-col justify-between pointer-events-auto">
          
          {/* Drawer Header */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-ivory">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-charcoal">Your Shopping Bag</h2>
              <span className="text-xs bg-[#769055] text-white px-2 py-0.5 rounded-full font-bold">
                {cartCount}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-2 text-gray-400 hover:text-charcoal transition-colors cursor-pointer"
              aria-label="Close bag"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Free Shipping Progress */}
          <div className="bg-cream/70 px-5 py-3 border-b border-border/60">
            {amountToFreeShipping > 0 ? (
              <p className="text-xs text-charcoal mb-1.5 font-medium">
                Add <span className="font-bold text-[#769055]">Rs. {amountToFreeShipping.toLocaleString('en-IN')}.00</span> more to unlock <strong className="text-[#769055]">FREE SHIPPING</strong>!
              </p>
            ) : (
              <p className="text-xs font-bold text-green-700 mb-1.5 flex items-center gap-1">
                🎉 Congratulations! You have unlocked FREE Shipping!
              </p>
            )}
            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#769055] h-full transition-all duration-500 ease-out"
                style={{ width: `${shippingProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-4">
                <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto text-3xl">
                  🛍️
                </div>
                <h3 className="font-display text-lg font-bold text-charcoal">Your bag is empty</h3>
                <p className="text-xs text-muted max-w-xs mx-auto">
                  Explore our festive sarees, designer lehengas, and hand-embroidered anarkali collections!
                </p>
                <button
                  onClick={handleGoToCatalog}
                  className="mt-2 px-6 py-2.5 bg-[#769055] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#5e7343] transition-colors cursor-pointer"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={`${item.product.id}-${item.selectedSize}`}
                  className="flex gap-4 p-3 border border-border/60 bg-ivory/40 rounded-none relative group"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-24 shrink-0 overflow-hidden bg-cream">
                    <ImagePlaceholder
                      src={item.product.img}
                      alt={item.product.name}
                      aspectRatio="2/3"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between text-left">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-medium text-xs sm:text-sm text-charcoal line-clamp-1">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                          className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                          aria-label="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">
                        Size: <span className="font-semibold text-charcoal">{item.selectedSize}</span>
                      </p>
                      <p className="text-xs font-bold text-[#769055] mt-1">
                        Rs. {item.product.price.toLocaleString('en-IN')}.00
                      </p>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-gray-300 bg-white">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.selectedSize, -1)}
                          className="px-2 py-0.5 text-xs text-charcoal hover:bg-gray-100 cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="px-3 py-0.5 text-xs font-bold text-charcoal">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.selectedSize, 1)}
                          className="px-2 py-0.5 text-xs text-charcoal hover:bg-gray-100 cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs font-semibold text-charcoal ml-auto">
                        Rs. {(item.product.price * item.quantity).toLocaleString('en-IN')}.00
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer & Checkout */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-gray-200 bg-ivory space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal ({cartCount} items)</span>
                <span className="font-bold text-charcoal text-base">
                  Rs. {cartSubtotal.toLocaleString('en-IN')}.00
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted">
                <span>Shipping</span>
                <span>{amountToFreeShipping === 0 ? 'FREE' : 'Rs. 99.00'}</span>
              </div>

              {/* Login Status & Checkout Protection — Clerk-based */}
              <SignedIn>
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900 flex items-center justify-between">
                  <span>✓ Ordering as <strong>{clerkName ?? (clerkEmail ?? 'you')}</strong></span>
                  {clerkPhone && <span className="text-muted">{clerkPhone}</span>}
                </div>
              </SignedIn>
              <SignedOut>
                <div className="bg-amber-50 border border-amber-200 p-3 text-left">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-1">
                    <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <span>Account Login Required</span>
                  </div>
                  <p className="text-[11px] text-amber-700 mb-2">
                    Please log in or sign up before checking out so we can confirm your order details and track delivery.
                  </p>
                  <div className="flex gap-2">
                    <SignInButton mode="modal" fallbackRedirectUrl="/">
                      <button
                        onClick={closeCart}
                        className="flex-1 py-2 bg-[#769055] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#5e7343] transition-colors cursor-pointer"
                      >
                        Log In / Sign Up →
                      </button>
                    </SignInButton>
                  </div>
                </div>
              </SignedOut>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                {/* Direct WhatsApp Ordering */}
                <SignedIn>
                  <button
                    type="button"
                    onClick={handleWhatsAppCheckout}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Order Instant via WhatsApp
                  </button>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal" fallbackRedirectUrl="/">
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Log in to Order via WhatsApp
                    </button>
                  </SignInButton>
                </SignedOut>

                {/* Regular Checkout */}
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-3 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🛍️</span> Proceed to Checkout (Rs. {cartSubtotal.toLocaleString('en-IN')}.00)
                </button>
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

