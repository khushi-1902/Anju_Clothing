import { Router, Request, Response } from 'express'
import { pool } from '../../db'

export const adminSettingsRouter = Router()

/**
 * GET /api/admin/settings
 * Returns all store settings as structured object and raw key-value list.
 */
adminSettingsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT key, value, description, updated_at AS "updatedAt" FROM store_settings ORDER BY key ASC`
    )

    const settingsMap: Record<string, string> = {}
    for (const r of rows) {
      settingsMap[r.key] = r.value
    }

    const parseNum = (val: string | undefined, fallback: number) => {
      if (val === undefined || val === null || val === '') return fallback
      const n = Number(val)
      return isNaN(n) ? fallback : n
    }

    res.json({
      settings: rows,
      formatted: {
        defaultCourier: settingsMap['shipping_default_courier'] || 'Blue Dart Express',
        flatFee: parseNum(settingsMap['shipping_flat_fee'], 0),
        freeThreshold: parseNum(settingsMap['shipping_free_threshold'], 0),
        estimatedDelivery: settingsMap['shipping_estimated_delivery'] || '3–5 Business Days',
        codAdvanceAmount: parseNum(settingsMap['shipping_cod_advance_amount'], 200),
        supportPhone: settingsMap['store_support_phone'] || '+91 9625923308',
        supportEmail: settingsMap['store_support_email'] || 'orders@anjuclothing.com',
        announcementText: settingsMap['store_announcement_text'] || '✦ FREE Shipping on All Online Orders • ₹200 Extra for COD ✦',
      },
    })
  } catch (err: any) {
    console.error('Error fetching admin settings:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch settings' })
  }
})

/**
 * PUT /api/admin/settings
 * Updates multiple settings key-values in PostgreSQL transactionally.
 */
adminSettingsRouter.put('/', async (req: Request, res: Response) => {
  const {
    defaultCourier,
    flatFee,
    freeThreshold,
    estimatedDelivery,
    codAdvanceAmount,
    supportPhone,
    supportEmail,
    announcementText,
    customKeyValues,
  } = req.body

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const updates: { key: string; value: string }[] = []

    if (defaultCourier != null) updates.push({ key: 'shipping_default_courier', value: String(defaultCourier).trim() })
    if (flatFee != null && !isNaN(Number(flatFee))) updates.push({ key: 'shipping_flat_fee', value: String(Math.max(0, Number(flatFee))) })
    if (freeThreshold != null && !isNaN(Number(freeThreshold))) updates.push({ key: 'shipping_free_threshold', value: String(Math.max(0, Number(freeThreshold))) })
    if (estimatedDelivery != null) updates.push({ key: 'shipping_estimated_delivery', value: String(estimatedDelivery).trim() })
    if (codAdvanceAmount != null && !isNaN(Number(codAdvanceAmount))) updates.push({ key: 'shipping_cod_advance_amount', value: String(Math.max(0, Number(codAdvanceAmount))) })
    if (supportPhone != null) updates.push({ key: 'store_support_phone', value: String(supportPhone).trim() })
    if (supportEmail != null) updates.push({ key: 'store_support_email', value: String(supportEmail).trim() })
    if (announcementText != null) updates.push({ key: 'store_announcement_text', value: String(announcementText).trim() })

    // If custom key-values array passed
    if (Array.isArray(customKeyValues)) {
      for (const item of customKeyValues) {
        if (item.key && item.value != null) {
          updates.push({ key: String(item.key).trim(), value: String(item.value).trim() })
        }
      }
    }

    for (const u of updates) {
      await client.query(
        `INSERT INTO store_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [u.key, u.value]
      )
    }

    await client.query('COMMIT')

    // Fetch updated settings
    const { rows } = await client.query(
      `SELECT key, value, description, updated_at AS "updatedAt" FROM store_settings ORDER BY key ASC`
    )

    const settingsMap: Record<string, string> = {}
    for (const r of rows) {
      settingsMap[r.key] = r.value
    }

    res.json({
      success: true,
      message: 'Store settings updated successfully',
      settings: rows,
      formatted: {
        defaultCourier: settingsMap['shipping_default_courier'],
        flatFee: Number(settingsMap['shipping_flat_fee']),
        freeThreshold: Number(settingsMap['shipping_free_threshold']),
        estimatedDelivery: settingsMap['shipping_estimated_delivery'],
        codAdvanceAmount: Number(settingsMap['shipping_cod_advance_amount']) || 200,
        supportPhone: settingsMap['store_support_phone'],
        supportEmail: settingsMap['store_support_email'],
        announcementText: settingsMap['store_announcement_text'],
      },
    })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error('Error updating admin settings:', err)
    res.status(500).json({ error: err.message || 'Failed to update settings' })
  } finally {
    client.release()
  }
})
