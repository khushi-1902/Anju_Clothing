import 'dotenv/config'
import { pool } from './db'

/**
 * EXACT 14 products requested for the Influencer / Creators' Favourite Collection.
 * All other products are excluded.
 */
export const INFLUENCER_PRODUCT_HANDLES = [
  'summer-special-farshi-set', // 1. Instagram Most Viral Farshi Set
  'viral-real-mirror-bustier-set', // 2. Viral Real Mirror Bustier Set
  'noor-set', // 3. Noor Set
  'cosmos-gold-with-embroidery-work-gown', // 4. Cosmos Gold With Embroidery Work Gown
  'viral-sunflower-farshi-set', // 5. Viral Sunflower Farshi Set
  'aafreen-luxe-chinon-gown-set', // 6. Viral Pakistani Anarkali Set
  'viral-evil-eye-farshi-set', // 7. Viral Evil Eye Farshi Set
  'viral-fendi-silk-anarkali-set', // 8. Viral Fendi Silk Anarkali Set
  'viral-fish-cut-fully-stitched-lehenga', // 9. Viral Fish Cut Fully Stitched Lehenga
  'faux-georgette-sharara-set', // 10. Faux Georgette Sharara Set
  'premium-chinon-silk-thread-sequence-anarkali-set-with-tabby-organza-dupatta', // 11. Premium Chinon Silk Thread & Sequence Anarkali
  'tibby-organza-silk-brush-print-set', // 12. Tibby Organza Silk Brush Print Set
  'pure-cotton-bandhej-print-short-kurti', // 13. Pure Cotton Bandhej Print Short Kurti
  'premium-fendy-silk-3-piece-suit-set-with-mirror-work', // 14. Festival Special Sharara Set
]

export async function markCreatorsFavourites() {
  console.log('--- Setting Exactly the 14 Influencer Products in Database ---')

  // 1. Reset ALL products isCreatorsFavourite to false
  await pool.query(`UPDATE products SET "isCreatorsFavourite" = false`)

  // 2. Mark ONLY these 14 products as isCreatorsFavourite = true and status = 'active'
  const result = await pool.query(
    `UPDATE products
     SET "isCreatorsFavourite" = true,
         status = 'active'
     WHERE handle = ANY($1)
     RETURNING id, handle, name, status, "isCreatorsFavourite"`,
    [INFLUENCER_PRODUCT_HANDLES]
  )

  console.log(`Successfully marked exactly ${result.rows.length} of ${INFLUENCER_PRODUCT_HANDLES.length} influencer products:`)
  result.rows.forEach((r, idx) => {
    console.log(` ${idx + 1}. [ID: ${r.id}] ${r.name} (${r.handle})`)
  })

  // 3. Verify the creators-favourite query
  const check = await pool.query(`
    SELECT p.id, p.handle, p.name, p."isCreatorsFavourite", p.status,
           (SELECT i.url FROM product_images i WHERE i."productId" = p.id ORDER BY i.position ASC LIMIT 1) as cover_photo
    FROM products p
    WHERE p."isCreatorsFavourite" = true AND (p.status IS NULL OR p.status = 'active')
    ORDER BY p.id ASC
  `)

  console.log(`\nVerified query returned ${check.rows.length} products:`)
  check.rows.forEach((c, i) => {
    console.log(` ${i + 1}. ${c.name} | Handle: ${c.handle} | Photo: ${c.cover_photo?.substring(0, 60)}`)
  })

  return check.rows
}

if (process.argv[1]?.endsWith('markCreatorsFavourites.ts') || process.argv[1]?.endsWith('markCreatorsFavourites.js')) {
  markCreatorsFavourites().then(() => pool.end()).catch((err) => {
    console.error('Error marking creators favourites:', err)
    process.exit(1)
  })
}
