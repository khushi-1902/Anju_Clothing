import { Router, Request, Response } from 'express'
import { pool } from '../../db'

export const adminUsersRouter = Router()

/**
 * GET /api/admin/users
 * Returns list of registered users.
 */
adminUsersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, clerk_user_id AS "clerkUserId", email, name, role, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users
       ORDER BY created_at DESC
       LIMIT 100`
    )
    res.json({ users: rows })
  } catch (err) {
    console.error('Error fetching admin users:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

/**
 * PATCH /api/admin/users/:clerkUserId/role
 * Updates a user's role between CUSTOMER and ADMIN.
 */
adminUsersRouter.patch('/:clerkUserId/role', async (req: Request, res: Response) => {
  const { clerkUserId } = req.params
  const { role } = req.body

  if (role !== 'CUSTOMER' && role !== 'ADMIN') {
    return res.status(400).json({ error: "Role must be 'CUSTOMER' or 'ADMIN'" })
  }

  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET role = $1, updated_at = NOW()
       WHERE clerk_user_id = $2
       RETURNING id, clerk_user_id AS "clerkUserId", email, name, role`,
      [role, clerkUserId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user: rows[0], message: `Role updated to ${role}` })
  } catch (err) {
    console.error('Error updating user role:', err)
    res.status(500).json({ error: 'Failed to update user role' })
  }
})
