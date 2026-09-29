import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'

interface NavItem {
  name: string
  to: string
  icon: (props: { className?: string }) => JSX.Element
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    to: '/admin',
    icon: ({ className = 'w-4 h-4' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    name: 'Orders',
    to: '/admin/orders',
    icon: ({ className = 'w-4 h-4' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    name: 'Products',
    to: '/admin/products',
    icon: ({ className = 'w-4 h-4' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    name: 'Customers',
    to: '/admin/customers',
    icon: ({ className = 'w-4 h-4' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    name: 'Settings',
    to: '/admin/settings',
    icon: ({ className = 'w-4 h-4' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.6 6.6 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
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
    <div className="min-h-screen bg-[#F7F9F5] flex antialiased text-[#232B1E] font-sans">
      
      {/* Sidebar (Desktop) - Luxury Olive Green */}
      <aside className="hidden md:flex flex-col w-64 bg-[#233019] text-[#E2EBD9] border-r border-[#344426] shrink-0 select-none">
        
        {/* Workspace Brand */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#344426]/80 bg-[#1B2513]">
          <Link to="/admin" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#769055] border border-[#8FA86E] flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-sm">
              AC
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-white tracking-tight">
                  Anju Clothing
                </span>
                <span className="text-[10px] bg-[#344426] text-[#D0E0C2] font-mono px-1.5 py-0.5 rounded border border-[#485C36]">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-[#A6BA94] font-medium">Boutique Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
          <div>
            <div className="px-3 pb-2 text-[10px] font-semibold text-[#8DA37B] uppercase tracking-wider">
              Management
            </div>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    className={({ isActive }) =>
                      `group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-[#769055] text-white font-semibold shadow-xs'
                          : 'text-[#C7D9BA] hover:text-white hover:bg-[#2D3D20]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 transition-colors" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 bg-[#1B2513] text-[#D0E0C2] text-[10px] rounded font-mono">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </nav>
          </div>

          <div>
            <div className="px-3 pb-2 text-[10px] font-semibold text-[#8DA37B] uppercase tracking-wider">
              Live Channels
            </div>
            <div className="space-y-1">
              <Link
                to="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-[#C7D9BA] hover:text-white hover:bg-[#2D3D20] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-[#8DA37B] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  <span>Customer Storefront</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#82AD4C] shadow-xs" />
              </Link>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 border-t border-[#344426]/80 bg-[#1B2513]">
          <div className="p-2.5 rounded-lg bg-[#27361C] border border-[#3A4E2B] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || 'Admin'}
                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#769055]"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#769055] border border-[#8FA86E] text-white font-semibold text-xs flex items-center justify-center shrink-0">
                  {(user?.firstName?.[0] || 'A').toUpperCase()}
                </div>
              )}
              <div className="min-w-0 text-left">
                <p className="text-xs font-semibold text-[#E2EBD9] truncate">
                  {user?.fullName || user?.firstName || 'Admin'}
                </p>
                <p className="text-[10px] text-[#A6BA94] font-mono truncate">
                  {primaryEmail}
                </p>
              </div>
            </div>

            <button
              onClick={() => clerk.signOut({ redirectUrl: '/' })}
              className="p-1.5 text-[#A6BA94] hover:text-white hover:bg-[#344426] rounded transition-colors cursor-pointer"
              title="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[#E3E9DD] px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-[#495C38] hover:text-[#233019] rounded-lg hover:bg-[#F0F5EB] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-[#6B7D5C]">
              <span className="hover:text-[#233019]">Admin</span>
              <span>/</span>
              <span className="text-[#233019] font-semibold capitalize">
                {currentNav?.name || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F4F7ED] border border-[#DCE4D0] text-[11px] font-medium text-[#4D6337]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#769055] animate-pulse" />
              Razorpay Test Mode
            </div>

            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#769055] hover:bg-[#5e7343] text-white rounded-lg text-xs font-medium transition-colors shadow-2xs"
            >
              <span>View Store</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </Link>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            />
            <div className="fixed inset-y-0 left-0 w-64 bg-[#233019] text-[#E2EBD9] p-4 flex flex-col z-50 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-[#344426]">
                <span className="font-semibold text-white text-sm">Anju Clothing Admin</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-[#A6BA94] hover:text-white"
                >
                  ✕
                </button>
              </div>
              <nav className="py-4 space-y-1 flex-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/admin'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                          isActive ? 'bg-[#769055] text-white font-semibold' : 'text-[#C7D9BA] hover:bg-[#2D3D20]'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </NavLink>
                  )
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Body Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#F7F9F5]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
