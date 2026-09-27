import { Router, Request, Response } from 'express'
import { pool } from '../../db'

export const adminOrdersRouter = Router()

/**
 * GET /api/admin/orders
 * Returns all store orders with customer details, search, and status filters.
 */
adminOrdersRouter.get('/', async (req: Request, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500)
  const statusFilter = (req.query.status as string | undefined)?.toLowerCase()
  const search = req.query.search as string | undefined

  try {
    let whereClauses: string[] = []
    const params: any[] = []

    // 1. Status Filter (All / Unfulfilled / Unpaid / Cancelled / specific)
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'unfulfilled') {
        whereClauses.push(`"orderStatus" IN ('Pending', 'Processing', 'Confirmed')`)
      } else if (statusFilter === 'unpaid') {
        whereClauses.push(`LOWER("paymentStatus") IN ('pending', 'unpaid', 'failed')`)
      } else if (statusFilter === 'cancelled') {
        whereClauses.push(`LOWER("orderStatus") = 'cancelled'`)
      } else if (statusFilter === 'delivered' || statusFilter === 'fulfilled') {
        whereClauses.push(`LOWER("orderStatus") IN ('delivered', 'fulfilled')`)
      } else if (statusFilter === 'shipped') {
        whereClauses.push(`LOWER("orderStatus") IN ('shipped', 'in transit', 'out for delivery')`)
      } else {
        params.push(statusFilter)
        whereClauses.push(`LOWER("orderStatus") = $${params.length}`)
      }
    }

    // 2. Search Filter (by orderNumber, customerName, customerEmail, phone)
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`)
      whereClauses.push(
        `(LOWER("orderNumber") LIKE $${params.length} OR LOWER("customerName") LIKE $${params.length} OR LOWER("customerEmail") LIKE $${params.length} OR LOWER(COALESCE("customerPhone", '')) LIKE $${params.length})`
      )
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    params.push(limit)
    const query = `
      SELECT 
        id,
        "orderNumber",
        "clerkUserId",
        "customerName",
        "customerEmail",
        "customerPhone",
        "orderStatus",
        "paymentStatus",
        "paymentMethod",
        "totalAmount",
        "subtotal",
        "shippingFee",
        "discountAmount",
        "shippingAddress",
        items,
        "trackingNumber",
        "courierName",
        "estimatedDelivery",
        timeline,
        notes,
        "createdAt",
        "updatedAt"
      FROM orders
      ${whereString}
      ORDER BY "createdAt" DESC
      LIMIT $${params.length}
    `

    const { rows } = await pool.query(query, params)
    res.json({ orders: rows, total: rows.length })
  } catch (err: any) {
    console.error('Error fetching admin orders:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch admin orders' })
  }
})

/**
 * GET /api/admin/orders/recent
 * Returns the last 10 orders for dashboard.
 */
adminOrdersRouter.get('/recent', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
        id,
        "orderNumber",
        "customerName",
        "customerEmail",
        "orderStatus",
        "paymentStatus",
        "paymentMethod",
        "totalAmount",
        items,
        "createdAt"
      FROM orders
      ORDER BY "createdAt" DESC
      LIMIT 10`
    )
    res.json({ orders: rows })
  } catch (err) {
    console.error('Error fetching recent orders:', err)
    res.status(500).json({ error: 'Failed to fetch recent orders' })
  }
})

/**
 * GET /api/admin/orders/:orderNumber
 * Single order details.
 */
adminOrdersRouter.get('/:orderNumber', async (req: Request, res: Response) => {
  const { orderNumber } = req.params
  try {
    const { rows } = await pool.query(
      `SELECT * FROM orders WHERE "orderNumber" = $1 LIMIT 1`,
      [orderNumber]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json({ order: rows[0] })
  } catch (err: any) {
    console.error('Error fetching order details:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch order details' })
  }
})

/**
 * PATCH /api/admin/orders/:orderNumber/status
 * Updates tracking information, status, and timeline.
 */
adminOrdersRouter.patch('/:orderNumber/status', async (req: Request, res: Response) => {
  const { orderNumber } = req.params
  const {
    orderStatus,
    paymentStatus,
    trackingNumber,
    courierName,
    estimatedDelivery,
    notes,
  } = req.body

  try {
    // 1. Fetch current order to update timeline
    const currentRes = await pool.query(
      `SELECT timeline, "orderStatus" FROM orders WHERE "orderNumber" = $1 LIMIT 1`,
      [orderNumber]
    )

    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    let timeline = currentRes.rows[0].timeline || []
    if (typeof timeline === 'string') {
      try { timeline = JSON.parse(timeline) } catch (_) { timeline = [] }
    }

    // Add milestone if status changed
    if (orderStatus && orderStatus !== currentRes.rows[0].orderStatus) {
      const nowFormatted = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })

      timeline.push({
        status: orderStatus,
        time: nowFormatted,
        completed: true,
        description:
          orderStatus === 'Delivered'
            ? 'Package handed over to customer. Order fulfilled.'
            : orderStatus === 'Shipped'
            ? `Dispatched via ${courierName || 'Courier Partner'}${trackingNumber ? ` (AWB: ${trackingNumber})` : ''}.`
            : `Order updated to ${orderStatus}.`,
      })
    }

    // 2. Update order record
    const { rows } = await pool.query(
      `UPDATE orders
       SET 
         "orderStatus" = COALESCE($1, "orderStatus"),
         "paymentStatus" = COALESCE($2, "paymentStatus"),
         "trackingNumber" = COALESCE($3, "trackingNumber"),
         "courierName" = COALESCE($4, "courierName"),
         "estimatedDelivery" = COALESCE($5, "estimatedDelivery"),
         notes = COALESCE($6, notes),
         timeline = $7::jsonb,
         "updatedAt" = NOW()
       WHERE "orderNumber" = $8
       RETURNING *`,
      [
        orderStatus,
        paymentStatus,
        trackingNumber,
        courierName,
        estimatedDelivery,
        notes,
        JSON.stringify(timeline),
        orderNumber,
      ]
    )

    res.json({
      success: true,
      order: rows[0],
      message: `Order #${orderNumber} updated successfully`,
    })
  } catch (err: any) {
    console.error('Error updating order status:', err)
    res.status(500).json({ error: err.message || 'Failed to update order status' })
  }
})
