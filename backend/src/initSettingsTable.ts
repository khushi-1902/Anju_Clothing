import { pool } from './db'

export async function initSettingsTable() {
  try {
    // 1. Create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)

    // 2. Default settings seed
    const defaultSettings = [
      { key: 'shipping_default_courier', value: 'Blue Dart Express', description: 'Default courier carrier for customer dispatches' },
      { key: 'shipping_flat_fee', value: '0', description: 'Standard flat shipping fee in INR (0 = Free Shipping)' },
      { key: 'shipping_free_threshold', value: '0', description: 'Minimum order cart amount in INR for free delivery' },
      { key: 'shipping_estimated_delivery', value: '3–5 Business Days', description: 'Estimated delivery timeline shown at checkout' },
      { key: 'shipping_cod_advance_amount', value: '200', description: 'Extra online booking fee for COD orders in INR' },
      { key: 'store_support_phone', value: '+91 9625923308', description: 'Customer support hotline' },
      { key: 'store_support_email', value: 'orders@anjuclothing.com', description: 'Customer support email address' },
      { key: 'store_announcement_text', value: '✦ FREE Shipping on All Online Orders • ₹200 Extra for COD ✦', description: 'Top announcement bar promo banner' },
    ]

    for (const s of defaultSettings) {
      await pool.query(
        `INSERT INTO store_settings (key, value, description, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO NOTHING`,
        [s.key, s.value, s.description]
      )
    }

    console.log('✅ store_settings table initialized & seeded.')
  } catch (err) {
    console.error('Error initializing store_settings table:', err)
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('initSettingsTable.ts') || process.argv[1]?.endsWith('initSettingsTable.js')) {
  initSettingsTable().then(() => pool.end())
}
