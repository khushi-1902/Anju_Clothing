import { Router, Request, Response } from 'express'
import { pool } from '../db'

export const publicSettingsRouter = Router()

/**
 * GET /api/settings/shipping
 * Public endpoint for storefront cart, checkout calculations, and banner.
 */
publicSettingsRouter.get('/shipping', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`SELECT key, value FROM store_settings`)
    const settingsMap: Record<string, string> = {}
    for (const r of rows) {
      settingsMap[r.key] = r.value
    }

    const parseNum = (val: string | undefined, fallback: number) => {
      if (val === undefined || val === null || val === '') return fallback
      const n = Number(val)
      return isNaN(n) ? fallback : n
    }

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.json({
      flatFee: parseNum(settingsMap['shipping_flat_fee'], 0),
      freeThreshold: parseNum(settingsMap['shipping_free_threshold'], 0),
      defaultCourier: settingsMap['shipping_default_courier'] || 'Blue Dart Express',
      estimatedDelivery: settingsMap['shipping_estimated_delivery'] || '3–5 Business Days',
      codAdvanceAmount: parseNum(settingsMap['shipping_cod_advance_amount'], 200),
      announcementText: settingsMap['store_announcement_text'] || '✦ FREE Shipping on All Online Orders • ₹200 Extra for COD ✦',
      supportPhone: settingsMap['store_support_phone'] || '+91 9625923308',
      supportEmail: settingsMap['store_support_email'] || 'orders@anjuclothing.com',
    })
  } catch (err: any) {
    console.error('Error fetching public shipping settings:', err)
    res.json({
      flatFee: 0,
      freeThreshold: 0,
      defaultCourier: 'Blue Dart Express',
      estimatedDelivery: '3–5 Business Days',
      codAdvanceAmount: 200,
      announcementText: '✦ FREE Shipping on All Online Orders • ₹200 Extra for COD ✦',
      supportPhone: '+91 9625923308',
      supportEmail: 'orders@anjuclothing.com',
    })
  }
})
