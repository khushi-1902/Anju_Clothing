import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { AdminOrder, updateOrderStatus, refundAdminOrder } from '../adminApi'
import { WhatsAppUpdatesSection } from './WhatsAppUpdatesSection'
import { OrderBillInvoice } from './OrderBillInvoice'
import { RazorpayLogo } from '../../components/RazorpayLogo'

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
  const [showPrintBillModal, setShowPrintBillModal] = useState(false)
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in font-sans text-[#232B1E]">
      <div className="bg-white border border-[#E3E9DD] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E3E9DD] flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#769055] text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs shrink-0">
              #{order.orderNumber.slice(-4)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-[#1B2513] font-mono tracking-tight">
                  {order.orderNumber}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold ${
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
                  className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold ${
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
              <p className="text-[10px] sm:text-[11px] text-[#7A8E6A] mt-0.5 truncate">
                {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowPrintBillModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.056.867-1.829 1.89-1.829h10.78c1.023 0 2.13.773 1.89 1.829l-1.08 4.757A2.25 2.25 0 0118.006 21H5.994a2.25 2.25 0 01-2.194-2.414l1.08-4.757z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18H4.5a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25h15A2.25 2.25 0 0121.75 9v6.75A2.25 2.25 0 0119.5 18H18" />
              </svg>
              <span>Print Bill</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-[#F0F5EB] flex items-center justify-center text-[#7A8E6A] hover:text-[#232B1E] transition-colors cursor-pointer text-lg font-bold"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 bg-[#F7F9F5]">
          
          {/* Alerts */}
          {successMsg && (
            <div className="p-3 bg-[#F0F5EB] border border-[#D5DFC9] text-[#3E522B] text-xs font-semibold rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#769055]" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Fulfill Banner */}
          {order.orderStatus !== 'Delivered' && order.orderStatus !== 'Cancelled' && (
            <div className="bg-white border border-[#E3E9DD] rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F0F5EB] text-[#4A6333] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1B2513]">Mark as Delivered & Paid</h4>
                  <p className="text-[11px] text-[#5D6F4E]">
                    Quickly close out shipment after delivery confirmation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuickFulfill}
                disabled={saving}
                className="w-full sm:w-auto px-3.5 py-2 bg-[#769055] hover:bg-[#5e7343] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-2xs cursor-pointer text-center"
              >
                {saving ? 'Updating...' : 'Complete Fulfillment'}
              </button>
            </div>
          )}

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Left 2 Cols: WhatsApp Updates, Items & Gateway Details */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              
              {/* WhatsApp Customer Updates */}
              <WhatsAppUpdatesSection order={order} onOrderUpdated={onOrderUpdated} />

              {/* Ordered Items */}
              <div className="bg-white border border-[#E3E9DD] rounded-xl p-3.5 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#EBEFE6] pb-2.5 sm:pb-3">
                  <h3 className="text-xs font-bold text-[#4A6333] uppercase tracking-wider">
                    Ordered Items ({items.length})
                  </h3>
                  <span className="text-xs font-mono font-bold text-[#1B2513] tabular-nums">
                    ₹{order.totalAmount.toLocaleString('en-IN')} Total
                  </span>
                </div>

                <div className="divide-y divide-[#EBEFE6]">
                  {items.map((item: any, idx: number) => (
                    <div key={idx} className="py-2.5 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-3">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {item.img || item.image ? (
                          <img
                            src={item.img || item.image}
                            alt={item.name}
                            className="w-11 h-14 sm:w-12 sm:h-14 object-cover rounded-lg bg-[#F0F5EB] border border-[#D5DFC9] shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-14 sm:w-12 sm:h-14 bg-[#F0F5EB] rounded-lg border border-[#D5DFC9] flex items-center justify-center text-[#7A8E6A] shrink-0">
                            👗
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1B2513] truncate">{item.name}</p>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-[#5D6F4E] mt-0.5 flex-wrap">
                            {item.selectedSize && (
                              <span className="bg-[#F0F5EB] px-1.5 py-0.2 rounded text-[#3E522B] font-semibold">
                                Size: {item.selectedSize}
                              </span>
                            )}
                            {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                            <span>Qty: {item.quantity}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-[#1B2513] tabular-nums">
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
                    <span>Shipping Delivery:</span>
                    <span>{order.shippingFee > 0 ? `₹${order.shippingFee}` : 'Free'}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#1B2513] pt-2 border-t border-[#EBEFE6]">
                    <span>Total Amount:</span>
                    <span className="tabular-nums text-[#769055]">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Print Bill & Invoice Action */}
                  <div className="pt-3 border-t border-[#EBEFE6] flex items-center justify-between">
                    <div className="text-xs text-[#5D6F4E]">
                      <span className="font-semibold text-[#1B2513] block">Official Invoice / Bill</span>
                      <span className="text-[10px]">Printable retail bill with itemized breakdown</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPrintBillModal(true)}
                      className="px-3.5 py-1.5 bg-[#FAF8F5] hover:bg-[#F0F5EB] border border-[#D5DFC9] text-[#3E522B] text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🖨️</span>
                      <span>Print Bill</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Razorpay Gateway Inspector & Refund */}
              <div className="bg-white border border-[#E3E9DD] rounded-xl p-3.5 sm:p-5 shadow-2xs space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between border-b border-[#EBEFE6] pb-2.5 sm:pb-3">
                  <div className="flex items-center gap-2.5">
                    <RazorpayLogo height={20} variant="full" />
                    <span className="text-[10px] bg-[#0C2340]/5 text-[#0C2340] border border-[#0C2340]/15 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      Gateway Inspector
                    </span>
                  </div>

                  {order.razorpayPaymentId && (isPaid || String(order.paymentStatus).toUpperCase() === 'ADVANCE_PAID') && (
                    <button
                      type="button"
                      onClick={() => setShowRefundModal(true)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Issue Refund
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                  <div className="p-2.5 sm:p-3 bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg space-y-1">
                    <div className="flex items-center gap-1.5">
                      <RazorpayLogo height={11} variant="icon" />
                      <span className="text-[10px] text-[#7A8E6A] font-semibold uppercase tracking-wider block">
                        Razorpay Order ID
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[#232B1E] text-[11px] truncate select-all">
                        {order.razorpayOrderId || '—'}
                      </span>
                      {order.razorpayOrderId && (
                        <button
                          onClick={() => copyToClipboard(order.razorpayOrderId!, 'orderId')}
                          className="text-[#769055] hover:text-[#4A6333] text-[10px] font-mono cursor-pointer"
                        >
                          {copiedField === 'orderId' ? '✓' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg space-y-1">
                    <div className="flex items-center gap-1.5">
                      <RazorpayLogo height={11} variant="icon" />
                      <span className="text-[10px] text-[#7A8E6A] font-semibold uppercase tracking-wider block">
                        Razorpay Payment ID
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[#232B1E] text-[11px] truncate select-all">
                        {order.razorpayPaymentId || '—'}
                      </span>
                      {order.razorpayPaymentId && (
                        <button
                          onClick={() => copyToClipboard(order.razorpayPaymentId!, 'paymentId')}
                          className="text-[#769055] hover:text-[#4A6333] text-[10px] font-mono cursor-pointer"
                        >
                          {copiedField === 'paymentId' ? '✓' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-[#F0F5EB] border border-[#D5DFC9] rounded-lg space-y-0.5">
                    <span className="text-[10px] text-[#4A6333] font-semibold uppercase tracking-wider block">
                      Paid Online Now
                    </span>
                    <span className="font-bold text-[#769055] text-sm tabular-nums">
                      ₹{(order.amountPayableNow ?? order.totalAmount).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-[#FAF8F5] border border-[#EBE4D8] rounded-lg space-y-0.5">
                    <span className="text-[10px] text-[#7A8E6A] font-semibold uppercase tracking-wider block">
                      Due on Delivery (COD)
                    </span>
                    <span className="font-bold text-[#1B2513] text-sm tabular-nums">
                      ₹{(order.amountDueOnDelivery ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Refund Form */}
                {showRefundModal && (
                  <div className="p-3.5 sm:p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RazorpayLogo height={14} variant="icon" />
                        <h4 className="text-xs font-bold text-rose-900">Initiate Razorpay Refund</h4>
                      </div>
                      <button
                        onClick={() => setShowRefundModal(false)}
                        className="text-rose-400 hover:text-rose-700 text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[11px] text-rose-800 leading-relaxed">
                      Refund ₹{(order.amountPayableNow ?? order.totalAmount)} directly to the customer via Razorpay.
                    </p>
                    <input
                      type="text"
                      placeholder="Reason for refund (optional)..."
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full bg-white border border-rose-200 rounded-lg px-3 py-1.5 text-xs text-[#232B1E] focus:outline-none"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowRefundModal(false)}
                        className="px-3 py-1.5 bg-white border border-[#D5DFC9] rounded-lg text-xs font-semibold text-[#5D6F4E] hover:bg-[#F0F5EB] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleProcessRefund}
                        disabled={refunding}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                      >
                        {refunding ? 'Refunding...' : 'Confirm Refund'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Timeline */}
              <div className="bg-white border border-[#E3E9DD] rounded-xl p-3.5 sm:p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-[#4A6333] uppercase tracking-wider border-b border-[#EBEFE6] pb-2.5 sm:pb-3">
                  Order Timeline & History
                </h3>

                {timeline.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {timeline.map((event: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5 sm:gap-3 text-xs">
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
            <div className="space-y-4 sm:space-y-6">
              
              {/* Customer Card */}
              <div className="bg-white border border-[#E3E9DD] rounded-xl p-3.5 sm:p-5 shadow-2xs space-y-3 sm:space-y-4">
                <h3 className="text-xs font-bold text-[#4A6333] uppercase tracking-wider border-b border-[#EBEFE6] pb-2.5 sm:pb-3">
                  Customer & Delivery
                </h3>

                <div className="space-y-2.5 sm:space-y-3 text-xs">
                  <div>
                    <span className="text-[#7A8E6A] text-[10px] uppercase font-semibold block">Customer Name</span>
                    <p className="font-bold text-[#1B2513] mt-0.5">{order.customerName}</p>
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
                    <span className="text-[#7A8E6A] text-[10px] uppercase font-semibold">Payment Mode</span>
                    <span className="font-bold text-[#1B2513]">{order.paymentMethod || 'Online'}</span>
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
              <form onSubmit={handleSaveStatus} className="bg-white border border-[#E3E9DD] rounded-xl p-3.5 sm:p-5 shadow-2xs space-y-3 sm:space-y-4">
                <h3 className="text-xs font-bold text-[#4A6333] uppercase tracking-wider border-b border-[#EBEFE6] pb-2.5 sm:pb-3">
                  Update Fulfillment
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#5D6F4E] mb-1">
                      Fulfillment Status
                    </label>
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                      className="w-full bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg px-3 py-2 text-xs font-semibold text-[#232B1E] focus:bg-white focus:outline-none focus:border-[#769055]"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5D6F4E] mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg px-3 py-2 text-xs font-semibold text-[#232B1E] focus:bg-white focus:outline-none focus:border-[#769055]"
                    >
                      {PAYMENT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5D6F4E] mb-1">
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
                    <label className="block text-xs font-bold text-[#5D6F4E] mb-1">
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
                    <label className="block text-xs font-bold text-[#5D6F4E] mb-1">
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
                    <label className="block text-xs font-bold text-[#5D6F4E] mb-1">
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
                    className="w-full py-2.5 bg-[#769055] hover:bg-[#5e7343] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer text-center"
                  >
                    {saving ? 'Saving...' : 'Save Order Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Invoice Modal */}
      <OrderBillInvoice
        order={order}
        isOpen={showPrintBillModal}
        onClose={() => setShowPrintBillModal(false)}
      />
    </div>
  )
}
