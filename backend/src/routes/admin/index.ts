import { Router, Request, Response } from 'express'
import { adminUsersRouter } from './users'
import { adminOrdersRouter } from './orders'
import { adminProductsRouter } from './products'
import { uploadRouter } from './upload'
import { adminSettingsRouter } from './settings'
import { pool } from '../../db'

export const adminRouter = Router()

// Mount sub-routes (all protected by requireLogin + requireAdmin upstream)
adminRouter.use('/users', adminUsersRouter)
adminRouter.use('/orders', adminOrdersRouter)
adminRouter.use('/products', adminProductsRouter)
adminRouter.use('/upload', uploadRouter)
adminRouter.use('/settings', adminSettingsRouter)

/**
 * GET /api/admin/me
 * Returns current authenticated admin's user record.
 */
adminRouter.get('/me', (req: Request, res: Response) => {
  res.json({
    user: req.dbUser,
    isAdmin: true,
  })
})

/**
 * GET /api/admin/stats
 * Overview analytics for the admin dashboard (real Postgres numbers).
 */
adminRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [usersCount, ordersCount, productsCount, pendingOrdersCount, revenueSum, salesByDay] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM users`),
      pool.query(`SELECT COUNT(*)::int AS count FROM orders`),
      pool.query(`SELECT COUNT(*)::int AS count FROM products`),
      pool.query(`SELECT COUNT(*)::int AS count FROM orders WHERE "orderStatus" IN ('Pending', 'Processing', 'Confirmed')`),
      pool.query(`SELECT COALESCE(SUM("totalAmount"), 0)::int AS "totalRevenue" FROM orders`),
      pool.query(`
        SELECT 
          TO_CHAR("createdAt", 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS orders,
          COALESCE(SUM("totalAmount"), 0)::int AS revenue
        FROM orders
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD')
        ORDER BY date ASC
      `),
    ])

    const totalOrders = ordersCount.rows[0]?.count ?? 0
    const totalRevenue = revenueSum.rows[0]?.totalRevenue ?? 0
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

    res.json({
      totalUsers: usersCount.rows[0]?.count ?? 0,
      totalOrders,
      totalProducts: productsCount.rows[0]?.count ?? 0,
      pendingOrders: pendingOrdersCount.rows[0]?.count ?? 0,
      totalRevenue,
      avgOrderValue,
      salesByDay: salesByDay.rows ?? [],
    })
  } catch (err) {
    console.error('Error fetching admin stats:', err)
    res.status(500).json({ error: 'Failed to fetch admin stats' })
  }
})
