import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { PageType } from '../types'
import {
  SignedIn,
  SignedOut,
  useClerk,
  useUser,
  useAuth,
} from '@clerk/clerk-react'
import anjuLogo from '../assets/anju-clothing-logo.svg'
import { checkAuthRole } from '../admin/adminApi'

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
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigateTo('all-products')
      setSearchOpen(false)
    }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 sm:h-20">

        <button
          onClick={() => navigateTo('home')}
          className="flex items-center min-w-0 max-w-[48%] sm:max-w-[220px] md:max-w-[260px] lg:max-w-[320px] cursor-pointer shrink group"
          aria-label="Anju Clothing home"
        >
          <img
            src={anjuLogo}
            alt="Anju Clothing"
            className="h-9 w-auto max-w-full object-contain object-left sm:h-11 md:h-12 lg:h-14 transition-opacity group-hover:opacity-80"
          />
        </button>

        {/* Desktop Navigation Links (Uppercase) */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-9" aria-label="Main navigation">
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

        {/* Right Action Icons (Search, User, Wishlist, Cart with Price) */}
        <div className="flex items-center gap-1 sm:gap-2.5">

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

          {/* User / Account Icon (Sign In / Register / Profile) with Dropdown */}
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
                <span className="hidden lg:inline text-xs font-bold text-charcoal hover:text-[#769055]">
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
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
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

              {/* Compact, Luxury Account Dropdown Popover */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-md rounded-xl border border-[#EBE4D8] shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
                  {/* User Profile Header */}
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

                  {/* Essential Navigation Actions */}
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

                  {/* Sign Out Action */}
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
            <span className="hidden lg:inline text-xs font-semibold text-charcoal">
              Rs. {cartSubtotal.toLocaleString('en-IN')}.00
            </span>
          </button>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-1.5 text-charcoal hover:text-[#769055]"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable Search Input */}
      {searchOpen && (
        <div className="border-t border-gray-100 bg-[#FAF7F2] px-4 py-3 shadow-inner">
          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto relative flex items-center">
            <input
              type="text"
              placeholder="Search sarees, lehengas, anarkalis, shararas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-white border border-gray-300 rounded-none px-4 py-2.5 pr-20 text-xs focus:outline-none focus:border-[#769055] transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-4 bg-[#769055] text-white text-[11px] font-bold uppercase tracking-wider hover:bg-[#5e7343] transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white py-4 px-5 sm:px-6 flex flex-col gap-1 shadow-lg max-h-[calc(100vh-80px)] overflow-y-auto">
          {NAV_ITEMS.map(({ name, page }) => {
            const isActive = currentPage === page
            return (
              <button
                key={name}
                onClick={() => {
                  navigateTo(page)
                  setMenuOpen(false)
                }}
                className={`text-left text-xs uppercase font-bold tracking-wider py-2.5 border-b border-gray-50 transition-colors ${
                  isActive ? 'text-[#769055] font-black pl-2 border-l-2 border-[#769055]' : 'text-[#2c2420] hover:text-[#769055]'
                }`}
              >
                {name}
              </button>
            )
          })}

          {/* Quick links to Admin, Track Order and Orders */}
          {effectiveIsAdmin && (
            <button
              onClick={() => {
                navigate('/admin')
                setMenuOpen(false)
              }}
              className="text-left text-xs uppercase font-extrabold tracking-wider py-2.5 px-2 bg-amber-50 border border-amber-200 text-amber-900 rounded flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span>👑</span>
                <span>Admin Dashboard</span>
              </div>
              <span className="text-[9px] bg-amber-800 text-white px-1.5 py-0.5 rounded font-bold">
                PORTAL →
              </span>
            </button>
          )}

          <button
            onClick={() => {
              navigateTo('track-order')
              setMenuOpen(false)
            }}
            className="text-left text-xs uppercase font-bold tracking-wider py-2.5 border-b border-gray-50 text-[#769055] flex items-center gap-2"
          >
            <span>📦</span> Track Your Order
          </button>
          <button
            onClick={() => {
              navigateTo('orders')
              setMenuOpen(false)
            }}
            className="text-left text-xs uppercase font-bold tracking-wider py-2.5 border-b border-gray-50 text-charcoal flex items-center gap-2"
          >
            <span>🛍️</span> My Orders & History
          </button>

          {/* Account item in mobile drawer — Clerk powered */}
          <div className="pt-3 border-t border-gray-100 mt-2">
            <SignedIn>
              <div className="flex items-center justify-between py-2">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-charcoal truncate">Hi, {firstName ?? 'there'}</p>
                  {primaryEmail && <p className="text-[11px] text-muted truncate">{primaryEmail}</p>}
                </div>
                <div className="flex gap-2.5 items-center shrink-0">
                  <button
                    onClick={() => {
                      navigateTo('account')
                      setMenuOpen(false)
                    }}
                    className="text-xs text-[#769055] font-bold underline"
                  >
                    Account
                  </button>
                  <button
                    onClick={() => {
                      void clerk.signOut({ redirectUrl: '/' })
                      setMenuOpen(false)
                    }}
                    className="text-xs text-red-600 font-bold hover:underline"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </SignedIn>
            <SignedOut>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    navigateTo('login')
                    setMenuOpen(false)
                  }}
                  className="flex-1 text-center py-2.5 bg-white border border-[#769055] text-[#769055] text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    navigateTo('signup')
                    setMenuOpen(false)
                  }}
                  className="flex-1 text-center py-2.5 bg-[#769055] text-white text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-[#5e7343]"
                >
                  Create Account
                </button>
              </div>
            </SignedOut>
          </div>
        </div>
      )}
    </header>
  )
}