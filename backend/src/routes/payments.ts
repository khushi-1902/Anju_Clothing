import { Router, Request, Response } from 'express'
import { getAuth } from '@clerk/express'
import { requireLogin } from '../middleware/auth'
import { pool } from '../db'
import { razorpay, RAZORPAY_PUBLIC_KEY_ID, verifyRazorpaySignature } from '../lib/razorpay'
import { confirmOrderPaymentAndDecrementStock } from '../services/orders'

export const paymentsRouter = Router()

/**
 * POST /api/payments/create-order
 * Initiates a Razorpay payment order for an existing pending internal order.
 * 
 * - Strictly requires authenticated Clerk session.
 * - Strict ownership check: logged-in user MUST match order.clerkUserId (403 if mismatch or null).
 * - Charges amountPayableNow * 100 paise:
 *     - PREPAID: charges full subtotal (free shipping).
 *     - COD: charges COD_SHIPPING_FEE (200 INR advance shipping fee).
 * - Rejects if order is already PAID or ADVANCE_PAID.
 * - Reuses existing Razorpay order ID if already created for this pending order.
 */
paymentsRouter.post('/create-order', requireLogin, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req)
    const loggedInUserId = auth.userId

    if (!loggedInUserId) {
      return res.status(401).json({
        error: 'Unauthorized: Authentication required.',
      })
    }

    const { orderId, orderNumber } = req.body

    if (!orderId && !orderNumber) {
      return res.status(400).json({
        error: 'Missing required field: orderId or orderNumber must be provided.',
      })
    }

    // 1. Fetch internal order from database
    const query = orderId
      ? 'SELECT * FROM orders WHERE id = $1 LIMIT 1'
      : 'SELECT * FROM orders WHERE "orderNumber" = $1 LIMIT 1'
    const param = orderId || orderNumber

    const { rows } = await pool.query(query, [param])
    const order = rows[0]

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    // 2. Strict ownership verification: order.clerkUserId must strictly match logged-in user
    if (!order.clerkUserId || order.clerkUserId !== loggedInUserId) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to pay for this order.',
      })
    }

    // 3. Status check: Reject if order is already PAID or ADVANCE_PAID
    const currentStatus = String(order.paymentStatus || '').toUpperCase()
    if (currentStatus === 'PAID' || currentStatus === 'ADVANCE_PAID') {
      return res.status(400).json({
        error: 'Order has already been paid or confirmed.',
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
      })
    }

    // 4. Money units conversion:
    // Charge amountPayableNow (in Rupees) converted to paise (1 INR = 100 paise).
    // For PREPAID: amountPayableNow = subtotal.
    // For COD: amountPayableNow = 200 (the online advance booking charge).
    const payableInRupees = Number(order.amountPayableNow ?? order.totalAmount)
    const amountInPaise = Math.round(payableInRupees * 100)

    if (amountInPaise <= 0) {
      return res.status(400).json({ error: 'Invalid payable amount.' })
    }

    // 5. Check if Razorpay order already exists for this pending order (avoid duplicate gateway orders)
    if (order.razorpayOrderId) {
      return res.status(200).json({
        razorpayOrderId: order.razorpayOrderId,
        amount: amountInPaise,
        currency: 'INR',
        keyId: RAZORPAY_PUBLIC_KEY_ID,
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
        amountPayableNow: payableInRupees,
        amountDueOnDelivery: Number(order.amountDueOnDelivery ?? 0),
      })
    }

    // 6. Create Razorpay order via Razorpay SDK
    const receiptId = String(order.orderNumber || order.id).slice(0, 40)
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        internalOrderId: String(order.id),
        orderNumber: String(order.orderNumber),
        customerEmail: String(order.customerEmail || ''),
        customerPhone: String(order.customerPhone || ''),
        paymentMethod: String(order.paymentMethod || 'PREPAID'),
        amountDueOnDelivery: String(order.amountDueOnDelivery || 0),
      },
    })

    // 7. Persist razorpayOrderId in the orders table
    await pool.query(
      `UPDATE orders 
       SET "razorpayOrderId" = $1, "paymentStatus" = 'PENDING', "updatedAt" = NOW() 
       WHERE id = $2`,
      [razorpayOrder.id, order.id]
    )

    return res.status(200).json({
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: RAZORPAY_PUBLIC_KEY_ID,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      amountPayableNow: payableInRupees,
      amountDueOnDelivery: Number(order.amountDueOnDelivery ?? 0),
    })
  } catch (error: any) {
    console.error('[POST /api/payments/create-order] Internal error:', error)
    return res.status(500).json({
      error: 'Internal server error while initiating payment order.',
    })
  }
})

/**
 * POST /api/payments/verify
 * Verifies Razorpay payment signature using timing-safe HMAC-SHA256 comparison.
 * 
 * - Strictly requires authenticated Clerk session.
 * - Strict ownership check (403 if order.clerkUserId !== loggedInUserId or null).
 * - Delegates confirmation and atomic stock decrement to shared confirmOrderPaymentAndDecrementStock function.
 * - Idempotent: returns 200 if already PAID or ADVANCE_PAID with same payment ID.
 * - 409 Conflict: returns 409 if already PAID or ADVANCE_PAID with a different payment ID.
 * - Sets paymentStatus = 'PAID' for PREPAID orders, and 'ADVANCE_PAID' for COD orders.
 * - Sets orderStatus = 'Confirmed' after successful verification.
 */
paymentsRouter.post('/verify', requireLogin, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req)
    const loggedInUserId = auth.userId

    if (!loggedInUserId) {
      return res.status(401).json({
        error: 'Unauthorized: Authentication required.',
      })
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        error: 'Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.',
      })
    }

    // 1. Locate order by razorpayOrderId
    const { rows } = await pool.query(
      'SELECT * FROM orders WHERE "razorpayOrderId" = $1 LIMIT 1',
      [razorpay_order_id]
    )
    const order = rows[0]

    if (!order) {
      return res.status(404).json({
        error: 'No order found corresponding to the given Razorpay order ID.',
      })
    }

    // 2. Strict ownership check
    if (!order.clerkUserId || order.clerkUserId !== loggedInUserId) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to verify this order payment.',
      })
    }

    // 3. Cryptographic HMAC-SHA256 signature verification with timing-safe comparison
    const isValidSignature = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    )

    if (!isValidSignature) {
      return res.status(400).json({
        error: 'Invalid payment signature. Verification failed.',
      })
    }

    // 4. Confirm payment, update status, and atomically decrement stock (Option B) via shared function
    const result = await confirmOrderPaymentAndDecrementStock({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    })

    if (!result.success) {
      if (result.conflict) {
        return res.status(409).json({
          error: 'Conflict: Order has already been marked as PAID/ADVANCE_PAID with a different payment ID.',
          orderNumber: result.order?.orderNumber,
          paymentStatus: result.order?.paymentStatus,
        })
      }
      return res.status(500).json({ error: result.error || 'Failed to confirm order payment.' })
    }

    const updatedOrder = result.order
    const isCod = String(updatedOrder.paymentMethod || '').toUpperCase() === 'COD'

    return res.status(200).json({
      success: true,
      alreadyProcessed: result.alreadyProcessed || false,
      message: isCod
        ? 'Advance shipping payment verified. Order confirmed for Cash on Delivery.'
        : 'Full payment verified and captured successfully.',
      orderNumber: updatedOrder.orderNumber,
      paymentStatus: updatedOrder.paymentStatus,
      paymentMethod: updatedOrder.paymentMethod,
      razorpayPaymentId: razorpay_payment_id,
      amountPaid: Number(updatedOrder.amountPayableNow),
      amountDueOnDelivery: Number(updatedOrder.amountDueOnDelivery),
      totalAmount: Number(updatedOrder.totalAmount),
    })
  } catch (error: any) {
    console.error('[POST /api/payments/verify] Internal error:', error)
    return res.status(500).json({
      error: 'Internal server error while verifying payment.',
    })
  }
})

/**
 * POST /api/payments/refund
 * Initiates a full or partial refund for an order via Razorpay Refund API.
 * - Checks that order exists, has a valid razorpayPaymentId, and paymentStatus is PAID or ADVANCE_PAID.
 * - Calls razorpay.payments.refund(order.razorpayPaymentId, { amount: refundInPaise, notes: { orderNumber, reason } }).
 * - Updates order.paymentStatus to 'REFUNDED' (or 'PARTIALLY_REFUNDED').
 * - Restocks items back into product_variants table.
 * - Appends refund milestone to timeline.
 */
paymentsRouter.post('/refund', requireLogin, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req)
    const loggedInUserId = auth.userId

    if (!loggedInUserId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' })
    }

    const { orderNumber, amountInRupees, reason } = req.body

    if (!orderNumber) {
      return res.status(400).json({ error: 'orderNumber is required.' })
    }

    // 1. Fetch order
    const { rows } = await pool.query(
      'SELECT * FROM orders WHERE "orderNumber" = $1 LIMIT 1',
      [orderNumber]
    )
    const order = rows[0]

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    // 2. Validate payment status and Razorpay Payment ID
    const currentStatus = String(order.paymentStatus || '').toUpperCase()
    if (!order.razorpayPaymentId || (currentStatus !== 'PAID' && currentStatus !== 'ADVANCE_PAID')) {
      return res.status(400).json({
        error: `Cannot refund order #${orderNumber} with payment status "${order.paymentStatus}" and no captured payment ID.`,
      })
    }

    // 3. Determine refund amount (default to online amount paid)
    const maxRefundableRupees = Number(order.amountPayableNow || order.totalAmount)
    const refundRupees = amountInRupees ? Number(amountInRupees) : maxRefundableRupees

    if (refundRupees <= 0 || refundRupees > maxRefundableRupees) {
      return res.status(400).json({
        error: `Invalid refund amount. Maximum refundable amount is ₹${maxRefundableRupees}.`,
      })
    }

    const refundInPaise = Math.round(refundRupees * 100)

    // 4. Initiate Refund with Razorpay
    const refundResult = await razorpay.payments.refund(order.razorpayPaymentId, {
      amount: refundInPaise,
      notes: {
        orderNumber: String(order.orderNumber),
        reason: reason || 'Customer requested refund / order cancellation',
      },
    })

    // 5. Restock variants (reversing Option B decrement)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows: items } = await client.query(
        'SELECT "productVariantId", quantity FROM order_items WHERE "orderId" = $1',
        [order.id]
      )

      for (const item of items) {
        if (item.productVariantId && Number(item.quantity) > 0) {
          await client.query(
            'UPDATE product_variants SET stock = stock + $1 WHERE id = $2',
            [Number(item.quantity), Number(item.productVariantId)]
          )
        }
      }

      const isPartial = refundRupees < maxRefundableRupees
      const newPaymentStatus = isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED'
      const newOrderStatus = isPartial ? order.orderStatus : 'Cancelled'

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
        status: isPartial ? 'Partial Refund Processed' : 'Order Refunded',
        time: nowFormatted,
        completed: true,
        description: `Refund of ₹${refundRupees} processed via Razorpay (Refund ID: ${refundResult.id}).${reason ? ` Reason: ${reason}` : ''}`,
      })

      const updateRes = await client.query(
        `UPDATE orders 
         SET "paymentStatus" = $1, 
             "orderStatus" = $2, 
             timeline = $3::jsonb, 
             notes = COALESCE(notes || E'\n', '') || $4,
             "updatedAt" = NOW() 
         WHERE id = $5 
         RETURNING *`,
        [
          newPaymentStatus,
          newOrderStatus,
          JSON.stringify(timeline),
          `[Refund ID: ${refundResult.id}] ₹${refundRupees} refunded on ${nowFormatted}.`,
          order.id,
        ]
      )

      await client.query('COMMIT')

      return res.status(200).json({
        success: true,
        message: `Refund of ₹${refundRupees} processed successfully.`,
        refundId: refundResult.id,
        order: updateRes.rows[0],
      })
    } catch (dbErr: any) {
      await client.query('ROLLBACK')
      throw dbErr
    } finally {
      client.release()
    }
  } catch (err: any) {
    console.error('[POST /api/payments/refund] Error:', err)
    return res.status(500).json({
      error: err.error?.description || err.message || 'Failed to process refund.',
    })
  }
})
