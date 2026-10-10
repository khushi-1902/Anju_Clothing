import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { PageType, Product } from '../types'
import {
  SignedIn,
  SignedOut,
  useClerk,
  useUser,
  useAuth,
} from '@clerk/clerk-react'
import anjuLogo from '../assets/anju-clothing-logo.svg'
import { checkAuthRole } from '../admin/adminApi'
import { fetchProducts } from '../lib/api'

interface NavItem {
  name: string
  page: PageType
}

const NAV_ITEMS: NavItem[] = [
  { name: 'HOME', page: 'home' },
  { name: 'ALL PRODUCTS', page: 'all-products' },
  { name: 'SHOP BESTSELLERS', page: 'bestsellers' },
  { name: 'CONTACT US', page: 'contact' },
]

export function Header() {
  const {
    currentPage,
    navigateTo,
    cartCount,
    cartSubtotal,
    wishlistCount,
    openCart,
    openWishlist,
    searchQuery,
    setSearchQuery,
  } = useShop()

  const clerk = useClerk()
  const { user } = useUser()
  const { getToken, isSignedIn } = useAuth()
  const navigate = useNavigate()

  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Live search state
  const [liveResults, setLiveResults] = useState<Product[]>([])
  const [liveTotal, setLiveTotal] = useState<number>(0)
  const [isSearching, setIsSearching] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    async function checkRole() {
      if (!isSignedIn) {
        setIsAdmin(false)
        return
      }
      try {
        const token = await getToken()
        const res = await checkAuthRole(token)
        if (active) {
          setIsAdmin(Boolean(res?.isAdmin || res?.user?.role === 'ADMIN'))
        }
      } catch (e) {
        console.warn('Failed to check admin status in header', e)
      }
    }
    checkRole()
    return () => {
      active = false
    }
  }, [isSignedIn, getToken])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setLiveResults([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Live search debounced fetch
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!searchOpen || trimmed.length < 2) {
      setLiveResults([])
      setLiveTotal(0)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetchProducts({
        search: trimmed,
        limit: 6,
        signal: controller.signal,
      })
        .then(res => {
          setLiveResults(res.products || res.items || [])
          setLiveTotal(res.total || 0)
          setIsSearching(false)
        })
        .catch(err => {
          if (err?.name !== 'AbortError') {
            setIsSearching(false)
          }
        })
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [searchQuery, searchOpen])

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const q = searchQuery.trim()
    if (q) {
      navigate(`/all-products?q=${encodeURIComponent(q)}`)
      setSearchOpen(false)
      setLiveResults([])
    }
  }

  const handleSelectProduct = (product: Product) => {
    setSearchOpen(false)
    setLiveResults([])
    navigate(`/product/${encodeURIComponent(product.id)}`)
  }

  const firstName = user?.firstName ?? null
  const primaryEmail =
    (user?.primaryEmailAddress?.emailAddress as string | undefined) ??
    (user?.emailAddresses?.[0]?.emailAddress as string | undefined) ??
    null

  const KNOWN_ADMIN_EMAILS = [
    'khushipatil9128@gmail.com',
    'ajit14mahajan@gmail.com',
    'khushipatil1914@gmail.com',
  ]

  const isEmailAdmin = Boolean(
    primaryEmail && KNOWN_ADMIN_EMAILS.includes(primaryEmail.toLowerCase().trim())
  )

  const effectiveIsAdmin = isAdmin || isEmailAdmin

  return (
    <header className="sticky top-0 z-40 bg-white shadow-xs border-b border-gray-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center">
        {/* ========================================================================= */}
        {/* MOBILE & TABLET HEADER (< 1024px)                                         */}
        {/* Left: Hamburger | Center: Brand Logo | Right: Search + Account/Login       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center w-full lg:hidden">
          {/* Left: 3-line hamburger menu */}
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 -ml-2 text-charcoal hover:text-[#769055] transition-colors rounded-lg active:bg-gray-100 cursor-pointer flex items-center justify-center focus-visible:outline-none"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {menuOpen ? (
                <svg className="w-6 h-6 text-[#2c2420]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>

          {/* Center: Brand Logo */}
          <div className="flex items-center justify-center min-w-0 px-2">
            <button
              onClick={() => navigateTo('home')}
              className="flex items-center justify-center cursor-pointer max-w-[200px] xs:max-w-[230px]"
              aria-label="Anju Clothing home"
            >
              <img
                src={anjuLogo}
                alt="Anju Clothing"
                className="h-9 xs:h-10 sm:h-11 w-auto max-w-full object-contain"
              />
            </button>
          </div>

          {/* Right: Search Icon + Account / Login Icon */}
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            {/* Search Icon */}
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-1.5 text-charcoal hover:text-[#769055] transition-colors cursor-pointer rounded-full active:bg-gray-100"
              aria-label="Search store"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>

            {/* Account / Login Icon */}
            <SignedOut>
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="p-1.5 text-charcoal hover:text-[#769055] transition-colors cursor-pointer rounded-full active:bg-gray-100"
                aria-label="Sign In / Register"
                title="Sign In / Register"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </button>
            </SignedOut>

            <SignedIn>
              <button
                type="button"
                onClick={() => navigateTo('account')}
                className="p-1 cursor-pointer flex items-center justify-center rounded-full hover:bg-gray-50 transition-colors"
                aria-label="Account Profile"
              >
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || 'User'}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-[#C9973A] object-cover shadow-2xs"
                  />
                ) : (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#769055] text-white font-bold text-[10px] sm:text-xs flex items-center justify-center border border-[#C9973A]">
                    {(user?.firstName?.[0] || 'U').toUpperCase()}
                  </div>
                )}
              </button>
            </SignedIn>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP HEADER (>= 1024px)                                                */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex items-center justify-between w-full">
          <button
            onClick={() => navigateTo('home')}
            className="flex items-center min-w-0 max-w-[220px] md:max-w-[260px] lg:max-w-[320px] cursor-pointer shrink group"
            aria-label="Anju Clothing home"
          >
            <img
              src={anjuLogo}
              alt="Anju Clothing"
              className="h-11 md:h-12 lg:h-14 w-auto max-w-full object-contain object-left transition-opacity group-hover:opacity-80"
            />
          </button>

          {/* Desktop Navigation Links */}
          <nav className="flex items-center gap-6 xl:gap-8" aria-label="Main navigation">
            {NAV_ITEMS.map(({ name, page }) => {
              const isActive = currentPage === page
              return (
                <button
                  key={name}
                  onClick={() => navigateTo(page)}
                  className={`text-xs font-bold tracking-widest transition-colors relative py-1 uppercase cursor-pointer ${
                    isActive ? 'text-[#769055] font-extrabold' : 'text-[#2c2420] hover:text-[#769055]'
                  }`}
                >
                  {name}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#769055]" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Desktop Right Action Icons */}
          <div className="flex items-center gap-2 xl:gap-3">
            {/* Search Toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-1.5 text-charcoal hover:text-[#769055] transition-colors cursor-pointer"
              aria-label="Search store"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>

            {/* User / Account Icon with Dropdown */}
            <div className="relative flex items-center" ref={userMenuRef}>
              <SignedOut>
                <button
                  onClick={() => navigateTo('login')}
                  className="p-1.5 transition-colors cursor-pointer relative text-charcoal hover:text-[#769055] flex items-center gap-1"
                  aria-label="Sign In / Register"
                  title="Sign In / Register"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <span className="hidden xl:inline text-xs font-bold text-charcoal hover:text-[#769055]">
                    Sign In
                  </span>
                </button>
              </SignedOut>

              <SignedIn>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-full hover:bg-gray-50 transition-all cursor-pointer border border-transparent hover:border-gray-200"
                  aria-label={firstName ? `Account menu for ${firstName}` : 'Account menu'}
                >
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.fullName || 'User'}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#C9973A] object-cover shadow-xs"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#769055] text-white font-bold text-xs flex items-center justify-center border border-[#C9973A]">
                      {(user?.firstName?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  {effectiveIsAdmin && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                      👑 ADMIN
                    </span>
                  )}
                  <svg
                    className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Account Dropdown Popover */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-md rounded-xl border border-[#EBE4D8] shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
                    <div className="p-3.5 bg-gradient-to-b from-[#FAF8F5] to-white border-b border-gray-100 flex items-center gap-3">
                      {user?.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt={user.fullName || 'User'}
                          className="w-9 h-9 rounded-full border border-[#C9973A] object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#769055] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {(user?.firstName?.[0] || 'U').toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-charcoal truncate">
                            {user?.fullName || firstName || 'Valued Member'}
                          </p>
                          {effectiveIsAdmin && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded">
                              ADMIN
                            </span>
                          )}
                        </div>
                        {primaryEmail && (
                          <p className="text-[11px] text-gray-500 truncate font-mono">{primaryEmail}</p>
                        )}
                      </div>
                    </div>

                    <div className="p-1.5 space-y-1 text-xs">
                      {effectiveIsAdmin && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false)
                            navigate('/admin')
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-amber-100/60 hover:from-amber-100 hover:to-amber-200/80 text-amber-950 font-bold flex items-center justify-between transition-all border border-amber-300 shadow-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">👑</span>
                            <span>Admin Dashboard</span>
                          </div>
                          <span className="text-[10px] bg-amber-800 text-white font-extrabold px-1.5 py-0.5 rounded">
                            PORTAL →
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          navigateTo('orders')
                          setUserMenuOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#FAF8F5] text-charcoal font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="text-base">🛍️</span>
                        <span>My Orders</span>
                      </button>

                      <button
                        onClick={() => {
                          navigateTo('account')
                          setUserMenuOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#FAF8F5] text-charcoal font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="text-base">⚙️</span>
                        <span>Account Profile</span>
                      </button>
                    </div>

                    <div className="p-1.5 border-t border-gray-100 bg-gray-50/50">
                      <button
                        onClick={async () => {
                          setUserMenuOpen(false)
                          await clerk.signOut({ redirectUrl: '/' })
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="text-base">🚪</span>
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </SignedIn>
            </div>

            {/* Wishlist Icon */}
            <button
              onClick={openWishlist}
              className="relative p-1.5 text-charcoal hover:text-[#769055] transition-colors cursor-pointer"
              aria-label={`Wishlist (${wishlistCount} items)`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute top-0 right-0 bg-[#c9973a] text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart with Price badge */}
            <button
              onClick={openCart}
              className="flex items-center gap-1 sm:gap-1.5 p-1.5 text-charcoal hover:text-[#769055] transition-colors cursor-pointer"
              aria-label={`Shopping cart (${cartCount} items, Rs. ${cartSubtotal})`}
            >
              <div className="relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#769055] text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden xl:inline text-xs font-semibold text-charcoal">
                Rs. {cartSubtotal.toLocaleString('en-IN')}.00
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Search Input & Live Suggestions */}
      {searchOpen && (
        <div ref={searchContainerRef} className="border-t border-[#EBE4D8] bg-[#FAF8F5] px-4 py-3 sm:py-4 shadow-md relative z-50">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center shadow-xs">
              <div className="absolute left-3.5 text-gray-400 pointer-events-none flex items-center">
                <svg className="w-4 h-4 text-[#769055]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>

              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search sarees, lehengas, anarkalis, shararas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-white border border-[#D9D0C3] focus:border-[#769055] rounded-none pl-10 pr-28 py-3 text-xs sm:text-sm text-[#2C2420] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#769055] transition-all"
              />

              <div className="absolute right-1.5 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setLiveResults([])
                      searchInputRef.current?.focus()
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer rounded-full"
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                <button
                  type="submit"
                  className="px-4 sm:px-5 py-2 bg-[#769055] hover:bg-[#5E7343] text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>SEARCH</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false)
                    setLiveResults([])
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                  title="Close search"
                  aria-label="Close search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Live Search Instant Preview Dropdown */}
            {(isSearching || liveResults.length > 0 || (searchQuery.trim().length >= 2 && !isSearching)) && (
              <div className="mt-2 bg-white border border-[#E8E2D8] shadow-2xl rounded-sm overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                {isSearching ? (
                  <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin text-[#769055]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Searching outfits...</span>
                  </div>
                ) : liveResults.length > 0 ? (
                  <div>
                    <div className="px-3.5 py-2 bg-[#FAF8F5] border-b border-[#F0EBE1] flex items-center justify-between text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                      <span>Products Found ({liveTotal})</span>
                      <span className="text-[10px] text-[#769055] font-bold">Live Results</span>
                    </div>

                    <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                      {liveResults.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className="p-2.5 sm:p-3 flex items-center gap-3 hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
                        >
                          <div className="w-12 h-16 sm:w-14 sm:h-18 rounded bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                            {p.img ? (
                              <img
                                src={p.img}
                                alt={p.name}
                                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">👗</div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-[#2C2420] group-hover:text-[#769055] transition-colors truncate">
                              {p.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              {p.category && (
                                <span className="text-[10px] uppercase tracking-wider text-stone-500 font-medium truncate">
                                  {p.category}
                                </span>
                              )}
                              {p.fabric && (
                                <span className="text-[10px] text-stone-400 truncate">
                                  • {p.fabric}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs sm:text-sm font-bold text-[#2C2420]">
                                ₹{p.price.toLocaleString('en-IN')}
                              </span>
                              {p.originalPrice && p.originalPrice > p.price && (
                                <span className="text-[11px] text-gray-400 line-through">
                                  ₹{p.originalPrice.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-stone-400 group-hover:text-[#769055] group-hover:translate-x-0.5 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSearchSubmit()}
                      className="w-full py-2.5 px-4 bg-[#769055] hover:bg-[#5E7343] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>View all {liveTotal} results for "{searchQuery}"</span>
                      <span>→</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-5 text-center">
                    <p className="text-xs sm:text-sm text-stone-600 font-medium">
                      No outfits found matching "<span className="font-bold text-[#2C2420]">{searchQuery}</span>"
                    </p>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Press Search or Enter to view all products in the catalog.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile & Tablet Menu Overlay Drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 sm:top-20 bottom-0 z-50 flex flex-col">
          {/* Subtle Dark Backdrop */}
          <div
            className="fixed inset-0 top-16 sm:top-20 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer Scroll Container */}
          <div className="relative z-10 w-full h-full bg-[#FAF8F5] border-t border-gray-100 overflow-y-auto overscroll-contain flex flex-col justify-between p-4 sm:p-6 pb-28 sm:pb-32 space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-200">
            
            <div className="space-y-3">
              {/* 1. Explore Collections Section */}
              <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-[#EBE4D8] shadow-xs space-y-1">
                <div className="px-3 py-1.5 border-b border-[#F0EBE1] mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A8E6A]">
                    Explore Collections
                  </span>
                </div>
                {NAV_ITEMS.map(({ name, page }) => {
                  const isActive = currentPage === page
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        navigateTo(page)
                        setMenuOpen(false)
                      }}
                      className={`w-full text-left text-xs uppercase font-bold tracking-wider py-3 px-3.5 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-[#769055] text-white shadow-2xs font-extrabold'
                          : 'text-[#2c2420] hover:bg-[#F0F5EB]'
                      }`}
                    >
                      <span>{name}</span>
                      {isActive ? (
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                      ) : (
                        <span className="text-gray-400 text-xs">→</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Account Privilege Card & Login / Logout */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#EBE4D8] shadow-xs">
              <SignedIn>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {user?.imageUrl ? (
                      <img
                        src={user.imageUrl}
                        alt={user.fullName || 'User'}
                        className="w-10 h-10 rounded-full border border-[#C9973A] object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#769055] text-white font-bold text-sm flex items-center justify-center border border-[#C9973A] shrink-0">
                        {(user?.firstName?.[0] || primaryEmail?.[0] || 'A').toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#C9973A] block">
                        ✦ Privilege Member
                      </span>
                      <h4 className="text-xs font-bold text-[#1B2513] truncate">
                        {user?.fullName || firstName || 'Valued Member'}
                      </h4>
                      {primaryEmail && (
                        <p className="text-[10px] text-gray-500 truncate font-mono">{primaryEmail}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        navigateTo('account')
                        setMenuOpen(false)
                      }}
                      className="py-2.5 px-3 bg-[#FAF8F5] hover:bg-[#F0F5EB] border border-[#EBE4D8] text-[#3E522B] text-xs font-bold uppercase tracking-wider rounded-xl transition-colors text-center cursor-pointer"
                    >
                      My Account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void clerk.signOut({ redirectUrl: '/' })
                        setMenuOpen(false)
                      }}
                      className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors text-center cursor-pointer"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </SignedIn>

              <SignedOut>
                <div className="space-y-2.5">
                  <p className="text-xs text-[#5D6F4E] font-medium text-center">
                    Sign in to view orders & save favorites.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigateTo('login')
                        setMenuOpen(false)
                      }}
                      className="flex-1 py-2.5 bg-white border border-[#769055] text-[#769055] hover:bg-gray-50 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors text-center cursor-pointer"
                    >
                      Log In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigateTo('signup')
                        setMenuOpen(false)
                      }}
                      className="flex-1 py-2.5 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors text-center cursor-pointer shadow-2xs"
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              </SignedOut>
            </div>

          </div>
        </div>
      )}
    </header>
  )
}