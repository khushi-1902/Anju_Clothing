import { Request, Response, NextFunction } from 'express'
import { clerkMiddleware, requireAuth, getAuth, createClerkClient } from '@clerk/express'
import { pool } from '../db'

export type UserRole = 'CUSTOMER' | 'ADMIN'

export interface AuthenticatedUser {
  id: number
  clerkUserId: string
  email: string
  name: string | null
  role: UserRole
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      dbUser?: AuthenticatedUser
    }
  }
}

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

/**
 * Global Clerk session resolver middleware.
 * Attaches auth state to req.auth on all routes.
 */
export const clerkAuth = clerkMiddleware()

/**
 * Route-level guard: Ensures a valid Clerk session token is provided.
 */
export const requireLogin = requireAuth()

/**
 * Admin-Only guard:
 * Verifies that the user exists in Postgres and has the 'ADMIN' role.
 * Rejects with 403 Forbidden if not an admin.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req)
    const clerkUserId = auth.userId

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' })
    }

    const adminEmails = (process.env.ADMIN_EMAILS || 'khushipatil9128@gmail.com,ajit14mahajan@gmail.com,khushipatil1914@gmail.com')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    // 1. Lookup user in PostgreSQL
    let { rows } = await pool.query<AuthenticatedUser>(
      `SELECT id, COALESCE("clerkUserId", clerk_user_id) AS "clerkUserId", email, name, role 
       FROM users 
       WHERE ("clerkUserId" = $1 OR clerk_user_id = $1)
       LIMIT 1`,
      [clerkUserId]
    )

    let user = rows[0]

    // 2. If user record is missing in Postgres or not admin yet, check if email matches ADMIN_EMAILS
    if (!user || user.role !== 'ADMIN' || !user.email) {
      try {
        const cu = await clerkClient.users.getUser(clerkUserId)
        const primaryEmailId = cu.primaryEmailAddressId
        const emailObj = cu.emailAddresses?.find((e: any) => e.id === primaryEmailId)
        const email = (emailObj?.emailAddress ?? cu.emailAddresses?.[0]?.emailAddress ?? '').toLowerCase().trim()
        const name = `${cu.firstName || ''} ${cu.lastName || ''}`.trim() || null

        const shouldBeAdmin = adminEmails.includes(email) || user?.role === 'ADMIN'
        const role: UserRole = shouldBeAdmin ? 'ADMIN' : (user?.role || 'CUSTOMER')

        const upsertRes = await pool.query<AuthenticatedUser>(
          `INSERT INTO users ("clerkUserId", clerk_user_id, email, name, role, "updatedAt", updated_at)
           VALUES ($1, $1, $2, $3, $4, NOW(), NOW())
           ON CONFLICT ("clerkUserId") 
           DO UPDATE SET 
             email = EXCLUDED.email, 
             name = COALESCE(EXCLUDED.name, users.name),
             role = CASE WHEN users.role = 'ADMIN' OR $4 = 'ADMIN' THEN 'ADMIN' ELSE users.role END,
             "updatedAt" = NOW()
           RETURNING id, "clerkUserId", email, name, role`,
          [clerkUserId, email || `user-${clerkUserId.slice(0, 8)}@store.local`, name, role]
        )
        user = upsertRes.rows[0]
      } catch (clerkErr) {
        console.warn('[requireAdmin] Could not query Clerk API:', clerkErr)
      }
    }

    // 3. Verify ADMIN role
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Forbidden: Administrator privileges required',
        currentRole: user?.role || 'CUSTOMER',
      })
    }

    // Attach verified DB user to request object
    req.dbUser = user
    next()
  } catch (error) {
    console.error('[requireAdmin middleware error]:', error)
    res.status(500).json({ error: 'Internal authorization error' })
  }
}
