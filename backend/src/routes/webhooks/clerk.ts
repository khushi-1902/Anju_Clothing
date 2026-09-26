import { Router, Request, Response } from 'express'
import express from 'express'
import { Webhook } from 'svix'
import { pool } from '../../db'

export const clerkWebhookRouter = Router()

/**
 * POST /api/webhooks/clerk
 * Listens for Clerk webhooks (user.created, user.updated, user.deleted)
 * and synchronizes user profiles to PostgreSQL.
 */
clerkWebhookRouter.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!SIGNING_SECRET) {
      console.warn('[Clerk Webhook] Warning: CLERK_WEBHOOK_SECRET is not set in backend/.env')
      return res.status(500).json({ error: 'Webhook secret is not configured' })
    }

    // Extract Svix verification headers
    const svix_id = req.headers['svix-id'] as string
    const svix_timestamp = req.headers['svix-timestamp'] as string
    const svix_signature = req.headers['svix-signature'] as string

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: 'Missing required Svix headers' })
    }

    const wh = new Webhook(SIGNING_SECRET)
    let evt: any

    try {
      const payloadString = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body)

      evt = wh.verify(payloadString, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      })
    } catch (err) {
      console.error('[Clerk Webhook] Signature verification failed:', err)
      return res.status(400).json({ error: 'Invalid webhook signature' })
    }

    const eventType: string = evt.type
    const data = evt.data

    try {
      if (eventType === 'user.created' || eventType === 'user.updated') {
        const clerkUserId: string = data.id
        const primaryEmailId = data.primary_email_address_id
        const emailObj = data.email_addresses?.find((e: any) => e.id === primaryEmailId)
        const email: string =
          emailObj?.email_address ?? data.email_addresses?.[0]?.email_address ?? ''

        const firstName = data.first_name || ''
        const lastName = data.last_name || ''
        const name = `${firstName} ${lastName}`.trim() || null

        // Upsert user into PostgreSQL (default role: CUSTOMER)
        await pool.query(
          `INSERT INTO users (clerk_user_id, email, name, role, updated_at)
           VALUES ($1, $2, $3, 'CUSTOMER', NOW())
           ON CONFLICT (clerk_user_id) 
           DO UPDATE SET 
             email = EXCLUDED.email,
             name = COALESCE(EXCLUDED.name, users.name),
             updated_at = NOW()`,
          [clerkUserId, email, name]
        )

        console.log(`[Clerk Webhook] Successfully synced user: ${clerkUserId} (${email})`)
      } else if (eventType === 'user.deleted') {
        const clerkUserId: string = data.id
        if (clerkUserId) {
          await pool.query(`DELETE FROM users WHERE clerk_user_id = $1`, [clerkUserId])
          console.log(`[Clerk Webhook] Deleted user: ${clerkUserId}`)
        }
      }

      return res.status(200).json({ success: true })
    } catch (dbErr) {
      console.error('[Clerk Webhook DB Error]:', dbErr)
      return res.status(500).json({ error: 'Database synchronization failed' })
    }
  }
)
