import { Router, Request, Response } from 'express'
import { pool } from '../../db'

export const adminUsersRouter = Router()

/**
 * GET /api/admin/users
 * Returns list of registered users with order count and total spent.
 */
adminUsersRouter.get('/', async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined
  const role = req.query.role as string | undefined

  try {
    const params: any[] = []
    let whereClauses: string[] = []

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`)
      whereClauses.push(`(LOWER(u.email) LIKE $${params.length} OR LOWER(COALESCE(u.name, '')) LIKE $${params.length})`)
    }

    if (role && role !== 'all') {
      params.push(role.toUpperCase())
      whereClauses.push(`u.role = $${params.length}`)
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const { rows } = await pool.query(
      `SELECT 
         u.id, 
         COALESCE(u."clerkUserId", u.clerk_user_id) AS "clerkUserId", 
         u.email, 
         u.name, 
         u.role, 
         COALESCE(u."createdAt", u.created_at, NOW()) AS "createdAt",
         COALESCE((
           SELECT COUNT(*)::int 
           FROM orders o 
           WHERE (o."clerkUserId" IS NOT NULL AND o."clerkUserId" = COALESCE(u."clerkUserId", u.clerk_user_id))
              OR (o."customerEmail" IS NOT NULL AND LOWER(o."customerEmail") = LOWER(u.email))
         ), 0) AS "orderCount",
         COALESCE((
           SELECT SUM("totalAmount")::int 
           FROM orders o 
           WHERE (o."clerkUserId" IS NOT NULL AND o."clerkUserId" = COALESCE(u."clerkUserId", u.clerk_user_id))
              OR (o."customerEmail" IS NOT NULL AND LOWER(o."customerEmail") = LOWER(u.email))
         ), 0) AS "totalSpent"
       FROM users u
       ${whereString}
       ORDER BY COALESCE(u."createdAt", u.created_at) DESC
       LIMIT 200`,
      params
    )

    res.json({ users: rows, total: rows.length })
  } catch (err: any) {
    console.error('Error fetching admin users:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch users' })
  }
})

/**
 * PATCH /api/admin/users/:identifier/role
 * Updates a user's role (CUSTOMER <-> ADMIN).
 */
adminUsersRouter.patch('/:identifier/role', async (req: Request, res: Response) => {
  const { identifier } = req.params
  const { role } = req.body

  if (role !== 'CUSTOMER' && role !== 'ADMIN') {
    return res.status(400).json({ error: "Role must be 'CUSTOMER' or 'ADMIN'" })
  }

  const isNumeric = /^\d+$/.test(identifier)

  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET role = $1, "updatedAt" = NOW()
       WHERE ${isNumeric ? 'id = $2' : '("clerkUserId" = $2 OR clerk_user_id = $2 OR email ILIKE $2)'}
       RETURNING id, COALESCE("clerkUserId", clerk_user_id) AS "clerkUserId", email, name, role`,
      [role, isNumeric ? Number(identifier) : identifier]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      success: true,
      user: rows[0],
      message: `User ${rows[0].email} is now ${role === 'ADMIN' ? 'an Administrator' : 'a Customer'}.`,
    })
  } catch (err: any) {
    console.error('Error updating user role:', err)
    res.status(500).json({ error: err.message || 'Failed to update user role' })
  }
})
