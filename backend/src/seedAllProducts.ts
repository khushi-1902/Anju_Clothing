/**
 * Imports ALL products from the Shopify export (data/products_export_1.csv)
 * into PostgreSQL. Safe to re-run: products are matched on `handle`.
 *
 * What it does
 *  - Creates new products and updates existing ones (name, price, flags, createdAt, status)
 *  - Updates each product's variants IN PLACE (matched by size + colour), adds new ones, and removes
 *    variants no longer in the CSV. Variants that past orders refer to are never deleted (stock set to 0).
 *    Images are replaced with what is in the CSV.
 *  - Products with zero total stock are set to status = 'archived' (use --keep-sold-out to skip this)
 *  - Products in the database that are NOT in the CSV are set to status = 'archived' (never deleted)
 *  - Flags (New Arrivals / Bestsellers / Sale) are set automatically ONLY for newly created products:
 *    first 12 in-stock = New Arrivals, 5-16 = Bestsellers, discount >= 50% = Sale.
 *    Existing products keep whatever was chosen in the admin panel. Use --reset-flags to overwrite them.
 *
 * Usage:
 *   npm run seed:all -- --dry-run        parse and print a summary, no database access
 *   npm run seed:all                     import
 *
 * Flags:
 *   --dry-run                 no database writes
 *   --keep-sold-out           keep zero-stock products active
 *   --reset-flags             overwrite flags and createdAt on existing products
 *   --no-stock                do not overwrite the stock of EXISTING variants (use after launch,
 *                             when orders have been reducing stock)
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'csv-parse/sync'

type Row = Record<string, string>

interface SeedVariant {
  sku: string | null
  size: string | null
  color: string | null
  price: number
  compareAtPrice: number | null
  stock: number
  imageUrl: string | null
}

interface SeedImage {
  url: string
  position: number
  alt: string | null
}

interface SeedProduct {
  handle: string
  name: string
  descriptionHtml: string | null
  fabric: string | null
  work: string | null
  category: string | null
  price: number
  comparePrice: number | null
  totalStock: number
  variants: SeedVariant[]
  images: SeedImage[]
}

const CSV_PATH = process.env.CSV_PATH ?? path.join(__dirname, '..', 'data', 'products_export_1.csv')
const DRY_RUN = process.argv.includes('--dry-run')
const KEEP_SOLD_OUT = process.argv.includes('--keep-sold-out')
const NO_STOCK = process.argv.includes('--no-stock')
const RESET_FLAGS = process.argv.includes('--reset-flags')

const HIDDEN_COL = 'CODK Hide Product (product.metafields.seo.hidden)'
const FABRIC_COL = 'Fabric (product.metafields.shopify.fabric)'

const text = (v: string | undefined): string | null => {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}

/** "1699.00" -> 1699. Prices are stored as whole rupees. */
const toInt = (v: string | undefined): number | null => {
  const n = parseFloat((v ?? '').trim())
  return Number.isFinite(n) ? Math.round(n) : null
}

/** "Apparel > ... > Lehengas" -> "Lehengas" ("Uncategorized" -> null) */
const categoryFrom = (v: string | undefined): string | null => {
  const t = text(v)
  if (!t || t.toLowerCase() === 'uncategorized') return null
  return t.split('>').pop()!.trim()
}

function buildProduct(handle: string, rows: Row[]): SeedProduct | null {
  const first = rows[0]
  const name = text(first['Title'])
  if (!name) return null
  if ((first[HIDDEN_COL] ?? '').trim().toLowerCase() === 'true') return null

  // Shopify only guarantees option names on the product's first row
  const optionNames = [1, 2, 3].map(i => (first[`Option${i} Name`] ?? '').trim().toLowerCase())
  const defaultColor = text(first['Color (product.metafields.shopify.color-pattern)'])

  const variants: SeedVariant[] = []
  for (const r of rows) {
    const price = toInt(r['Variant Price'])
    if (price === null) continue // image-only rows have no price

    let size: string | null = null
    let color: string | null = null
    optionNames.forEach((optName, idx) => {
      const value = text(r[`Option${idx + 1} Value`])
      if (!value) return
      if (optName === 'size') size = value
      else if (optName === 'color' || optName === 'colour') color = value
    })

    const compare = toInt(r['Variant Compare At Price'])
    variants.push({
      sku: text(r['Variant SKU']),
      size,
      color: color || defaultColor || null,
      price,
      compareAtPrice: compare !== null && compare > price ? compare : null,
      stock: toInt(r['Variant Inventory Qty']) ?? 10,
      imageUrl: text(r['Variant Image']) || text(r['Image Src']) || null,
    })
  }
  if (variants.length === 0) return null

  // Product-level price = cheapest variant (and its compare-at price)
  const cheapest = variants.reduce((a, b) => (b.price < a.price ? b : a))
  const totalStock = variants.reduce((sum, v) => sum + Math.max(v.stock, 0), 0)

  const seen = new Set<string>()
  const images: SeedImage[] = []
  for (const r of rows) {
    const url = text(r['Image Src'])
    if (!url || seen.has(url)) continue
    seen.add(url)
    images.push({ url, position: toInt(r['Image Position']) ?? images.length + 1, alt: text(r['Image Alt Text']) })
  }
  images.sort((a, b) => a.position - b.position)

  return {
    handle,
    name,
    descriptionHtml: text(first['Body (HTML)']),
    fabric: text(first[FABRIC_COL]),
    work: null, // not a column in the export
    category: categoryFrom(first['Product Category']),
    price: cheapest.price,
    comparePrice: cheapest.compareAtPrice,
    totalStock,
    variants,
    images,
  }
}

function loadAllProducts(): SeedProduct[] {
  const rows: Row[] = parse(fs.readFileSync(CSV_PATH), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
  })

  // Group rows by handle, keeping CSV order (Shopify lists newest first)
  const byHandle = new Map<string, Row[]>()
  for (const r of rows) {
    const handle = (r['Handle'] ?? '').trim()
    if (!handle) continue
    const list = byHandle.get(handle)
    if (list) list.push(r)
    else byHandle.set(handle, [r])
  }

  const products: SeedProduct[] = []
  for (const [handle, group] of byHandle) {
    const p = buildProduct(handle, group)
    if (p) products.push(p)
  }
  return products
}

async function main() {
  const products = loadAllProducts()

  const active = KEEP_SOLD_OUT ? products : products.filter(p => p.totalStock > 0)
  const soldOut = KEEP_SOLD_OUT ? [] : products.filter(p => p.totalStock <= 0)

  console.log(`Parsed ${products.length} products from ${path.basename(CSV_PATH)}`)
  console.log(`  active (in stock): ${active.length}`)
  console.log(`  archived (zero stock): ${soldOut.length}`)
  for (const p of soldOut) console.log(`    - ${p.handle}`)

  if (DRY_RUN) {
    console.log('\nFirst 12 in-stock products (will be flagged New Arrivals):')
    active.slice(0, 12).forEach(p => console.log(`  - ${p.name}`))
    console.log('\nDry run: nothing was written to the database.')
    return
  }

  // Imported here so a dry run works without a database connection
  const { pool } = await import('./db')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const upsert = async (p: SeedProduct, i: number, isActive: boolean) => {
      // Earlier in the CSV = newer, so give it a later createdAt
      const createdAt = new Date(Date.now() - i * 60_000).toISOString()
      const isNewArrival = isActive && i < 12
      const isBestseller = isActive && i >= 4 && i < 16
      const off = p.comparePrice && p.comparePrice > p.price
        ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
        : 0
      const isSale = isActive && off >= 50
      const status = isActive ? 'active' : 'archived'
      // Existing products keep the flags and createdAt chosen in the admin panel,
      // unless the script is run with --reset-flags
      const flagUpdate = RESET_FLAGS
        ? `,
           "isNewArrival" = EXCLUDED."isNewArrival",
           "isBestseller" = EXCLUDED."isBestseller",
           "isSale" = EXCLUDED."isSale",
           "createdAt" = EXCLUDED."createdAt"`
        : ''

      const { rows } = await client.query(
        `INSERT INTO products
           (handle, name, "descriptionHtml", fabric, work, category, price, "comparePrice",
            "isNewArrival", "isBestseller", "isSale", status, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (handle) DO UPDATE SET
           name = EXCLUDED.name,
           "descriptionHtml" = EXCLUDED."descriptionHtml",
           fabric = EXCLUDED.fabric,
           work = EXCLUDED.work,
           category = EXCLUDED.category,
           price = EXCLUDED.price,
           "comparePrice" = EXCLUDED."comparePrice",
           status = EXCLUDED.status${flagUpdate}
         RETURNING id`,
        [p.handle, p.name, p.descriptionHtml, p.fabric, p.work, p.category, p.price, p.comparePrice,
          isNewArrival, isBestseller, isSale, status, createdAt],
      )
      const productId: number = rows[0].id

      await client.query('DELETE FROM product_images WHERE "productId" = $1', [productId])
      for (const img of p.images) {
        await client.query(
          'INSERT INTO product_images (url, position, alt, "productId") VALUES ($1, $2, $3, $4)',
          [img.url, img.position, img.alt, productId],
        )
      }

      // Variants are updated in place so order history keeps pointing at the same rows
      const keyOf = (size: string | null, color: string | null) =>
        `${(size ?? '').trim().toLowerCase()}|${(color ?? '').trim().toLowerCase()}`
      const { rows: existing } = await client.query(
        'SELECT id, size, color FROM product_variants WHERE "productId" = $1 ORDER BY id',
        [productId],
      )
      const available = new Map<string, number[]>()
      for (const e of existing) {
        const k = keyOf(e.size, e.color)
        const list = available.get(k)
        if (list) list.push(e.id)
        else available.set(k, [e.id])
      }

      for (const v of p.variants) {
        const id = available.get(keyOf(v.size, v.color))?.shift()
        if (id !== undefined) {
          await client.query(
            `UPDATE product_variants
                SET sku = $1, price = $2, "compareAtPrice" = $3, "imageUrl" = $4${NO_STOCK ? '' : ', stock = $6'}
              WHERE id = $5`,
            NO_STOCK
              ? [v.sku, v.price, v.compareAtPrice, v.imageUrl, id]
              : [v.sku, v.price, v.compareAtPrice, v.imageUrl, id, v.stock],
          )
        } else {
          await client.query(
            `INSERT INTO product_variants (sku, size, color, price, "compareAtPrice", stock, "imageUrl", "productId")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [v.sku, v.size, v.color, v.price, v.compareAtPrice, v.stock, v.imageUrl, productId],
          )
        }
      }

      // Variants that are no longer in the CSV: delete if no order uses them, otherwise sell out
      const leftover = [...available.values()].flat()
      if (leftover.length > 0) {
        await client.query(
          `DELETE FROM product_variants pv
            WHERE pv.id = ANY($1::int[])
              AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi."productVariantId" = pv.id)`,
          [leftover],
        )
        await client.query('UPDATE product_variants SET stock = 0 WHERE id = ANY($1::int[])', [leftover])
      }
    }

    console.log(`\nImporting ${products.length} products...`)
    let done = 0
    for (const [i, p] of active.entries()) {
      await upsert(p, i, true)
      if (++done % 50 === 0) console.log(`Progress: ${done}/${products.length}`)
    }
    for (const [j, p] of soldOut.entries()) {
      await upsert(p, active.length + j, false)
      done++
    }
    console.log(`Progress: ${done}/${products.length}`)

    // Anything in the database that is no longer in the CSV is archived, never deleted
    const handles = products.map(p => p.handle)
    const archived = await client.query(
      `UPDATE products
          SET status = 'archived', "isNewArrival" = false, "isBestseller" = false, "isSale" = false
        WHERE handle <> ALL($1::text[]) AND status IS DISTINCT FROM 'archived'`,
      [handles],
    )
    console.log(`Archived ${archived.rowCount ?? 0} products that are not in the CSV.`)

    await client.query('COMMIT')
    console.log(`\nDone. ${active.length} active, ${soldOut.length} archived (zero stock).`)
  } catch (err) {
    await client.query('ROLLBACK').catch(() => { })
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})