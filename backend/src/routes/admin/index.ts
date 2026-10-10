import { Router, Request, Response } from 'express'
import { adminUsersRouter } from './users'
import { adminOrdersRouter } from './orders'
import { adminProductsRouter } from './products'
import { uploadRouter } from './upload'
import { adminSettingsRouter } from './settings'
import { pool } from '../../db'

export const adminRouter = Router()

// Status list constants for consistent stats filtering
export const EXCLUDED_ORDER_STATUSES = ['cancelled', 'refunded'] as const
export const PAID_PAYMENT_STATUSES = ['paid', 'advance_paid', 'captured', 'completed'] as const
export const PENDING_ORDER_STATUSES = ['pending', 'processing', 'confirmed'] as const
export const ACTIVE_PRODUCT_STATUS = 'active' as const

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
    user: (req as any).dbUser,
    isAdmin: true,
  })
})

/**
 * GET /api/admin/stats
 * Overview analytics for the admin dashboard (real Postgres numbers).
 * 
 * Rules:
 * - A real sale = not cancelled/refunded AND (COD or paid online), excluding abandoned checkouts.
 * - salesByDay = last 14 days in Asia/Kolkata timezone, zero-filled via generate_series.
 * - totalProducts = products with status 'active' (case-insensitive).
 * - pendingOrders = real sales with status in pending/processing/confirmed.
 */
adminRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [salesSummaryRes, pendingOrdersRes, productsCountRes, salesByDayRes] = await Promise.all([
      // 1. Total real orders & total revenue
      pool.query(`
        SELECT 
          COUNT(*)::int AS "totalOrders",
          COALESCE(SUM("totalAmount"), 0)::int AS "totalRevenue"
        FROM orders
        WHERE LOWER("orderStatus") NOT IN ('cancelled', 'refunded')
          AND (
            LOWER("paymentMethod") = 'cod' 
            OR LOWER("paymentStatus") IN ('paid', 'advance_paid', 'captured', 'completed')
          )
      `),

      // 2. Pending orders count (real sales awaiting fulfillment)
      pool.query(`
        SELECT COUNT(*)::int AS count 
        FROM orders 
        WHERE LOWER("orderStatus") IN ('pending', 'processing', 'confirmed')
          AND (
            LOWER("paymentMethod") = 'cod' 
            OR LOWER("paymentStatus") IN ('paid', 'advance_paid', 'captured', 'completed')
          )
      `),

      // 3. Total active products count (case-insensitive)
      pool.query(`
        SELECT COUNT(*)::int AS count 
        FROM products 
        WHERE LOWER(status) = 'active'
      `),

      // 4. Sales by day: last 14 days in Asia/Kolkata, zero-filled via generate_series
      pool.query(`
        WITH date_series AS (
          SELECT (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata' - (i || ' days')::interval)::date AS day
          FROM generate_series(13, 0, -1) AS i
        ),
        daily_sales AS (
          SELECT 
            ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date AS day,
            COUNT(*)::int AS orders,
            COALESCE(SUM("totalAmount"), 0)::int AS revenue
          FROM orders
          WHERE LOWER("orderStatus") NOT IN ('cancelled', 'refunded')
            AND (
              LOWER("paymentMethod") = 'cod' 
              OR LOWER("paymentStatus") IN ('paid', 'advance_paid', 'captured', 'completed')
            )
            AND ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata' - INTERVAL '13 days')::date
          GROUP BY ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
        )
        SELECT 
          TO_CHAR(ds.day, 'YYYY-MM-DD') AS date,
          COALESCE(s.revenue, 0)::int AS revenue,
          COALESCE(s.orders, 0)::int AS orders
        FROM date_series ds
        LEFT JOIN daily_sales s ON ds.day = s.day
        ORDER BY ds.day ASC
      `),
    ])

    const totalOrders = salesSummaryRes.rows[0]?.totalOrders ?? 0
    const totalRevenue = salesSummaryRes.rows[0]?.totalRevenue ?? 0
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
    const pendingOrders = pendingOrdersRes.rows[0]?.count ?? 0
    const totalProducts = productsCountRes.rows[0]?.count ?? 0
    const salesByDay = (salesByDayRes.rows ?? []).map((row) => ({
      date: String(row.date),
      revenue: Number(row.revenue ?? 0),
      orders: Number(row.orders ?? 0),
    }))

    res.json({
      totalRevenue,
      avgOrderValue,
      totalOrders,
      pendingOrders,
      totalProducts,
      salesByDay,
    })
  } catch (err) {
    console.error('Error fetching admin stats:', err)
    res.status(500).json({ error: 'Failed to fetch admin stats' })
  }
})
