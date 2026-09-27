import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import anjuLogo from '../assets/anju-clothing-logo.svg'

interface NavItem {
  name: string
  to: string
  icon: string
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', to: '/admin', icon: '📊' },
  { name: 'Products', to: '/admin/products', icon: '📦' },
  { name: 'Orders', to: '/admin/orders', icon: '🛍️' },
  { name: 'Customers', to: '/admin/customers', icon: '👥' },
  { name: 'Settings', to: '/admin/settings', icon: '⚙️' },
]

export function AdminLayout() {
  const { user } = useUser()
  const clerk = useClerk()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const currentNav = NAV_ITEMS.find((item) =>
    item.to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.to)
  )

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    ''

  return (
    <div className="min-h-screen bg-[#F6F6F7] flex flex-col antialiased text-[#202223] font-body">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#1A1A1A] text-white border-b border-[#2C2C2C] h-14 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-gray-300 hover:text-white rounded-md hover:bg-white/10 cursor-pointer"
            aria-label="Toggle admin navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo & Store Link */}
          <Link to="/admin" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-[#769055] rounded-md flex items-center justify-center text-white font-bold text-xs shadow-xs">
              A
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-bold text-sm text-white tracking-wide">
                Anju Clothing
              </span>
              <span className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded text-gray-300 font-mono font-medium">
                Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Right Topbar Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Live Online Store Link */}
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-white px-2.5 py-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <span>Online Store</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>

          {/* Admin User Info */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/15">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName || 'Admin'}
                className="w-7 h-7 rounded-full border border-[#C9973A] object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#769055] text-white font-bold text-xs flex items-center justify-center">
                {(user?.firstName?.[0] || 'A').toUpperCase()}
              </div>
            )}
            <div className="hidden lg:block text-left min-w-0 max-w-[140px]">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {user?.fullName || user?.firstName || 'Admin User'}
              </p>
              <p className="text-[10px] text-gray-400 truncate leading-tight">
                {primaryEmail}
              </p>
            </div>

            <button
              onClick={() => clerk.signOut({ redirectUrl: '/' })}
              className="p-1.5 text-gray-400 hover:text-red-400 rounded-md hover:bg-white/10 transition-colors cursor-pointer text-xs"
              title="Sign Out of Admin"
              aria-label="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Wrapper */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        
        {/* Desktop Sidebar (Shopify Style) */}
        <aside className="hidden md:flex flex-col w-56 lg:w-60 bg-[#EBEBEB]/60 border-r border-[#E1E3E5] p-3 space-y-6 shrink-0 min-h-[calc(100vh-56px)]">
          {/* Main Navigation */}
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-[#6D7175] uppercase tracking-wider">
              Store Management
            </div>
            <nav className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-white text-[#202223] shadow-xs font-bold border border-[#E1E3E5]'
                        : 'text-[#4A4C4E] hover:bg-black/5 hover:text-[#202223]'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 bg-[#769055] text-white text-[10px] rounded font-bold">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Quick Help & Shortcuts */}
          <div className="mt-auto pt-4 border-t border-[#E1E3E5]/80 space-y-2">
            <div className="p-3 bg-white border border-[#E1E3E5] rounded-lg shadow-xs text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#202223]">Store Status</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
              </div>
              <p className="text-[11px] text-[#6D7175]">
                Anju Clothing e-commerce catalog and order intake active.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            />
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl flex flex-col p-4 z-50">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#769055] rounded-md flex items-center justify-center text-white font-bold text-xs">
                    A
                  </div>
                  <span className="font-display font-bold text-sm text-[#202223]">
                    Admin Panel
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-gray-500 hover:text-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <nav className="py-4 space-y-1 flex-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-[#769055] text-white font-bold'
                          : 'text-[#4A4C4E] hover:bg-gray-100'
                      }`
                    }
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="pt-4 border-t border-gray-100 space-y-2">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 w-full py-2 bg-gray-100 text-xs font-bold text-[#202223] rounded-lg"
                >
                  <span>Go to Customer Store →</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl">
          <Outlet />
        </main>

      </div>
    </div>
  )
}
