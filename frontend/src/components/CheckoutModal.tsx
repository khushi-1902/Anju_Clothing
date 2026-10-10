import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useShop } from '../context/ShopContext'
import { createOrder, createPaymentOrder, verifyPayment } from '../lib/api'
import { loadRazorpayScript } from '../lib/razorpay'
import anjuLogo from '../assets/anju-clothing-logo.svg'
import { RazorpayLogo } from './RazorpayLogo'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const {
    cart,
    cartSubtotal,
    clearCart,
    closeCart,
    shippingSettings,
    appliedCoupon,
    cartDiscountAmount,
    cartTotalAfterDiscount,
  } = useShop()
  const { user } = useUser()
  const { getToken, isSignedIn } = useAuth()
  const navigate = useNavigate()

  // Steps: 'address' | 'payment'
  const [activeStep, setActiveStep] = useState<'address' | 'payment'>('address')
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [addressType, setAddressType] = useState<'Home' | 'Work'>('Home')
  const [paymentMethod, setPaymentMethod] = useState<'Online UPI / Card' | 'COD'>('Online UPI / Card')

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

      if (clerkName && !name) setName(clerkName)
      if (clerkEmail && !email) setEmail(clerkEmail)
      if (clerkPhone && !phone) setPhone(clerkPhone)
    }
  }, [user])

  if (!isOpen) return null

  const shippingFee = 0
  const discountAmount = cartDiscountAmount
  const totalAmount = cartTotalAfterDiscount
  const codExtraFee = shippingSettings.codAdvanceAmount ?? 200

  // Amount customer pays online right now
  const amountPayableNow = paymentMethod === 'COD' ? codExtraFee : totalAmount

  const validateAddress = (): boolean => {
    setErrorMessage(null)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const indianPhoneRegex = /^(?:\+91[\-\s]?)?[6-9]\d{9}$/
    const pincodeRegex = /^\d{6}$/

    if (!name.trim()) {
      setErrorMessage('Please enter your full recipient name.')
      return false
    }
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage('Please provide a valid email for order updates.')
      return false
    }
    if (!phone.trim() || !indianPhoneRegex.test(phone.trim())) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.')
      return false
    }
    if (!street.trim() || street.trim().length < 5) {
      setErrorMessage('Please provide a complete delivery street / building address.')
      return false
    }
    if (!city.trim()) {
      setErrorMessage('Please enter your city.')
      return false
    }
    if (!pincode.trim() || !pincodeRegex.test(pincode.trim())) {
      setErrorMessage('Please enter a valid 6-digit delivery PIN code.')
      return false
    }
    return true
  }

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateAddress()) {
      setActiveStep('payment')
    }
  }

  const handleFinalCheckout = async () => {
    setErrorMessage(null)

    if (!isSignedIn) {
      setErrorMessage('Please sign in or create an account to complete your luxury purchase.')
      return
    }

    if (!validateAddress()) {
      setActiveStep('address')
      return
    }

    if (cart.length === 0) {
      setErrorMessage('Your shopping bag is empty.')
      return
    }

    setIsSubmitting(true)

    try {
      const token = await getToken()

      // Resolve variant IDs
      const items = cart.map((item) => {
        let variantId: number | undefined

        if (item.product.variants && item.product.variants.length > 0) {
          const match = item.product.variants.find(
            (v) =>
              (!item.selectedSize || v.size === item.selectedSize) &&
              (!item.selectedColor || v.color === item.selectedColor)
          )
          variantId = match?.id || item.product.variants[0]?.id
        }

        if (!variantId && /^\d+$/.test(item.product.id)) {
          variantId = Number(item.product.id)
        }

        if (!variantId) {
          throw new Error(`Could not resolve variant for "${item.product.name}". Please re-select size.`)
        }

        return {
          productId: Number(item.product.id) || undefined,
          productVariantId: variantId,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          size: item.selectedSize,
          color: item.selectedColor,
          imageUrl: item.product.img,
        }
      })

      const isCodMethod = paymentMethod === 'COD'

      // 1. Create order in PostgreSQL
      const order = await createOrder(
        {
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          shippingAddress: {
            street: street.trim(),
            city: city.trim(),
            state: state.trim() || 'India',
            pincode: pincode.trim(),
            addressType,
          },
          items,
          subtotal: cartSubtotal,
          shippingFee,
          discountAmount,
          couponCode: appliedCoupon?.code,
          totalAmount,
          paymentMethod: isCodMethod ? 'COD' : 'PREPAID',
          amountPayableNow,
          amountDueOnDelivery: isCodMethod ? totalAmount : 0,
        },
        token
      )

      // 2. Load Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error('Razorpay payment gateway failed to initialize. Please check your connection.')
      }

      // 3. Create Gateway Payment Order
      const paymentOrderData = await createPaymentOrder(
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
        token
      )

      // 4. Open Razorpay Gateway
      const options = {
        key: paymentOrderData.keyId,
        amount: paymentOrderData.amount,
        currency: paymentOrderData.currency,
        name: 'ANJU CLOTHING',
        description: isCodMethod
          ? `COD Advance Courier Booking Fee for Order #${order.orderNumber}`
          : `Full Payment for Order #${order.orderNumber}`,
        image: '/assets/anju-clothing-logo.svg',
        order_id: paymentOrderData.razorpayOrderId,
        prefill: {
          name: name.trim(),
          email: email.trim(),
          contact: phone.trim(),
        },
        theme: {
          color: '#769055',
        },
        handler: async function (response: any) {
          try {
            await verifyPayment(
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              token
            )

            clearCart()
            closeCart()
            setIsSubmitting(false)
            onClose()
            navigate('/orders')
          } catch (verifyErr: any) {
            setErrorMessage(verifyErr.message || 'Payment verification failed. Please contact support.')
            setIsSubmitting(false)
          }
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false)
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', function (resp: any) {
        setErrorMessage(resp.error?.description || 'Payment was declined. Please try again.')
        setIsSubmitting(false)
      })
      rzp.open()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place order. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      
      {/* Container: Full height on mobile screens, elegant rounded card on sm+ */}
      <div className="relative w-full max-w-4xl bg-[#F5F5F6] sm:rounded-2xl rounded-none shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto max-h-full sm:max-h-[92vh] border-0 sm:border sm:border-gray-200">
        
        {/* Header Bar: Stacked neatly on mobile, unified on desktop */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3 sm:py-3.5 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <img
                src={anjuLogo}
                alt="Anju Clothing"
                className="h-7 sm:h-9 w-auto max-w-[130px] sm:max-w-[180px] object-contain"
              />
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-700 font-semibold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                <span>🔒</span> <span className="hidden xs:inline">100%</span> Secure
              </span>
            </div>

            {/* Desktop Stepper */}
            <div className="hidden sm:flex items-center gap-2 sm:gap-4 text-xs font-bold tracking-wider">
              <button
                type="button"
                onClick={() => setActiveStep('address')}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeStep === 'address' ? 'text-[#769055] font-extrabold' : 'text-gray-400'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  activeStep === 'address' ? 'bg-[#769055] text-white' : 'bg-gray-200 text-gray-600'
                }`}>1</span>
                <span>ADDRESS</span>
              </button>

              <span className="text-gray-300">———</span>

              <button
                type="button"
                onClick={() => {
                  if (validateAddress()) setActiveStep('payment')
                }}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeStep === 'payment' ? 'text-[#769055] font-extrabold' : 'text-gray-400'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  activeStep === 'payment' ? 'bg-[#769055] text-white' : 'bg-gray-200 text-gray-600'
                }`}>2</span>
                <span>PAYMENT</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors text-base font-bold cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Mobile Stepper Bar (Dedicated clean row on small screens) */}
          <div className="flex sm:hidden items-center justify-center gap-3 pt-2.5 mt-2 border-t border-gray-100 text-[11px] font-bold tracking-wider">
            <button
              type="button"
              onClick={() => setActiveStep('address')}
              className={`flex items-center gap-1.5 transition-colors ${
                activeStep === 'address' ? 'text-[#769055] font-extrabold' : 'text-gray-400'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                activeStep === 'address' ? 'bg-[#769055] text-white' : 'bg-gray-200 text-gray-600'
              }`}>1</span>
              <span>ADDRESS</span>
            </button>

            <span className="text-gray-300">——</span>

            <button
              type="button"
              onClick={() => {
                if (validateAddress()) setActiveStep('payment')
              }}
              className={`flex items-center gap-1.5 transition-colors ${
                activeStep === 'payment' ? 'text-[#769055] font-extrabold' : 'text-gray-400'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                activeStep === 'payment' ? 'bg-[#769055] text-white' : 'bg-gray-200 text-gray-600'
              }`}>2</span>
              <span>PAYMENT</span>
            </button>
          </div>
        </header>

        {/* Member login banner */}
        <SignedOut>
          <div className="bg-amber-50 border-b border-amber-200/80 px-4 sm:px-8 py-2.5 flex items-center justify-between text-xs text-amber-950 shrink-0">
            <div className="flex items-center gap-2 truncate mr-2">
              <span>✨</span>
              <span className="truncate">Already a member? Sign in to autofill details.</span>
            </div>
            <SignInButton mode="modal">
              <button className="font-bold underline text-[#769055] hover:text-[#5e7343] shrink-0 cursor-pointer">
                Log In →
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        {/* Error Notification */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 sm:px-8 py-2.5 flex items-center gap-2 text-xs font-semibold text-rose-800 shrink-0">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Mobile Accordion Order Summary Header (Quick preview at the top on phones) */}
        <div className="lg:hidden bg-white border-b border-gray-200 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileSummaryOpen(!isMobileSummaryOpen)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs cursor-pointer select-none"
          >
            <div className="flex items-center gap-1.5 font-bold text-charcoal">
              <span>🛍️ Bag Summary ({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
              <span className="text-[#769055] font-semibold text-[11px]">
                {isMobileSummaryOpen ? '▲ Hide' : '▼ Details'}
              </span>
            </div>
            <div className="font-extrabold text-[#769055] text-sm tabular-nums">
              ₹{amountPayableNow.toLocaleString('en-IN')}
            </div>
          </button>

          {/* Expandable Bag Preview */}
          {isMobileSummaryOpen && (
            <div className="p-4 bg-[#FAF8F5] border-t border-gray-100 space-y-3 animate-in slide-in-from-top-2 duration-150">
              <div className="max-h-40 overflow-y-auto divide-y divide-gray-200/60 pr-1 space-y-2">
                {cart.map((item, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 flex items-center gap-2.5">
                    {item.product.img ? (
                      <img
                        src={item.product.img}
                        alt={item.product.name}
                        className="w-10 h-12 object-cover rounded-md bg-gray-100 border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-12 bg-gray-100 rounded-md flex items-center justify-center text-sm shrink-0">
                        👗
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-charcoal truncate">{item.product.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                        <span>Qty: {item.quantity}</span>
                      </div>
                      <p className="text-xs font-bold text-[#769055]">
                        ₹{((item.product.price || 0) * item.quantity).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-gray-200 text-[11px] space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{cartSubtotal.toLocaleString('en-IN')}.00</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Coupon ({appliedCoupon?.code})</span>
                    <span>-₹{discountAmount.toLocaleString('en-IN')}.00</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="font-bold text-emerald-700">FREE</span>
                </div>
                {paymentMethod === 'COD' && (
                  <div className="flex justify-between text-amber-900 font-bold bg-amber-50 p-1.5 rounded">
                    <span>COD Advance Courier Fee</span>
                    <span>+₹{codExtraFee}.00</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8">
            
            {/* Left Column: Form & Payment Methods (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              
              {activeStep === 'address' ? (
                /* Address Form */
                <form id="address-form" onSubmit={handleProceedToPayment} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-charcoal flex items-center gap-2">
                      <span>📍</span> Delivery Address Details
                    </h2>
                    <span className="text-[10px] sm:text-[11px] text-gray-400">* Required</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                    {/* Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Priya Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2.5 sm:py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-sm sm:text-xs text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2.5 sm:py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-sm sm:text-xs text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Mobile Phone */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Mobile Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-2.5 sm:px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-xs font-bold text-gray-600 shrink-0">
                          🇮🇳 +91
                        </span>
                        <input
                          type="tel"
                          required
                          placeholder="9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-2.5 sm:py-2 bg-[#FAF8F5] border border-gray-300 rounded-r-lg text-sm sm:text-xs font-mono text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Street Address */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Flat / House No. / Building / Street <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Flat 402, Royal Residency, Linking Road"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="w-full px-3 py-2.5 sm:py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-sm sm:text-xs text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        City <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mumbai"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2.5 sm:py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-sm sm:text-xs text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        State <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Maharashtra"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2.5 sm:py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-sm sm:text-xs text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Pincode */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        PIN Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="e.g. 400050"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2.5 sm:py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-sm sm:text-xs font-mono font-bold text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Address Type Tag */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Address Type
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAddressType('Home')}
                          className={`flex-1 py-2 sm:py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            addressType === 'Home'
                              ? 'bg-[#769055]/10 border-[#769055] text-[#769055]'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          🏠 Home
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddressType('Work')}
                          className={`flex-1 py-2 sm:py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            addressType === 'Work'
                              ? 'bg-[#769055]/10 border-[#769055] text-[#769055]'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          🏢 Work
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-7 py-3 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Payment</span>
                      <span>→</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Payment Options */
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-xs space-y-5">
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 border-b border-gray-100 pb-3">
                    <div>
                      <h2 className="text-xs font-extrabold uppercase tracking-wider text-charcoal flex items-center gap-2">
                        <span>💳</span> Select Payment Method
                      </h2>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Delivering to: <strong className="text-charcoal">{street}, {city} ({pincode})</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveStep('address')}
                      className="text-xs text-[#769055] font-bold underline hover:text-[#5e7343] cursor-pointer self-start xs:self-auto"
                    >
                      Change Address
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Option 1: Full Online Payment */}
                    <div
                      onClick={() => setPaymentMethod('Online UPI / Card')}
                      className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                        paymentMethod === 'Online UPI / Card'
                          ? 'border-[#769055] bg-emerald-50/30 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="paymentOption"
                            checked={paymentMethod === 'Online UPI / Card'}
                            onChange={() => setPaymentMethod('Online UPI / Card')}
                            className="mt-1 text-[#769055] focus:ring-[#769055] shrink-0"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className="font-extrabold text-xs text-[#202223]">
                                UPI / Cards / NetBanking / Wallets
                              </span>
                              <span className="text-[9px] sm:text-[10px] bg-emerald-100 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full">
                                RECOMMENDED
                              </span>
                              <RazorpayLogo height={15} variant="full" />
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                              <span>Pay ₹{totalAmount.toLocaleString('en-IN')} online via</span>
                              <RazorpayLogo height={13} variant="full" />
                              <span>Fast & 100% verified.</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 text-[10px] text-gray-600">
                              <span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold">Google Pay</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold">PhonePe</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold">Paytm</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold">Cards</span>
                            </div>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0 pl-7 sm:pl-0">
                          <span className="text-sm font-extrabold text-emerald-800">
                            ₹{totalAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Option 2: Cash on Delivery with Advance Booking Charge */}
                    <div
                      onClick={() => setPaymentMethod('COD')}
                      className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                        paymentMethod === 'COD'
                          ? 'border-amber-600 bg-amber-50/40 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="paymentOption"
                            checked={paymentMethod === 'COD'}
                            onChange={() => setPaymentMethod('COD')}
                            className="mt-1 text-amber-600 focus:ring-amber-600 shrink-0"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className="font-extrabold text-xs text-[#202223]">
                                Cash on Delivery (COD)
                              </span>
                              <span className="text-[9px] sm:text-[10px] bg-amber-200 text-amber-950 font-extrabold px-2 py-0.5 rounded-full">
                                +₹{codExtraFee} ADVANCE CHARGE
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                              Cash on Delivery is available across eligible orders. A <strong className="font-extrabold text-amber-950">₹{codExtraFee} COD shipping charge</strong> is applicable in addition to the outfit price and must be paid in advance to confirm the COD order. The remaining outfit amount (<strong className="font-extrabold text-charcoal">₹{totalAmount.toLocaleString('en-IN')}</strong>) can be paid at the time of delivery.
                            </p>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0 pl-7 sm:pl-0">
                          <span className="text-xs font-bold text-amber-900 block">
                            Pay ₹{codExtraFee} Now
                          </span>
                          <span className="text-[10px] text-gray-500 block">
                            ₹{totalAmount.toLocaleString('en-IN')} on Delivery
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment CTA Buttons */}
                  <div className="pt-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveStep('address')}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-charcoal text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
                    >
                      ← Back to Address
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleFinalCheckout}
                      className="w-full sm:w-auto px-8 py-3.5 bg-[#769055] hover:bg-[#5e7343] disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        'Opening Gateway...'
                      ) : paymentMethod === 'COD' ? (
                        `Pay ₹${codExtraFee} & Confirm COD →`
                      ) : (
                        `Pay ₹${totalAmount.toLocaleString('en-IN')} & Complete Order →`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Order Summary & Trust Badges (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Order Summary Card (Always visible on lg screens, also displayed below form on mobile) */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                    <span>🛍️</span> Bag Summary ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                  </h3>
                  <span className="text-[11px] font-bold text-[#769055]">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Garment item previews */}
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 pr-1 space-y-2">
                  {cart.map((item, idx) => (
                    <div key={idx} className="pt-2 first:pt-0 flex items-center gap-3">
                      {item.product.img ? (
                        <img
                          src={item.product.img}
                          alt={item.product.name}
                          className="w-12 h-14 object-cover rounded-lg bg-gray-100 border border-gray-200 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-12 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-base shrink-0">
                          👗
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-charcoal truncate">{item.product.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                          {item.selectedSize && <span className="font-semibold bg-gray-100 px-1.5 py-0.2 rounded text-charcoal">Size: {item.selectedSize}</span>}
                          <span>Qty: {item.quantity}</span>
                        </div>
                        <p className="text-xs font-bold text-[#769055] mt-0.5">
                          ₹{((item.product.price || 0) * item.quantity).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Total MRP / Items Subtotal</span>
                    <span className="font-medium">₹{cartSubtotal.toLocaleString('en-IN')}.00</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>Shipping Delivery ({shippingSettings.defaultCourier || 'Express'})</span>
                    <span className="font-bold text-emerald-700">
                      {shippingFee === 0 ? 'FREE' : `₹${shippingFee}.00`}
                    </span>
                  </div>

                  {paymentMethod === 'COD' && (
                    <div className="flex justify-between text-amber-900 font-bold bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px]">
                      <span>Extra COD Advance Courier Charge</span>
                      <span>+₹{codExtraFee}.00</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-charcoal block">
                        Total Payable
                      </span>
                      <span className="text-[10px] text-gray-400">Inclusive of all taxes</span>
                    </div>
                    <span className="text-base font-extrabold text-[#769055]">
                      ₹{amountPayableNow.toLocaleString('en-IN')}.00
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust & Guarantee Badges */}
              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs space-y-2.5 text-[11px] text-gray-600">
                <div className="flex items-center gap-2.5">
                  <span className="text-base shrink-0">🛡️</span>
                  <span><strong>100% Genuine Designer Apparel</strong> handcrafted in India.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base shrink-0">⚡</span>
                  <span><strong>Express Courier Partner:</strong> Blue Dart / Delhivery (3–5 Days).</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base shrink-0">🔒</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <RazorpayLogo height={14} variant="badge" />
                    <span>256-bit encrypted bank checkout.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
