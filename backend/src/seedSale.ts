/**
 * Seeds the products that power the "Mega Sale Collection" section.
 *
 * - Reads the Shopify export (data/products_export_1.csv)
 * - Selects top discounted products for the Mega Sale collection
 * - Upserts them by handle
 * - Marks them isSale = true
 * - Ensures index on (isSale, createdAt DESC) for query optimization
 *
 * Usage:
 *   npm run seed:sale
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
  discountPercent: number
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

  const optionNames = [1, 2, 3].map(i => (first[`Option${i} Name`] ?? '').trim().toLowerCase())

  const variants: SeedVariant[] = []
  for (const r of rows) {
    const price = toInt(r['Variant Price'])
    if (price === null) continue

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
      stock: toInt(r['Variant Inventory Qty']) ?? 10,
      imageUrl: text(r['Variant Image']),
    })
  }
  if (variants.length === 0) return null

  const cheapest = variants.reduce((a, b) => (b.price < a.price ? b : a))
  const comparePrice = cheapest.compareAtPrice
  const discountPercent =
    comparePrice && comparePrice > cheapest.price
      ? Math.round(((comparePrice - cheapest.price) / comparePrice) * 100)
      : 0

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
    work: null,
    category: categoryFrom(first['Product Category']),
    price: cheapest.price,
    comparePrice,
    discountPercent,
    variants,
    images,
  }
}

function loadSaleProducts(): SeedProduct[] {
  const rows: Row[] = parse(fs.readFileSync(CSV_PATH), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
  })

  const byHandle = new Map<string, Row[]>()
  for (const r of rows) {
    const handle = (r['Handle'] ?? '').trim()
    if (!handle) continue
    const list = byHandle.get(handle)
    if (list) list.push(r)
    else byHandle.set(handle, [r])
  }

  const allProducts: SeedProduct[] = []
  for (const [handle, group] of byHandle) {
    const p = buildProduct(handle, group)
    if (p && p.discountPercent >= 40) {
      allProducts.push(p)
    }
  }

  // Sort by highest discount first for Mega Sale
  allProducts.sort((a, b) => b.discountPercent - a.discountPercent)
  return allProducts.slice(0, LIMIT)
}

async function main() {
  const products = loadSaleProducts()
  console.log(`Parsed ${products.length} mega sale products from ${path.basename(CSV_PATH)}`)

  for (const p of products) {
    console.log(`- ${p.name} | Rs ${p.price} (was ${p.comparePrice}, -${p.discountPercent}%) | ${p.variants.length} variants | ${p.images.length} images`)
  }

  if (DRY_RUN) {
    console.log('\nDry run: nothing was written to the database.')
    return
  }

  const { pool } = await import('./db')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Ensure composite index exists for optimal query performance
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_products_sale_created ON products ("isSale", "createdAt" DESC)'
    )

    // Reset previous sale flags
    await client.query('UPDATE products SET "isSale" = false')

    for (const [i, p] of products.entries()) {
      const createdAt = new Date(Date.now() - i * 60_000).toISOString()

      const { rows } = await client.query(
        `INSERT INTO products
           (handle, name, "descriptionHtml", fabric, work, category, price, "comparePrice", "isSale", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
         ON CONFLICT (handle) DO UPDATE SET
           name = EXCLUDED.name,
           "descriptionHtml" = EXCLUDED."descriptionHtml",
           fabric = EXCLUDED.fabric,
           work = EXCLUDED.work,
           category = EXCLUDED.category,
           price = EXCLUDED.price,
           "comparePrice" = EXCLUDED."comparePrice",
           "isSale" = true
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
    console.log(`\nSuccessfully seeded ${products.length} products and flagged them as mega sale.`)
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
