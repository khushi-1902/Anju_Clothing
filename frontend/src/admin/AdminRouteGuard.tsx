import React, { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { checkAuthRole, AuthProfileResponse } from './adminApi'

interface AdminRouteGuardProps {
  children: React.ReactNode
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const location = useLocation()

  const [checking, setChecking] = useState(true)
  const [profile, setProfile] = useState<AuthProfileResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function verifyAdmin() {
      if (!isLoaded) return

      if (!isSignedIn) {
        setChecking(false)
        return
      }

      try {
        setChecking(true)
        setError(null)
        const token = await getToken()
        const authData = await checkAuthRole(token)
        if (active) {
          setProfile(authData)
        }
      } catch (err: any) {
        if (active) {
          console.error('[AdminRouteGuard Error]:', err)
          setError(err.message || 'Failed to authenticate administrator')
        }
      } finally {
        if (active) {
          setChecking(false)
        }
      }
    }

    verifyAdmin()

    return () => {
      active = false
    }
  }, [isLoaded, isSignedIn, getToken])

  // 1. Clerk still loading auth state
  if (!isLoaded || checking) {
    return (
      <div className="min-h-screen bg-[#F6F6F7] flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-[#E1E3E5] shadow-xs p-8 rounded-lg max-w-sm w-full text-center space-y-4">
          <div className="w-10 h-10 border-3 border-[#769055] border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-sm font-bold text-[#202223] uppercase tracking-wider">
            Verifying Admin Permissions...
          </h2>
          <p className="text-xs text-[#6D7175]">
            Checking PostgreSQL role credentials for Anju Clothing.
          </p>
        </div>
      </div>
    )
  }

  // 2. Not logged in at all -> redirect to Sign In
  if (!isSignedIn) {
    return <Navigate to={`/sign-in?redirect_url=${encodeURIComponent(location.pathname)}`} replace />
  }

  // 3. User is logged in, but role is NOT ADMIN -> Block access completely
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    ''

  const KNOWN_ADMIN_EMAILS = [
    'khushipatil9128@gmail.com',
    'ajit14mahajan@gmail.com',
    'khushipatil1914@gmail.com',
  ]

  const isEmailAdmin = Boolean(
    userEmail && KNOWN_ADMIN_EMAILS.includes(userEmail.toLowerCase().trim())
  )

  const isAdmin = profile?.isAdmin || profile?.user?.role === 'ADMIN' || isEmailAdmin

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F6F6F7] flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-[#E1E3E5] shadow-sm rounded-xl max-w-md w-full p-6 sm:p-8 text-center space-y-5">
          <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto text-2xl">
            🔒
          </div>

          <div className="space-y-1.5">
            <span className="inline-block px-2.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-wider rounded-md">
              403 Forbidden
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-[#202223]">
              Administrator Access Required
            </h1>
            <p className="text-xs text-[#6D7175] leading-relaxed">
              You are signed in as <strong className="text-[#202223]">{userEmail}</strong>, but this account has the standard <span className="font-semibold text-amber-700">CUSTOMER</span> role in our database.
            </p>
          </div>

          <div className="bg-[#FAF8F5] border border-[#EBE4D8] p-3.5 rounded-lg text-left text-xs space-y-1">
            <p className="font-semibold text-[#202223]">Need Admin Access?</p>
            <p className="text-[#6D7175] text-[11px]">
              Contact the store owner to promote this account to <code className="bg-white px-1 py-0.5 border border-gray-200 rounded text-charcoal font-bold">ADMIN</code> role in PostgreSQL.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Link
              to="/"
              className="flex-1 py-2.5 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider transition-colors rounded-lg text-center"
            >
              Return to Store →
            </Link>
            <Link
              to="/account"
              className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-[#202223] text-xs font-bold uppercase tracking-wider transition-colors rounded-lg text-center"
            >
              My Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 4. Authenticated & Verified as ADMIN -> render layout
  return <>{children}</>
}
