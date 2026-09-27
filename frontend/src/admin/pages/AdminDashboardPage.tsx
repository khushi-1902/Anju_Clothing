import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { fetchAdminStats, fetchRecentOrders, AdminStats, AdminOrder } from '../adminApi'

export function AdminDashboardPage() {
  const { getToken } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartView, setChartView] = useState<'revenue' | 'orders'>('revenue')

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      if (!token) throw new Error('Authentication required')

      const [statsData, ordersData] = await Promise.all([
        fetchAdminStats(token),
        fetchRecentOrders(token),
      ])

      setStats(statsData)
      setRecentOrders(ordersData)
    } catch (err: any) {
      console.error('[Dashboard Load Error]:', err)
      setError(err.message || 'Failed to load dashboard metrics from PostgreSQL')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [getToken])

  const getStatusBadge = (status: string) => {
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

  const getPaymentBadge = (status: string) => {
    return status.toLowerCase() === 'paid'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-amber-50 text-amber-700 border-amber-200'
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#202223] tracking-tight">
            Store Overview
          </h1>
          <p className="text-xs text-[#6D7175] mt-0.5">
            Real-time sales, order fulfillment, and inventory metrics from your database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#BABFC3] hover:bg-gray-50 text-xs font-semibold text-[#202223] rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            <span>Refresh Data</span>
          </button>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
          >
            <span>Manage Orders →</span>
          </Link>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={loadDashboardData} className="font-bold underline cursor-pointer">
            Try Again
          </button>
        </div>
      )}

      {/* 1. Key Metrics Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Orders */}
        <div className="bg-white p-5 rounded-xl border border-[#E1E3E5] shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6D7175]">Total Orders</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-bold">
              🛍️
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-[#202223] tracking-tight">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                stats?.totalOrders ?? 0
              )}
            </div>
            <p className="text-[11px] text-[#6D7175] mt-1">
              Storewide purchases to date
            </p>
          </div>
        </div>

        {/* Metric 2: Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-[#E1E3E5] shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6D7175]">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold">
              💰
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-[#769055] tracking-tight">
              {loading ? (
                <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />
              ) : (
                `Rs. ${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`
              )}
            </div>
            <p className="text-[11px] text-[#6D7175] mt-1">
              Avg order: Rs. {(stats?.avgOrderValue ?? 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Metric 3: Pending Orders */}
        <div className="bg-white p-5 rounded-xl border border-[#E1E3E5] shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6D7175]">Pending Fulfillment</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold">
              ⏳
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-[#202223] tracking-tight flex items-baseline gap-2">
              {loading ? (
                <div className="h-8 w-14 bg-gray-200 rounded animate-pulse" />
              ) : (
                <>
                  <span>{stats?.pendingOrders ?? 0}</span>
                  {(stats?.pendingOrders ?? 0) > 0 && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Needs Action
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-[11px] text-[#6D7175] mt-1">
              Awaiting packing & dispatch
            </p>
          </div>
        </div>

        {/* Metric 4: Total Products */}
        <div className="bg-white p-5 rounded-xl border border-[#E1E3E5] shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6D7175]">Active Products</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center text-sm font-bold">
              👗
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-[#202223] tracking-tight">
              {loading ? (
                <div className="h-8 w-14 bg-gray-200 rounded animate-pulse" />
              ) : (
                stats?.totalProducts ?? 0
              )}
            </div>
            <p className="text-[11px] text-[#6D7175] mt-1">
              Live in boutique catalog
            </p>
          </div>
        </div>

      </div>

      {/* 2. Sales Over Time Chart */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#E1E3E5] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-[#202223]">Sales Activity Over Time</h2>
            <p className="text-xs text-[#6D7175]">Daily revenue and order volume trends</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setChartView('revenue')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                chartView === 'revenue'
                  ? 'bg-white text-[#202223] shadow-xs'
                  : 'text-[#6D7175] hover:text-[#202223]'
              }`}
            >
              Revenue (Rs.)
            </button>
            <button
              onClick={() => setChartView('orders')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                chartView === 'orders'
                  ? 'bg-white text-[#202223] shadow-xs'
                  : 'text-[#6D7175] hover:text-[#202223]'
              }`}
            >
              Orders Count
            </button>
          </div>
        </div>

        {/* Responsive SVG Chart */}
        {loading ? (
          <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center text-xs text-[#6D7175]">
            Loading sales metrics...
          </div>
        ) : stats?.salesByDay && stats.salesByDay.length > 0 ? (
          <div className="pt-2">
            {/* Chart Bars */}
            <div className="h-48 w-full flex items-end gap-2 pt-6 pb-2 px-2 overflow-x-auto">
              {(() => {
                const maxVal = Math.max(
                  ...stats.salesByDay.map((d) => (chartView === 'revenue' ? d.revenue : d.orders)),
                  1
                )
                return stats.salesByDay.map((item, idx) => {
                  const val = chartView === 'revenue' ? item.revenue : item.orders
                  const heightPercent = Math.max(Math.round((val / maxVal) * 100), 10)
                  return (
                    <div
                      key={idx}
                      className="flex-1 min-w-[36px] flex flex-col items-center gap-1.5 group relative"
                    >
                      {/* Tooltip on Hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-[#202223] text-white text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap shadow-md z-10">
                        {item.date}: {chartView === 'revenue' ? `Rs. ${item.revenue.toLocaleString('en-IN')}` : `${item.orders} order(s)`}
                      </div>

                      {/* Bar */}
                      <div className="w-full bg-gray-100 rounded-t-sm h-full flex items-end">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            chartView === 'revenue'
                              ? 'bg-[#769055] group-hover:bg-[#5e7343]'
                              : 'bg-blue-600 group-hover:bg-blue-700'
                          }`}
                        />
                      </div>

                      {/* X-axis date label */}
                      <span className="text-[10px] text-[#6D7175] font-mono truncate max-w-full">
                        {item.date.slice(5)}
                      </span>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        ) : (
          <div className="h-40 bg-[#FAF8F5] rounded-lg border border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-4">
            <span className="text-xl">📊</span>
            <p className="text-xs font-semibold text-[#202223] mt-1">No sales data recorded yet</p>
            <p className="text-[11px] text-[#6D7175]">Sales graphs will populate automatically as new customer orders are placed.</p>
          </div>
        )}
      </div>

      {/* 3. Recent Orders List Table */}
      <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#202223]">Recent Customer Orders</h2>
            <p className="text-xs text-[#6D7175]">Last 10 orders received</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs text-[#769055] hover:underline font-bold"
          >
            View All Orders ({stats?.totalOrders ?? 0}) →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-gray-100 text-[11px] font-bold text-[#6D7175] uppercase tracking-wider">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Fulfillment Status</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-28 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-16 bg-gray-200 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : recentOrders.length > 0 ? (
                recentOrders.map((ord) => (
                  <tr key={ord.orderNumber} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-[#202223] text-xs">
                        {ord.orderNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#202223] truncate max-w-[160px]">
                        {ord.customerName}
                      </div>
                      <div className="text-[11px] text-[#6D7175] truncate max-w-[160px]">
                        {ord.customerEmail}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#6D7175] text-[11px] whitespace-nowrap">
                      {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getPaymentBadge(
                          ord.paymentStatus || 'Pending'
                        )}`}
                      >
                        {ord.paymentStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                          ord.orderStatus || 'Confirmed'
                        )}`}
                      >
                        {ord.orderStatus || 'Confirmed'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#202223]">
                      Rs. {ord.totalAmount.toLocaleString('en-IN')}.00
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 text-xs">
                    No recent orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
