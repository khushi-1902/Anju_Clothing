import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useShop } from '../context/ShopContext'
import { createOrder, OrderItem } from '../lib/api'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { cart, cartSubtotal, clearCart, closeCart, shippingSettings } = useShop()
  const { user } = useUser()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Online UPI / Card'>('Online UPI / Card')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      const clerkName =
        user.fullName ||
        (user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : '') ||
        ''
      const clerkEmail =
        (user.primaryEmailAddress?.emailAddress as string | undefined) ??
        (user.emailAddresses?.[0]?.emailAddress as string | undefined) ??
        ''
      const clerkPhone =
        (user.primaryPhoneNumber?.phoneNumber as string | undefined) ??
        (user.phoneNumbers?.[0]?.phoneNumber as string | undefined) ??
        ''

      if (clerkName) setName(clerkName)
      if (clerkEmail) setEmail(clerkEmail)
      if (clerkPhone) setPhone(clerkPhone)
    }
  }, [user])

  if (!isOpen) return null

  const freeShippingThreshold = shippingSettings.freeThreshold || 1999
  const flatShippingFee = shippingSettings.flatFee ?? 99
  const shippingFee = cartSubtotal >= freeShippingThreshold ? 0 : flatShippingFee
  const totalAmount = cartSubtotal + shippingFee
  const codExtraFee = shippingSettings.codAdvanceAmount ?? 200

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!name.trim() || !email.trim() || !phone.trim() || !street.trim() || !city.trim() || !pincode.trim()) {
      setErrorMessage('Please fill in all required shipping fields.')
      return
    }

    if (cart.length === 0) {
      setErrorMessage('Your bag is empty.')
      return
    }

    setIsSubmitting(true)

    const items: OrderItem[] = cart.map((item) => ({
      id: String(item.product.id),
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor,
      img: item.product.img,
    }))

    try {
      const isCod = paymentMethod === 'COD'
      const paymentStatus = isCod ? `COD Confirmed (₹${codExtraFee} Fee Paid)` : 'Paid'
      const formattedPaymentMethod = isCod ? `COD (+₹${codExtraFee} Online Fee)` : 'Online UPI / Card'
      const notes = isCod
        ? `COD Order: Extra ₹${codExtraFee} booking fee paid online. Full actual dress price ₹${totalAmount} to be collected on delivery.`
        : 'Full online payment confirmed.'

      const newOrder = await createOrder({
        clerkUserId: user?.id || null,
        customerName: name.trim(),
        customerEmail: email.trim().toLowerCase(),
        customerPhone: phone.trim(),
        shippingAddress: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim() || 'India',
          pincode: pincode.trim(),
          country: 'India',
        },
        items,
        subtotal: cartSubtotal,
        shippingFee,
        discountAmount: 0,
        totalAmount,
        paymentMethod: formattedPaymentMethod,
        paymentStatus,
        orderStatus: 'Confirmed',
        courierName: shippingSettings.defaultCourier || 'Blue Dart Express',
        estimatedDelivery: shippingSettings.estimatedDelivery || '3–5 Business Days',
        notes,
      })

      // Clean up and direct user to order tracking
      clearCart()
      closeCart()
      onClose()
      navigate(`/track/${newOrder.orderNumber}`)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-charcoal/70 backdrop-blur-xs transition-opacity"
      />

      <div className="flex min-h-screen items-center justify-center p-2 sm:p-4">
        <div className="relative w-full max-w-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden text-left z-50 my-4 sm:my-8 max-h-[92vh] flex flex-col">
          
          {/* Header */}
          <div className="p-4 sm:p-6 bg-[#2C2420] text-white flex items-center justify-between shrink-0">
            <div>
              <span className="text-[10px] text-[#C9973A] uppercase font-bold tracking-widest block">
                ✦ Secure Luxury Checkout
              </span>
              <h2 className="font-display text-lg sm:text-2xl font-bold text-white">
                Complete Your Order
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer text-sm"
              aria-label="Close checkout"
            >
              ✕
            </button>
          </div>

          <SignedOut>
            <div className="p-3 sm:p-4 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900 shrink-0">
              <span>Have a member account? Log in with Clerk to auto-save orders.</span>
              <SignInButton mode="modal">
                <button className="underline font-bold text-[#769055] cursor-pointer">
                  Log In →
                </button>
              </SignInButton>
            </div>
          </SignedOut>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">

            
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Customer Details */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-3 border-b border-gray-100 pb-1.5">
                1. Contact & Customer Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-charcoal mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 focus:border-[#769055] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-charcoal mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 focus:border-[#769055] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-charcoal mb-1">
                    Phone / WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 focus:border-[#769055] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-3 border-b border-gray-100 pb-1.5">
                2. Shipping & Delivery Address
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-charcoal mb-1">
                    Flat / House No. / Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="House/Apartment number, Street, Landmark"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 focus:border-[#769055] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-charcoal mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 focus:border-[#769055] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-charcoal mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maharashtra"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 focus:border-[#769055] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-charcoal mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 400053"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 focus:border-[#769055] focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Options */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-3 border-b border-gray-100 pb-1.5 flex items-center justify-between">
                <span>3. Choose Payment Method</span>
                <span className="text-[11px] font-normal text-muted">100% Encrypted & Secure</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-3.5 border flex items-start gap-3 cursor-pointer transition-colors ${
                    paymentMethod === 'Online UPI / Card'
                      ? 'border-[#769055] bg-emerald-50/40 shadow-xs'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'Online UPI / Card'}
                    onChange={() => setPaymentMethod('Online UPI / Card')}
                    className="mt-0.5 text-[#769055] focus:ring-[#769055]"
                  />
                  <div>
                    <strong className="block text-xs text-charcoal">Full Online Payment (UPI / Card / NetBanking)</strong>
                    <span className="text-[11px] text-muted">Pay full Rs. {totalAmount.toLocaleString('en-IN')}.00 online. Instant priority dispatch.</span>
                  </div>
                </label>

                <label
                  className={`p-3.5 border flex items-start gap-3 cursor-pointer transition-colors ${
                    paymentMethod === 'COD'
                      ? 'border-[#769055] bg-amber-50/40 shadow-xs'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="mt-0.5 text-[#769055] focus:ring-[#769055]"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <strong className="block text-xs text-charcoal">Cash on Delivery (COD)</strong>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                        +₹{codExtraFee} Online Fee
                      </span>
                    </div>
                    <span className="text-[11px] text-muted block mt-0.5">
                      Pay <strong className="text-charcoal font-semibold">extra ₹{codExtraFee} online now</strong> for COD confirmation. Pay the <strong className="text-charcoal font-semibold">actual dress price (Rs. {totalAmount.toLocaleString('en-IN')}.00) during delivery</strong>.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Order Price Summary */}
            <div className="p-4 bg-[#FAF8F5] border border-border/80 text-xs space-y-2">
              <div className="flex justify-between text-muted">
                <span>Items Subtotal ({cart.length} unique items)</span>
                <span>Rs. {cartSubtotal.toLocaleString('en-IN')}.00</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Shipping ({shippingSettings.defaultCourier || 'Express'} • {shippingSettings.estimatedDelivery || '3–5 Days'})</span>
                <span>{shippingFee === 0 ? 'FREE' : `Rs. ${shippingFee}.00`}</span>
              </div>
              <div className="flex justify-between text-charcoal font-bold text-sm pt-2 border-t border-gray-200">
                <span>Actual Dress / Order Amount</span>
                <span className="text-[#769055]">Rs. {totalAmount.toLocaleString('en-IN')}.00</span>
              </div>

              {/* COD Split Breakdown Highlight */}
              {paymentMethod === 'COD' && (
                <div className="mt-2 p-3 bg-amber-50/80 border border-amber-200 rounded-none space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold text-amber-950">
                    <span className="flex items-center gap-1">
                      <span>💳</span> Extra COD Booking Fee (Paid Online Now):
                    </span>
                    <span className="text-amber-900 font-bold">Rs. {codExtraFee}.00</span>
                  </div>
                  <div className="flex justify-between text-charcoal font-medium pt-1 border-t border-amber-200/60">
                    <span className="flex items-center gap-1">
                      <span>📦</span> Actual Dress Price to Pay on Delivery (Cash / UPI):
                    </span>
                    <span className="font-bold text-charcoal">Rs. {totalAmount.toLocaleString('en-IN')}.00</span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-charcoal text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Back to Bag
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  'Placing Order...'
                ) : paymentMethod === 'COD' ? (
                  `Pay ₹${codExtraFee} Online & Confirm Order (Pay Rs. ${totalAmount.toLocaleString('en-IN')}.00 on Delivery) →`
                ) : (
                  `Confirm & Place Order (Rs. ${totalAmount.toLocaleString('en-IN')}.00) →`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
