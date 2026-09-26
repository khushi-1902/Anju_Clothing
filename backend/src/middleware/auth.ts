import { Request, Response, NextFunction } from 'express'
import { clerkMiddleware, requireAuth, getAuth } from '@clerk/express'
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

    // Lookup user in PostgreSQL
    const { rows } = await pool.query<AuthenticatedUser>(
      `SELECT id, clerk_user_id AS "clerkUserId", email, name, role 
       FROM users 
       WHERE clerk_user_id = $1 
       LIMIT 1`,
      [clerkUserId]
    )

    const user = rows[0]

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Forbidden: Administrator privileges required',
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
