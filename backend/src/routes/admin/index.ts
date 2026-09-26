import { Router, Request, Response } from 'express'
import { adminUsersRouter } from './users'
import { adminOrdersRouter } from './orders'
import { pool } from '../../db'

export const adminRouter = Router()

// Mount sub-routes (all protected by requireAdmin upstream)
adminRouter.use('/users', adminUsersRouter)
adminRouter.use('/orders', adminOrdersRouter)

/**
 * GET /api/admin/stats
 * Overview analytics for the admin dashboard
 */
adminRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [usersCount, ordersCount] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM users`),
      pool.query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0)::int AS "totalRevenue" FROM orders`),
    ])

    res.json({
      totalUsers: usersCount.rows[0]?.count ?? 0,
      totalOrders: ordersCount.rows[0]?.count ?? 0,
      totalRevenue: ordersCount.rows[0]?.totalRevenue ?? 0,
    })
  } catch (err) {
    console.error('Error fetching admin stats:', err)
    res.status(500).json({ error: 'Failed to fetch admin stats' })
  }
})
