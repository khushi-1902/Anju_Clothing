import 'dotenv/config'
import path from 'path'
import dotenv from 'dotenv'

// Load backend .env if running from root
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') })
dotenv.config({ path: path.resolve(__dirname, './backend/.env') })

import { pool } from '../backend/src/db'

// Optional PrismaClient integration if generated in project
let prisma: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client')
  prisma = new PrismaClient()
} catch {
  // Handled gracefully via PostgreSQL pool fallback below
}

/**
 * scripts/clearTestOrders.ts
 * 
 * Safely deletes test orders before a specified cutoff date.
 * 
 * Safety Rules:
 * 1. Requires explicit cutoff date: --cutoff="YYYY-MM-DD" or --cutoff="YYYY-MM-DDTHH:mm:ssZ"
 * 2. Requires --confirm flag; without it, only performs a dry-run count.
 * 3. Never deletes orders created after the cutoff date.
 * 
 * Usage Examples:
 *   # Dry-run preview:
 *   npx tsx scripts/clearTestOrders.ts --cutoff="2026-10-01"
 * 
 *   # Actual deletion:
 *   npx tsx scripts/clearTestOrders.ts --cutoff="2026-10-01" --confirm
 */

function parseArgs() {
  const args = process.argv.slice(2)
  let cutoffString: string | null = null
  let confirm = false

  for (const arg of args) {
    if (arg === '--confirm') {
      confirm = true
    } else if (arg.startsWith('--cutoff=')) {
      cutoffString = arg.replace('--cutoff=', '').trim()
    } else if (arg === '-c' || arg === '--cutoff') {
      const nextIdx = args.indexOf(arg) + 1
      if (nextIdx < args.length) cutoffString = args[nextIdx]
    }
  }

  return { cutoffString, confirm }
}

async function main() {
  const { cutoffString, confirm } = parseArgs()

  console.log('\n======================================================')
  console.log('   ANJU CLOTHING - SAFE TEST ORDER CLEANUP UTILITY    ')
  console.log('======================================================\n')

  if (!cutoffString) {
    console.error('❌ Error: Missing cutoff date argument.')
    console.error('\nPlease specify a cutoff date using:')
    console.error('  --cutoff="YYYY-MM-DD"  (or ISO-8601 string)\n')
    console.error('Example dry-run:')
    console.error('  npx tsx scripts/clearTestOrders.ts --cutoff="2026-10-01"\n')
    console.error('Example confirmed execution:')
    console.error('  npx tsx scripts/clearTestOrders.ts --cutoff="2026-10-01" --confirm\n')
    process.exit(1)
  }

  const cutoffDate = new Date(cutoffString)
  if (isNaN(cutoffDate.getTime())) {
    console.error(`❌ Error: Invalid date string "${cutoffString}". Please use YYYY-MM-DD format.`)
    process.exit(1)
  }

  try {
    // 1. Inspect matching orders count before cutoff
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM orders WHERE "createdAt" < $1`,
      [cutoffDate]
    )
    const matchingCount = countRes.rows[0]?.count ?? 0

    console.log(`Cutoff Date : ${cutoffDate.toISOString()} (Asia/Kolkata: ${cutoffDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`)
    console.log(`Orders found: ${matchingCount} order(s) placed before cutoff\n`)

    if (matchingCount === 0) {
      console.log('ℹ️  No orders found before this cutoff date. Nothing to delete.')
      return
    }

    // 2. Safety check: require --confirm flag
    if (!confirm) {
      console.log('------------------------------------------------------')
      console.log('⚠️  DRY RUN MODE: No orders were deleted.')
      console.log(`   Found ${matchingCount} test order(s) eligible for deletion.`)
      console.log('   To permanently delete these orders, re-run with --confirm:')
      console.log(`   npx tsx scripts/clearTestOrders.ts --cutoff="${cutoffString}" --confirm`)
      console.log('------------------------------------------------------\n')
      return
    }

    // 3. Perform Deletion
    console.log(`⚠️  Confirmed flag detected. Proceeding to delete ${matchingCount} order(s)...`)

    let deletedCount = 0

    if (prisma?.orders?.deleteMany) {
      const deleteResult = await prisma.orders.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      })
      deletedCount = deleteResult.count
    } else {
      const deleteRes = await pool.query(
        `DELETE FROM orders WHERE "createdAt" < $1 RETURNING id`,
        [cutoffDate]
      )
      deletedCount = deleteRes.rowCount ?? matchingCount
    }

    console.log(`\n✅ SUCCESS: Successfully deleted ${deletedCount} test order(s) before ${cutoffDate.toISOString()}.`)
    console.log('   (Associated order_items were automatically cascade-deleted by foreign key constraint.)\n')
  } catch (err) {
    console.error('❌ Error executing order cleanup:', err)
    process.exit(1)
  } finally {
    if (prisma?.$disconnect) {
      await prisma.$disconnect()
    }
    await pool.end()
  }
}

main()
