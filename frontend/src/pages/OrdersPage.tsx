import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useUser, useAuth, useClerk, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { fetchUserOrders, cancelOrder, Order } from '../lib/api'
import { useShop } from '../context/ShopContext'
import { STORE_INFO } from '../data/products'

interface SavedAddress {
  id: string
  name: string
  phone: string
  street: string
  city: string
  state: string
  pincode: string
  isDefault: boolean
  tag: 'Home' | 'Work' | 'Other'
}

const DEFAULT_SAVED_ADDRESSES: SavedAddress[] = [
  {
    id: 'addr-1',
    name: 'Primary Delivery',
    phone: '+91 96259 23308',
    street: 'B-14, Luxury Enclave, South Extension',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110049',
    isDefault: true,
    tag: 'Home',
  },
]

export function OrdersPage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const { wishlist, openWishlist } = useShop()
  const navigate = useNavigate()
  const location = useLocation()

  // Tab routing
  const isAccountRoute = location.pathname.startsWith('/account') || location.pathname.startsWith('/profile')
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'addresses' | 'support'>(
    isAccountRoute ? 'profile' : 'orders'
  )

  // Mobile Hamburger Drawer state (Order & Account sections)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Orders state
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cancellingOrderNum, setCancellingOrderNum] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  // Profile Form state
  const [profileFirstName, setProfileFirstName] = useState(user?.firstName || '')
  const [profileLastName, setProfileLastName] = useState(user?.lastName || '')
  const [profileGender, setProfileGender] = useState<'Female' | 'Male' | 'Other'>('Female')
  const [profileDob, setProfileDob] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null)

  // Addresses state
  const [addresses, setAddresses] = useState<SavedAddress[]>(() => {
    try {
      const saved = localStorage.getItem('anju_saved_addresses')
      return saved ? JSON.parse(saved) : DEFAULT_SAVED_ADDRESSES
    } catch {
      return DEFAULT_SAVED_ADDRESSES
    }
  })
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [newAddress, setNewAddress] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    tag: 'Home' as 'Home' | 'Work' | 'Other',
  })

  // Sync route & query parameters (?tab=orders|profile|addresses|support)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const tabParam = searchParams.get('tab')
    if (tabParam === 'orders' || tabParam === 'profile' || tabParam === 'addresses' || tabParam === 'support') {
      setActiveTab(tabParam)
    } else if (location.pathname.startsWith('/account') || location.pathname.startsWith('/profile')) {
      setActiveTab('profile')
    } else if (location.pathname.startsWith('/orders')) {
      setActiveTab('orders')
    }
  }, [location.pathname, location.search])

  // Sync profile form when user loads
  useEffect(() => {
    if (user) {
      setProfileFirstName(user.firstName || '')
      setProfileLastName(user.lastName || '')
    }
  }, [user])

  // Save addresses to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('anju_saved_addresses', JSON.stringify(addresses))
    } catch (_) {}
  }, [addresses])

  const userEmail =
    (user?.primaryEmailAddress?.emailAddress as string | undefined) ||
    (user?.emailAddresses?.[0]?.emailAddress as string | undefined) ||
    ''

  const userIdentifier = user?.id || userEmail

  // Real-time Order Loader
  const loadOrders = useCallback(
    async (isBackground = false) => {
      if (!userIdentifier) {
        setLoading(false)
        return
      }

      if (!isBackground) setLoading(true)
      setRefreshing(true)

      try {
        const token = await getToken()
        const data = await fetchUserOrders(userIdentifier, token, userEmail)
        setOrders(data)
      } catch (err) {
        console.error('Failed to load user orders:', err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [userIdentifier, userEmail, getToken]
  )

  // Initial load & window focus real-time sync
  useEffect(() => {
    loadOrders()

    // Poll every 20 seconds for real-time tracking updates
    const interval = setInterval(() => {
      loadOrders(true)
    }, 20000)

    const handleFocus = () => {
      loadOrders(true)
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadOrders])

  // Order Filtering & Search
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // Status filter
      if (filterStatus === 'active') {
        const activeStatuses = ['confirmed', 'processing', 'in transit', 'shipped', 'out for delivery', 'pending']
        if (!activeStatuses.includes((ord.orderStatus || '').toLowerCase())) return false
      } else if (filterStatus === 'delivered') {
        if ((ord.orderStatus || '').toLowerCase() !== 'delivered') return false
      } else if (filterStatus === 'cancelled') {
        if ((ord.orderStatus || '').toLowerCase() !== 'cancelled') return false
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase()
        const matchesNumber = ord.orderNumber.toLowerCase().includes(query)
        const matchesItem = ord.items?.some((item: any) =>
          (item.name || item.productName || '').toLowerCase().includes(query)
        )
        return matchesNumber || matchesItem
      }

      return true
    })
  }, [orders, filterStatus, searchQuery])

  // Active Orders Count
  const activeOrdersCount = useMemo(() => {
    return orders.filter((ord) =>
      ['confirmed', 'processing', 'in transit', 'shipped', 'out for delivery', 'pending'].includes(
        (ord.orderStatus || '').toLowerCase()
      )
    ).length
  }, [orders])

  const handleTabChange = (tabId: 'orders' | 'profile' | 'addresses' | 'support') => {
    setActiveTab(tabId)
    setIsMobileMenuOpen(false)
    if (tabId === 'orders') navigate('/orders')
    else navigate(`/account?tab=${tabId}`)
  }

  // Profile update handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setSavingProfile(true)
      setProfileSuccessMsg(null)
      await user.update({
        firstName: profileFirstName.trim(),
        lastName: profileLastName.trim(),
      })
      setProfileSuccessMsg('Profile updated successfully.')
      setTimeout(() => setProfileSuccessMsg(null), 3000)
    } catch (err: any) {
      console.error('Failed to update profile:', err)
    } finally {
      setSavingProfile(false)
    }
  }

  // Cancel order handler
  const handleCancelOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cancellingOrderNum) return

    try {
      setCancelLoading(true)
      setCancelError(null)
      await cancelOrder(cancellingOrderNum, cancelReason || 'Customer cancelled from portal')
      setCancellingOrderNum(null)
      setCancelReason('')
      loadOrders(false)
    } catch (err: any) {
      setCancelError(err.message || 'Could not cancel order. Please contact customer support.')
    } finally {
      setCancelLoading(false)
    }
  }

  // Add Address Handler
  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAddress.name || !newAddress.street || !newAddress.city || !newAddress.pincode) return

    const created: SavedAddress = {
      id: `addr-${Date.now()}`,
      name: newAddress.name,
      phone: newAddress.phone || user?.primaryPhoneNumber?.phoneNumber || '',
      street: newAddress.street,
      city: newAddress.city,
      state: newAddress.state || 'Delhi',
      pincode: newAddress.pincode,
      tag: newAddress.tag,
      isDefault: addresses.length === 0,
    }

    setAddresses([...addresses, created])
    setShowAddressModal(false)
    setNewAddress({
      name: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      pincode: '',
      tag: 'Home',
    })
  }

  const handleSetDefaultAddress = (id: string) => {
    setAddresses(
      addresses.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }))
    )
  }

  const handleDeleteAddress = (id: string) => {
    setAddresses(addresses.filter((a) => a.id !== id))
  }

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'delivered') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    if (s.includes('ship') || s.includes('transit') || s.includes('out for'))
      return 'bg-blue-50 text-blue-800 border-blue-200'
    if (s.includes('process') || s.includes('confirm'))
      return 'bg-amber-50 text-amber-800 border-amber-200'
    if (s.includes('cancel')) return 'bg-rose-50 text-rose-800 border-rose-200'
    return 'bg-gray-50 text-gray-800 border-gray-200'
  }

  const NAV_SECTIONS = [
    { id: 'orders', label: 'My Orders', icon: '🛍️', desc: 'Active shipments & history', badge: orders.length > 0 ? String(orders.length) : undefined },
    { id: 'profile', label: 'Profile Details', icon: '👤', desc: 'Name, email, preferences' },
    { id: 'addresses', label: 'Saved Addresses', icon: '📍', desc: 'Delivery locations', badge: String(addresses.length) },
    { id: 'support', label: 'Customer Care & FAQs', icon: '💬', desc: 'WhatsApp styling concierge' },
  ]

  const activeSectionTitle = NAV_SECTIONS.find((s) => s.id === activeTab)?.label || 'My Account'
  const activeSectionIcon = NAV_SECTIONS.find((s) => s.id === activeTab)?.icon || '🛍️'

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-4 sm:py-8 px-3 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Signed Out View */}
        <SignedOut>
          <div className="bg-white border border-[#EBE4D8] rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
            <div className="w-16 h-16 bg-[#FAF5EE] rounded-full flex items-center justify-center mx-auto text-3xl">
              🛍️
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1B2513]">
              Sign In to View Your Luxury Orders
            </h2>
            <p className="text-xs sm:text-sm text-[#5D6F4E] leading-relaxed">
              Track live shipments, view past festive purchases, manage saved delivery addresses, and chat directly with concierge support.
            </p>
            <div className="pt-2">
              <SignInButton mode="modal" fallbackRedirectUrl="/orders">
                <button className="px-8 py-3 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer">
                  Log In / Create Account →
                </button>
              </SignInButton>
            </div>
          </div>
        </SignedOut>

        {/* Signed In View */}
        <SignedIn>
          {/* Top Profile Card Header */}
          <div className="bg-gradient-to-r from-[#2C2420] via-[#3a302a] to-[#2C2420] text-white rounded-2xl p-4 sm:p-6 shadow-sm border border-[#EBE4D8]/20 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
            <div className="flex items-center gap-3.5 sm:gap-5">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || 'User'}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-[#C9973A] object-cover shadow-xs shrink-0"
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#769055] text-white font-bold text-lg sm:text-2xl flex items-center justify-center border-2 border-[#C9973A] shrink-0">
                  {(user?.firstName?.[0] || userEmail?.[0] || 'A').toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#C9973A]">
                    ✦ Anju Privilege Club
                  </span>
                </div>
                <h1 className="text-base sm:text-2xl font-bold tracking-tight text-white truncate mt-0.5">
                  {user?.fullName || user?.firstName || 'Valued Member'}
                </h1>
                <p className="text-[11px] sm:text-xs text-[#D1C7BD] font-mono truncate mt-0.5">
                  {userEmail || 'Customer Account'}
                </p>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
              <div
                onClick={() => handleTabChange('orders')}
                className="bg-white/10 hover:bg-white/15 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl text-center cursor-pointer transition-colors"
              >
                <span className="block text-sm sm:text-lg font-bold font-mono text-[#C9973A]">
                  {orders.length}
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase tracking-wider font-semibold">
                  Orders
                </span>
              </div>

              <div
                onClick={() => handleTabChange('orders')}
                className="bg-white/10 hover:bg-white/15 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl text-center cursor-pointer transition-colors"
              >
                <span className="block text-sm sm:text-lg font-bold font-mono text-emerald-400">
                  {activeOrdersCount}
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase tracking-wider font-semibold">
                  In Transit
                </span>
              </div>

              <div
                onClick={openWishlist}
                className="bg-white/10 hover:bg-white/15 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl text-center cursor-pointer transition-colors"
              >
                <span className="block text-sm sm:text-lg font-bold font-mono text-rose-300">
                  {wishlist.length}
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase tracking-wider font-semibold">
                  Wishlist
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Section Selector & Hamburger Bar (< lg) */}
          <div className="lg:hidden bg-white border border-[#EBE4D8] rounded-2xl p-2.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">{activeSectionIcon}</span>
                <span className="font-bold text-xs sm:text-sm text-[#1B2513] uppercase tracking-wider truncate">
                  {activeSectionTitle}
                </span>
              </div>

              {/* Hamburger Button (icon only) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="w-8 h-8 flex items-center justify-center bg-[#769055] text-white rounded-xl hover:bg-[#5e7343] transition-colors cursor-pointer shadow-2xs shrink-0"
                aria-label="Open section menu"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            </div>

            {/* Quick Horizontal Scrollable Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {NAV_SECTIONS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-[#769055] text-white shadow-2xs'
                      : 'bg-[#FAF8F5] text-[#3E522B] border border-[#EBE4D8]'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        activeTab === item.id ? 'bg-white/20 text-white' : 'bg-[#E3E9DD] text-[#3E522B]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 items-start">
            
            {/* Left Sidebar Navigation (Desktop lg and up) */}
            <div className="hidden lg:block lg:col-span-1 bg-white border border-[#EBE4D8] rounded-2xl p-2.5 sm:p-3 shadow-xs space-y-1 sticky top-24">
              <div className="px-3 py-2 border-b border-[#EBEFE6] mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A8E6A] block">
                  Account Menu
                </span>
              </div>

              {NAV_SECTIONS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-[#769055] text-white shadow-2xs'
                      : 'text-[#3E522B] hover:bg-[#F0F5EB]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        activeTab === item.id ? 'bg-white/20 text-white' : 'bg-[#E3E9DD] text-[#3E522B]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}

              <div className="pt-2 border-t border-gray-100 mt-2 space-y-1">
                <button
                  onClick={openWishlist}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#3E522B] hover:bg-[#F0F5EB] transition-colors cursor-pointer"
                >
                  <span>❤️</span>
                  <span>My Wishlist ({wishlist.length})</span>
                </button>


                <button
                  onClick={() => signOut({ redirectUrl: '/' })}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <span>🚪</span>
                  <span>Log Out</span>
                </button>
              </div>
            </div>

            {/* Right Main Content Panel */}
            <div className="lg:col-span-3 space-y-4 sm:space-y-6">
              
              {/* TAB 1: MY ORDERS */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  
                  {/* Search and Live Refresh Bar */}
                  <div className="bg-white border border-[#EBE4D8] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                    {/* Search inside orders */}
                    <div className="relative w-full sm:w-72">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Search orders or outfits..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-[#FAF8F5] border border-[#EBE4D8] rounded-xl text-xs text-[#232B1E] focus:outline-none focus:border-[#769055]"
                      />
                    </div>

                    {/* Real-Time Status & Refresh */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#3E522B] bg-[#F0F5EB] px-2.5 py-1 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Real-Time Sync</span>
                      </span>

                      <button
                        onClick={() => loadOrders(false)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#D5DFC9] hover:bg-[#F0F5EB] text-[#3E522B] text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
                        title="Refresh orders"
                      >
                        <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
                        <span className="text-xs">{refreshing ? 'Syncing...' : 'Refresh'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { id: 'all', label: `All (${orders.length})` },
                      { id: 'active', label: `In Transit (${activeOrdersCount})` },
                      { id: 'delivered', label: 'Delivered' },
                      { id: 'cancelled', label: 'Cancelled' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id)}
                        className={`px-3.5 py-1.5 font-bold uppercase text-[10px] sm:text-[11px] tracking-wider rounded-xl transition-all cursor-pointer shrink-0 ${
                          filterStatus === tab.id
                            ? 'bg-[#769055] text-white shadow-2xs'
                            : 'bg-white border border-[#D5DFC9] text-[#3E522B] hover:bg-[#F0F5EB]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Loading State */}
                  {loading && (
                    <div className="bg-white border border-[#EBE4D8] rounded-2xl p-8 sm:p-12 text-center text-xs text-[#5D6F4E] space-y-3 shadow-xs">
                      <div className="w-8 h-8 border-2 border-[#769055] border-t-transparent rounded-full animate-spin mx-auto" />
                      <p>Loading your orders in real-time...</p>
                    </div>
                  )}

                  {/* Empty Orders State */}
                  {!loading && filteredOrders.length === 0 && (
                    <div className="bg-white border border-[#EBE4D8] rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
                      <div className="w-16 h-16 bg-[#FAF5EE] rounded-full flex items-center justify-center mx-auto text-3xl">
                        👗
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-[#1B2513]">
                        {orders.length === 0 ? 'No orders placed yet' : 'No orders match your filter'}
                      </h3>
                      <p className="text-xs text-[#5D6F4E] max-w-sm mx-auto leading-relaxed">
                        Discover handcrafted bridal Kanjivarams, mirror-work lehengas, and festive silk anarkalis tailored for celebrations.
                      </p>
                      <Link
                        to="/all-products"
                        className="inline-block px-6 py-2.5 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs"
                      >
                        Explore Collections →
                      </Link>
                    </div>
                  )}

                  {/* Orders Cards List */}
                  {!loading && filteredOrders.length > 0 && (
                    <div className="space-y-4">
                      {filteredOrders.map((ord) => {
                        const canCancel = ['confirmed', 'processing', 'pending'].includes(
                          (ord.orderStatus || '').toLowerCase()
                        )
                        return (
                          <div
                            key={ord.orderNumber}
                            className="bg-white border border-[#EBE4D8] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow"
                          >
                            {/* Card Top Banner */}
                            <div className="p-3.5 sm:p-5 bg-[#FAF8F5] border-b border-[#EBE4D8] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-6">
                                <div>
                                  <span className="text-[10px] text-[#7A8E6A] uppercase font-bold block">
                                    Order Placed
                                  </span>
                                  <span className="font-semibold text-[#1B2513] text-xs">
                                    {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-[10px] text-[#7A8E6A] uppercase font-bold block">
                                    Total Amount
                                  </span>
                                  <span className="font-bold text-[#769055] text-xs font-mono">
                                    ₹{ord.totalAmount.toLocaleString('en-IN')}.00
                                  </span>
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                  <span className="text-[10px] text-[#7A8E6A] uppercase font-bold block">
                                    Ship To
                                  </span>
                                  <span className="text-[#1B2513] font-medium text-xs truncate block max-w-xs">
                                    {ord.shippingAddress?.city || 'India'}, {ord.shippingAddress?.state || ''}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                                <span
                                  className={`px-2.5 py-0.5 sm:py-1 rounded-full border text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${getStatusBadge(
                                    ord.orderStatus
                                  )}`}
                                >
                                  {ord.orderStatus}
                                </span>
                                <span className="font-mono font-bold text-xs text-[#1B2513]">
                                  #{ord.orderNumber}
                                </span>
                              </div>
                            </div>

                            {/* Card Body: Items & Interactive Action Buttons */}
                            <div className="p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                              {/* Left Items Column */}
                              <div className={`${canCancel ? 'md:col-span-8' : 'md:col-span-12'} space-y-3`}>
                                {ord.items.map((item, itemIdx) => {
                                  const itemImage = item.imageUrl || item.img || (item as any).image || ''
                                  const itemSize = item.selectedSize || item.size

                                  return (
                                    <div key={itemIdx} className="flex gap-3 sm:gap-4 items-center">
                                      {itemImage ? (
                                        <img
                                          src={itemImage}
                                          alt={item.name}
                                          className="w-14 h-18 sm:w-16 sm:h-20 object-cover bg-cream rounded-xl shrink-0 border border-gray-100 shadow-2xs"
                                        />
                                      ) : (
                                        <div className="w-14 h-18 sm:w-16 sm:h-20 rounded-xl bg-cream flex items-center justify-center text-xl shrink-0">
                                          👗
                                        </div>
                                      )}
                                      <div className="text-left min-w-0 flex-1">
                                        <h4 className="text-xs sm:text-sm font-bold text-[#1B2513] truncate">
                                          {item.name}
                                        </h4>
                                        <div className="text-[11px] text-[#5D6F4E] mt-0.5 space-x-2">
                                          {itemSize && (
                                            <span className="bg-[#FAF8F5] px-1.5 py-0.2 rounded border border-[#EBE4D8]">
                                              Size: <strong>{itemSize}</strong>
                                            </span>
                                          )}
                                          <span>Qty: <strong>{item.quantity}</strong></span>
                                        </div>
                                        <span className="text-xs font-bold text-[#769055] mt-1 block font-mono">
                                          ₹{((item.price || 0) * item.quantity).toLocaleString('en-IN')}.00
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Right Action Column */}
                              {canCancel && (
                                <div className="md:col-span-4 flex flex-col gap-2 pt-2 md:pt-0 md:border-l md:border-gray-100 md:pl-5">
                                  <button
                                    onClick={() => {
                                      setCancellingOrderNum(ord.orderNumber)
                                      setCancelReason('')
                                      setCancelError(null)
                                    }}
                                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-colors text-center cursor-pointer"
                                  >
                                    Cancel Order
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PROFILE DETAILS */}
              {activeTab === 'profile' && (
                <div className="bg-white border border-[#EBE4D8] rounded-2xl p-4 sm:p-7 shadow-xs space-y-6">
                  <div className="border-b border-[#EBEFE6] pb-4">
                    <h2 className="text-sm sm:text-lg font-bold text-[#1B2513] uppercase tracking-wider">
                      Profile Details
                    </h2>
                    <p className="text-xs text-[#5D6F4E] mt-0.5">
                      Manage your personal information, communications, and luxury preferences.
                    </p>
                  </div>

                  {profileSuccessMsg && (
                    <div className="p-3.5 bg-[#F0F5EB] border border-[#D5DFC9] text-[#3E522B] text-xs font-semibold rounded-xl flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#769055]" />
                      <span>{profileSuccessMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#3E522B] uppercase tracking-wider mb-1.5">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={profileFirstName}
                          onChange={(e) => setProfileFirstName(e.target.value)}
                          className="w-full bg-[#FAF8F5] border border-[#D5DFC9] rounded-xl px-3.5 py-2.5 text-xs text-[#232B1E] focus:outline-none focus:border-[#769055]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#3E522B] uppercase tracking-wider mb-1.5">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={profileLastName}
                          onChange={(e) => setProfileLastName(e.target.value)}
                          className="w-full bg-[#FAF8F5] border border-[#D5DFC9] rounded-xl px-3.5 py-2.5 text-xs text-[#232B1E] focus:outline-none focus:border-[#769055]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#3E522B] uppercase tracking-wider mb-1.5">
                        Email Address (Verified)
                      </label>
                      <input
                        type="email"
                        value={userEmail}
                        disabled
                        className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-600 cursor-not-allowed font-mono"
                      />
                      <span className="text-[10px] text-[#7A8E6A] mt-1 block">
                        Verified via Clerk luxury authentication.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#3E522B] uppercase tracking-wider mb-1.5">
                        Gender Preference
                      </label>
                      <div className="flex gap-4">
                        {['Female', 'Male', 'Other'].map((g) => (
                          <label key={g} className="flex items-center gap-2 text-xs text-[#232B1E] cursor-pointer">
                            <input
                              type="radio"
                              name="gender"
                              value={g}
                              checked={profileGender === g}
                              onChange={() => setProfileGender(g as any)}
                              className="accent-[#769055]"
                            />
                            <span>{g}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#3E522B] uppercase tracking-wider mb-1.5">
                        Date of Birth (For Festive Birthday Privileges)
                      </label>
                      <input
                        type="date"
                        value={profileDob}
                        onChange={(e) => setProfileDob(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#D5DFC9] rounded-xl px-3.5 py-2.5 text-xs text-[#232B1E] focus:outline-none focus:border-[#769055]"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="w-full sm:w-auto px-6 py-2.5 bg-[#769055] hover:bg-[#5e7343] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer text-center"
                      >
                        {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                      </button>
                    </div>
                  </form>

                  {/* Security & Verification Card */}
                  <div className="pt-6 border-t border-[#EBEFE6] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3.5 bg-[#FAF8F5] border border-[#EBE4D8] rounded-xl space-y-1">
                      <span className="text-[10px] text-[#7A8E6A] font-bold uppercase tracking-wider block">
                        Account Security
                      </span>
                      <p className="text-xs font-semibold text-[#1B2513] flex items-center gap-1.5">
                        <span>🔒</span> 256-bit Encrypted Session Active
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#F0F5EB] border border-[#D5DFC9] rounded-xl space-y-1">
                      <span className="text-[10px] text-[#3E522B] font-bold uppercase tracking-wider block">
                        Privilege Status
                      </span>
                      <p className="text-xs font-semibold text-[#3E522B] flex items-center gap-1.5">
                        <span>✦</span> Lifetime Anju Luxury Club
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SAVED ADDRESSES */}
              {activeTab === 'addresses' && (
                <div className="bg-white border border-[#EBE4D8] rounded-2xl p-4 sm:p-7 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-[#EBEFE6] pb-4">
                    <div>
                      <h2 className="text-sm sm:text-lg font-bold text-[#1B2513] uppercase tracking-wider">
                        Saved Delivery Addresses
                      </h2>
                      <p className="text-xs text-[#5D6F4E] mt-0.5">
                        Your preferred delivery locations for fast checkout.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddressModal(true)}
                      className="px-3.5 py-2 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0"
                    >
                      <span>+</span> Add Address
                    </button>
                  </div>

                  {addresses.length === 0 ? (
                    <div className="text-center py-10 text-xs text-[#5D6F4E]">
                      No saved addresses yet. Add your delivery address for instant checkout.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className={`p-4 rounded-xl border transition-all relative ${
                            addr.isDefault
                              ? 'border-[#769055] bg-[#FAF8F5] shadow-xs'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 bg-[#E3E9DD] text-[#3E522B] rounded text-[10px] font-bold uppercase tracking-wider">
                              {addr.tag}
                            </span>
                            {addr.isDefault && (
                              <span className="text-[10px] font-bold text-[#769055] uppercase tracking-wider">
                                ✓ Default
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-[#1B2513]">{addr.name}</h4>
                          <p className="text-xs text-[#5D6F4E] mt-1 leading-relaxed">
                            {addr.street}
                          </p>
                          <p className="text-xs text-[#5D6F4E]">
                            {addr.city}, {addr.state} - <strong className="font-mono">{addr.pincode}</strong>
                          </p>
                          {addr.phone && (
                            <p className="text-xs font-mono text-[#1B2513] mt-2">
                              Mobile: {addr.phone}
                            </p>
                          )}

                          <div className="pt-3 border-t border-gray-100 mt-3 flex items-center justify-between text-xs">
                            {!addr.isDefault ? (
                              <button
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-[#769055] hover:underline font-semibold cursor-pointer"
                              >
                                Set as Default
                              </button>
                            ) : <span />}

                            <button
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CUSTOMER SUPPORT & FAQS */}
              {activeTab === 'support' && (
                <div className="bg-white border border-[#EBE4D8] rounded-2xl p-4 sm:p-7 shadow-xs space-y-6">
                  <div className="border-b border-[#EBEFE6] pb-4">
                    <h2 className="text-sm sm:text-lg font-bold text-[#1B2513] uppercase tracking-wider">
                      Customer Care & Concierge
                    </h2>
                    <p className="text-xs text-[#5D6F4E] mt-0.5">
                      Reach our dedicated styling and order fulfillment specialists directly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#FAF8F5] border border-[#EBE4D8] rounded-xl space-y-2">
                      <span className="text-xl">💬</span>
                      <h4 className="text-xs font-bold text-[#1B2513] uppercase tracking-wider">
                        WhatsApp Concierge
                      </h4>
                      <p className="text-xs text-[#5D6F4E]">
                        Instant sizing assistance and custom measurements on WhatsApp.
                      </p>
                      <a
                        href={STORE_INFO.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#769055] hover:underline pt-1"
                      >
                        <span>Message {STORE_INFO.phone}</span> →
                      </a>
                    </div>

                    <div className="p-4 bg-[#FAF8F5] border border-[#EBE4D8] rounded-xl space-y-2">
                      <span className="text-xl">✉️</span>
                      <h4 className="text-xs font-bold text-[#1B2513] uppercase tracking-wider">
                        Email Support
                      </h4>
                      <p className="text-xs text-[#5D6F4E]">
                        For wholesale inquiries, press, and post-delivery returns or exchanges.
                      </p>
                      <a
                        href={`mailto:${STORE_INFO.email}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#769055] hover:underline pt-1"
                      >
                        <span>{STORE_INFO.email}</span> →
                      </a>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </SignedIn>

        {/* Modal: Add Address */}
        {showAddressModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#EBE4D8] rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B2513]">
                  Add New Delivery Address
                </h3>
                <button
                  onClick={() => setShowAddressModal(false)}
                  className="text-gray-400 hover:text-gray-700 font-bold text-base cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddAddress} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#3E522B] mb-1">Recipient Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pooja Patel"
                    value={newAddress.name}
                    onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D5DFC9] rounded-xl px-3 py-2 text-[#232B1E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#3E522B] mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D5DFC9] rounded-xl px-3 py-2 text-[#232B1E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#3E522B] mb-1">Street Address *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="House/Flat number, Building, Street"
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D5DFC9] rounded-xl p-2 text-[#232B1E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#3E522B] mb-1">City *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. New Delhi"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="w-full bg-[#FAF8F5] border border-[#D5DFC9] rounded-xl px-3 py-2 text-[#232B1E]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#3E522B] mb-1">PIN Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 110001"
                      value={newAddress.pincode}
                      onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                      className="w-full bg-[#FAF8F5] border border-[#D5DFC9] rounded-xl px-3 py-2 text-[#232B1E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#3E522B] mb-1">Address Tag</label>
                  <div className="flex gap-4">
                    {['Home', 'Work', 'Other'].map((t) => (
                      <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="tag"
                          value={t}
                          checked={newAddress.tag === t}
                          onChange={() => setNewAddress({ ...newAddress, tag: t as any })}
                          className="accent-[#769055]"
                        />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase rounded-xl cursor-pointer"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Cancel Order */}
        {cancellingOrderNum && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-rose-200 rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Cancel Order #{cancellingOrderNum}
                </h3>
                <button
                  onClick={() => setCancellingOrderNum(null)}
                  className="text-gray-400 hover:text-gray-700 font-bold text-base cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {cancelError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                  {cancelError}
                </div>
              )}

              <form onSubmit={handleCancelOrderSubmit} className="space-y-3 text-xs">
                <p className="text-[#5D6F4E]">
                  Are you sure you want to cancel this order? If prepaid, your refund will be processed automatically to the original payment method.
                </p>

                <div>
                  <label className="block font-bold text-[#3E522B] mb-1">Reason for cancellation</label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#D5DFC9] rounded-xl px-3 py-2 text-[#232B1E]"
                  >
                    <option value="Changed my mind">Changed my mind</option>
                    <option value="Incorrect size selected">Incorrect size selected</option>
                    <option value="Ordered by mistake">Ordered by mistake</option>
                    <option value="Found alternative outfit">Found alternative outfit</option>
                    <option value="Delivery time too long">Delivery time too long</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCancellingOrderNum(null)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    disabled={cancelLoading}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold uppercase rounded-xl cursor-pointer"
                  >
                    {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Mobile Section Drawer Menu (< lg) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Slide-over Drawer */}
            <div className="relative ml-auto w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="bg-gradient-to-r from-[#2C2420] via-[#3a302a] to-[#2C2420] text-white p-4.5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.fullName || 'User'}
                      className="w-10 h-10 rounded-full border border-[#C9973A] object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#769055] text-white font-bold text-sm flex items-center justify-center border border-[#C9973A] shrink-0">
                      {(user?.firstName?.[0] || userEmail?.[0] || 'A').toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#C9973A]">
                      Privilege Account
                    </p>
                    <h3 className="text-sm font-bold text-white truncate">
                      {user?.fullName || user?.firstName || 'Valued Member'}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  aria-label="Close menu"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                <div className="px-3 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A8E6A]">
                    Account Sections
                  </span>
                </div>

                {NAV_SECTIONS.map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabChange(item.id as any)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#769055] text-white shadow-xs'
                          : 'bg-[#FAF8F5] text-[#1B2513] hover:bg-[#F0F5EB] border border-[#EBE4D8]/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-white' : 'text-[#1B2513]'}`}>
                            {item.label}
                          </p>
                          <p className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-[#7A8E6A]'}`}>
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                            isActive ? 'bg-white/20 text-white' : 'bg-[#E3E9DD] text-[#3E522B]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}

                <div className="pt-3 border-t border-gray-100 my-2 space-y-1.5">
                  <div className="px-3 py-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A8E6A]">
                      Quick Shortcuts
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      openWishlist()
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl text-left bg-[#FAF8F5] hover:bg-[#F0F5EB] border border-[#EBE4D8]/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">❤️</span>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#1B2513]">
                          My Wishlist
                        </p>
                        <p className="text-[10px] text-[#7A8E6A]">Saved luxury favorites</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {wishlist.length}
                    </span>
                  </button>

                </div>
              </div>

              {/* Drawer Footer / Sign out */}
              <div className="p-3 border-t border-gray-100 bg-[#FAF8F5]">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    signOut({ redirectUrl: '/' })
                  }}
                  className="w-full py-2.5 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
