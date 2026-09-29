import { useState, useEffect } from 'react'
import { SignIn, SignUp, useUser, useClerk, useAuth, SignedIn, SignedOut } from '@clerk/clerk-react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import anjuLogo from '../assets/anju-clothing-logo.svg'
import { checkAuthRole } from '../admin/adminApi'

interface AuthPageProps {
  initialMode?: 'sign-in' | 'sign-up'
}

export function AuthPage({ initialMode = 'sign-in' }: AuthPageProps) {
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect_url') || '/'
  const [activeTab, setActiveTab] = useState<'sign-in' | 'sign-up'>(initialMode)
  const { user } = useUser()
  const { getToken, isSignedIn } = useAuth()
  const clerk = useClerk()
  const navigate = useNavigate()
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [verifyingRole, setVerifyingRole] = useState(false)

  useEffect(() => {
    setActiveTab(initialMode)
  }, [initialMode])

  useEffect(() => {
    let active = true
    async function checkRole() {
      if (!isSignedIn) {
        setIsAdminUser(false)
        return
      }
      try {
        setVerifyingRole(true)
        const token = await getToken()
        const res = await checkAuthRole(token)
        if (active) {
          const isAdm = Boolean(res?.isAdmin || res?.user?.role === 'ADMIN')
          setIsAdminUser(isAdm)
          // If redirect_url was specifically set to /admin and user is admin, auto redirect
          if (isAdm && redirectUrl.startsWith('/admin')) {
            navigate(redirectUrl, { replace: true })
          }
        }
      } catch (err) {
        console.warn('Error checking admin role on auth page:', err)
      } finally {
        if (active) setVerifyingRole(false)
      }
    }

    checkRole()
    return () => {
      active = false
    }
  }, [isSignedIn, getToken, redirectUrl, navigate])

  const handleSignOut = async () => {
    await clerk.signOut()
    setActiveTab('sign-in')
    setIsAdminUser(false)
  }

  const primaryEmail =
    (user?.primaryEmailAddress?.emailAddress as string | undefined) ??
    (user?.emailAddresses?.[0]?.emailAddress as string | undefined) ??
    null

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#FAF8F5] py-8 sm:py-14 px-3 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
            <img
              src={anjuLogo}
              alt="Anju Clothing"
              className="h-10 sm:h-12 w-auto mx-auto object-contain"
            />
          </Link>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-[#C9973A]">
            <span>✦</span> Luxury Indian Ethnic Wear <span>✦</span>
          </div>
        </div>

        {/* Main Centered Form Card */}
        <div className="bg-white border border-[#EBE4D8] shadow-xl p-5 sm:p-8 w-full overflow-hidden rounded-xl">
          
          {/* Active Logged In Session */}
          <SignedIn>
            <div className="text-center py-2 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#769055]/15 border-2 border-[#769055] mx-auto flex items-center justify-center overflow-hidden">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt={user.fullName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-[#769055]">
                    {(user?.firstName?.[0] || 'U').toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="inline-block px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider rounded">
                    ✓ Currently Signed In
                  </span>
                  {isAdminUser && (
                    <span className="inline-block px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider rounded shadow-xs">
                      👑 STORE ADMIN
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold tracking-tight text-charcoal">
                  Welcome, {user?.fullName || user?.firstName || 'Valued Member'}!
                </h3>
                {primaryEmail && (
                  <p className="text-xs font-mono text-gray-500 mt-1">{primaryEmail}</p>
                )}
              </div>

              <div className="space-y-2.5 pt-2">
                {isAdminUser && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="w-full py-3 bg-gradient-to-r from-[#202223] to-[#2c2420] hover:from-black hover:to-[#1a1512] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer rounded-lg flex items-center justify-center gap-2 border border-amber-500/40"
                  >
                    <span>👑 Open Admin Dashboard →</span>
                  </button>
                )}

                <button
                  onClick={() => navigate('/orders')}
                  className="w-full py-3 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer rounded-lg"
                >
                  🛍️ View My Orders & Account →
                </button>
                
                <button
                  onClick={() => navigate('/all-products')}
                  className="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-charcoal text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer rounded-lg"
                >
                  Explore Collections
                </button>

                <div className="pt-3 border-t border-gray-100">
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-red-600 hover:text-red-800 font-bold hover:underline cursor-pointer py-1"
                  >
                    🚪 Sign Out / Log into a Different Account
                  </button>
                </div>
              </div>
            </div>
          </SignedIn>

          {/* Signed Out — Form Tabs & Clerk Component */}
          <SignedOut>
            {/* Tab Switcher */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('sign-in')}
                className={`flex-1 pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  activeTab === 'sign-in'
                    ? 'border-[#769055] text-[#769055]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sign-up')}
                className={`flex-1 pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  activeTab === 'sign-up'
                    ? 'border-[#769055] text-[#769055]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Clerk Form Rendering */}
            <div className="w-full flex justify-center overflow-x-hidden min-h-[380px]">
              {activeTab === 'sign-in' ? (
                <SignIn
                  routing="hash"
                  fallbackRedirectUrl={redirectUrl}
                  appearance={{
                    layout: {
                      socialButtonsVariant: 'blockButton',
                      logoPlacement: 'none',
                    },
                    variables: {
                      colorPrimary: '#769055',
                      colorText: '#2c2420',
                      colorTextSecondary: '#666666',
                      fontFamily: 'inherit',
                    },
                    elements: {
                      card: 'shadow-none border-0 p-0 w-full max-w-full bg-transparent',
                      rootBox: 'w-full max-w-full',
                      headerTitle: 'text-lg sm:text-xl font-bold tracking-tight text-charcoal',
                      formButtonPrimary:
                        'bg-[#769055] hover:bg-[#5e7343] text-white text-xs uppercase font-bold tracking-wider py-2.5 rounded-none',
                      socialButtonsBlockButton:
                        'border border-gray-300 rounded-none text-xs font-semibold py-2 hover:bg-gray-50',
                      formFieldInput:
                        'rounded-none border-gray-300 text-xs py-2 focus:border-[#769055] max-w-full',
                      footerActionLink: 'text-[#769055] hover:underline font-bold',
                    },
                  }}
                />
              ) : (
                <SignUp
                  routing="hash"
                  fallbackRedirectUrl={redirectUrl}
                  appearance={{
                    layout: {
                      socialButtonsVariant: 'blockButton',
                      logoPlacement: 'none',
                    },
                    variables: {
                      colorPrimary: '#769055',
                      colorText: '#2c2420',
                      colorTextSecondary: '#666666',
                      fontFamily: 'inherit',
                    },
                    elements: {
                      card: 'shadow-none border-0 p-0 w-full max-w-full bg-transparent',
                      rootBox: 'w-full max-w-full',
                      headerTitle: 'text-lg sm:text-xl font-bold tracking-tight text-charcoal',
                      formButtonPrimary:
                        'bg-[#769055] hover:bg-[#5e7343] text-white text-xs uppercase font-bold tracking-wider py-2.5 rounded-none',
                      socialButtonsBlockButton:
                        'border border-gray-300 rounded-none text-xs font-semibold py-2 hover:bg-gray-50',
                      formFieldInput:
                        'rounded-none border-gray-300 text-xs py-2 focus:border-[#769055] max-w-full',
                      footerActionLink: 'text-[#769055] hover:underline font-bold',
                    },
                  }}
                />
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 text-center text-[11px] text-gray-400">
              Protected by Clerk Authentication & 256-bit SSL encryption.
            </div>
          </SignedOut>

        </div>

        {/* Footer Quick Links */}
        <div className="mt-6 text-center space-x-4 text-xs">
          <Link to="/" className="text-gray-500 hover:text-[#769055] transition-colors">
            ← Return to Store
          </Link>
          <span className="text-gray-300">•</span>
          <Link to="/track-order" className="text-gray-500 hover:text-[#769055] transition-colors">
            📦 Track Order as Guest
          </Link>
        </div>

      </div>
    </div>
  )
}


