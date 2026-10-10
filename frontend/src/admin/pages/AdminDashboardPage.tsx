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
      setError(err.message || 'Failed to load dashboard metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [getToken])

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'delivered') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
    if (s === 'shipped' || s === 'in transit') return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20'
    if (s === 'cancelled' || s === 'refunded') return 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
    return 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20'
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-8 sm:pb-12 font-sans text-[#232B1E]">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#1B2513] tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs text-[#5D6F4E] mt-0.5">
            Key operational metrics, revenue performance, and recent activities.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[#D5DFC9] hover:bg-[#F4F7ED] text-xs font-semibold text-[#3A4B29] rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 text-[#5D6F4E] ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>Sync</span>
          </button>

          <Link
            to="/admin/orders"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs text-center"
          >
            <span>All Orders</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <span className="font-medium">{error}</span>
          <button onClick={loadDashboardData} className="font-semibold underline cursor-pointer ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Metrics Row (2 columns on mobile, 4 columns on large screens) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Metric 1: Total Revenue */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-[#E3E9DD] shadow-2xs hover:border-[#CAD7BE] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-[#5D6F4E]">Gross Sales</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F0F5EB] text-[#4A6333] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl font-bold text-[#202E15] tracking-tight tabular-nums truncate">
              {loading ? (
                <div className="h-6 sm:h-7 w-20 sm:w-28 bg-[#F0F5EB] rounded animate-pulse" />
              ) : (
                `₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#7A8E6A] mt-0.5 truncate">
              Avg: ₹{(stats?.avgOrderValue ?? 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Metric 2: Total Orders */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-[#E3E9DD] shadow-2xs hover:border-[#CAD7BE] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-[#5D6F4E]">Total Orders</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F0F5EB] text-[#4A6333] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl font-bold text-[#202E15] tracking-tight tabular-nums">
              {loading ? (
                <div className="h-6 sm:h-7 w-12 sm:w-16 bg-[#F0F5EB] rounded animate-pulse" />
              ) : (
                stats?.totalOrders ?? 0
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#7A8E6A] mt-0.5 truncate">
              Lifetime sales
            </p>
          </div>
        </div>

        {/* Metric 3: Pending Orders */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-[#E3E9DD] shadow-2xs hover:border-[#CAD7BE] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-[#5D6F4E]">Pending</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl font-bold text-[#202E15] tracking-tight flex items-baseline gap-1.5 tabular-nums">
              {loading ? (
                <div className="h-6 sm:h-7 w-10 sm:w-14 bg-[#F0F5EB] rounded animate-pulse" />
              ) : (
                <>
                  <span>{stats?.pendingOrders ?? 0}</span>
                  {(stats?.pendingOrders ?? 0) > 0 && (
                    <span className="text-[9px] sm:text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-full">
                      Action
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#7A8E6A] mt-0.5 truncate">
              Awaiting dispatch
            </p>
          </div>
        </div>

        {/* Metric 4: Total Products */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-[#E3E9DD] shadow-2xs hover:border-[#CAD7BE] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-[#5D6F4E]">Live Outfits</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F0F5EB] text-[#4A6333] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl font-bold text-[#202E15] tracking-tight tabular-nums">
              {loading ? (
                <div className="h-6 sm:h-7 w-10 sm:w-14 bg-[#F0F5EB] rounded animate-pulse" />
              ) : (
                stats?.totalProducts ?? 0
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#7A8E6A] mt-0.5 truncate">
              Active catalog items
            </p>
          </div>
        </div>

      </div>

      {/* Sales Activity Visualizer */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-[#E3E9DD] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#EBEFE6]">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-[#202E15]">Revenue & Volume Trends</h2>
            <p className="text-[11px] sm:text-xs text-[#5D6F4E]">Daily sales performance history (Last 14 Days)</p>
          </div>
          <div className="flex items-center self-start sm:self-auto gap-1 bg-[#F0F5EB] p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setChartView('revenue')}
              className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                chartView === 'revenue'
                  ? 'bg-white text-[#202E15] shadow-2xs font-semibold'
                  : 'text-[#5D6F4E] hover:text-[#202E15]'
              }`}
            >
              Revenue (₹)
            </button>
            <button
              onClick={() => setChartView('orders')}
              className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                chartView === 'orders'
                  ? 'bg-white text-[#202E15] shadow-2xs font-semibold'
                  : 'text-[#5D6F4E] hover:text-[#202E15]'
              }`}
            >
              Order Count
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-44 sm:h-52 bg-[#F7F9F5] rounded-lg flex items-center justify-center text-xs text-[#7A8E6A]">
            Loading sales metrics...
          </div>
        ) : stats?.salesByDay && stats.salesByDay.length > 0 ? (
          <div className="pt-2">
            {/* Chart Track Container with items-stretch and ample top padding for tooltips */}
            <div className="h-44 sm:h-52 w-full flex items-stretch gap-1.5 sm:gap-2 pt-10 pb-2 px-1 sm:px-2 overflow-x-auto scrollbar-none">
              {(() => {
                const maxVal = Math.max(
                  ...stats.salesByDay.map((d) => (chartView === 'revenue' ? d.revenue : d.orders)),
                  1
                )
                return stats.salesByDay.map((item) => {
                  const val = chartView === 'revenue' ? item.revenue : item.orders
                  const isZero = val === 0
                  const heightPercent = isZero ? 0 : Math.max(Math.round((val / maxVal) * 100), 6)

                  return (
                    <div
                      key={item.date}
                      className="flex-1 min-w-[32px] sm:min-w-[36px] h-full flex flex-col items-center gap-1.5 group relative shrink-0"
                    >
                      {/* Tooltip positioned safely inside top padding area */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#233019] text-white text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap shadow-md z-20 font-mono">
                        {item.date}: {chartView === 'revenue' ? `₹${item.revenue.toLocaleString('en-IN')}` : `${item.orders} orders`}
                      </div>

                      {/* Bar Track: flex-1 min-h-0 with rounded-t background */}
                      <div className="w-full bg-[#F0F5EB] rounded-t flex-1 min-h-0 flex items-end">
                        <div
                          style={{ height: isZero ? '4px' : `${heightPercent}%` }}
                          className={`w-full rounded-t transition-all duration-300 ${
                            isZero
                              ? 'bg-[#D2DEC8] group-hover:bg-[#C0CFA5]'
                              : chartView === 'revenue'
                              ? 'bg-[#769055] group-hover:bg-[#5e7343]'
                              : 'bg-[#4B6B38] group-hover:bg-[#3C572D]'
                          }`}
                        />
                      </div>

                      {/* Date Label */}
                      <span className="text-[9px] sm:text-[10px] text-[#7A8E6A] font-mono truncate max-w-full">
                        {item.date.slice(5)}
                      </span>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        ) : (
          <div className="h-32 sm:h-36 bg-[#F7F9F5] rounded-lg border border-dashed border-[#D5DFC9] flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs font-semibold text-[#3A4B29]">No chart data yet</p>
            <p className="text-[11px] text-[#7A8E6A] mt-0.5">Graphs will automatically populate as customer checkouts occur.</p>
          </div>
        )}
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-xl border border-[#E3E9DD] shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-5 border-b border-[#EBEFE6] flex items-center justify-between">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-[#202E15]">Recent Transactions</h2>
            <p className="text-[11px] sm:text-xs text-[#5D6F4E]">Latest orders placed on your store</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs text-[#769055] hover:text-[#5e7343] font-semibold hover:underline"
          >
            All Orders ({stats?.totalOrders ?? 0}) →
          </Link>
        </div>

        {/* Mobile View: Cards */}
        <div className="block sm:hidden divide-y divide-[#EBEFE6]">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3.5 space-y-2 animate-pulse">
                <div className="h-4 w-24 bg-[#F0F5EB] rounded" />
                <div className="h-3 w-40 bg-[#F0F5EB] rounded" />
                <div className="h-4 w-20 bg-[#F0F5EB] rounded" />
              </div>
            ))
          ) : recentOrders.length > 0 ? (
            recentOrders.map((ord) => (
              <div key={ord.orderNumber} className="p-3.5 space-y-2 hover:bg-[#F9FAF7] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-[#202E15]">
                    #{ord.orderNumber}
                  </span>
                  <span className="font-bold text-xs text-[#202E15]">
                    ₹{ord.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#202E15] font-medium truncate max-w-[180px]">
                    {ord.customerName}
                  </span>
                  <span className="text-[#5D6F4E] text-[11px]">
                    {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#F0F5EB] text-[#3E522B]">
                    {ord.paymentStatus || 'Pending'}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(ord.orderStatus || 'Pending')}`}>
                    {ord.orderStatus || 'Pending'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-[#7A8E6A] text-xs">
              No recent orders.
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F9F5] border-b border-[#EBEFE6] text-[11px] font-semibold text-[#5D6F4E] uppercase tracking-wider">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Fulfillment</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEFE6]">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-28 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-16 bg-[#F0F5EB] rounded ml-auto" /></td>
                  </tr>
                ))
              ) : recentOrders.length > 0 ? (
                recentOrders.map((ord) => (
                  <tr key={ord.orderNumber} className="hover:bg-[#F9FAF7] transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold text-[#202E15]">
                        #{ord.orderNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#202E15] truncate max-w-[160px]">
                        {ord.customerName}
                      </div>
                      <div className="text-[11px] text-[#7A8E6A] font-mono truncate max-w-[160px]">
                        {ord.customerEmail}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5D6F4E] text-[11px] whitespace-nowrap">
                      {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0F5EB] text-[#3E522B]">
                        {ord.paymentStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${getStatusBadge(ord.orderStatus || 'Pending')}`}>
                        {ord.orderStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#202E15] tabular-nums">
                      ₹{ord.totalAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#7A8E6A] text-xs">
                    No recent orders.
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
