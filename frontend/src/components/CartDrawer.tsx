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
    shippingSettings,
  } = useShop()

  const { user } = useUser()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  if (!isCartOpen && !isCheckoutOpen) return null

  const freeShippingThreshold = shippingSettings.freeThreshold || 1999
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
    ? `\n*Customer:* ${clerkName ?? '—'}\n*Contact:* ${clerkPhone ? clerkPhone + ' ' : ''}(${clerkEmail ?? '—'})\n`
    : ''

  const whatsappMessage = encodeURIComponent(
    `Hello Anju Clothing, I would like to place an order:${customerInfo}\n${cart
      .map(
        (item, index) =>
          `${index + 1}. ${item.product.name} (Size: ${item.selectedSize}) x ${item.quantity} = ₹${(
            item.product.price * item.quantity
          ).toLocaleString('en-IN')}`
      )
      .join('\n')}\n\n*Total Amount:* ₹${cartSubtotal.toLocaleString('en-IN')}\n\nPlease confirm availability and dispatch details.`
  )

  const handleWhatsAppCheckout = () => {
    window.open(`https://wa.me/${STORE_INFO.phoneRaw}?text=${whatsappMessage}`, '_blank')
  }

  const handleGoToCatalog = () => {
    closeCart()
    navigateTo('all-products')
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-full sm:max-w-md flex z-50 pointer-events-none">
        <div className="w-full h-full bg-white shadow-2xl flex flex-col justify-between pointer-events-auto border-l border-zinc-200/80 animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold tracking-tight text-zinc-900">
                Shopping Bag
              </h2>
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-zinc-900 text-white tabular-nums">
                {cartCount}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 -mr-1.5 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              aria-label="Close bag"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              {amountToFreeShipping > 0 ? (
                <span className="text-zinc-600 font-medium">
                  Add <strong className="text-zinc-900 font-semibold">₹{amountToFreeShipping.toLocaleString('en-IN')}</strong> for Free Express Delivery
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Free Express Shipping unlocked!
                </span>
              )}
              <span className="text-[11px] font-mono text-zinc-400 tabular-nums font-medium">
                {Math.round(shippingProgress)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 transition-all duration-500 rounded-full"
                style={{ width: `${shippingProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-zinc-100">
            {cart.length === 0 ? (
              <div className="text-center py-20 px-4 space-y-4">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-900">Your bag is currently empty</h3>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Discover handcrafted ethnic suits, designer sarees, and bridal couture.
                  </p>
                </div>
                <button
                  onClick={handleGoToCatalog}
                  className="mt-2 inline-flex items-center justify-center px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg tracking-wide transition-all shadow-xs cursor-pointer"
                >
                  Explore Catalog →
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={`${item.product.id}-${item.selectedSize}`}
                  className="py-4 flex gap-4 items-start group"
                >
                  {/* Image */}
                  <div className="w-20 h-24 shrink-0 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200/80">
                    <ImagePlaceholder
                      src={item.product.img}
                      alt={item.product.name}
                      aspectRatio="2/3"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-semibold text-zinc-900 line-clamp-2 leading-snug">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                          className="text-zinc-400 hover:text-zinc-700 p-0.5 rounded transition-colors cursor-pointer"
                          aria-label="Remove item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                          Size: {item.selectedSize}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2">
                      {/* Stepper */}
                      <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50/60 p-0.5">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.selectedSize, -1)}
                          className="w-6 h-6 flex items-center justify-center text-xs font-medium text-zinc-600 hover:bg-white hover:text-zinc-900 rounded transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-xs font-semibold text-zinc-900 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.selectedSize, 1)}
                          className="w-6 h-6 flex items-center justify-center text-xs font-medium text-zinc-600 hover:bg-white hover:text-zinc-900 rounded transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-xs font-bold text-zinc-900 tabular-nums">
                        ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-zinc-200 bg-white space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal ({cartCount} items)</span>
                  <span className="font-medium text-zinc-900 tabular-nums">
                    ₹{cartSubtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Shipping</span>
                  <span className="font-semibold text-emerald-700">Free Express</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-zinc-100 text-sm">
                  <span className="font-semibold text-zinc-900">Total Payable</span>
                  <span className="font-bold text-base text-zinc-900 tabular-nums">
                    ₹{cartSubtotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Clerk Auth Badge */}
              <SignedIn>
                <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-2.5 text-xs text-zinc-700 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">Logged in as <strong className="font-medium text-zinc-900">{clerkName ?? clerkEmail}</strong></span>
                  </div>
                  {clerkPhone && <span className="text-[11px] text-zinc-400 font-mono shrink-0">{clerkPhone}</span>}
                </div>
              </SignedIn>
              <SignedOut>
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3 text-left">
                  <div className="flex items-center gap-1.5 text-amber-900 font-medium text-xs mb-1">
                    <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <span>Sign In to Checkout</span>
                  </div>
                  <p className="text-[11px] text-amber-700 mb-2.5">
                    Log in with your phone or email to track shipments and access one-click checkout.
                  </p>
                  <SignInButton mode="modal" fallbackRedirectUrl="/">
                    <button
                      onClick={closeCart}
                      className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Sign In / Register →
                    </button>
                  </SignInButton>
                </div>
              </SignedOut>

              {/* CTAs */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold tracking-wider uppercase rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Proceed to Checkout • ₹{cartSubtotal.toLocaleString('en-IN')}</span>
                </button>

                <SignedIn>
                  <button
                    type="button"
                    onClick={handleWhatsAppCheckout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span>Instant Order via WhatsApp</span>
                  </button>
                </SignedIn>
              </div>

              {/* Guarantees */}
              <div className="flex items-center justify-center gap-4 pt-1 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  256-bit SSL Secure
                </span>
                <span>•</span>
                <span>7-Day Returns</span>
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
