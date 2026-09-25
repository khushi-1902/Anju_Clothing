/**
 * Seeds the products that power the home page "New Arrivals" section.
 *
 * - Reads the Shopify export (data/products_export_1.csv)
 * - Takes the first SEED_LIMIT products (Shopify lists the newest first)
 * - Upserts them by handle, so it is safe to run more than once
 * - Marks them isNewArrival = true (every other product is un-flagged)
 *
 * Usage:
 *   npm run seed:dry             -> parse and print a summary, no database writes
 *   npm run seed:new-arrivals    -> write to Postgres
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
  variants: SeedVariant[]
  images: SeedImage[]
}

const CSV_PATH = process.env.CSV_PATH ?? path.join(__dirname, '..', 'data', 'products_export_1.csv')
const LIMIT = Number(process.env.SEED_LIMIT ?? 12)
const DRY_RUN = process.argv.includes('--dry-run')

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
      color,
      price,
      compareAtPrice: compare !== null && compare > price ? compare : null,
      stock: toInt(r['Variant Inventory Qty']) ?? 0,
      imageUrl: text(r['Variant Image']),
    })
  }
  if (variants.length === 0) return null

  // Product-level price = cheapest variant (and its compare-at price)
  const cheapest = variants.reduce((a, b) => (b.price < a.price ? b : a))

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
    work: null, // not a column in the export; it only appears inside the description HTML
    category: categoryFrom(first['Product Category']),
    price: cheapest.price,
    comparePrice: cheapest.compareAtPrice,
    variants,
    images,
  }
}

function loadProducts(): SeedProduct[] {
  const rows: Row[] = parse(fs.readFileSync(CSV_PATH), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
  })

  // Group rows by handle, keeping the CSV order (newest first)
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
    if (products.length >= LIMIT) break
  }
  return products
}

async function main() {
  const products = loadProducts()
  console.log(`Parsed ${products.length} products from ${path.basename(CSV_PATH)}`)

  for (const p of products) {
    const off = p.comparePrice ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0
    console.log(`- ${p.name} | Rs ${p.price}${p.comparePrice ? ` (was ${p.comparePrice}, -${off}%)` : ''} | ${p.variants.length} variants | ${p.images.length} images`)
  }

  if (DRY_RUN) {
    console.log('\nDry run: nothing was written to the database.')
    return
  }

  // Imported here so a dry run works without a database connection
  const { pool } = await import('./db')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('UPDATE products SET "isNewArrival" = false')

    for (const [i, p] of products.entries()) {
      // Row 1 of the CSV = newest, so give it the latest createdAt
      const createdAt = new Date(Date.now() - i * 60_000).toISOString()

      const { rows } = await client.query(
        `INSERT INTO products
           (handle, name, "descriptionHtml", fabric, work, category, price, "comparePrice", "isNewArrival", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
         ON CONFLICT (handle) DO UPDATE SET
           name = EXCLUDED.name,
           "descriptionHtml" = EXCLUDED."descriptionHtml",
           fabric = EXCLUDED.fabric,
           work = EXCLUDED.work,
           category = EXCLUDED.category,
           price = EXCLUDED.price,
           "comparePrice" = EXCLUDED."comparePrice",
           "isNewArrival" = true,
           "createdAt" = EXCLUDED."createdAt"
         RETURNING id`,
        [p.handle, p.name, p.descriptionHtml, p.fabric, p.work, p.category, p.price, p.comparePrice, createdAt],
      )
      const productId: number = rows[0].id

      await client.query('DELETE FROM product_images WHERE "productId" = $1', [productId])
      await client.query('DELETE FROM product_variants WHERE "productId" = $1', [productId])

      for (const img of p.images) {
        await client.query(
          'INSERT INTO product_images (url, position, alt, "productId") VALUES ($1, $2, $3, $4)',
          [img.url, img.position, img.alt, productId],
        )
      }
      for (const v of p.variants) {
        await client.query(
          `INSERT INTO product_variants (sku, size, color, price, "compareAtPrice", stock, "imageUrl", "productId")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [v.sku, v.size, v.color, v.price, v.compareAtPrice, v.stock, v.imageUrl, productId],
        )
      }
    }

    await client.query('COMMIT')
    console.log(`\nSeeded ${products.length} products and flagged them as new arrivals.`)
  } catch (err) {
    await client.query('ROLLBACK')
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
