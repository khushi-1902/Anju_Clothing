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

    // 2. Safe schema extensions for creators favourite collection & video URLs
    await pool.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS "isCreatorsFavourite" BOOLEAN DEFAULT false;
    `)

    // 3. Ensure authentic influencer / creator products are flagged (strictly 14 products)
    const influencerHandles = [
      'summer-special-farshi-set',
      'viral-real-mirror-bustier-set',
      'noor-set',
      'cosmos-gold-with-embroidery-work-gown',
      'viral-sunflower-farshi-set',
      'aafreen-luxe-chinon-gown-set',
      'viral-evil-eye-farshi-set',
      'viral-fendi-silk-anarkali-set',
      'viral-fish-cut-fully-stitched-lehenga',
      'faux-georgette-sharara-set',
      'premium-chinon-silk-thread-sequence-anarkali-set-with-tabby-organza-dupatta',
      'tibby-organza-silk-brush-print-set',
      'pure-cotton-bandhej-print-short-kurti',
      'premium-fendy-silk-3-piece-suit-set-with-mirror-work',
    ]

    await pool.query(`UPDATE products SET "isCreatorsFavourite" = false`)
    await pool.query(
      `UPDATE products SET "isCreatorsFavourite" = true, status = 'active' WHERE handle = ANY($1)`,
      [influencerHandles]
    )
    console.log('✅ Exactly 14 influencer products synchronized in products table.')

    // 4. Default settings seed
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

    console.log('✅ store_settings and product video schema initialized & seeded.')
  } catch (err) {
    console.error('Error initializing store_settings table:', err)
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('initSettingsTable.ts') || process.argv[1]?.endsWith('initSettingsTable.js')) {
  initSettingsTable().then(() => pool.end())
}
