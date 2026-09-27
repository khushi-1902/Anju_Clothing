import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { fetchAdminOrders, AdminOrder } from '../adminApi'
import { OrderDetailModal } from '../components/OrderDetailModal'

const FILTER_TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'unfulfilled', label: '⏳ Unfulfilled' },
  { id: 'unpaid', label: '💳 Unpaid' },
  { id: 'shipped', label: '🚚 In Transit / Shipped' },
  { id: 'delivered', label: '✓ Delivered' },
  { id: 'cancelled', label: '✕ Cancelled' },
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#202223] tracking-tight">Orders</h1>
            <span className="px-2.5 py-0.5 bg-[#FAF8F5] border border-[#EBE4D8] rounded-full text-xs font-bold text-[#769055]">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </span>
          </div>
          <p className="text-xs text-[#6D7175] mt-0.5">
            Track customer shipments, manage fulfillment, update AWB courier info, and inspect invoices.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E1E3E5] shadow-xs space-y-3">
        
        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 border-b border-gray-100">
          {FILTER_TABS.map(({ id, label }) => {
            const isActive = statusFilter === id
            return (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#769055] text-white shadow-xs'
                    : 'bg-[#FAF8F5] border border-gray-200 text-[#202223] hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 items-center">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search by order # (e.g. ANJU-849201), customer name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-[#FAF8F5] border border-gray-300 rounded-lg focus:outline-none focus:border-[#769055] focus:bg-white transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#202223] text-white text-xs font-bold rounded-lg hover:bg-black transition-colors cursor-pointer"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
              }}
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {/* Orders Data Table */}
      <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EBE4D8] text-[11px] font-bold text-[#6D7175] uppercase tracking-wider">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Fulfillment</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-12 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-16 bg-gray-200 rounded ml-auto" /></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-6 w-16 bg-gray-200 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : orders.length > 0 ? (
                orders.map((ord) => {
                  const itemCount = Array.isArray(ord.items)
                    ? ord.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0)
                    : 1

                  const isPaid = (ord.paymentStatus || '').toLowerCase() === 'paid'
                  const isDelivered = (ord.orderStatus || '').toLowerCase() === 'delivered'
                  const isCancelled = (ord.orderStatus || '').toLowerCase() === 'cancelled'
                  const isShipped = ['shipped', 'in transit', 'out for delivery'].includes((ord.orderStatus || '').toLowerCase())

                  return (
                    <tr
                      key={ord.orderNumber}
                      onClick={() => handleOpenOrderDetail(ord)}
                      className="hover:bg-[#FAF8F5]/80 transition-colors cursor-pointer group"
                    >
                      {/* Order Number */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#202223] group-hover:text-[#769055] transition-colors">
                          #{ord.orderNumber}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[#6D7175] whitespace-nowrap">
                        {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#202223] truncate max-w-[170px]">{ord.customerName}</p>
                        <p className="text-[11px] text-[#6D7175] font-mono truncate max-w-[170px]">{ord.customerEmail}</p>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : (ord.paymentStatus || '').toLowerCase().includes('advance')
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {isPaid ? '✓ Paid' : ord.paymentStatus || 'Pending'}
                        </span>
                      </td>

                      {/* Fulfillment Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            isDelivered
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isShipped
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : isCancelled
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}
                        >
                          {ord.orderStatus}
                        </span>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 text-[#6D7175]">
                        <span className="font-semibold text-charcoal">{itemCount}</span> {itemCount === 1 ? 'item' : 'items'}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-bold text-[#202223]">
                        ₹{ord.totalAmount.toLocaleString('en-IN')}
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenOrderDetail(ord)}
                          className="px-3 py-1 bg-white border border-gray-300 hover:bg-[#769055] hover:text-white hover:border-[#769055] rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          Manage →
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <p className="text-2xl mb-2">📦</p>
                    <p className="font-bold text-charcoal">No orders found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      No orders match the selected filter or search term.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail & Fulfillment Modal */}
      <OrderDetailModal
        isOpen={isModalOpen}
        order={selectedOrder}
        onClose={() => setIsModalOpen(false)}
        onOrderUpdated={handleOrderUpdated}
      />
    </div>
  )
}
