import { pool } from './src/db'

async function run() {
  try {
    const [u, o, p, rev] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM users'),
      pool.query('SELECT COUNT(*)::int AS count FROM orders'),
      pool.query('SELECT COUNT(*)::int AS count FROM products'),
      pool.query('SELECT COALESCE(SUM("totalAmount"), 0)::int AS rev FROM orders'),
    ])

    console.log('PostgreSQL Store Stats:', {
      users: u.rows[0].count,
      orders: o.rows[0].count,
      products: p.rows[0].count,
      totalRevenue: rev.rows[0].rev,
    })

    // Check users
    const users = await pool.query('SELECT id, "clerkUserId", email, name, role FROM users')
    console.log('Current Registered Users:', users.rows)
  } catch (err) {
    console.error('Error testing stats:', err)
  } finally {
    await pool.end()
  }
}

run()
