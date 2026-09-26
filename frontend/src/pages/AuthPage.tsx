import { useState } from 'react'
import { SignIn, SignUp } from '@clerk/clerk-react'
import { Link, useSearchParams } from 'react-router-dom'

interface AuthPageProps {
  initialMode?: 'sign-in' | 'sign-up'
}

export function AuthPage({ initialMode = 'sign-in' }: AuthPageProps) {
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect_url') || '/'
  const [activeTab, setActiveTab] = useState<'sign-in' | 'sign-up'>(initialMode)

  return (
    <div className="min-h-[calc(100vh-160px)] bg-[#FAF8F5] py-6 sm:py-12 lg:py-16 px-3 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-5xl bg-white border border-[#EBE4D8] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Editorial / Brand Column (order-2 on mobile so form is immediately accessible, order-1 on lg) */}
        <div className="order-2 lg:order-1 lg:col-span-5 bg-[#2C2420] text-white p-6 sm:p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background luxury pattern overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C9973A_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C9973A]/20 border border-[#C9973A]/40 text-[#E8C06A] text-[10px] font-bold uppercase tracking-widest mb-4 sm:mb-6">
              <span>✦</span> Luxury Ethnic Club
            </div>
            
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white mb-2 sm:mb-3">
              Experience Bespoke Luxury & Festive Splendour
            </h2>
            <p className="text-xs sm:text-sm text-[#D1C7BD] leading-relaxed mb-6 sm:mb-8">
              Sign in to manage your orders, get real-time dispatch tracking, and enjoy exclusive member privileges.
            </p>

            {/* Perks list */}
            <div className="space-y-3 sm:space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#769055]/30 text-[#A3C37B] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">Live Courier & Order Tracking</h4>
                  <p className="text-[11px] text-[#A89F95]">Get step-by-step updates from handcrafting to doorstep.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#769055]/30 text-[#A3C37B] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">Exclusive Member Pre-Drops</h4>
                  <p className="text-[11px] text-[#A89F95]">Early access to festive lehengas and royal sarees.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#769055]/30 text-[#A3C37B] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">1-Click Priority WhatsApp Care</h4>
                  <p className="text-[11px] text-[#A89F95]">Direct stylist assistance for custom sizing and fitting.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 relative z-10 flex items-center justify-between">
            <Link
              to="/track-order"
              className="text-xs text-[#E8C06A] hover:underline font-semibold flex items-center gap-1.5"
            >
              <span>📦</span> Track an existing order as Guest →
            </Link>
          </div>
        </div>

        {/* Right Clerk Auth Column */}
        <div className="order-1 lg:order-2 lg:col-span-7 p-4 sm:p-8 lg:p-10 flex flex-col justify-center items-center bg-white min-w-0">
          
          {/* Auth Tab Switcher */}
          <div className="w-full max-w-md flex border-b border-gray-200 mb-6 sm:mb-8">
            <button
              onClick={() => setActiveTab('sign-in')}
              className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                activeTab === 'sign-in'
                  ? 'border-[#769055] text-[#769055]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setActiveTab('sign-up')}
              className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                activeTab === 'sign-up'
                  ? 'border-[#769055] text-[#769055]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Clerk Component Embedding */}
          <div className="w-full max-w-md flex justify-center overflow-x-hidden">
            {activeTab === 'sign-in' ? (
              <SignIn
                path="/sign-in"
                signUpUrl="/sign-up"
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
                    card: 'shadow-none border-0 p-0 w-full max-w-full',
                    rootBox: 'w-full max-w-full',
                    headerTitle: 'font-display text-lg sm:text-xl text-charcoal',
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
                path="/sign-up"
                signInUrl="/sign-in"
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
                    card: 'shadow-none border-0 p-0 w-full max-w-full',
                    rootBox: 'w-full max-w-full',
                    headerTitle: 'font-display text-lg sm:text-xl text-charcoal',
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

          <div className="mt-6 text-center text-[11px] text-gray-500">
            By continuing, you agree to Anju Clothing's{' '}
            <span className="underline cursor-pointer">Terms of Service</span> and{' '}
            <span className="underline cursor-pointer">Privacy Policy</span>.
          </div>
        </div>
      </div>
    </div>
  )
}
