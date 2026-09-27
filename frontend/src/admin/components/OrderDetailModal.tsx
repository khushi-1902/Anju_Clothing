import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { AdminOrder, updateOrderStatus } from '../adminApi'

interface OrderDetailModalProps {
  order: AdminOrder | null
  isOpen: boolean
  onClose: () => void
  onOrderUpdated: (updatedOrder: AdminOrder) => void
}

const STATUS_OPTIONS = ['Pending', 'Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']
const PAYMENT_OPTIONS = ['Paid', 'Pending', 'Failed', 'Refunded']
const COURIER_PRESETS = ['Blue Dart', 'Delhivery', 'DTDC', 'India Post', 'Shadowfax', 'Ecom Express', 'Shiprocket']

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
}: OrderDetailModalProps) {
  const { getToken } = useAuth()

  // Form states
  const [orderStatus, setOrderStatus] = useState(order?.orderStatus || 'Pending')
  const [paymentStatus, setPaymentStatus] = useState(order?.paymentStatus || 'Pending')
  const [courierName, setCourierName] = useState(order?.courierName || '')
  const [trackingNumber, setTrackingNumber] = useState(order?.trackingNumber || '')
  const [estimatedDelivery, setEstimatedDelivery] = useState(order?.estimatedDelivery || '')
  const [notes, setNotes] = useState(order?.notes || '')

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (order) {
      setOrderStatus(order.orderStatus || 'Pending')
      setPaymentStatus(order.paymentStatus || 'Pending')
      setCourierName(order.courierName || '')
      setTrackingNumber(order.trackingNumber || '')
      setEstimatedDelivery(order.estimatedDelivery || '')
      setNotes(order.notes || '')
      setSuccessMsg(null)
      setErrorMsg(null)
    }
  }, [order, isOpen])

  if (!isOpen || !order) return null

  const handleSaveStatus = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    try {
      setSaving(true)
      setErrorMsg(null)
      setSuccessMsg(null)
      const token = await getToken()
      if (!token) return

      const updated = await updateOrderStatus(token, order.orderNumber, {
        orderStatus,
        paymentStatus,
        courierName: courierName.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        estimatedDelivery: estimatedDelivery.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      setSuccessMsg('Order updated successfully!')
      onOrderUpdated(updated)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      console.error('Failed to update order:', err)
      setErrorMsg(err.message || 'Failed to update order status')
    } finally {
      setSaving(false)
    }
  }

  const handleQuickFulfill = async () => {
    try {
      setSaving(true)
      setErrorMsg(null)
      const token = await getToken()
      if (!token) return

      const updated = await updateOrderStatus(token, order.orderNumber, {
        orderStatus: 'Delivered',
        paymentStatus: 'Paid',
      })

      setOrderStatus('Delivered')
      setPaymentStatus('Paid')
      setSuccessMsg('Marked as Fulfilled & Delivered!')
      onOrderUpdated(updated)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      console.error('Failed to fulfill order:', err)
      setErrorMsg(err.message || 'Failed to mark fulfilled')
    } finally {
      setSaving(false)
    }
  }

  // Parse items safely
  const items = Array.isArray(order.items)
    ? order.items
    : typeof order.items === 'string'
    ? JSON.parse(order.items)
    : []

  // Parse shipping address safely
  const address = order.shippingAddress || {}

  // Parse timeline safely
  const timeline = Array.isArray(order.timeline)
    ? order.timeline
    : typeof order.timeline === 'string'
    ? JSON.parse(order.timeline)
    : []

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border border-[#EBE4D8] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-charcoal">
        
        {/* Modal Topbar */}
        <div className="px-6 py-4 bg-white border-b border-[#EBE4D8] flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#202223] font-mono">
                  #{order.orderNumber}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                    order.orderStatus === 'Delivered'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : order.orderStatus === 'Shipped'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : order.orderStatus === 'Cancelled'
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}
                >
                  {order.orderStatus}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    order.paymentStatus === 'Paid'
                      ? 'bg-emerald-100/60 text-emerald-900 border-emerald-300'
                      : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                >
                  {order.paymentStatus === 'Paid' ? '✓ Paid' : 'Payment Pending'}
                </span>
              </div>
              <p className="text-xs text-[#6D7175] mt-0.5">
                Placed on {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-charcoal text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <span>🖨️ Print</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer text-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          
          {/* Toast / Alert Feedback */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <span>✅</span>
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Fulfillment Bar */}
          {order.orderStatus !== 'Delivered' && order.orderStatus !== 'Cancelled' && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">✨</span>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Quick Fulfillment</h4>
                  <p className="text-[11px] text-emerald-800">
                    Ready to complete this order? Mark it as fully paid & delivered in 1 click.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuickFulfill}
                disabled={saving}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer shrink-0"
              >
                {saving ? 'Updating...' : '✓ Mark Fulfilled & Delivered'}
              </button>
            </div>
          )}

          {/* Grid Layout: Items & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (2 Cols): Ordered Items & Timeline */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Ordered Items Table */}
              <div className="bg-white border border-[#E1E3E5] rounded-xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#769055] border-b border-gray-100 pb-2 flex items-center justify-between">
                  <span>🛍️ Items Ordered ({items.length})</span>
                  <span className="text-[11px] font-mono text-gray-500">₹{order.totalAmount.toLocaleString('en-IN')} Total</span>
                </h3>

                <div className="divide-y divide-gray-100">
                  {items.map((item: any, idx: number) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.img || item.image ? (
                          <img
                            src={item.img || item.image}
                            alt={item.name}
                            className="w-12 h-14 object-cover rounded-lg bg-gray-100 border border-gray-200 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-12 h-14 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-lg text-gray-400 shrink-0">
                            👗
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#202223] truncate">{item.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-[#6D7175] mt-0.5">
                            {item.selectedSize && (
                              <span className="font-semibold bg-gray-100 px-1.5 py-0.2 rounded text-charcoal">
                                Size: {item.selectedSize}
                              </span>
                            )}
                            {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                            <span>Qty: {item.quantity}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-[#202223]">
                          ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          ₹{(item.price || 0).toLocaleString('en-IN')} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-medium">₹{(order.subtotal || order.totalAmount).toLocaleString('en-IN')}</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Discount Coupon:</span>
                      <span>-₹{order.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping Delivery:</span>
                    <span>{order.shippingFee > 0 ? `₹${order.shippingFee}` : 'Free'}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#202223] pt-2 border-t border-gray-200">
                    <span>Total Amount:</span>
                    <span className="text-[#769055]">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Order Timeline History */}
              <div className="bg-white border border-[#E1E3E5] rounded-xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#769055] border-b border-gray-100 pb-2">
                  <span>📜 Order Timeline & Tracking Milestones</span>
                </h3>

                {timeline.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {timeline.map((event: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 text-xs">
                        <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          ✓
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#202223]">{event.status}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{event.time}</span>
                          </div>
                          {event.description && (
                            <p className="text-[11px] text-[#6D7175] mt-0.5">{event.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-2">
                    Order created on {new Date(order.createdAt).toLocaleDateString('en-IN')}.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column (1 Col): Customer Info & Status Updaters */}
            <div className="space-y-6">
              
              {/* Customer & Shipping Details */}
              <div className="bg-white border border-[#E1E3E5] rounded-xl p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#769055] border-b border-gray-100 pb-2">
                  <span>👤 Customer Details</span>
                </h3>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Customer Name</span>
                    <p className="font-bold text-[#202223]">{order.customerName}</p>
                  </div>

                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Email Address</span>
                    <p className="font-mono text-gray-700 break-all">{order.customerEmail}</p>
                  </div>

                  {order.customerPhone && (
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold">Phone Number</span>
                      <p className="font-semibold text-[#202223]">{order.customerPhone}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Shipping Address</span>
                    <p className="text-xs text-charcoal mt-1 leading-relaxed">
                      {address.street ? (
                        <>
                          {address.street}<br />
                          {address.city}, {address.state} - <strong className="font-mono">{address.pincode}</strong><br />
                          {address.country || 'India'}
                        </>
                      ) : (
                        <span className="text-gray-400 italic">No street address recorded</span>
                      )}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Payment Method</span>
                    <span className="font-bold text-charcoal">{order.paymentMethod || 'Online / Card / UPI'}</span>
                  </div>

                  {(order as any).notes && (
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-amber-800 text-[10px] uppercase font-bold flex items-center gap-1">
                        <span>📝</span> Payment & Order Notes
                      </span>
                      <p className="text-xs text-amber-950 font-medium bg-amber-50 p-2 rounded mt-1 border border-amber-200">
                        {(order as any).notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Courier Update Form */}
              <form onSubmit={handleSaveStatus} className="bg-white border border-[#E1E3E5] rounded-xl p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#769055] border-b border-gray-100 pb-2">
                  <span>⚙️ Update Fulfillment & Courier</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#202223] mb-1">
                      Fulfillment / Order Status
                    </label>
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold text-charcoal focus:bg-white focus:outline-none focus:border-[#769055]"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202223] mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold text-charcoal focus:bg-white focus:outline-none focus:border-[#769055]"
                    >
                      {PAYMENT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202223] mb-1">
                      Courier Partner
                    </label>
                    <input
                      type="text"
                      list="courier-presets"
                      placeholder="e.g. Blue Dart, Delhivery, DTDC"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-gray-300 rounded-lg px-3 py-2 text-xs text-charcoal focus:bg-white focus:outline-none focus:border-[#769055]"
                    />
                    <datalist id="courier-presets">
                      {COURIER_PRESETS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202223] mb-1">
                      AWB / Tracking Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BD94829104IN"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono text-charcoal focus:bg-white focus:outline-none focus:border-[#769055]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202223] mb-1">
                      Estimated Delivery Date
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3-5 Business Days / Oct 2, 2026"
                      value={estimatedDelivery}
                      onChange={(e) => setEstimatedDelivery(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-gray-300 rounded-lg px-3 py-2 text-xs text-charcoal focus:bg-white focus:outline-none focus:border-[#769055]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202223] mb-1">
                      Internal Admin Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Private notes (customer does not see this)..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-gray-300 rounded-lg p-2 text-xs text-charcoal focus:bg-white focus:outline-none focus:border-[#769055]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2.5 bg-[#769055] hover:bg-[#5e7343] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    {saving ? 'Saving Updates...' : 'Save Order Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
