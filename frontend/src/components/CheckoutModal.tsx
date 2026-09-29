import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useShop } from '../context/ShopContext'
import { createOrder, createPaymentOrder, verifyPayment } from '../lib/api'
import { loadRazorpayScript } from '../lib/razorpay'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { cart, cartSubtotal, clearCart, closeCart, shippingSettings } = useShop()
  const { user } = useUser()
  const { getToken, isSignedIn } = useAuth()
  const navigate = useNavigate()

  // Steps: 'address' | 'payment'
  const [activeStep, setActiveStep] = useState<'address' | 'payment'>('address')

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

  const freeShippingThreshold = shippingSettings.freeThreshold || 1999
  const flatShippingFee = shippingSettings.flatFee ?? 99
  const shippingFee = cartSubtotal >= freeShippingThreshold ? 0 : flatShippingFee
  const totalAmount = cartSubtotal + shippingFee
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
          productVariantId: variantId,
          quantity: item.quantity,
        }
      })

      const isCod = paymentMethod === 'COD'
      const backendPaymentMethod = isCod ? 'COD' : 'PREPAID'
      const notes = isCod
        ? `COD Order: Extra ₹${codExtraFee} advance courier booking charge paid online. Rs. ${totalAmount.toLocaleString('en-IN')}.00 due on delivery.`
        : 'Full online payment order.'

      // 1. Create Internal Order
      const newOrder = await createOrder(
        {
          items,
          paymentMethod: backendPaymentMethod,
          customerName: name.trim(),
          customerEmail: email.trim().toLowerCase(),
          customerPhone: phone.trim(),
          shippingAddress: {
            street: `${street.trim()} (${addressType})`.slice(0, 200),
            city: city.trim().slice(0, 100),
            state: (state.trim() || 'India').slice(0, 100),
            pincode: pincode.trim().slice(0, 6),
            country: 'India',
          },
          notes,
        },
        token
      )

      // 2. Create Razorpay Payment Order
      const paymentOrder = await createPaymentOrder(newOrder.orderNumber, token)

      // 3. Load Razorpay Checkout.js
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error('Payment gateway failed to load. Please check your internet connection.')
      }

      // 4. Launch Razorpay Checkout Modal
      const options = {
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency || 'INR',
        name: 'Anju Clothing',
        description: isCod
          ? `Advance COD Booking Fee (₹${paymentOrder.amountPayableNow})`
          : `Order #${newOrder.orderNumber}`,
        order_id: paymentOrder.razorpayOrderId,
        prefill: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          contact: phone.trim(),
        },
        theme: {
          color: '#769055',
        },
        handler: async function (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) {
          try {
            await verifyPayment(response, token)
            clearCart()
            closeCart()
            onClose()
            navigate(`/track/${newOrder.orderNumber}`)
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      
      {/* Container */}
      <div className="relative w-full max-w-4xl bg-[#F5F5F6] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] border border-gray-200">
        
        {/* Header Bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-serif tracking-widest font-bold text-sm sm:text-base text-[#2C2420]">
              ANJU CLOTHING
            </span>
            <span className="hidden sm:inline-block w-px h-4 bg-gray-300"></span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
              <span>🔒</span> 100% Secure Checkout
            </span>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold tracking-wider">
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

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors text-base font-bold cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {/* Member login banner */}
        <SignedOut>
          <div className="bg-amber-50 border-b border-amber-200/80 px-4 sm:px-8 py-2.5 flex items-center justify-between text-xs text-amber-950 shrink-0">
            <div className="flex items-center gap-2">
              <span>✨</span>
              <span>Already a member? Sign in to autofill addresses & track deliveries.</span>
            </div>
            <SignInButton mode="modal">
              <button className="font-bold underline text-[#769055] hover:text-[#5e7343] cursor-pointer">
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

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            
            {/* Left Column: Form & Payment Methods (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {activeStep === 'address' ? (
                /* Address Form */
                <form id="address-form" onSubmit={handleProceedToPayment} className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-charcoal flex items-center gap-2">
                      <span>📍</span> Delivery Address Details
                    </h2>
                    <span className="text-[11px] text-gray-400">* Required fields</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-xs text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
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
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-xs text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Mobile Phone */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Mobile Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-xs font-bold text-gray-600">
                          🇮🇳 +91
                        </span>
                        <input
                          type="tel"
                          required
                          placeholder="9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 rounded-r-lg text-xs font-mono text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
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
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-xs text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
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
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-xs text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
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
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-xs text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
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
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-xs font-mono font-bold text-charcoal focus:bg-white focus:border-[#769055] focus:outline-none transition-colors"
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
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
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
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
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
                /* Payment Options (Myntra Style Cards) */
                <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
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
                      className="text-xs text-[#769055] font-bold underline hover:text-[#5e7343] cursor-pointer"
                    >
                      Change Address
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Option 1: Full Online Payment */}
                    <div
                      onClick={() => setPaymentMethod('Online UPI / Card')}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                        paymentMethod === 'Online UPI / Card'
                          ? 'border-[#769055] bg-emerald-50/30 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="paymentOption"
                            checked={paymentMethod === 'Online UPI / Card'}
                            onChange={() => setPaymentMethod('Online UPI / Card')}
                            className="mt-1 text-[#769055] focus:ring-[#769055]"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-[#202223]">
                                UPI / Cards / NetBanking / Wallets
                              </span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full">
                                RECOMMENDED
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1">
                              Pay ₹{totalAmount.toLocaleString('en-IN')} online via Razorpay. Fast & 100% verified.
                            </p>
                            <div className="flex items-center gap-2 mt-2.5 text-[10px] text-gray-600">
                              <span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold">Google Pay</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold">PhonePe</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold">Paytm</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold">Cards</span>
                            </div>
                          </div>
                        </div>

                        <span className="text-sm font-extrabold text-emerald-800">
                          ₹{totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Option 2: Cash on Delivery with Advance Booking Charge */}
                    <div
                      onClick={() => setPaymentMethod('COD')}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                        paymentMethod === 'COD'
                          ? 'border-amber-600 bg-amber-50/40 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="paymentOption"
                            checked={paymentMethod === 'COD'}
                            onChange={() => setPaymentMethod('COD')}
                            className="mt-1 text-amber-600 focus:ring-amber-600"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-[#202223]">
                                Cash on Delivery (COD)
                              </span>
                              <span className="text-[10px] bg-amber-200 text-amber-950 font-extrabold px-2 py-0.5 rounded-full">
                                +₹{codExtraFee} ADVANCE FEE
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                              Pay <strong className="font-extrabold text-amber-950">₹{codExtraFee} booking fee online now</strong> to confirm dispatch. Pay full garment price <strong className="font-extrabold text-charcoal">₹{totalAmount.toLocaleString('en-IN')} to courier on delivery</strong>.
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
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

                  {/* Payment CTA Button */}
                  <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveStep('address')}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-charcoal text-xs font-bold rounded-lg transition-colors cursor-pointer"
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
                        `Pay ₹${codExtraFee} Online & Confirm COD Order →`
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
              
              {/* Order Summary Card */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                    <span>🛍️</span> Bag Summary ({cart.length} items)
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
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2.5 text-[11px] text-gray-600">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🛡️</span>
                  <span><strong>100% Genuine Designer Apparel</strong> handcrafted in India.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">⚡</span>
                  <span><strong>Express Courier Partner:</strong> Blue Dart / Delhivery (3–5 Days).</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🔒</span>
                  <span><strong>Razorpay Verified:</strong> 256-bit encrypted bank checkout.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
