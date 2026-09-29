import { pool } from '../db'

export interface ConfirmPaymentParams {
  razorpayOrderId?: string
  orderId?: number
  razorpayPaymentId: string
}

export interface ConfirmPaymentResult {
  success: boolean
  alreadyProcessed?: boolean
  conflict?: boolean
  order?: any
  error?: string
}

/**
 * Shared order payment confirmation and atomic stock decrement (Option B).
 * Used by BOTH POST /api/payments/verify AND POST /api/webhooks/razorpay.
 * 
 * - Idempotent: safe against duplicate webhook deliveries and race conditions with /verify.
 * - Atomically decrements variant stock in product_variants.
 * - Sets paymentStatus: 'PAID' (PREPAID) or 'ADVANCE_PAID' (COD).
 * - Sets orderStatus: 'Confirmed'.
 */
export async function confirmOrderPaymentAndDecrementStock({
  razorpayOrderId,
  orderId,
  razorpayPaymentId,
}: ConfirmPaymentParams): Promise<ConfirmPaymentResult> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Fetch order with row lock
    const query = orderId
      ? 'SELECT * FROM orders WHERE id = $1 FOR UPDATE'
      : 'SELECT * FROM orders WHERE "razorpayOrderId" = $1 FOR UPDATE'
    const param = orderId || razorpayOrderId

    const { rows } = await client.query(query, [param])
    const order = rows[0]

    if (!order) {
      await client.query('ROLLBACK')
      return { success: false, error: 'Order not found.' }
    }

    // 2. Idempotency Check: if order is already PAID or ADVANCE_PAID
    const currentStatus = String(order.paymentStatus || '').toUpperCase()
    const isAlreadyPaid = currentStatus === 'PAID' || currentStatus === 'ADVANCE_PAID'

    if (isAlreadyPaid) {
      await client.query('COMMIT')
      if (order.razorpayPaymentId === razorpayPaymentId) {
        return { success: true, alreadyProcessed: true, order }
      } else {
        return { success: false, conflict: true, order }
      }
    }

    // 3. Atomically Decrement Variant Stock for all items in the order
    const { rows: items } = await client.query(
      'SELECT "productVariantId", quantity FROM order_items WHERE "orderId" = $1',
      [order.id]
    )

    for (const item of items) {
      if (item.productVariantId && Number(item.quantity) > 0) {
        await client.query(
          `UPDATE product_variants 
           SET stock = GREATEST(0, stock - $1) 
           WHERE id = $2`,
          [Number(item.quantity), Number(item.productVariantId)]
        )
      }
    }

    // 4. Update Order Status and Timeline
    const isCod = String(order.paymentMethod || '').toUpperCase() === 'COD'
    const newPaymentStatus = isCod ? 'ADVANCE_PAID' : 'PAID'

    let timeline = order.timeline || []
    if (typeof timeline === 'string') {
      try { timeline = JSON.parse(timeline) } catch (_) { timeline = [] }
    }

    const nowFormatted = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    timeline.push({
      status: 'Payment Confirmed',
      time: nowFormatted,
      completed: true,
      description: isCod
        ? `Advance shipping fee (₹${order.amountPayableNow}) paid online via Razorpay (${razorpayPaymentId}). ₹${order.amountDueOnDelivery} due on delivery.`
        : `Full payment of ₹${order.amountPayableNow} received via Razorpay (${razorpayPaymentId}). Stock reserved.`,
    })

    const updateRes = await client.query(
      `UPDATE orders 
       SET "paymentStatus" = $1, 
           "razorpayPaymentId" = $2, 
           "orderStatus" = 'Confirmed',
           timeline = $3::jsonb,
           "updatedAt" = NOW() 
       WHERE id = $4 
       RETURNING *`,
      [newPaymentStatus, razorpayPaymentId, JSON.stringify(timeline), order.id]
    )

    await client.query('COMMIT')

    return {
      success: true,
      alreadyProcessed: false,
      order: updateRes.rows[0],
    }
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('[confirmOrderPaymentAndDecrementStock] Transaction error:', error)
    return { success: false, error: error.message || 'Internal database error' }
  } finally {
    client.release()
  }
}

/**
 * Marks an internal order as FAILED when Razorpay payment fails.
 */
export async function markOrderPaymentFailed({
  razorpayOrderId,
  razorpayPaymentId,
  failureReason,
}: {
  razorpayOrderId?: string
  razorpayPaymentId?: string
  failureReason?: string
}): Promise<{ success: boolean; order?: any }> {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM orders WHERE "razorpayOrderId" = $1 LIMIT 1',
      [razorpayOrderId]
    )
    const order = rows[0]

    if (!order) {
      return { success: false }
    }

    const currentStatus = String(order.paymentStatus || '').toUpperCase()
    if (currentStatus === 'PAID' || currentStatus === 'ADVANCE_PAID') {
      return { success: true, order }
    }

    let timeline = order.timeline || []
    if (typeof timeline === 'string') {
      try { timeline = JSON.parse(timeline) } catch (_) { timeline = [] }
    }

    const nowFormatted = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    timeline.push({
      status: 'Payment Failed',
      time: nowFormatted,
      completed: false,
      description: `Payment attempt failed via Razorpay${failureReason ? `: ${failureReason}` : ''}.`,
    })

    const updateRes = await pool.query(
      `UPDATE orders 
       SET "paymentStatus" = 'FAILED', 
           "razorpayPaymentId" = COALESCE($1, "razorpayPaymentId"),
           timeline = $2::jsonb,
           "updatedAt" = NOW() 
       WHERE id = $3 
       RETURNING *`,
      [razorpayPaymentId || null, JSON.stringify(timeline), order.id]
    )

    return { success: true, order: updateRes.rows[0] }
  } catch (error) {
    console.error('[markOrderPaymentFailed] Error:', error)
    return { success: false }
  }
}
