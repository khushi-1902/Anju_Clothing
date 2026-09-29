import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { fetchAdminOrders, AdminOrder } from '../adminApi'
import { OrderDetailModal } from '../components/OrderDetailModal'

const FILTER_TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'unfulfilled', label: 'Unfulfilled' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'shipped', label: 'In Transit' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Refunded / Cancelled' },
]

export function AdminOrdersPage() {
  const { getToken } = useAuth()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadOrders = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) return
      const data = await fetchAdminOrders(token, statusFilter, search)
      setOrders(data)
    } catch (err) {
      console.error('Failed to load orders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadOrders()
  }

  const handleOpenOrderDetail = (order: AdminOrder) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  const handleOrderUpdated = (updated: AdminOrder) => {
    setSelectedOrder(updated)
    setOrders((prev) => prev.map((o) => (o.orderNumber === updated.orderNumber ? updated : o)))
  }

  const getOrderStatusPill = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'delivered') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Delivered
        </span>
      )
    }
    if (s === 'shipped' || s === 'in transit') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-600/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          In Transit
        </span>
      )
    }
    if (s === 'cancelled' || s === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 ring-1 ring-rose-600/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          {status}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 ring-1 ring-amber-600/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {status || 'Pending'}
      </span>
    )
  }

  const getPaymentStatusPill = (status: string, method?: string) => {
    const s = String(status || '').toUpperCase()
    if (s === 'PAID') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          Paid
        </span>
      )
    }
    if (s === 'ADVANCE_PAID') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
          COD (₹200 Adv)
        </span>
      )
    }
    if (s === 'REFUNDED' || s === 'PARTIALLY_REFUNDED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200/80">
          Refunded
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0F5EB] text-[#4A6333] border border-[#D5DFC9]">
        {status || 'Pending'}
      </span>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-[#232B1E]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#1B2513] tracking-tight">Orders</h1>
            <span className="px-2 py-0.5 bg-[#F0F5EB] border border-[#D5DFC9] rounded-md text-xs font-mono font-medium text-[#4A6333]">
              {orders.length} total
            </span>
          </div>
          <p className="text-xs text-[#5D6F4E] mt-1">
            Manage customer orders, track Razorpay transactions, update shipments, and issue refunds.
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-3 rounded-xl border border-[#E3E9DD] shadow-2xs space-y-3">
        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTER_TABS.map(({ id, label }) => {
            const isActive = statusFilter === id
            return (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#769055] text-white shadow-2xs font-semibold'
                    : 'text-[#5D6F4E] hover:text-[#232B1E] hover:bg-[#F0F5EB]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 items-center pt-2 border-t border-[#EBEFE6]">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-[#7A8E6A] absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search by order #, customer name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg focus:outline-none focus:border-[#769055] focus:bg-white transition-all text-[#232B1E]"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Filter
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
              }}
              className="px-2.5 py-1.5 text-xs text-[#7A8E6A] hover:text-[#232B1E] transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E3E9DD] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F9F5] border-b border-[#EBEFE6] text-[11px] font-semibold text-[#5D6F4E] uppercase tracking-wider">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Fulfillment</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEFE6]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-32 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-12 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-16 bg-[#F0F5EB] rounded ml-auto" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-6 w-14 bg-[#F0F5EB] rounded ml-auto" /></td>
                  </tr>
                ))
              ) : orders.length > 0 ? (
                orders.map((ord) => {
                  const itemCount = Array.isArray(ord.items)
                    ? ord.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0)
                    : 1

                  return (
                    <tr
                      key={ord.orderNumber}
                      onClick={() => handleOpenOrderDetail(ord)}
                      className="hover:bg-[#F9FAF7] transition-colors cursor-pointer group"
                    >
                      {/* Order Number */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-[#202E15] group-hover:text-[#769055] transition-colors">
                          #{ord.orderNumber}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[#7A8E6A] whitespace-nowrap text-[11px]">
                        {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-[#202E15] truncate max-w-[160px]">{ord.customerName}</p>
                        <p className="text-[11px] text-[#7A8E6A] font-mono truncate max-w-[160px]">{ord.customerEmail}</p>
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-4">
                        {getPaymentStatusPill(ord.paymentStatus, ord.paymentMethod)}
                      </td>

                      {/* Fulfillment */}
                      <td className="py-3.5 px-4">
                        {getOrderStatusPill(ord.orderStatus)}
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 text-[#7A8E6A]">
                        <span className="font-medium text-[#202E15]">{itemCount}</span> {itemCount === 1 ? 'item' : 'items'}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-semibold text-[#202E15] tabular-nums">
                        ₹{ord.totalAmount.toLocaleString('en-IN')}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenOrderDetail(ord)}
                          className="px-2.5 py-1 bg-white border border-[#D5DFC9] hover:border-[#769055] hover:bg-[#F0F5EB] text-[#3E522B] text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[#7A8E6A]">
                    <div className="w-10 h-10 rounded-full bg-[#F0F5EB] flex items-center justify-center mx-auto text-[#769055] mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                    </div>
                    <p className="font-medium text-[#3A4B29] text-xs">No matching orders</p>
                    <p className="text-[11px] text-[#7A8E6A] mt-0.5">Try selecting a different filter tab or clearing your search.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <OrderDetailModal
        isOpen={isModalOpen}
        order={selectedOrder}
        onClose={() => setIsModalOpen(false)}
        onOrderUpdated={handleOrderUpdated}
      />
    </div>
  )
}
