import React from 'react'
import { AdminOrder } from '../adminApi'
import anjuLogo from '../../assets/anju-clothing-logo.svg'
import { RazorpayLogo } from '../../components/RazorpayLogo'

interface OrderBillInvoiceProps {
  order: AdminOrder
  isOpen: boolean
  onClose: () => void
}

export function OrderBillInvoice({ order, isOpen, onClose }: OrderBillInvoiceProps) {
  if (!isOpen) return null

  const items = Array.isArray(order.items)
    ? order.items
    : typeof order.items === 'string'
    ? JSON.parse(order.items)
    : []

  const address = order.shippingAddress
  const subtotal = order.subtotal || order.totalAmount
  const shippingFee = order.shippingFee || 0
  const discount = order.discountAmount || 0
  const total = order.totalAmount
  const paidNow = order.amountPayableNow ?? total
  const dueOnDelivery = order.amountDueOnDelivery ?? 0
  const isPaid = String(order.paymentStatus).toUpperCase().includes('PAID')
  const invoiceNumber = `INV-${order.orderNumber.replace(/^#+/, '')}`

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-1.5 sm:p-4 lg:p-6 animate-in fade-in font-sans">
      <div className="bg-white border border-[#E3E9DD] rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[96vh] sm:max-h-[95vh] flex flex-col overflow-hidden">
        
        {/* Top Action Bar (Hidden during print) */}
        <div className="no-print px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-[#E3E9DD] bg-[#FAF8F5] flex items-center justify-between gap-2 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-1">
            <img src={anjuLogo} alt="Anju Clothing" className="h-5 sm:h-6 w-auto object-contain shrink-0" />
            <div className="min-w-0">
              <h3 className="text-[11px] sm:text-xs font-bold text-[#1B2513] uppercase tracking-wider truncate">
                Retail Bill / Invoice
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#5D6F4E] truncate">
                #{invoiceNumber} • Order #{order.orderNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#769055] hover:bg-[#5e7343] text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg sm:rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.056.867-1.829 1.89-1.829h10.78c1.023 0 2.13.773 1.89 1.829l-1.08 4.757A2.25 2.25 0 0118.006 21H5.994a2.25 2.25 0 01-2.194-2.414l1.08-4.757z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18H4.5a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25h15A2.25 2.25 0 0121.75 9v6.75A2.25 2.25 0 0119.5 18H18" />
              </svg>
              <span>Print Bill</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer text-sm sm:text-base font-bold"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Preview Container on Screen */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-6 md:p-8 bg-[#F7F9F5]">
          
          {/* Printable Invoice Container (Has id="printable-bill" for print CSS) */}
          <div
            id="printable-bill"
            className="bg-white border border-[#E3E9DD] rounded-xl p-4 sm:p-7 md:p-8 shadow-xs text-black max-w-2xl mx-auto"
            style={{ backgroundColor: '#ffffff' }}
          >
            {/* Header: Brand & Document Title */}
            <div className="border-b-2 border-[#1B2513] pb-3 sm:pb-4 mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-full sm:w-auto">
                <img
                  src={anjuLogo}
                  alt="Anju Clothing"
                  className="h-8 sm:h-11 w-auto object-contain mb-1.5"
                />
                <p className="text-[10px] sm:text-[11px] text-[#5D6F4E] font-medium tracking-wide">
                  Luxury Ethnic & Contemporary Fusion Wear
                </p>
                <p className="text-[9px] sm:text-[10px] text-gray-600 mt-0.5">
                  Web: anjuclothing.com • Email: support@anjuclothing.com
                </p>
              </div>

              <div className="w-full sm:w-auto text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 flex sm:block justify-between items-center">
                <div>
                  <span className="inline-block bg-[#F0F5EB] border border-[#D5DFC9] text-[#3E522B] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1 rounded">
                    Retail Invoice / Bill
                  </span>
                  <p className="text-[11px] sm:text-xs font-mono font-bold text-[#1B2513] mt-1 sm:mt-1.5">
                    {invoiceNumber}
                  </p>
                </div>
                <div className="text-right sm:text-right sm:mt-1">
                  <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase block font-semibold">Invoice Date</span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-gray-800">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Order & Customer Metadata Info (2 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-gray-200 text-xs">
              {/* Left Column: Customer & Shipping Details */}
              <div className="space-y-1 bg-[#FAF8F5] sm:bg-transparent p-2.5 sm:p-0 rounded-lg sm:rounded-none border sm:border-none border-[#EBE4D8]/60">
                <h4 className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Billed & Shipped To:
                </h4>
                <p className="font-bold text-gray-900 text-xs sm:text-sm">{order.customerName}</p>
                <p className="text-gray-700 font-mono text-[10px] sm:text-[11px]">{order.customerPhone || '—'}</p>
                {order.customerEmail && (
                  <p className="text-gray-700 text-[10px] sm:text-[11px] break-all">{order.customerEmail}</p>
                )}
                <div className="text-gray-700 text-[11px] sm:text-xs pt-0.5 leading-snug">
                  {address?.street ? (
                    <>
                      <p>{address.street}</p>
                      <p>
                        {address.city}, {address.state} -{' '}
                        <strong className="font-mono">{address.pincode}</strong>
                      </p>
                      <p>{address.country || 'India'}</p>
                    </>
                  ) : (
                    <p className="italic text-gray-500 text-[11px]">Address not specified</p>
                  )}
                </div>
              </div>

              {/* Right Column: Order Details */}
              <div className="space-y-1 bg-[#FAF8F5] sm:bg-transparent p-2.5 sm:p-0 rounded-lg sm:rounded-none border sm:border-none border-[#EBE4D8]/60 sm:text-right">
                <h4 className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Order Details:
                </h4>
                <p className="text-[11px] sm:text-xs text-gray-800">
                  Order Number: <strong className="font-mono">#{order.orderNumber}</strong>
                </p>
                <div className="text-[11px] sm:text-xs text-gray-800 flex items-center sm:justify-end gap-1.5 flex-wrap">
                  <span>Payment:</span>
                  <strong>{order.paymentMethod || (isPaid ? 'Prepaid Online' : 'COD')}</strong>
                  {order.razorpayPaymentId && (
                    <RazorpayLogo height={13} variant="badge" className="ml-0.5" />
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-gray-800">
                  Payment Status:{' '}
                  <span
                    className={`font-bold ${
                      isPaid ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </p>
                {order.razorpayPaymentId && (
                  <div className="flex items-center sm:justify-end gap-1 text-[10px] sm:text-[11px] text-gray-700 font-mono pt-0.5">
                    <RazorpayLogo height={11} variant="icon" />
                    <span>Txn ID: {order.razorpayPaymentId}</span>
                  </div>
                )}
                {order.courierName && (
                  <p className="text-[11px] sm:text-xs text-gray-800 pt-0.5">
                    Courier: <strong>{order.courierName}</strong>
                    {order.trackingNumber && (
                      <span className="block font-mono text-[10px] sm:text-[11px] text-gray-600">
                        AWB: {order.trackingNumber}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Items Table (Responsive with smooth horizontal scroll on narrow mobile screens) */}
            <div className="py-3 sm:py-4 overflow-x-auto">
              <table className="w-full min-w-[340px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-600">
                    <th className="py-2 px-1 sm:px-2 w-6">#</th>
                    <th className="py-2 px-1.5 sm:px-2">Item Description</th>
                    <th className="py-2 px-1 sm:px-2 text-center w-12">Size</th>
                    <th className="py-2 px-1 sm:px-2 text-center w-10">Qty</th>
                    <th className="py-2 px-1.5 sm:px-2 text-right">Price</th>
                    <th className="py-2 px-1.5 sm:px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item: any, idx: number) => {
                    const price = item.price || 0
                    const qty = item.quantity || 1
                    const size = item.selectedSize || item.size || '—'
                    return (
                      <tr key={idx} className="align-middle text-[11px] sm:text-xs">
                        <td className="py-2.5 px-1 sm:px-2 text-gray-500 font-mono text-[10px] sm:text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-1.5 sm:px-2">
                          <p className="font-semibold text-gray-900 leading-tight">{item.name}</p>
                          {item.color && (
                            <p className="text-[9px] sm:text-[10px] text-gray-500">Color: {item.color}</p>
                          )}
                        </td>
                        <td className="py-2.5 px-1 sm:px-2 text-center font-medium">{size}</td>
                        <td className="py-2.5 px-1 sm:px-2 text-center font-mono font-bold">{qty}</td>
                        <td className="py-2.5 px-1.5 sm:px-2 text-right font-mono tabular-nums whitespace-nowrap">
                          ₹{price.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-1.5 sm:px-2 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                          ₹{(price * qty).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculation Totals */}
            <div className="border-t-2 border-gray-300 pt-3 flex justify-end">
              <div className="w-full sm:w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600 text-[11px] sm:text-xs">
                  <span>Subtotal:</span>
                  <span className="font-mono tabular-nums">
                    ₹{subtotal.toLocaleString('en-IN')}.00
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium text-[11px] sm:text-xs">
                    <span>Discount:</span>
                    <span className="font-mono tabular-nums">
                      -₹{discount.toLocaleString('en-IN')}.00
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 text-[11px] sm:text-xs">
                  <span>Shipping Fee:</span>
                  <span className="font-mono">
                    {shippingFee > 0 ? `₹${shippingFee}.00` : 'FREE'}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm font-bold text-gray-900 pt-1.5 sm:pt-2 border-t-2 border-gray-400">
                  <span>Grand Total:</span>
                  <span className="font-mono tabular-nums text-[#3E522B]">
                    ₹{total.toLocaleString('en-IN')}.00
                  </span>
                </div>
                {dueOnDelivery > 0 && (
                  <>
                    <div className="flex justify-between text-gray-600 text-[10px] sm:text-[11px] pt-1">
                      <span>Advance Paid Online:</span>
                      <span className="font-mono tabular-nums">
                        ₹{paidNow.toLocaleString('en-IN')}.00
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-900 font-bold text-[11px] sm:text-xs">
                      <span>Amount Due on Delivery:</span>
                      <span className="font-mono tabular-nums">
                        ₹{dueOnDelivery.toLocaleString('en-IN')}.00
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer Terms & Disclaimer */}
            <div className="mt-6 sm:mt-8 pt-3 sm:pt-4 border-t border-gray-200 text-[9px] sm:text-[10px] text-gray-600 space-y-1">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2">
                <p className="font-semibold text-gray-700">
                  Important: An unboxing video is mandatory for any exchange/alteration request.
                </p>
                <p className="text-gray-500 font-mono">
                  Authorized Signatory: Anju Clothing
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
                <p className="text-gray-500">
                  Thank you for shopping with Anju Clothing. This is a computer-generated tax invoice and requires no physical signature.
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Processed by</span>
                  <RazorpayLogo height={13} variant="full" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Buttons (Hidden during print) */}
        <div className="no-print p-2.5 sm:p-4 bg-white border-t border-[#E3E9DD] flex items-center justify-between gap-2 shrink-0">
          <p className="text-[11px] text-gray-500 hidden sm:block">
            Tip: Press Ctrl+P or click &apos;Print Bill&apos; to print or save as PDF.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-3.5 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-4 py-2 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <span>🖨️</span>
              <span>Print Bill</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
