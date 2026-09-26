import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser, SignedIn, SignedOut, SignInButton, UserProfile } from '@clerk/clerk-react'
import { fetchUserOrders, Order } from '../lib/api'
import { STORE_INFO } from '../data/products'

export function OrdersPage() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const userIdentifier =
    user?.id ||
    (user?.primaryEmailAddress?.emailAddress as string | undefined) ||
    (user?.emailAddresses?.[0]?.emailAddress as string | undefined)

  useEffect(() => {
    let cancelled = false
    if (userIdentifier) {
      setLoading(true)
      fetchUserOrders(userIdentifier)
        .then((data) => {
          if (!cancelled) setOrders(data)
        })
        .catch(() => {
          if (!cancelled) setOrders([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    } else {
      setLoading(false)
    }
    return () => {
      cancelled = true
    }
  }, [userIdentifier])

  const filteredOrders = orders.filter((ord) => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'active') return ['Confirmed', 'Processing', 'In Transit', 'Shipped', 'Out for Delivery'].includes(ord.orderStatus)
    if (filterStatus === 'delivered') return ord.orderStatus === 'Delivered'
    if (filterStatus === 'cancelled') return ord.orderStatus === 'Cancelled'
    return true
  })

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

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Signed Out View */}
        <SignedOut>
          <div className="bg-white border border-[#EBE4D8] p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm space-y-4">
            <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto text-3xl">
              🛍️
            </div>
            <h2 className="font-display text-2xl font-bold text-charcoal">
              Sign In to View Your Orders
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Log in with your Clerk account to view your past orders, monitor live tracking, and manage your luxury wardrobe preferences.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <SignInButton mode="modal" fallbackRedirectUrl="/account">
                <button className="px-6 py-2.5 bg-[#769055] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#5e7343] transition-colors cursor-pointer">
                  Log In / Create Account →
                </button>
              </SignInButton>
              <Link
                to="/track-order"
                className="px-6 py-2.5 bg-white border border-gray-300 text-charcoal text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors"
              >
                Track by Order ID (Guest)
              </Link>
            </div>
          </div>
        </SignedOut>

        {/* Signed In View */}
        <SignedIn>
          {/* User Welcome Banner */}
          <div className="bg-[#2C2420] text-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-[#EBE4D8]/20">
            <div className="flex items-center gap-4">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || 'User'}
                  className="w-14 h-14 rounded-full border-2 border-[#C9973A] object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#769055] text-white font-bold text-xl flex items-center justify-center border-2 border-[#C9973A]">
                  {(user?.firstName?.[0] || 'A').toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-[10px] text-[#C9973A] font-bold uppercase tracking-widest block">
                  ✦ Valued Member
                </span>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
                  Welcome back, {user?.firstName || 'there'}!
                </h1>
                <p className="text-xs text-[#D1C7BD]">
                  {user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                to="/track-order"
                className="flex-1 sm:flex-initial text-center px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                📦 Track Any Order
              </Link>
              <Link
                to="/all-products"
                className="flex-1 sm:flex-initial text-center px-4 py-2 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Shop New Outfits
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 bg-white px-3 sm:px-6 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-3 sm:py-4 px-3 sm:px-4 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                activeTab === 'orders'
                  ? 'border-[#769055] text-[#769055]'
                  : 'border-transparent text-gray-500 hover:text-charcoal'
              }`}
            >
              <span>🛍️</span> My Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3 sm:py-4 px-3 sm:px-4 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                activeTab === 'profile'
                  ? 'border-[#769055] text-[#769055]'
                  : 'border-transparent text-gray-500 hover:text-charcoal'
              }`}
            >
              <span>⚙️</span> Profile & Security
            </button>
          </div>

          {/* Tab 1: Orders List */}
          {activeTab === 'orders' && (
            <div className="space-y-4 sm:space-y-6">
              
              {/* Filter Pills with smooth horizontal scroll on small devices */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex gap-2 text-xs overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {[
                    { id: 'all', label: 'All Orders' },
                    { id: 'active', label: 'Active & In Transit' },
                    { id: 'delivered', label: 'Delivered' },
                    { id: 'cancelled', label: 'Cancelled' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterStatus(tab.id)}
                      className={`px-3 py-1.5 font-bold uppercase text-[10px] sm:text-[11px] tracking-wider transition-colors cursor-pointer shrink-0 ${
                        filterStatus === tab.id
                          ? 'bg-[#769055] text-white'
                          : 'bg-white border border-gray-300 text-charcoal hover:bg-gray-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] sm:text-xs text-muted">
                  Showing {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'}
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="bg-white border border-[#EBE4D8] p-8 sm:p-12 text-center text-xs text-muted">
                  <div className="animate-spin w-8 h-8 border-2 border-[#769055] border-t-transparent rounded-full mx-auto mb-3" />
                  Loading your purchase history...
                </div>
              )}

              {/* Empty Orders State */}
              {!loading && filteredOrders.length === 0 && (
                <div className="bg-white border border-[#EBE4D8] p-8 sm:p-12 text-center space-y-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-cream rounded-full flex items-center justify-center mx-auto text-2xl sm:text-3xl">
                    👗
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-charcoal">
                    No orders found in this category
                  </h3>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Explore our handcrafted designer anarkalis, festive lehengas, and royal sarees to place your first order.
                  </p>
                  <Link
                    to="/all-products"
                    className="inline-block px-6 py-2.5 bg-[#769055] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#5e7343] transition-colors"
                  >
                    Explore Collections
                  </Link>
                </div>
              )}

              {/* Orders List Cards */}
              {!loading && filteredOrders.length > 0 && (
                <div className="space-y-4">
                  {filteredOrders.map((ord) => (
                    <div
                      key={ord.orderNumber}
                      className="bg-white border border-[#EBE4D8] shadow-xs hover:shadow-md transition-shadow overflow-hidden"
                    >
                      {/* Card Header */}
                      <div className="p-3.5 sm:p-5 bg-ivory/80 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 sm:gap-6">
                          <div>
                            <span className="text-[10px] text-muted uppercase font-bold block">Order Placed</span>
                            <span className="font-semibold text-charcoal text-[11px] sm:text-xs">
                              {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-muted uppercase font-bold block">Total Amount</span>
                            <span className="font-bold text-[#769055] text-[11px] sm:text-xs">
                              Rs. {ord.totalAmount.toLocaleString('en-IN')}.00
                            </span>
                          </div>

                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-[10px] text-muted uppercase font-bold block">Ship To</span>
                            <span className="text-charcoal font-medium text-[11px] sm:text-xs">
                              {ord.shippingAddress.city}, {ord.shippingAddress.state}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                          <span
                            className={`px-2.5 py-0.5 sm:py-1 border text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${getStatusBadge(
                              ord.orderStatus
                            )}`}
                          >
                            {ord.orderStatus}
                          </span>
                          <span className="font-mono font-bold text-xs text-charcoal">
                            #{ord.orderNumber}
                          </span>
                        </div>
                      </div>

                      {/* Card Body with Items */}
                      <div className="p-3.5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
                        <div className="md:col-span-8 space-y-3">
                          {ord.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex gap-3 sm:gap-4 items-center">
                              {item.img && (
                                <img
                                  src={item.img}
                                  alt={item.name}
                                  className="w-14 h-18 sm:w-16 sm:h-20 object-cover bg-cream shrink-0 border border-gray-100"
                                />
                              )}
                              <div className="text-left min-w-0 flex-1">
                                <h4 className="text-xs sm:text-sm font-bold text-charcoal truncate">
                                  {item.name}
                                </h4>
                                <div className="text-[10px] sm:text-[11px] text-muted mt-0.5 space-x-2">
                                  {item.selectedSize && <span>Size: <strong>{item.selectedSize}</strong></span>}
                                  <span>Qty: <strong>{item.quantity}</strong></span>
                                </div>
                                <span className="text-xs font-bold text-[#769055] mt-1 block">
                                  Rs. {(item.price * item.quantity).toLocaleString('en-IN')}.00
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Card Actions */}
                        <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col gap-2 pt-2 md:pt-0 md:border-l md:border-gray-100 md:pl-6">
                          <button
                            onClick={() => navigate(`/track/${ord.orderNumber}`)}
                            className="flex-1 w-full py-2 sm:py-2.5 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
                          >
                            📍 Track Package Live
                          </button>

                          <a
                            href={`https://wa.me/${STORE_INFO.phoneRaw}?text=${encodeURIComponent(
                              `Hi Anju Clothing, I need help with my Order #${ord.orderNumber}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 w-full py-2 bg-white border border-gray-300 hover:bg-gray-50 text-charcoal text-xs font-bold uppercase tracking-wider transition-colors text-center"
                          >
                            💬 Order Support
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Profile & Security (Clerk) */}
          {activeTab === 'profile' && (
            <div className="bg-white border border-[#EBE4D8] p-2 sm:p-6 shadow-sm overflow-x-auto">
              <div className="min-w-full">
                <UserProfile path="/account" />
              </div>
            </div>
          )}
        </SignedIn>

      </div>
    </div>
  )
}

