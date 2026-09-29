import { Router, Request, Response } from 'express'
import express from 'express'
import { verifyRazorpayWebhookSignature } from '../../lib/razorpay'
import { confirmOrderPaymentAndDecrementStock, markOrderPaymentFailed } from '../../services/orders'

export const razorpayWebhookRouter = Router()

/**
 * POST /api/webhooks/razorpay
 * Listens for asynchronous payment lifecycle events from Razorpay.
 * 
 * - Mounted with express.raw({ type: 'application/json' }) before express.json()
 * - Verifies x-razorpay-signature header with RAZORPAY_WEBHOOK_SECRET
 * - Handled events:
 *     - payment.captured: confirms internal order, decrements stock atomically (Option B), marks PAID/ADVANCE_PAID
 *     - payment.failed: records failed payment attempt in order timeline and sets paymentStatus = 'FAILED'
 * - Idempotent: duplicate webhook events acknowledge with HTTP 200 without redundant operations
 */
razorpayWebhookRouter.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'] as string | undefined

    if (!signature) {
      console.warn('[Razorpay Webhook] Missing x-razorpay-signature header.')
      return res.status(400).json({ error: 'Missing x-razorpay-signature header' })
    }

    const rawBody = req.body as Buffer
    const isValidSignature = verifyRazorpayWebhookSignature(rawBody, signature)

    if (!isValidSignature) {
      console.warn('[Razorpay Webhook] Invalid webhook signature detected.')
      return res.status(400).json({ error: 'Invalid webhook signature' })
    }

    let event: any
    try {
      event = JSON.parse(rawBody.toString('utf8'))
    } catch (parseErr) {
      console.error('[Razorpay Webhook] Failed to parse raw body JSON:', parseErr)
      return res.status(400).json({ error: 'Malformed JSON payload' })
    }

    const eventType = event?.event
    console.log(`[Razorpay Webhook] Received verified event: ${eventType} (ID: ${event?.id})`)

    try {
      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        const paymentEntity = event?.payload?.payment?.entity
        const razorpayOrderId = paymentEntity?.order_id
        const razorpayPaymentId = paymentEntity?.id

        if (!razorpayOrderId || !razorpayPaymentId) {
          console.warn('[Razorpay Webhook] Missing order_id or payment id in captured payload.')
          return res.status(200).json({ received: true, ignored: true })
        }

        const result = await confirmOrderPaymentAndDecrementStock({
          razorpayOrderId,
          razorpayPaymentId,
        })

        if (!result.success && !result.alreadyProcessed) {
          console.error(`[Razorpay Webhook] Could not confirm order for Razorpay order ${razorpayOrderId}: ${result.error}`)
        } else {
          console.log(`[Razorpay Webhook] Order #${result.order?.orderNumber || razorpayOrderId} payment confirmed via webhook.`)
        }

        return res.status(200).json({ received: true, processed: true })
      }

      if (eventType === 'payment.failed') {
        const paymentEntity = event?.payload?.payment?.entity
        const razorpayOrderId = paymentEntity?.order_id
        const razorpayPaymentId = paymentEntity?.id
        const failureReason = paymentEntity?.error_description || paymentEntity?.error_reason

        if (razorpayOrderId) {
          await markOrderPaymentFailed({
            razorpayOrderId,
            razorpayPaymentId,
            failureReason,
          })
          console.log(`[Razorpay Webhook] Order with Razorpay order ${razorpayOrderId} marked as FAILED.`)
        }

        return res.status(200).json({ received: true, failed: true })
      }

      // Default: Acknowledge other unhandled webhook events
      return res.status(200).json({ received: true, ignored: true })
    } catch (err: any) {
      console.error('[Razorpay Webhook] Internal processing error:', err)
      return res.status(500).json({ error: 'Internal webhook processing error' })
    }
  }
)
