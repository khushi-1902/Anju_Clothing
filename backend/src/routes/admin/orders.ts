import { Router, Request, Response } from 'express'
import { pool } from '../../db'

export const adminOrdersRouter = Router()

/**
 * GET /api/admin/orders
 * Returns all store orders with customer details.
 */
adminOrdersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
         id,
         order_number AS "orderNumber",
         customer_name AS "customerName",
         customer_email AS "customerEmail",
         customer_phone AS "customerPhone",
         order_status AS "orderStatus",
         payment_status AS "paymentStatus",
         total_amount AS "totalAmount",
         tracking_number AS "trackingNumber",
         courier_partner AS "courierPartner",
         created_at AS "createdAt"
       FROM orders
       ORDER BY created_at DESC
       LIMIT 100`
    )
    res.json({ orders: rows })
  } catch (err) {
    console.error('Error fetching admin orders:', err)
    res.status(500).json({ error: 'Failed to fetch admin orders' })
  }
})

/**
 * PATCH /api/admin/orders/:orderNumber/status
 * Updates tracking information and status for an order.
 */
adminOrdersRouter.patch('/:orderNumber/status', async (req: Request, res: Response) => {
  const { orderNumber } = req.params
  const { orderStatus, trackingNumber, courierPartner } = req.body

  try {
    const { rows } = await pool.query(
      `UPDATE orders
       SET 
         order_status = COALESCE($1, order_status),
         tracking_number = COALESCE($2, tracking_number),
         courier_partner = COALESCE($3, courier_partner),
         updated_at = NOW()
       WHERE order_number = $4
       RETURNING order_number AS "orderNumber", order_status AS "orderStatus", tracking_number AS "trackingNumber", courier_partner AS "courierPartner"`,
      [orderStatus, trackingNumber, courierPartner, orderNumber]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json({ order: rows[0], message: 'Order status updated successfully' })
  } catch (err) {
    console.error('Error updating order status:', err)
    res.status(500).json({ error: 'Failed to update order status' })
  }
})
