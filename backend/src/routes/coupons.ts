import { Router, Request, Response } from 'express'
import { pool } from '../db'

export const couponsRouter = Router()

export interface CouponRow {
  id: number
  code: string
  description: string
  discount_type: 'PERCENTAGE' | 'FLAT'
  discount_value: number
  min_order_amount: number
  max_discount_amount: number | null
  is_active: boolean
  expires_at: Date | null
  usage_count: number
}

/**
 * GET /api/coupons
 * Returns all active, non-expired coupons available for customers to view and apply.
 */
couponsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
         id, 
         code, 
         description, 
         discount_type AS "discountType", 
         discount_value AS "discountValue", 
         min_order_amount AS "minOrderAmount", 
         max_discount_amount AS "maxDiscountAmount",
         expires_at AS "expiresAt"
       FROM coupons
       WHERE is_active = true 
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY min_order_amount ASC, id ASC`
    )

    res.json({ coupons: rows })
  } catch (err: any) {
    console.error('[GET /api/coupons] Error fetching coupons:', err)
    res.status(500).json({ error: 'Failed to retrieve available coupons.' })
  }
})

/**
 * POST /api/coupons/validate
 * Validates a coupon code against an order subtotal.
 * Computes the exact discount amount and new subtotal.
 */
couponsRouter.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code, subtotal } = req.body

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ valid: false, error: 'Please enter a coupon code.' })
    }

    const cleanCode = code.trim().toUpperCase()
    const numericSubtotal = Number(subtotal) || 0

    if (numericSubtotal <= 0) {
      return res.status(400).json({
        valid: false,
        error: 'Add items to your cart before applying a coupon.',
      })
    }

    const { rows } = await pool.query(
      `SELECT 
         id, 
         code, 
         description, 
         discount_type AS "discountType", 
         discount_value AS "discountValue", 
         min_order_amount AS "minOrderAmount", 
         max_discount_amount AS "maxDiscountAmount",
         is_active AS "isActive",
         expires_at AS "expiresAt"
       FROM coupons
       WHERE UPPER(code) = $1
       LIMIT 1`,
      [cleanCode]
    )

    if (rows.length === 0) {
      return res.status(400).json({
        valid: false,
        error: `Coupon "${cleanCode}" is invalid. Please check the spelling.`,
      })
    }

    const coupon = rows[0]

    if (!coupon.isActive) {
      return res.status(400).json({
        valid: false,
        error: `Coupon "${cleanCode}" is no longer active.`,
      })
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({
        valid: false,
        error: `Coupon "${cleanCode}" has expired.`,
      })
    }

    const minSpend = Number(coupon.minOrderAmount || 0)
    if (numericSubtotal < minSpend) {
      const remaining = minSpend - numericSubtotal
      return res.status(400).json({
        valid: false,
        error: `Minimum order amount of ₹${minSpend.toLocaleString('en-IN')} required for "${cleanCode}". Add ₹${remaining.toLocaleString('en-IN')} more to qualify!`,
      })
    }

    // Calculate discount amount
    let discountAmount = 0
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((numericSubtotal * Number(coupon.discountValue)) / 100)
      if (coupon.maxDiscountAmount && discountAmount > Number(coupon.maxDiscountAmount)) {
        discountAmount = Number(coupon.maxDiscountAmount)
      }
    } else {
      // FLAT discount
      discountAmount = Math.min(Number(coupon.discountValue), numericSubtotal)
    }

    const newSubtotal = Math.max(0, numericSubtotal - discountAmount)

    return res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
      },
      discountAmount,
      newSubtotal,
      message: `Coupon "${coupon.code}" applied! You saved ₹${discountAmount.toLocaleString('en-IN')}.`,
    })
  } catch (err: any) {
    console.error('[POST /api/coupons/validate] Error validating coupon:', err)
    res.status(500).json({ valid: false, error: 'Internal error validating coupon.' })
  }
})
