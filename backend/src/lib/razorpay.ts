import 'dotenv/config'
import Razorpay from 'razorpay'
import crypto from 'node:crypto'

const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET

if (!keyId || !keySecret) {
  throw new Error(
    'Missing Razorpay credentials. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env'
  )
}

/**
 * Singleton Razorpay client instance configured with Test Mode keys.
 */
export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
})

export const RAZORPAY_PUBLIC_KEY_ID = keyId
export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || ''

/**
 * Verify Razorpay Checkout payment signature using timing-safe HMAC-SHA256 comparison.
 * Signature payload format: `${razorpay_order_id}|${razorpay_payment_id}`
 */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false
  }

  const expectedPayload = `${razorpayOrderId}|${razorpayPaymentId}`
  const expectedSignature = crypto
    .createHmac('sha256', keySecret!)
    .update(expectedPayload)
    .digest('hex')

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  const actualBuffer = Buffer.from(razorpaySignature, 'utf8')

  if (expectedBuffer.length !== actualBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}

/**
 * Verify Razorpay Webhook signature using timing-safe HMAC-SHA256 comparison.
 * Compares header x-razorpay-signature against HMAC-SHA256(rawBody, secret).
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  webhookSecret: string = RAZORPAY_WEBHOOK_SECRET
): boolean {
  if (!rawBody || !signature || !webhookSecret) {
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex')

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  const actualBuffer = Buffer.from(signature, 'utf8')

  if (expectedBuffer.length !== actualBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}
