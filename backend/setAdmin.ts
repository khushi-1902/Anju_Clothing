import { pool } from './src/db'
import { createClerkClient } from '@clerk/express'
import dotenv from 'dotenv'
dotenv.config()

async function setAdmin() {
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  try {
    const cols = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users'")
    console.log('Columns in users table:', cols.rows)

    console.log('Fetching users from Clerk...')
    const clerkUsers = await clerkClient.users.getUserList({ limit: 50 })
    console.log(`Found ${clerkUsers.data.length} users in Clerk`)

    for (const u of clerkUsers.data) {
      const primaryEmailId = u.primaryEmailAddressId
      const emailObj = u.emailAddresses?.find((e: any) => e.id === primaryEmailId)
      const email = (emailObj?.emailAddress ?? u.emailAddresses?.[0]?.emailAddress ?? '').toLowerCase().trim()
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || null

      console.log(`Syncing Clerk user: ${u.id} (${email}) as ADMIN...`)
      const res = await pool.query(
        `INSERT INTO users ("clerkUserId", email, name, role, "updatedAt")
         VALUES ($1, $2, $3, 'ADMIN', NOW())
         ON CONFLICT ("clerkUserId")
         DO UPDATE SET 
           email = EXCLUDED.email,
           name = COALESCE(EXCLUDED.name, users.name),
           role = 'ADMIN',
           "updatedAt" = NOW()
         RETURNING id, "clerkUserId", email, name, role`,
        [u.id, email || `user-${u.id.slice(0, 8)}@store.local`, name]
      )
      console.log('✅ Synced to DB:', res.rows[0])
    }
  } catch (err) {
    console.error('Error syncing admin users:', err)
  } finally {
    await pool.end()
  }
}

setAdmin()


