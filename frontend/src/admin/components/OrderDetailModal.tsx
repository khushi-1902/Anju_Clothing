import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { AdminOrder, updateOrderStatus, refundAdminOrder } from '../adminApi'

interface OrderDetailModalProps {
  order: AdminOrder | null
  isOpen: boolean
  onClose: () => void
  onOrderUpdated: (updatedOrder: AdminOrder) => void
}

const STATUS_OPTIONS = ['Pending', 'Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']
const PAYMENT_OPTIONS = ['PENDING', 'ADVANCE_PAID', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED']
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
  const [paymentStatus, setPaymentStatus] = useState(order?.paymentStatus || 'PENDING')
  const [courierName, setCourierName] = useState(order?.courierName || '')
  const [trackingNumber, setTrackingNumber] = useState(order?.trackingNumber || '')
  const [estimatedDelivery, setEstimatedDelivery] = useState(order?.estimatedDelivery || '')
  const [notes, setNotes] = useState(order?.notes || '')

  const [saving, setSaving] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (order) {
      setOrderStatus(order.orderStatus || 'Pending')
      setPaymentStatus(order.paymentStatus || 'PENDING')
      setCourierName(order.courierName || '')
      setTrackingNumber(order.trackingNumber || '')
      setEstimatedDelivery(order.estimatedDelivery || '')
      setNotes(order.notes || '')
      setSuccessMsg(null)
      setErrorMsg(null)
    }
  }, [order, isOpen])

  if (!isOpen || !order) return null

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

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

      setSuccessMsg('Order updated successfully.')
      onOrderUpdated(updated)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      console.error('Failed to update order:', err)
      setErrorMsg(err.message || 'Failed to save changes.')
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
        paymentStatus: 'PAID',
      })

      setOrderStatus('Delivered')
      setPaymentStatus('PAID')
      setSuccessMsg('Order marked as Delivered & Paid.')
      onOrderUpdated(updated)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      console.error('Failed to fulfill order:', err)
      setErrorMsg(err.message || 'Failed to update fulfillment.')
    } finally {
      setSaving(false)
    }
  }

  const handleProcessRefund = async () => {
    if (!order.razorpayPaymentId) {
      setErrorMsg('No captured Razorpay Payment ID found for this order.')
      return
    }

    try {
      setRefunding(true)
      setErrorMsg(null)
      setSuccessMsg(null)
      const token = await getToken()
      if (!token) return

      const res = await refundAdminOrder(token, order.orderNumber, undefined, refundReason)
      setSuccessMsg(`Refund of ₹${order.amountPayableNow ?? order.totalAmount} processed (ID: ${res.refundId}).`)
      setPaymentStatus('REFUNDED')
      setOrderStatus('Cancelled')
      setShowRefundModal(false)
      onOrderUpdated(res.order)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      console.error('Failed to process refund:', err)
      setErrorMsg(err.message || 'Refund processing failed.')
    } finally {
      setRefunding(false)
    }
  }

  const items = Array.isArray(order.items)
    ? order.items
    : typeof order.items === 'string'
    ? JSON.parse(order.items)
    : []

  const address = order.shippingAddress

  const timeline = Array.isArray(order.timeline)
    ? order.timeline
    : typeof order.timeline === 'string'
    ? JSON.parse(order.timeline)
    : []

  const isPaid = String(order.paymentStatus).toUpperCase().includes('PAID')
  const isRefunded = String(order.paymentStatus).toUpperCase().includes('REFUND')

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in font-sans text-[#232B1E]">
      <div className="bg-white border border-[#E3E9DD] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#E3E9DD] flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#769055] text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs">
              #{order.orderNumber.slice(-4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#1B2513] font-mono tracking-tight">
                  {order.orderNumber}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    order.orderStatus === 'Delivered'
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                      : order.orderStatus === 'Shipped'
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20'
                      : order.orderStatus === 'Cancelled'
                      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                      : 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20'
                  }`}
                >
                  {order.orderStatus}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    isPaid
                      ? 'bg-[#F0F5EB] text-[#4A6333] border border-[#D5DFC9]'
                      : isRefunded
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>
              <p className="text-[11px] text-[#7A8E6A] mt-0.5">
                Placed on {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#D5DFC9] hover:bg-[#F0F5EB] text-[#3E522B] text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.056.867-1.829 1.89-1.829h10.78c1.023 0 2.13.773 1.89 1.829l-1.08 4.757A2.25 2.25 0 0118.006 21H5.994a2.25 2.25 0 01-2.194-2.414l1.08-4.757z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18H4.5a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25h15A2.25 2.25 0 0121.75 9v6.75A2.25 2.25 0 0119.5 18H18" />
              </svg>
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-[#F0F5EB] flex items-center justify-center text-[#7A8E6A] hover:text-[#232B1E] transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F7F9F5]">
          
          {/* Alerts */}
          {successMsg && (
            <div className="p-3 bg-[#F0F5EB] border border-[#D5DFC9] text-[#3E522B] text-xs font-medium rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#769055]" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Fulfill Banner */}
          {order.orderStatus !== 'Delivered' && order.orderStatus !== 'Cancelled' && (
            <div className="bg-white border border-[#E3E9DD] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F0F5EB] text-[#4A6333] flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#1B2513]">Mark as Delivered & Paid</h4>
                  <p className="text-[11px] text-[#5D6F4E]">
                    Quickly close out this shipment when confirmed by courier.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuickFulfill}
                disabled={saving}
                className="px-3.5 py-1.5 bg-[#769055] hover:bg-[#5e7343] disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all shadow-2xs cursor-pointer shrink-0"
              >
                {saving ? 'Updating...' : 'Complete Fulfillment'}
              </button>
            </div>
          )}

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Items & Gateway Details */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Ordered Items */}
              <div className="bg-white border border-[#E3E9DD] rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#EBEFE6] pb-3">
                  <h3 className="text-xs font-semibold text-[#4A6333] uppercase tracking-wider">
                    Ordered Items ({items.length})
                  </h3>
                  <span className="text-xs font-mono font-semibold text-[#1B2513] tabular-nums">
                    ₹{order.totalAmount.toLocaleString('en-IN')} Total
                  </span>
                </div>

                <div className="divide-y divide-[#EBEFE6]">
                  {items.map((item: any, idx: number) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.img || item.image ? (
                          <img
                            src={item.img || item.image}
                            alt={item.name}
                            className="w-12 h-14 object-cover rounded-lg bg-[#F0F5EB] border border-[#D5DFC9] shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-14 bg-[#F0F5EB] rounded-lg border border-[#D5DFC9] flex items-center justify-center text-[#7A8E6A] shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#1B2513] truncate">{item.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-[#5D6F4E] mt-0.5">
                            {item.selectedSize && (
                              <span className="bg-[#F0F5EB] px-1.5 py-0.5 rounded text-[#3E522B] font-medium">
                                Size: {item.selectedSize}
                              </span>
                            )}
                            {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                            <span>Qty: {item.quantity}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-[#1B2513] tabular-nums">
                          ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-[#7A8E6A] font-mono tabular-nums">
                          ₹{(item.price || 0).toLocaleString('en-IN')} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="pt-3 border-t border-[#EBEFE6] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#5D6F4E]">
                    <span>Subtotal:</span>
                    <span className="font-medium text-[#1B2513] tabular-nums">
                      ₹{(order.subtotal || order.totalAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount:</span>
                      <span className="tabular-nums">-₹{order.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#5D6F4E]">
                    <span>Shipping:</span>
                    <span>{order.shippingFee > 0 ? `₹${order.shippingFee}` : 'Free'}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-[#1B2513] pt-2 border-t border-[#EBEFE6]">
                    <span>Total Amount:</span>
                    <span className="tabular-nums text-[#769055]">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Razorpay Gateway Inspector & Refund */}
              <div className="bg-white border border-[#E3E9DD] rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#EBEFE6] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-[#769055] text-white flex items-center justify-center text-[10px] font-bold">
                      R
                    </div>
                    <h3 className="text-xs font-semibold text-[#4A6333] uppercase tracking-wider">
                      Razorpay Gateway Details
                    </h3>
                  </div>

                  {order.razorpayPaymentId && (isPaid || String(order.paymentStatus).toUpperCase() === 'ADVANCE_PAID') && (
                    <button
                      type="button"
                      onClick={() => setShowRefundModal(true)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    >
                      Issue Refund
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg space-y-1">
                    <span className="text-[10px] text-[#7A8E6A] font-semibold uppercase tracking-wider block">
                      Razorpay Order ID
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[#232B1E] text-[11px] truncate select-all">
                        {order.razorpayOrderId || '—'}
                      </span>
                      {order.razorpayOrderId && (
                        <button
                          onClick={() => copyToClipboard(order.razorpayOrderId!, 'orderId')}
                          className="text-[#769055] hover:text-[#4A6333] text-[10px] font-mono"
                        >
                          {copiedField === 'orderId' ? '✓' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg space-y-1">
                    <span className="text-[10px] text-[#7A8E6A] font-semibold uppercase tracking-wider block">
                      Razorpay Payment ID
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[#232B1E] text-[11px] truncate select-all">
                        {order.razorpayPaymentId || '—'}
                      </span>
                      {order.razorpayPaymentId && (
                        <button
                          onClick={() => copyToClipboard(order.razorpayPaymentId!, 'paymentId')}
                          className="text-[#769055] hover:text-[#4A6333] text-[10px] font-mono"
                        >
                          {copiedField === 'paymentId' ? '✓' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg space-y-1">
                    <span className="text-[10px] text-[#7A8E6A] font-semibold uppercase tracking-wider block">
                      Paid Online Now
                    </span>
                    <span className="font-semibold text-[#769055] text-sm tabular-nums">
                      ₹{(order.amountPayableNow ?? order.totalAmount).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg space-y-1">
                    <span className="text-[10px] text-[#7A8E6A] font-semibold uppercase tracking-wider block">
                      Balance Due on Delivery (COD)
                    </span>
                    <span className="font-semibold text-[#1B2513] text-sm tabular-nums">
                      ₹{(order.amountDueOnDelivery ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Refund Form */}
                {showRefundModal && (
                  <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-rose-900">Initiate Razorpay Refund</h4>
                      <button
                        onClick={() => setShowRefundModal(false)}
                        className="text-rose-400 hover:text-rose-700 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[11px] text-rose-800 leading-relaxed">
                      Refunding ₹{(order.amountPayableNow ?? order.totalAmount)} directly to the customer via Razorpay. Item inventory will automatically be replenished in the database.
                    </p>
                    <input
                      type="text"
                      placeholder="Reason for refund (optional)..."
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full bg-white border border-rose-200 rounded-lg px-3 py-1.5 text-xs text-[#232B1E] focus:outline-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRefundModal(false)}
                        className="px-3 py-1.5 bg-white border border-[#D5DFC9] rounded-lg text-xs font-medium text-[#5D6F4E] hover:bg-[#F0F5EB]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleProcessRefund}
                        disabled={refunding}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
                      >
                        {refunding ? 'Refunding...' : 'Confirm Refund'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Timeline */}
              <div className="bg-white border border-[#E3E9DD] rounded-xl p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-semibold text-[#4A6333] uppercase tracking-wider border-b border-[#EBEFE6] pb-3">
                  Order Timeline & History
                </h3>

                {timeline.length > 0 ? (
                  <div className="space-y-4 pt-1">
                    {timeline.map((event: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 text-xs">
                        <div className="w-5 h-5 rounded-full bg-[#F0F5EB] border border-[#D5DFC9] text-[#769055] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          ✓
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#1B2513]">{event.status}</span>
                            <span className="text-[10px] text-[#7A8E6A] font-mono">{event.time}</span>
                          </div>
                          {event.description && (
                            <p className="text-[11px] text-[#5D6F4E] mt-0.5">{event.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#7A8E6A] py-1">
                    Order registered on {new Date(order.createdAt).toLocaleDateString('en-IN')}.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Customer & Status Controls */}
            <div className="space-y-6">
              
              {/* Customer Card */}
              <div className="bg-white border border-[#E3E9DD] rounded-xl p-5 shadow-2xs space-y-4">
                <h3 className="text-xs font-semibold text-[#4A6333] uppercase tracking-wider border-b border-[#EBEFE6] pb-3">
                  Customer & Delivery
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[#7A8E6A] text-[10px] uppercase font-semibold block">Customer Name</span>
                    <p className="font-semibold text-[#1B2513] mt-0.5">{order.customerName}</p>
                  </div>

                  <div>
                    <span className="text-[#7A8E6A] text-[10px] uppercase font-semibold block">Email Address</span>
                    <p className="font-mono text-[#5D6F4E] break-all mt-0.5">{order.customerEmail}</p>
                  </div>

                  {order.customerPhone && (
                    <div>
                      <span className="text-[#7A8E6A] text-[10px] uppercase font-semibold block">Phone Number</span>
                      <p className="font-mono text-[#1B2513] mt-0.5">{order.customerPhone}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#EBEFE6]">
                    <span className="text-[#7A8E6A] text-[10px] uppercase font-semibold block">Shipping Address</span>
                    <div className="text-xs text-[#232B1E] mt-1 leading-relaxed">
                      {address?.street ? (
                        <>
                          <p>{address.street}</p>
                          <p>{address.city}, {address.state} - <strong className="font-mono">{address.pincode}</strong></p>
                          <p>{address.country || 'India'}</p>
                        </>
                      ) : (
                        <span className="text-[#7A8E6A] italic">No street address provided</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#EBEFE6] flex items-center justify-between">
                    <span className="text-[#7A8E6A] text-[10px] uppercase font-semibold">Method</span>
                    <span className="font-semibold text-[#1B2513]">{order.paymentMethod || 'Online'}</span>
                  </div>

                  {order.notes && (
                    <div className="pt-2 border-t border-[#EBEFE6]">
                      <span className="text-[#5D6F4E] text-[10px] uppercase font-semibold block">Customer Notes</span>
                      <p className="text-xs text-[#232B1E] bg-[#F7F9F5] p-2 rounded-lg mt-1 border border-[#D5DFC9]">
                        {order.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Update Form */}
              <form onSubmit={handleSaveStatus} className="bg-white border border-[#E3E9DD] rounded-xl p-5 shadow-2xs space-y-4">
                <h3 className="text-xs font-semibold text-[#4A6333] uppercase tracking-wider border-b border-[#EBEFE6] pb-3">
                  Update Fulfillment
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#5D6F4E] mb-1">
                      Fulfillment Status
                    </label>
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                      className="w-full bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg px-3 py-2 text-xs font-medium text-[#232B1E] focus:bg-white focus:outline-none focus:border-[#769055]"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5D6F4E] mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg px-3 py-2 text-xs font-medium text-[#232B1E] focus:bg-white focus:outline-none focus:border-[#769055]"
                    >
                      {PAYMENT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5D6F4E] mb-1">
                      Courier Partner
                    </label>
                    <input
                      type="text"
                      list="courier-presets"
                      placeholder="e.g. Blue Dart, Delhivery, DTDC"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="w-full bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg px-3 py-2 text-xs text-[#232B1E] focus:bg-white focus:outline-none focus:border-[#769055]"
                    />
                    <datalist id="courier-presets">
                      {COURIER_PRESETS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5D6F4E] mb-1">
                      AWB / Tracking Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BD94829104IN"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg px-3 py-2 text-xs font-mono text-[#232B1E] focus:bg-white focus:outline-none focus:border-[#769055]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5D6F4E] mb-1">
                      Estimated Delivery
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3-5 Business Days"
                      value={estimatedDelivery}
                      onChange={(e) => setEstimatedDelivery(e.target.value)}
                      className="w-full bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg px-3 py-2 text-xs text-[#232B1E] focus:bg-white focus:outline-none focus:border-[#769055]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5D6F4E] mb-1">
                      Internal Admin Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Private notes (customer does not see this)..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg p-2 text-xs text-[#232B1E] focus:bg-white focus:outline-none focus:border-[#769055]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2 bg-[#769055] hover:bg-[#5e7343] disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all shadow-2xs cursor-pointer"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
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
