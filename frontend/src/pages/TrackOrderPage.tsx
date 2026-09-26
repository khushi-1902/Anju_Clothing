import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { trackOrder, cancelOrder, Order } from '../lib/api'
import { STORE_INFO } from '../data/products'

export function TrackOrderPage() {
  const { orderNumber: paramOrderNumber } = useParams<{ orderNumber?: string }>()
  
  const [orderQuery, setOrderQuery] = useState(paramOrderNumber || '')
  const [verifyInput, setVerifyInput] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('Change of delivery address / mind')
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null)

  const handleSearch = async (targetOrderNumber?: string) => {
    const searchNumber = (targetOrderNumber || orderQuery).trim()
    if (!searchNumber) {
      setError('Please enter a valid Order Number (e.g. AC-89241).')
      return
    }

    setLoading(true)
    setError(null)
    setCancelSuccessMsg(null)

    try {
      const data = await trackOrder(searchNumber, verifyInput.trim() || undefined)
      setOrder(data)
      setOrderQuery(data.orderNumber)
    } catch (err: any) {
      setOrder(null)
      setError(err.message || 'Order could not be found. Please double check the order number.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (paramOrderNumber) {
      handleSearch(paramOrderNumber)
    }
  }, [paramOrderNumber])

  const handleCancelOrder = async () => {
    if (!order) return
    setIsCancelling(true)
    try {
      const updated = await cancelOrder(order.orderNumber, cancelReason)
      setOrder(updated)
      setCancelModalOpen(false)
      setCancelSuccessMsg('Your order has been cancelled successfully.')
    } catch (err: any) {
      alert(err.message || 'Could not cancel order')
    } finally {
      setIsCancelling(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'in transit':
      case 'shipped':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'processing':
      case 'confirmed':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-6 sm:py-12 lg:py-16 px-3 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Header Title & Intro */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#769055]/15 border border-[#769055]/30 text-[#769055] text-xs font-bold uppercase tracking-widest">
            <span>📦</span> Real-Time Courier Tracking
          </div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-charcoal">
            Track Your Anju Clothing Order
          </h1>
          <p className="text-xs sm:text-sm text-muted max-w-lg mx-auto px-2">
            Enter your order tracking number or check past shipments to see live dispatch and delivery milestones.
          </p>
        </div>

        {/* Search / Lookup Box */}
        <div className="bg-white border border-[#EBE4D8] p-4 sm:p-6 lg:p-8 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch()
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1">
                  Order Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. AC-89241 or AC-74620"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 text-xs bg-[#FAF8F5] border border-gray-300 focus:border-[#769055] focus:outline-none uppercase tracking-wider font-semibold"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1">
                  Email / Phone <span className="text-gray-400 text-[10px] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Verify with email or mobile"
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 text-xs bg-[#FAF8F5] border border-gray-300 focus:border-[#769055] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              {/* Quick sample chips for instant preview */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-muted">
                <span className="text-[11px] font-medium w-full sm:w-auto">Try Demo Order:</span>
                <button
                  type="button"
                  onClick={() => {
                    setOrderQuery('AC-89241')
                    handleSearch('AC-89241')
                  }}
                  className="px-2.5 py-1 bg-cream border border-border/80 hover:border-[#769055] text-[#769055] font-bold text-[11px] transition-colors cursor-pointer"
                >
                  AC-89241 (In Transit)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderQuery('AC-74620')
                    handleSearch('AC-74620')
                  }}
                  className="px-2.5 py-1 bg-cream border border-border/80 hover:border-[#769055] text-[#769055] font-bold text-[11px] transition-colors cursor-pointer"
                >
                  AC-74620 (Processing)
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 sm:px-8 py-2.5 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Locating Order...' : 'Track Package →'}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {cancelSuccessMsg && (
            <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <span>✓</span>
              <span>{cancelSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* Live Order Details Card */}
        {order && (
          <div className="bg-white border border-[#EBE4D8] shadow-md overflow-hidden animate-fade-in">
            
            {/* Top Bar with Order Number, Date & Status */}
            <div className="p-4 sm:p-6 bg-[#2C2420] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <span className="text-[10px] text-[#A89F95] font-bold uppercase tracking-wider block">
                  Order Reference
                </span>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-xl sm:text-2xl font-bold tracking-wide text-white">
                    #{order.orderNumber}
                  </span>
                  <span className="text-[11px] sm:text-xs text-[#D1C7BD]">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 border text-xs font-bold uppercase tracking-wider ${getStatusColor(
                    order.orderStatus
                  )}`}
                >
                  {order.orderStatus}
                </span>
              </div>
            </div>

            {/* Courier & Delivery Hero Banner */}
            <div className="p-4 sm:p-6 bg-cream/60 border-b border-border/80 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-left">
              <div>
                <span className="text-[10px] sm:text-[11px] text-muted block font-medium uppercase">Courier Partner</span>
                <strong className="text-xs sm:text-sm text-charcoal flex items-center gap-1.5 mt-0.5">
                  ✈️ {order.courierName || 'BlueDart Express'}
                </strong>
                {order.trackingNumber && (
                  <span className="text-xs text-muted block mt-0.5">
                    AWB: <span className="font-mono text-charcoal font-semibold">{order.trackingNumber}</span>
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] sm:text-[11px] text-muted block font-medium uppercase">Estimated Delivery</span>
                <strong className="text-xs sm:text-sm text-[#769055] flex items-center gap-1.5 mt-0.5">
                  🗓️ {order.estimatedDelivery || '3-5 Business Days'}
                </strong>
                <span className="text-xs text-muted block mt-0.5">
                  Priority express insured transit
                </span>
              </div>

              <div>
                <span className="text-[10px] sm:text-[11px] text-muted block font-medium uppercase">Payment Status</span>
                <strong className="text-xs sm:text-sm text-charcoal flex items-center gap-1.5 mt-0.5">
                  💳 {order.paymentMethod} ({order.paymentStatus})
                </strong>
                <span className="text-xs font-bold text-charcoal block mt-0.5">
                  Total: Rs. {order.totalAmount.toLocaleString('en-IN')}.00
                </span>
              </div>
            </div>

            {/* Step-by-Step Interactive Timeline */}
            <div className="p-5 sm:p-8 border-b border-border/80">
              <h3 className="font-display text-sm sm:text-base font-bold text-charcoal mb-6 flex items-center gap-2">
                <span>📍</span> Live Delivery Journey
              </h3>

              <div className="relative pl-7 sm:pl-9 space-y-6 sm:space-y-8 before:absolute before:left-3 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {order.timeline && order.timeline.length > 0 ? (
                  order.timeline.map((evt, idx) => {
                    const isDone = evt.completed
                    return (
                      <div key={idx} className="relative group text-left">
                        {/* Milestone bullet icon */}
                        <div
                          className={`absolute -left-7 sm:-left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                            isDone
                              ? 'bg-[#769055] text-white ring-4 ring-[#769055]/20'
                              : 'bg-white border-2 border-gray-300 text-gray-400'
                          }`}
                        >
                          {isDone ? '✓' : idx + 1}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-1">
                          <h4 className={`text-xs sm:text-sm font-bold ${isDone ? 'text-charcoal' : 'text-gray-400'}`}>
                            {evt.status}
                          </h4>
                          <span className="text-[10px] sm:text-[11px] font-semibold text-muted">
                            {evt.time}
                          </span>
                        </div>
                        {evt.description && (
                          <p className="text-xs text-muted mt-1 leading-relaxed">
                            {evt.description}
                          </p>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-muted">Timeline milestones are being updated.</p>
                )}
              </div>
            </div>

            {/* Order Items & Shipping Address details */}
            <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
              
              {/* Items List */}
              <div className="md:col-span-7 space-y-4">
                <h3 className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-charcoal border-b border-gray-100 pb-2">
                  Items in this Order ({order.items.length})
                </h3>


                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-3 bg-ivory/40 border border-border/50">
                      {item.img && (
                        <img
                          src={item.img}
                          alt={item.name}
                          className="w-16 h-20 object-cover bg-cream shrink-0"
                        />
                      )}
                      <div className="flex-1 text-left flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-charcoal line-clamp-1">
                            {item.name}
                          </h4>
                          <div className="text-[11px] text-muted mt-0.5 space-x-2">
                            {item.selectedSize && <span>Size: <strong>{item.selectedSize}</strong></span>}
                            {item.selectedColor && <span>Color: <strong>{item.selectedColor}</strong></span>}
                            <span>Qty: <strong>{item.quantity}</strong></span>
                          </div>
                        </div>
                        <div className="text-xs font-bold text-[#769055] mt-2">
                          Rs. {(item.price * item.quantity).toLocaleString('en-IN')}.00
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address & Summary */}
              <div className="md:col-span-5 bg-[#FAF8F5] p-5 border border-border/60 space-y-4 text-left">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-2">
                    Delivery Address
                  </h4>
                  <p className="text-xs font-semibold text-charcoal">{order.customerName}</p>
                  <p className="text-xs text-muted mt-0.5">{order.shippingAddress.street}</p>
                  <p className="text-xs text-muted">
                    {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                  </p>
                  <p className="text-xs text-muted mt-1">Phone: {order.customerPhone}</p>
                </div>

                <div className="pt-3 border-t border-gray-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal</span>
                    <span>Rs. {order.subtotal.toLocaleString('en-IN')}.00</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-[#769055] font-semibold">
                      <span>Discount</span>
                      <span>-Rs. {order.discountAmount.toLocaleString('en-IN')}.00</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted">
                    <span>Shipping</span>
                    <span>{order.shippingFee === 0 ? 'FREE' : `Rs. ${order.shippingFee}.00`}</span>
                  </div>
                  <div className="flex justify-between text-charcoal font-bold text-sm pt-2 border-t border-gray-200">
                    <span>Total Amount</span>
                    <span className="text-[#769055]">Rs. {order.totalAmount.toLocaleString('en-IN')}.00</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 space-y-2">
                  <a
                    href={`https://wa.me/${STORE_INFO.phoneRaw}?text=${encodeURIComponent(
                      `Hi Anju Clothing, I am inquiring about my Order #${order.orderNumber}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    <span>💬</span> Help with Order on WhatsApp
                  </a>

                  {['Confirmed', 'Processing'].includes(order.orderStatus) && (
                    <button
                      type="button"
                      onClick={() => setCancelModalOpen(true)}
                      className="w-full py-2 bg-white border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between text-xs text-muted">
              <span>Need modifications? Contact concierge support at {STORE_INFO.phone}.</span>
              <Link to="/all-products" className="text-[#769055] font-bold hover:underline">
                Continue Shopping →
              </Link>
            </div>
          </div>
        )}

        {/* Cancellation Modal */}
        {cancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
            <div className="bg-white max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-200">
              <h3 className="font-display text-lg font-bold text-charcoal">
                Cancel Order #{order?.orderNumber}?
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Are you sure you want to cancel this order? Once cancelled, our artisans will halt garment processing.
              </p>
              
              <div>
                <label className="block text-xs font-bold text-charcoal mb-1">
                  Reason for Cancellation:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 bg-[#FAF8F5] focus:outline-none focus:border-[#769055]"
                >
                  <option value="Change of delivery address / mind">Change of delivery address / mind</option>
                  <option value="Ordered wrong size / outfit">Ordered wrong size / outfit</option>
                  <option value="Delivery time too long">Delivery time too long</option>
                  <option value="Other reason">Other reason</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-charcoal text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleCancelOrder}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
