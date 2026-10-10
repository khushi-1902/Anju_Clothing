import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { getAuth } from '@clerk/express'
import { pool } from './db'
import { clerkAuth, requireLogin, requireAdmin } from './middleware/auth'
import { clerkWebhookRouter } from './routes/webhooks/clerk'
import { razorpayWebhookRouter } from './routes/webhooks/razorpay'
import { adminRouter } from './routes/admin'
import { publicSettingsRouter } from './routes/settings'
import { paymentsRouter } from './routes/payments'
import { couponsRouter } from './routes/coupons'
import { initSettingsTable } from './initSettingsTable'
import { COD_SHIPPING_FEE } from './config/pricing'
import { notifyNewOrder, notifyCustomerOrderConfirmation } from './lib/orderNotifier'

// Initialize settings table in PostgreSQL on boot
initSettingsTable().catch((err) => console.error('Settings init error:', err))

const app = express()
const PORT = Number(process.env.PORT ?? 4000)

app.use(compression())
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' }))

// 1. Webhooks MUST be mounted before global express.json() for raw buffer cryptographic verification
app.use('/api/webhooks/clerk', clerkWebhookRouter)
app.use('/api/webhooks/razorpay', razorpayWebhookRouter)

// 2. Standard JSON body parsing & Clerk session middleware
app.use(express.json())
app.use(clerkAuth)

// 3. Public Store Settings (Shipping, Courier, Announcement)
app.use('/api/settings', publicSettingsRouter)

// 4. Admin Protected Routes Group
app.use('/api/admin', requireLogin, requireAdmin, adminRouter)

// 5. Razorpay Payments Route Group
app.use('/api/payments', paymentsRouter)

// 6. Public Coupons Route Group
app.use('/api/coupons', couponsRouter)

// 4. Authenticated User Profile & Role Check (for Frontend Route Guards)
app.get('/api/auth/me', requireLogin, async (req, res) => {
  try {
    const auth = getAuth(req)
    const clerkUserId = auth?.userId
    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const adminEmails = (process.env.ADMIN_EMAILS || 'khushipatil9128@gmail.com,ajit14mahajan@gmail.com,khushipatil1914@gmail.com')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    let { rows } = await pool.query(
      `SELECT id, "clerkUserId", email, name, role 
       FROM users 
       WHERE "clerkUserId" = $1 
       LIMIT 1`,
      [clerkUserId]
    )

    let user = rows[0]

    if (!user || user.role !== 'ADMIN' || !user.email) {
      try {
        const { createClerkClient } = await import('@clerk/express')
        const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
        const cu = await clerkClient.users.getUser(clerkUserId)
        const primaryEmailId = cu.primaryEmailAddressId
        const emailObj = cu.emailAddresses?.find((e: any) => e.id === primaryEmailId)
        const email = (emailObj?.emailAddress ?? cu.emailAddresses?.[0]?.emailAddress ?? '').toLowerCase().trim()
        const name = `${cu.firstName || ''} ${cu.lastName || ''}`.trim() || null

        const shouldBeAdmin = adminEmails.includes(email) || user?.role === 'ADMIN'
        const role = shouldBeAdmin ? 'ADMIN' : (user?.role || 'CUSTOMER')

        const upsertRes = await pool.query(
          `INSERT INTO users ("clerkUserId", email, name, role, "updatedAt")
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT ("clerkUserId") 
           DO UPDATE SET 
             email = EXCLUDED.email, 
             name = COALESCE(EXCLUDED.name, users.name),
             role = CASE WHEN users.role = 'ADMIN' OR $4 = 'ADMIN' THEN 'ADMIN' ELSE users.role END,
             "updatedAt" = NOW()
           RETURNING id, "clerkUserId", email, name, role`,
          [clerkUserId, email || `user-${clerkUserId.slice(0, 8)}@store.local`, name, role]
        )
        user = upsertRes.rows[0]
      } catch (clerkErr) {
        console.warn('Could not query Clerk in /api/auth/me:', clerkErr)
      }
    }

    const isAdmin = user?.role === 'ADMIN'

    res.json({
      user: user || { clerkUserId, role: 'CUSTOMER' },
      isAdmin,
    })
  } catch (err) {
    console.error('Error in /api/auth/me:', err)
    res.status(500).json({ error: 'Failed to retrieve auth profile' })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

/**
 * GET /api/products/new-arrivals?limit=8
 * Products flagged isNewArrival, newest first, with images and variants.
 * Must stay ABOVE /api/products/:handle, or "new-arrivals" is read as a handle.
 */
app.get('/api/products/new-arrivals', async (req, res) => {
  const requested = Number.parseInt(String(req.query.limit ?? '8'), 10)
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 24) : 8

  try {
    const { rows } = await pool.query(
      `SELECT
         p.id, p.handle, p.name, p.category, p.fabric, p.price, p."comparePrice",
         p."isNewArrival", p."isBestseller", p."isSale", p."videoUrl", p."isCreatorsFavourite", p."createdAt",
         COALESCE((
           SELECT json_agg(json_build_object('url', i.url, 'alt', i.alt) ORDER BY i.position)
           FROM product_images i WHERE i."productId" = p.id
         ), '[]'::json) AS images,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', v.id, 'size', v.size, 'color', v.color, 'price', v.price,
             'compareAtPrice', v."compareAtPrice", 'stock', v.stock, 'imageUrl', v."imageUrl"
           ) ORDER BY v.id)
           FROM product_variants v WHERE v."productId" = p.id
         ), '[]'::json) AS variants
       FROM products p
       WHERE p."isNewArrival" = true
       ORDER BY p."createdAt" DESC
       LIMIT $1`,
      [limit],
    )

    const products = rows.map(p => ({
      ...p,
      discountPercent:
        p.comparePrice && p.comparePrice > p.price
          ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
          : 0,
    }))

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.json({ products })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load new arrivals' })
  }
})

/**
 * GET /api/products/bestsellers?limit=8
 * Products flagged isBestseller, newest first, with images and variants.
 * Must stay ABOVE /api/products/:handle, or "bestsellers" is read as a handle.
 */
app.get('/api/products/bestsellers', async (req, res) => {
  const requested = Number.parseInt(String(req.query.limit ?? '48'), 10)
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 100) : 48

  try {
    const { rows } = await pool.query(
      `SELECT
         p.id, p.handle, p.name, p.category, p.fabric, p.price, p."comparePrice",
         p."isNewArrival", p."isBestseller", p."isSale", p."videoUrl", p."isCreatorsFavourite", p."createdAt",
         COALESCE((
           SELECT json_agg(json_build_object('url', i.url, 'alt', i.alt) ORDER BY i.position)
           FROM product_images i WHERE i."productId" = p.id
         ), '[]'::json) AS images,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', v.id, 'size', v.size, 'color', v.color, 'price', v.price,
             'compareAtPrice', v."compareAtPrice", 'stock', v.stock, 'imageUrl', v."imageUrl"
           ) ORDER BY v.id)
           FROM product_variants v WHERE v."productId" = p.id
         ), '[]'::json) AS variants
       FROM products p
       WHERE p."isBestseller" = true
       ORDER BY p."createdAt" DESC
       LIMIT $1`,
      [limit],
    )

    const products = rows.map(p => ({
      ...p,
      discountPercent:
        p.comparePrice && p.comparePrice > p.price
          ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
          : 0,
    }))

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.json({ products })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load bestsellers' })
  }
})

/**
 * GET /api/products/creators-favourite?limit=12
 * Products flagged isCreatorsFavourite or with videoUrl, falling back to top active items.
 * Must stay ABOVE /api/products/:handle.
 */
app.get('/api/products/creators-favourite', async (req, res) => {
  const requested = Number.parseInt(String(req.query.limit ?? '12'), 10)
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 48) : 12

  try {
    const { rows } = await pool.query(
      `SELECT
         p.id, p.handle, p.name, p.category, p.fabric, p.price, p."comparePrice",
         p."isNewArrival", p."isBestseller", p."isSale", p."videoUrl", p."isCreatorsFavourite", p."createdAt",
         COALESCE((
           SELECT json_agg(json_build_object('url', i.url, 'alt', i.alt) ORDER BY i.position)
           FROM product_images i WHERE i."productId" = p.id
         ), '[]'::json) AS images,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', v.id, 'size', v.size, 'color', v.color, 'price', v.price,
             'compareAtPrice', v."compareAtPrice", 'stock', v.stock, 'imageUrl', v."imageUrl"
           ) ORDER BY v.id)
           FROM product_variants v WHERE v."productId" = p.id
         ), '[]'::json) AS variants
       FROM products p
       WHERE (p.status IS NULL OR p.status = 'active')
         AND (p."isCreatorsFavourite" = true OR (p."videoUrl" IS NOT NULL AND TRIM(p."videoUrl") != ''))
       ORDER BY CASE p.handle
         WHEN 'summer-special-farshi-set' THEN 1
         WHEN 'viral-real-mirror-bustier-set' THEN 2
         WHEN 'noor-set' THEN 3
         WHEN 'cosmos-gold-with-embroidery-work-gown' THEN 4
         WHEN 'viral-sunflower-farshi-set' THEN 5
         WHEN 'aafreen-luxe-chinon-gown-set' THEN 6
         WHEN 'viral-evil-eye-farshi-set' THEN 7
         WHEN 'viral-fendi-silk-anarkali-set' THEN 8
         WHEN 'viral-fish-cut-fully-stitched-lehenga' THEN 9
         WHEN 'faux-georgette-sharara-set' THEN 10
         WHEN 'premium-chinon-silk-thread-sequence-anarkali-set-with-tabby-organza-dupatta' THEN 11
         WHEN 'tibby-organza-silk-brush-print-set' THEN 12
         WHEN 'pure-cotton-bandhej-print-short-kurti' THEN 13
         WHEN 'premium-fendy-silk-3-piece-suit-set-with-mirror-work' THEN 14
         ELSE 99
       END ASC, p.id ASC
       LIMIT $1`,
      [limit],
    )

    const finalRows = rows

    const products = finalRows.map(p => ({
      ...p,
      discountPercent:
        p.comparePrice && p.comparePrice > p.price
          ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
          : 0,
    }))

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.json({ products })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load creators favourite products' })
  }
})

/**
 * GET /api/products/sale?limit=8
 * Products flagged isSale, newest first, with images and variants.
 * Must stay ABOVE /api/products/:handle, or "sale" is read as a handle.
 */
const handleSaleProducts: express.RequestHandler = async (req, res) => {
  const requested = Number.parseInt(String(req.query.limit ?? '8'), 10)
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 24) : 8

  try {
    const { rows } = await pool.query(
      `SELECT
         p.id, p.handle, p.name, p.category, p.fabric, p.price, p."comparePrice",
         p."isNewArrival", p."isBestseller", p."isSale", p."videoUrl", p."isCreatorsFavourite", p."createdAt",
         COALESCE((
           SELECT json_agg(json_build_object('url', i.url, 'alt', i.alt) ORDER BY i.position)
           FROM product_images i WHERE i."productId" = p.id
         ), '[]'::json) AS images,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', v.id, 'size', v.size, 'color', v.color, 'price', v.price,
             'compareAtPrice', v."compareAtPrice", 'stock', v.stock, 'imageUrl', v."imageUrl"
           ) ORDER BY v.id)
           FROM product_variants v WHERE v."productId" = p.id
         ), '[]'::json) AS variants
       FROM products p
       WHERE p."isSale" = true
       ORDER BY p."createdAt" DESC
       LIMIT $1`,
      [limit],
    )

    const products = rows.map(p => ({
      ...p,
      discountPercent:
        p.comparePrice && p.comparePrice > p.price
          ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
          : 0,
    }))

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.json({ products })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load sale products' })
  }
}

app.get('/api/products/sale', handleSaleProducts)
app.get('/api/products/mega-sale', handleSaleProducts)

/**
 * Helper: parse comma-separated or single query params into a cleaned lowercase array
 */
function parseFilterArray(singular?: unknown, plural?: unknown): string[] {
  const raw = singular || plural || ''
  return String(raw)
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * GET /api/categories
 * Returns list of distinct categories with representative image, item count, and slug.
 */
app.get('/api/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         p.category AS name,
         p.category AS "displayName",
         LOWER(REGEXP_REPLACE(REGEXP_REPLACE(p.category, '[&]', 'and', 'g'), '[^a-zA-Z0-9]+', '-', 'g')) AS slug,
         COUNT(p.id)::int AS "itemCount",
         COUNT(p.id)::int AS "productCount",
         COALESCE(
           (
             SELECT i.url
             FROM product_images i
             JOIN products p2 ON p2.id = i."productId"
             WHERE p2.category = p.category AND i.url IS NOT NULL AND i.url != ''
             ORDER BY p2."isBestseller" DESC, p2."isNewArrival" DESC, i.position ASC
             LIMIT 1
           ),
           ''
         ) AS "imageUrl"
       FROM products p
       WHERE (p.status IS NULL OR p.status = 'active') AND p.category IS NOT NULL AND TRIM(p.category) != ''
       GROUP BY p.category
       ORDER BY "itemCount" DESC, p.category ASC`
    )

    res.set('Cache-Control', 'public, max-age=300')
    res.json({ categories: rows })
  } catch (err) {
    console.error('Error in /api/categories:', err)
    res.status(500).json({ error: 'Could not load categories' })
  }
})

/**
 * GET /api/facets
 * Returns real dynamic aggregation counts from PostgreSQL for current context.
 */
app.get('/api/facets', async (req, res) => {
  try {
    const categorySlug = String(req.query.category ?? '').trim().toLowerCase()
    const collection = String(req.query.collection ?? '').trim().toLowerCase()

    const facetConditions = ["(p.status IS NULL OR p.status = 'active')"]
    const facetParams: any[] = []

    if (categorySlug && categorySlug !== 'all') {
      facetParams.push(categorySlug)
      facetConditions.push(`LOWER(REGEXP_REPLACE(REGEXP_REPLACE(p.category, '[&]', 'and', 'g'), '[^a-zA-Z0-9]+', '-', 'g')) = $${facetParams.length}`)
    }
    if (collection === 'new-arrivals') {
      facetConditions.push(`(p."isNewArrival" = true)`)
    } else if (collection === 'mega-sale') {
      facetConditions.push(`((p."comparePrice" IS NOT NULL AND p."comparePrice" > p.price) OR p."isSale" = true)`)
    } else if (collection === 'bestsellers') {
      facetConditions.push(`(p."isBestseller" = true OR EXISTS (SELECT 1 FROM order_items oi WHERE oi."productId" = p.id))`)
    } else if (collection === 'creators-favourite') {
      facetConditions.push(`(p."isCreatorsFavourite" = true OR (p."videoUrl" IS NOT NULL AND TRIM(p."videoUrl") != ''))`)
    }

    const facetWhere = facetConditions.join(' AND ')

    const { rows: categories } = await pool.query(`
      SELECT p.category AS name,
             LOWER(REGEXP_REPLACE(REGEXP_REPLACE(p.category, '[&]', 'and', 'g'), '[^a-zA-Z0-9]+', '-', 'g')) AS slug,
             COUNT(p.id)::int AS count
      FROM products p
      WHERE (p.status IS NULL OR p.status = 'active') AND p.category IS NOT NULL AND TRIM(p.category) != ''
      GROUP BY p.category
      ORDER BY count DESC
    `)

    const { rows: sizesRaw } = await pool.query(`
      SELECT LOWER(TRIM(v.size)) AS val,
             COUNT(DISTINCT p.id)::int AS count
      FROM product_variants v
      JOIN products p ON p.id = v."productId"
      WHERE ${facetWhere} AND v.size IS NOT NULL AND TRIM(v.size) != ''
      GROUP BY LOWER(TRIM(v.size))
      ORDER BY count DESC
    `, facetParams)

    const sizeOrder = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl', 'free size']
    const sizes = sizesRaw.map(s => {
      const label = s.val.length <= 4 ? s.val.toUpperCase() : s.val.charAt(0).toUpperCase() + s.val.slice(1)
      return { value: s.val, label, count: s.count }
    }).sort((a, b) => {
      const ia = sizeOrder.indexOf(a.value)
      const ib = sizeOrder.indexOf(b.value)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.label.localeCompare(b.label)
    })

    const { rows: colorsRaw } = await pool.query(`
      SELECT INITCAP(TRIM(v.color)) AS label,
             LOWER(TRIM(v.color)) AS value,
             COUNT(DISTINCT p.id)::int AS count
      FROM product_variants v
      JOIN products p ON p.id = v."productId"
      WHERE ${facetWhere} AND v.color IS NOT NULL AND TRIM(v.color) != ''
      GROUP BY INITCAP(TRIM(v.color)), LOWER(TRIM(v.color))
      ORDER BY count DESC
      LIMIT 25
    `, facetParams)

    const { rows: fabrics } = await pool.query(`
      SELECT p.fabric AS label,
             p.fabric AS value,
             COUNT(p.id)::int AS count
      FROM products p
      WHERE ${facetWhere} AND p.fabric IS NOT NULL AND TRIM(p.fabric) != ''
      GROUP BY p.fabric
      ORDER BY count DESC
    `, facetParams)

    const { rows: occasions } = await pool.query(`
      SELECT p.occasion AS label,
             p.occasion AS value,
             COUNT(p.id)::int AS count
      FROM products p
      WHERE ${facetWhere} AND p.occasion IS NOT NULL AND TRIM(p.occasion) != ''
      GROUP BY p.occasion
      ORDER BY count DESC
    `, facetParams)

    const { rows: priceRes } = await pool.query(`
      SELECT COALESCE(MIN(price), 0)::int AS min, COALESCE(MAX(price), 5000)::int AS max 
      FROM products p
      WHERE ${facetWhere}
    `, facetParams)

    const rawMin = priceRes[0]?.min ?? 0
    const rawMax = priceRes[0]?.max ?? 5000
    const span = rawMax - rawMin
    const step = span > 2000 ? 50 : span > 500 ? 10 : 1
    const min = Math.floor(rawMin / step) * step
    const max = Math.max(Math.ceil(rawMax / step) * step, min + step)

    const { rows: stockRes } = await pool.query(`
      SELECT
        COUNT(DISTINCT p.id) FILTER (WHERE EXISTS (SELECT 1 FROM product_variants v WHERE v."productId" = p.id AND v.stock > 0))::int AS "inStock",
        COUNT(DISTINCT p.id) FILTER (WHERE NOT EXISTS (SELECT 1 FROM product_variants v WHERE v."productId" = p.id AND v.stock > 0))::int AS "outOfStock",
        COUNT(DISTINCT p.id)::int AS total
      FROM products p
      WHERE ${facetWhere}
    `, facetParams)

    res.set('Cache-Control', 'public, max-age=60')
    res.json({
      categories: categories.map(c => ({ slug: c.slug, name: c.name, count: c.count })),
      sizes,
      colors: colorsRaw,
      fabrics,
      occasions,
      vendors: [],
      priceRange: { min, max, step },
      stock: {
        inStock: stockRes[0]?.inStock ?? 0,
        outOfStock: stockRes[0]?.outOfStock ?? 0,
      },
      total: stockRes[0]?.total ?? 0,
    })
  } catch (err) {
    console.error('Error in /api/facets:', err)
    res.status(500).json({ error: 'Could not load facets' })
  }
})

/**
 * GET /api/products
 * Unified products endpoint with filtering, search, sorting, facets, and exact/similar fallback.
 * Query params:
 *   - category (slug)
 *   - collection (new-arrivals | mega-sale | bestsellers)
 *   - q / search (keyword)
 *   - minPrice, maxPrice
 *   - size / sizes, color / colors, fabric / fabrics, occasion / occasions (comma-separated, OR within group, AND across groups)
 *   - inStock (true/false)
 *   - sort: newest | price-asc | price-desc | discount | popularity | featured
 *   - page, limit (default 12, max 48)
 */
app.get('/api/products', async (req, res) => {
  try {
    // 1. Input Validation & Clamping
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1)
    const collection = String(req.query.collection ?? req.query.filter ?? '').trim().toLowerCase()
    const defaultLimit = collection === 'creators-favourite' ? 100 : 48
    const rawLimit = req.query.limit !== undefined ? Number.parseInt(String(req.query.limit), 10) : defaultLimit
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 250) : defaultLimit
    const offset = (page - 1) * limit

    const search = String(req.query.q ?? req.query.search ?? '').trim()
    const categorySlug = String(req.query.category ?? '').trim().toLowerCase()

    const sizes = parseFilterArray(req.query.size, req.query.sizes)
    const colors = parseFilterArray(req.query.color, req.query.colors)
    const fabrics = parseFilterArray(req.query.fabric, req.query.fabrics)
    const occasions = parseFilterArray(req.query.occasion, req.query.occasions)

    const inStockRaw = req.query.inStock !== undefined ? String(req.query.inStock).trim().toLowerCase() : ''
    const inStockFilter = inStockRaw === 'true' || inStockRaw === '1' || inStockRaw === 'in-stock'
      ? true
      : inStockRaw === 'false' || inStockRaw === '0' || inStockRaw === 'out-of-stock'
      ? false
      : null

    const minPriceNum = req.query.minPrice !== undefined && req.query.minPrice !== null && String(req.query.minPrice).trim() !== ''
      ? Number.parseInt(String(req.query.minPrice), 10)
      : null
    const maxPriceNum = req.query.maxPrice !== undefined && req.query.maxPrice !== null && String(req.query.maxPrice).trim() !== ''
      ? Number.parseInt(String(req.query.maxPrice), 10)
      : null

    const minPrice = minPriceNum !== null && !Number.isNaN(minPriceNum) && minPriceNum >= 0 ? minPriceNum : null
    const maxPrice = maxPriceNum !== null && !Number.isNaN(maxPriceNum) && maxPriceNum >= 0 ? maxPriceNum : null

    const sort = String(req.query.sort ?? 'featured').trim().toLowerCase()

    // 2. Build WHERE clauses
    const conditions: string[] = ["(p.status IS NULL OR p.status = 'active')"]
    const params: any[] = []

    // Category Matching (Case-insensitive slug matching)
    if (categorySlug && categorySlug !== 'all') {
      params.push(categorySlug)
      conditions.push(`LOWER(REGEXP_REPLACE(REGEXP_REPLACE(p.category, '[&]', 'and', 'g'), '[^a-zA-Z0-9]+', '-', 'g')) = $${params.length}`)
    }

    // Collection Matching
    if (collection === 'new-arrivals') {
      conditions.push(`(p."isNewArrival" = true)`)
    } else if (collection === 'mega-sale') {
      conditions.push(`((p."comparePrice" IS NOT NULL AND p."comparePrice" > p.price) OR p."isSale" = true)`)
    } else if (collection === 'bestsellers') {
      conditions.push(`(p."isBestseller" = true OR EXISTS (SELECT 1 FROM order_items oi WHERE oi."productId" = p.id))`)
    } else if (collection === 'creators-favourite') {
      conditions.push(`(p."isCreatorsFavourite" = true OR (p."videoUrl" IS NOT NULL AND TRIM(p."videoUrl") != ''))`)
    }

    // Text Search (Phrase match + Multi-token matching)
    let searchPhraseIdx: number | null = null
    if (search) {
      params.push(`%${search}%`)
      searchPhraseIdx = params.length

      const tokens = search.split(/\s+/).map(t => t.trim()).filter(Boolean)
      if (tokens.length > 1) {
        const tokenClauses = tokens.map(tok => {
          params.push(`%${tok}%`)
          const tIdx = params.length
          return `(
            p.name ILIKE $${tIdx} OR 
            p.category ILIKE $${tIdx} OR 
            p.fabric ILIKE $${tIdx} OR 
            p.work ILIKE $${tIdx} OR 
            p.occasion ILIKE $${tIdx} OR 
            p."descriptionHtml" ILIKE $${tIdx}
          )`
        }).join(' AND ')

        conditions.push(`(
          p.name ILIKE $${searchPhraseIdx} OR 
          p.category ILIKE $${searchPhraseIdx} OR 
          p.fabric ILIKE $${searchPhraseIdx} OR 
          p.work ILIKE $${searchPhraseIdx} OR 
          p.occasion ILIKE $${searchPhraseIdx} OR 
          p."descriptionHtml" ILIKE $${searchPhraseIdx} OR
          (${tokenClauses})
        )`)
      } else {
        conditions.push(`(
          p.name ILIKE $${searchPhraseIdx} OR 
          p.category ILIKE $${searchPhraseIdx} OR 
          p.fabric ILIKE $${searchPhraseIdx} OR 
          p.work ILIKE $${searchPhraseIdx} OR 
          p.occasion ILIKE $${searchPhraseIdx} OR 
          p."descriptionHtml" ILIKE $${searchPhraseIdx}
        )`)
      }
    }

    // Price Filters
    if (minPrice !== null) {
      params.push(minPrice)
      conditions.push(`p.price >= $${params.length}`)
    }
    if (maxPrice !== null) {
      params.push(maxPrice)
      conditions.push(`p.price <= $${params.length}`)
    }

    // Fabric Filter (OR inside group, AND with others)
    if (fabrics.length > 0) {
      params.push(fabrics)
      conditions.push(`LOWER(TRIM(p.fabric)) = ANY($${params.length})`)
    }

    // Occasion Filter (OR inside group, AND with others)
    if (occasions.length > 0) {
      params.push(occasions)
      conditions.push(`LOWER(TRIM(p.occasion)) = ANY($${params.length})`)
    }

    // Variant-Level Size & Color Matching
    if (sizes.length > 0 && colors.length > 0) {
      params.push(sizes)
      const sizeIdx = params.length
      params.push(colors)
      const colorIdx = params.length
      if (inStockFilter === true) {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv."productId" = p.id 
            AND LOWER(TRIM(pv.size)) = ANY($${sizeIdx})
            AND LOWER(TRIM(pv.color)) = ANY($${colorIdx})
            AND pv.stock > 0
        )`)
      } else if (inStockFilter === false) {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv."productId" = p.id 
            AND LOWER(TRIM(pv.size)) = ANY($${sizeIdx})
            AND LOWER(TRIM(pv.color)) = ANY($${colorIdx})
            AND pv.stock <= 0
        )`)
      } else {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv."productId" = p.id 
            AND LOWER(TRIM(pv.size)) = ANY($${sizeIdx})
            AND LOWER(TRIM(pv.color)) = ANY($${colorIdx})
        )`)
      }
    } else if (sizes.length > 0) {
      params.push(sizes)
      const sizeIdx = params.length
      if (inStockFilter === true) {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv."productId" = p.id 
            AND LOWER(TRIM(pv.size)) = ANY($${sizeIdx})
            AND pv.stock > 0
        )`)
      } else if (inStockFilter === false) {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv."productId" = p.id 
            AND LOWER(TRIM(pv.size)) = ANY($${sizeIdx})
            AND pv.stock <= 0
        )`)
      } else {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv."productId" = p.id 
            AND LOWER(TRIM(pv.size)) = ANY($${sizeIdx})
        )`)
      }
    } else if (colors.length > 0) {
      params.push(colors)
      const colorIdx = params.length
      if (inStockFilter === true) {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv."productId" = p.id 
            AND LOWER(TRIM(pv.color)) = ANY($${colorIdx})
            AND pv.stock > 0
        )`)
      } else if (inStockFilter === false) {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv."productId" = p.id 
            AND LOWER(TRIM(pv.color)) = ANY($${colorIdx})
            AND pv.stock <= 0
        )`)
      } else {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv."productId" = p.id 
            AND LOWER(TRIM(pv.color)) = ANY($${colorIdx})
        )`)
      }
    } else if (inStockFilter !== null) {
      if (inStockFilter === true) {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv."productId" = p.id AND pv.stock > 0
        )`)
      } else {
        conditions.push(`NOT EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv."productId" = p.id AND pv.stock > 0
        )`)
      }
    }

    // 3. Sorting logic
    let orderBy = 'p."createdAt" DESC, p.id DESC'
    if (sort === 'price-asc' || sort === 'price-low') {
      orderBy = 'p.price ASC, p.id ASC'
    } else if (sort === 'price-desc' || sort === 'price-high') {
      orderBy = 'p.price DESC, p.id ASC'
    } else if (sort === 'discount') {
      orderBy = '((COALESCE(p."comparePrice", p.price) - p.price)::float / NULLIF(COALESCE(p."comparePrice", p.price), 0)) DESC, p."createdAt" DESC'
    } else if (sort === 'popularity' || sort === 'bestsellers') {
      orderBy = '(SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi."productId" = p.id) DESC, p."isBestseller" DESC, p."createdAt" DESC'
    } else if (sort === 'newest') {
      orderBy = 'p."createdAt" DESC, p.id DESC'
    } else if (sort === 'alphabetical-az') {
      orderBy = 'p.name ASC'
    } else if (sort === 'alphabetical-za') {
      orderBy = 'p.name DESC'
    } else if (sort === 'featured') {
      if (collection === 'mega-sale') {
        orderBy = '((COALESCE(p."comparePrice", p.price) - p.price)::float / NULLIF(COALESCE(p."comparePrice", p.price), 0)) DESC, p."createdAt" DESC'
      } else if (collection === 'creators-favourite') {
        orderBy = `CASE p.handle
          WHEN 'summer-special-farshi-set' THEN 1
          WHEN 'viral-real-mirror-bustier-set' THEN 2
          WHEN 'noor-set' THEN 3
          WHEN 'cosmos-gold-with-embroidery-work-gown' THEN 4
          WHEN 'viral-sunflower-farshi-set' THEN 5
          WHEN 'aafreen-luxe-chinon-gown-set' THEN 6
          WHEN 'viral-evil-eye-farshi-set' THEN 7
          WHEN 'viral-fendi-silk-anarkali-set' THEN 8
          WHEN 'viral-fish-cut-fully-stitched-lehenga' THEN 9
          WHEN 'faux-georgette-sharara-set' THEN 10
          WHEN 'premium-chinon-silk-thread-sequence-anarkali-set-with-tabby-organza-dupatta' THEN 11
          WHEN 'tibby-organza-silk-brush-print-set' THEN 12
          WHEN 'pure-cotton-bandhej-print-short-kurti' THEN 13
          WHEN 'premium-fendy-silk-3-piece-suit-set-with-mirror-work' THEN 14
          ELSE 99
        END ASC, p.id ASC`
      } else if (search && searchPhraseIdx) {
        orderBy = `(CASE WHEN p.name ILIKE $${searchPhraseIdx} THEN 1 ELSE 2 END) ASC, p."isBestseller" DESC, p."createdAt" DESC`
      } else {
        orderBy = 'p."isBestseller" DESC, p."isNewArrival" DESC, p."createdAt" DESC'
      }
    }

    const whereClause = conditions.join(' AND ')

    // 4. Query Main Items & Total Count
    params.push(limit)
    const limitParamIdx = params.length
    params.push(offset)
    const offsetParamIdx = params.length

    const itemsQuery = `
      SELECT
        p.id, p.handle, p.name, p.category, p.fabric, p.occasion, p.price, p."comparePrice",
        p."isNewArrival", p."isBestseller", p."isSale", p."videoUrl", p."isCreatorsFavourite", p.status, p."createdAt",
        COUNT(*) OVER() AS total_count,
        COALESCE((
          SELECT json_agg(json_build_object('url', i.url, 'alt', i.alt) ORDER BY i.position)
          FROM product_images i WHERE i."productId" = p.id
        ), '[]'::json) AS images,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', v.id, 'size', v.size, 'color', v.color, 'price', v.price,
            'compareAtPrice', v."compareAtPrice", 'stock', v.stock, 'imageUrl', v."imageUrl"
          ) ORDER BY v.id)
          FROM product_variants v WHERE v."productId" = p.id
        ), '[]'::json) AS variants
      FROM products p
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
    `

    const { rows } = await pool.query(itemsQuery, params)
    const total = rows.length > 0 ? Number.parseInt(String(rows[0].total_count), 10) : 0
    const totalPages = Math.ceil(total / limit) || 1

    const items = rows.map(({ total_count, ...p }) => ({
      ...p,
      discountPercent:
        p.comparePrice && p.comparePrice > p.price
          ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
          : 0,
    }))

    // 5. Facet Computation within context (category / collection context)
    const facetConditions = ["(p.status IS NULL OR p.status = 'active')"]
    const facetParams: any[] = []

    if (categorySlug && categorySlug !== 'all') {
      facetParams.push(categorySlug)
      facetConditions.push(`LOWER(REGEXP_REPLACE(REGEXP_REPLACE(p.category, '[&]', 'and', 'g'), '[^a-zA-Z0-9]+', '-', 'g')) = $${facetParams.length}`)
    }
    if (collection === 'new-arrivals') {
      facetConditions.push(`(p."isNewArrival" = true)`)
    } else if (collection === 'mega-sale') {
      facetConditions.push(`((p."comparePrice" IS NOT NULL AND p."comparePrice" > p.price) OR p."isSale" = true)`)
    } else if (collection === 'bestsellers') {
      facetConditions.push(`(p."isBestseller" = true OR EXISTS (SELECT 1 FROM order_items oi WHERE oi."productId" = p.id))`)
    } else if (collection === 'creators-favourite') {
      facetConditions.push(`(p."isCreatorsFavourite" = true OR (p."videoUrl" IS NOT NULL AND TRIM(p."videoUrl") != ''))`)
    }

    const facetWhere = facetConditions.join(' AND ')

    // Categories
    const catRes = await pool.query(`
      SELECT p.category AS name,
             LOWER(REGEXP_REPLACE(REGEXP_REPLACE(p.category, '[&]', 'and', 'g'), '[^a-zA-Z0-9]+', '-', 'g')) AS slug,
             COUNT(p.id)::int AS count
      FROM products p
      WHERE (p.status IS NULL OR p.status = 'active') AND p.category IS NOT NULL AND TRIM(p.category) != ''
      GROUP BY p.category
      ORDER BY count DESC
    `)

    // Sizes in context
    const sizeRes = await pool.query(`
      SELECT LOWER(TRIM(v.size)) AS val,
             COUNT(DISTINCT p.id)::int AS count
      FROM product_variants v
      JOIN products p ON p.id = v."productId"
      WHERE ${facetWhere} AND v.size IS NOT NULL AND TRIM(v.size) != ''
      GROUP BY LOWER(TRIM(v.size))
      ORDER BY count DESC
    `, facetParams)

    const sizeOrder = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl', 'free size']
    const sizesFacet = sizeRes.rows.map(s => {
      const label = s.val.length <= 4 ? s.val.toUpperCase() : s.val.charAt(0).toUpperCase() + s.val.slice(1)
      return { value: s.val, label, count: s.count }
    }).sort((a, b) => {
      const ia = sizeOrder.indexOf(a.value)
      const ib = sizeOrder.indexOf(b.value)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.label.localeCompare(b.label)
    })

    // Colors in context
    const colorRes = await pool.query(`
      SELECT INITCAP(TRIM(v.color)) AS label,
             LOWER(TRIM(v.color)) AS value,
             COUNT(DISTINCT p.id)::int AS count
      FROM product_variants v
      JOIN products p ON p.id = v."productId"
      WHERE ${facetWhere} AND v.color IS NOT NULL AND TRIM(v.color) != ''
      GROUP BY INITCAP(TRIM(v.color)), LOWER(TRIM(v.color))
      ORDER BY count DESC
      LIMIT 25
    `, facetParams)

    // Fabrics in context
    const fabricRes = await pool.query(`
      SELECT p.fabric AS label,
             p.fabric AS value,
             COUNT(p.id)::int AS count
      FROM products p
      WHERE ${facetWhere} AND p.fabric IS NOT NULL AND TRIM(p.fabric) != ''
      GROUP BY p.fabric
      ORDER BY count DESC
    `, facetParams)

    // Occasions in context
    const occasionRes = await pool.query(`
      SELECT p.occasion AS label,
             p.occasion AS value,
             COUNT(p.id)::int AS count
      FROM products p
      WHERE ${facetWhere} AND p.occasion IS NOT NULL AND TRIM(p.occasion) != ''
      GROUP BY p.occasion
      ORDER BY count DESC
    `, facetParams)

    // Price range in context
    const priceRangeRes = await pool.query(`
      SELECT COALESCE(MIN(price), 0)::int AS min, COALESCE(MAX(price), 5000)::int AS max 
      FROM products p
      WHERE ${facetWhere}
    `, facetParams)

    const priceRange = {
      min: priceRangeRes.rows[0]?.min ?? 0,
      max: priceRangeRes.rows[0]?.max ?? 5000,
    }

    // 6. "Exact or Similar" Behaviour
    let exactMatch = true
    let similar: any[] = []

    if (items.length === 0) {
      exactMatch = false

      // Compute ±25% price range
      const baseMin = minPrice ?? priceRange.min
      const baseMax = maxPrice ?? priceRange.max
      const simMinPrice = Math.max(0, Math.floor(baseMin * 0.75))
      const simMaxPrice = Math.ceil(baseMax * 1.25)

      const simParams: any[] = [simMinPrice, simMaxPrice]
      const simConditions = [
        "(p.status IS NULL OR p.status = 'active')",
        "p.price >= $1 AND p.price <= $2",
      ]

      const scoreExpressions: string[] = ['0']

      if (categorySlug && categorySlug !== 'all') {
        simParams.push(categorySlug)
        const catParamIdx = simParams.length
        scoreExpressions.push(`(CASE WHEN LOWER(REGEXP_REPLACE(REGEXP_REPLACE(p.category, '[&]', 'and', 'g'), '[^a-zA-Z0-9]+', '-', 'g')) = $${catParamIdx} THEN 5 ELSE 0 END)`)
      }

      if (fabrics.length > 0) {
        simParams.push(fabrics)
        const fabIdx = simParams.length
        scoreExpressions.push(`(CASE WHEN LOWER(TRIM(p.fabric)) = ANY($${fabIdx}) THEN 3 ELSE 0 END)`)
      }

      if (occasions.length > 0) {
        simParams.push(occasions)
        const occIdx = simParams.length
        scoreExpressions.push(`(CASE WHEN LOWER(TRIM(p.occasion)) = ANY($${occIdx}) THEN 3 ELSE 0 END)`)
      }

      if (sizes.length > 0) {
        simParams.push(sizes)
        const szIdx = simParams.length
        scoreExpressions.push(`(CASE WHEN EXISTS(SELECT 1 FROM product_variants pv WHERE pv."productId" = p.id AND LOWER(TRIM(pv.size)) = ANY($${szIdx})) THEN 2 ELSE 0 END)`)
      }

      if (colors.length > 0) {
        simParams.push(colors)
        const clIdx = simParams.length
        scoreExpressions.push(`(CASE WHEN EXISTS(SELECT 1 FROM product_variants pv WHERE pv."productId" = p.id AND LOWER(TRIM(pv.color)) = ANY($${clIdx})) THEN 2 ELSE 0 END)`)
      }

      scoreExpressions.push(`(CASE WHEN p."isBestseller" THEN 1 ELSE 0 END)`)
      const scoreSql = scoreExpressions.join(' + ')

      const simQuery = `
        SELECT
          p.id, p.handle, p.name, p.category, p.fabric, p.occasion, p.price, p."comparePrice",
          p."isNewArrival", p."isBestseller", p."isSale", p."videoUrl", p."isCreatorsFavourite", p.status, p."createdAt",
          (${scoreSql}) AS match_score,
          COALESCE((
            SELECT json_agg(json_build_object('url', i.url, 'alt', i.alt) ORDER BY i.position)
            FROM product_images i WHERE i."productId" = p.id
          ), '[]'::json) AS images,
          COALESCE((
            SELECT json_agg(json_build_object(
              'id', v.id, 'size', v.size, 'color', v.color, 'price', v.price,
              'compareAtPrice', v."compareAtPrice", 'stock', v.stock, 'imageUrl', v."imageUrl"
            ) ORDER BY v.id)
            FROM product_variants v WHERE v."productId" = p.id
          ), '[]'::json) AS variants
        FROM products p
        WHERE ${simConditions.join(' AND ')}
        ORDER BY match_score DESC, p."createdAt" DESC
        LIMIT 8
      `

      const { rows: simRows } = await pool.query(simQuery, simParams)
      similar = simRows.map(({ match_score, ...p }) => ({
        ...p,
        discountPercent:
          p.comparePrice && p.comparePrice > p.price
            ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
            : 0,
      }))
    }

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.json({
      items,
      products: items,
      total,
      page,
      limit,
      totalPages,
      facets: {
        categories: catRes.rows.map(c => ({ slug: c.slug, name: c.name, count: c.count })),
        sizes: sizesFacet,
        colors: colorRes.rows,
        fabrics: fabricRes.rows,
        occasions: occasionRes.rows,
        priceRange,
      },
      exactMatch,
      similar,
    })
  } catch (err) {
    console.error('Error in /api/products:', err)
    res.status(500).json({ error: 'Could not load products' })
  }
})

/**
 * GET /api/products/:handle
 * Full details for one product: description, work, all images and variants.
 */
app.get('/api/products/:handle', async (req, res) => {
  const { handle } = req.params
  if (!handle || handle.length > 200) {
    return res.status(404).json({ error: 'Product not found' })
  }

  try {
    const { rows } = await pool.query(
      `SELECT
         p.id, p.handle, p.name, p."descriptionHtml", p.category, p.fabric, p.work,
         p.price, p."comparePrice", p."isNewArrival", p."isBestseller", p."isSale", p."videoUrl", p."isCreatorsFavourite", p."createdAt",
         COALESCE((
           SELECT json_agg(json_build_object('url', i.url, 'alt', i.alt) ORDER BY i.position)
           FROM product_images i WHERE i."productId" = p.id
         ), '[]'::json) AS images,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', v.id, 'size', v.size, 'color', v.color, 'price', v.price,
             'compareAtPrice', v."compareAtPrice", 'stock', v.stock, 'imageUrl', v."imageUrl"
           ) ORDER BY v.id)
           FROM product_variants v WHERE v."productId" = p.id
         ), '[]'::json) AS variants
       FROM products p
       WHERE p.handle = $1`,
      [handle],
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const p = rows[0]
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.json({
      product: {
        ...p,
        discountPercent:
          p.comparePrice && p.comparePrice > p.price
            ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
            : 0,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load product' })
  }
})

/**
 * GET /api/products/:handle/reviews
 * Returns all reviews for a product from PostgreSQL.
 */
app.get('/api/products/:handle/reviews', async (req, res) => {
  const { handle } = req.params
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.name, r.rating, r.title, r.comment, r.verified, r."helpfulCount", r."createdAt"
       FROM product_reviews r
       JOIN products p ON p.id = r."productId"
       WHERE p.handle = $1
       ORDER BY r."createdAt" DESC`,
      [handle]
    )
    res.json({ reviews: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load reviews' })
  }
})

/**
 * POST /api/products/:handle/reviews
 * Adds a new review for a product into PostgreSQL.
 */
app.post('/api/products/:handle/reviews', async (req, res) => {
  const { handle } = req.params
  const { name, rating, title, comment } = req.body

  if (!name || !comment) {
    return res.status(400).json({ error: 'Name and comment are required' })
  }

  const numericRating = Math.min(Math.max(Number.parseInt(String(rating), 10) || 5, 1), 5)

  try {
    const prodRes = await pool.query('SELECT id FROM products WHERE handle = $1', [handle])
    if (prodRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }
    const productId = prodRes.rows[0].id

    const { rows } = await pool.query(
      `INSERT INTO product_reviews ("productId", name, rating, title, comment, verified, "helpfulCount")
       VALUES ($1, $2, $3, $4, $5, true, 0)
       RETURNING id, name, rating, title, comment, verified, "helpfulCount", "createdAt"`,
      [productId, String(name).trim(), numericRating, title ? String(title).trim() : null, String(comment).trim()]
    )

    res.status(201).json({ review: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not submit review' })
  }
})

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        clerk_user_id TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        role TEXT NOT NULL DEFAULT 'CUSTOMER',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'CUSTOMER';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

      CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerk_user_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

      CREATE TABLE IF NOT EXISTS product_reviews (
        id SERIAL PRIMARY KEY,
        "productId" INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title TEXT,
        comment TEXT NOT NULL,
        verified BOOLEAN DEFAULT true,
        "helpfulCount" INT DEFAULT 0,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews ("productId", "createdAt" DESC);

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        "orderNumber" TEXT UNIQUE NOT NULL,
        "clerkUserId" TEXT,
        "customerName" TEXT NOT NULL,
        "customerEmail" TEXT NOT NULL,
        "customerPhone" TEXT NOT NULL,
        "shippingAddress" JSONB NOT NULL,
        items JSONB NOT NULL,
        "subtotal" INT NOT NULL,
        "shippingFee" INT NOT NULL DEFAULT 0,
        "discountAmount" INT NOT NULL DEFAULT 0,
        "totalAmount" INT NOT NULL,
        "paymentMethod" TEXT NOT NULL DEFAULT 'COD',
        "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
        "orderStatus" TEXT NOT NULL DEFAULT 'Confirmed',
        "courierName" TEXT DEFAULT 'BlueDart Express',
        "trackingNumber" TEXT,
        "estimatedDelivery" TEXT,
        "timeline" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "notes" TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders ("clerkUserId");
      CREATE INDEX IF NOT EXISTS idx_orders_email ON orders ("customerEmail");
      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders ("orderNumber");

      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT UNIQUE;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "userId" INT REFERENCES users(id);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS "couponCode" TEXT;

      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        discount_type TEXT NOT NULL DEFAULT 'PERCENTAGE',
        discount_value INT NOT NULL,
        min_order_amount INT NOT NULL DEFAULT 0,
        max_discount_amount INT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        expires_at TIMESTAMPTZ,
        usage_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        "orderId" INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        "productId" INT REFERENCES products(id),
        "productVariantId" INT REFERENCES product_variants(id),
        name TEXT NOT NULL,
        price INT NOT NULL,
        quantity INT NOT NULL,
        size TEXT,
        color TEXT,
        "imageUrl" TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items ("orderId");
      CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders ("razorpayOrderId");
    `)

    // Seed default coupons if none exist
    const couponsCountRes = await pool.query('SELECT COUNT(*) FROM coupons')
    if (Number.parseInt(couponsCountRes.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount)
        VALUES
          ('WELCOME10', '10% OFF on your luxury designer outfit (up to ₹500)', 'PERCENTAGE', 10, 999, 500),
          ('ANJU15', '15% Festive discount on ethnic collections (up to ₹1,000)', 'PERCENTAGE', 15, 1999, 1000),
          ('FLAT500', 'Flat ₹500 instant discount on orders above ₹2,999', 'FLAT', 500, 2999, NULL),
          ('FIRST300', 'Flat ₹300 OFF on your first designer order (above ₹1,499)', 'FLAT', 300, 1499, NULL),
          ('FESTIVE20', '20% OFF on grand wedding and bridal edit (up to ₹1,500)', 'PERCENTAGE', 20, 3999, 1500)
        ON CONFLICT (code) DO NOTHING;
      `)
    }

    // Seed sample orders if none exist
    const countRes = await pool.query('SELECT COUNT(*) FROM orders')
    if (Number.parseInt(countRes.rows[0].count, 10) === 0) {
      await seedSampleOrders()
    }
  } catch (err) {
    console.error('Error initializing database tables:', err)
  }
}

async function seedSampleOrders() {
  try {
    const sampleOrders = [
      {
        orderNumber: 'AC-89241',
        clerkUserId: null,
        customerName: 'Priya Sharma',
        customerEmail: 'priya.sharma@example.com',
        customerPhone: '+91 98765 43210',
        shippingAddress: {
          street: 'B-402, Royal Palms, Link Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400053',
          country: 'India',
        },
        items: [
          {
            id: 'gulabo-handcrafted-gota-patti-suit-set',
            name: 'Gulabo Handcrafted Gota Patti Suit Set',
            price: 6499,
            quantity: 1,
            selectedSize: 'M',
            selectedColor: 'Rose Pink',
            img: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
          },
          {
            id: 'royal-heritage-banarasi-silk-saree',
            name: 'Royal Heritage Banarasi Katan Silk Saree',
            price: 9999,
            quantity: 1,
            selectedSize: 'Free Size',
            selectedColor: 'Deep Crimson',
            img: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80',
          },
        ],
        subtotal: 16498,
        shippingFee: 0,
        discountAmount: 1000,
        totalAmount: 15498,
        paymentMethod: 'Online UPI / Card',
        paymentStatus: 'Paid',
        orderStatus: 'In Transit',
        courierName: 'BlueDart Express',
        trackingNumber: 'BLUEDART-IND-7392819',
        estimatedDelivery: '3 Days (Arriving Soon)',
        timeline: [
          { status: 'Order Placed', time: 'Yesterday, 10:30 AM', completed: true, description: 'Order confirmed and verified' },
          { status: 'Handcrafting & Packed', time: 'Yesterday, 04:15 PM', completed: true, description: 'Inspected for quality and packaged in luxury box' },
          { status: 'Dispatched / In Transit', time: 'Today, 08:00 AM', completed: true, description: 'Shipped via BlueDart Express (Air Courier)' },
          { status: 'Out for Delivery', time: 'Expected Tomorrow', completed: false, description: 'Courier partner will contact on delivery' },
          { status: 'Delivered', time: 'Expected 28 Sep', completed: false, description: 'Delivered with luxury garment bag' },
        ],
      },
      {
        orderNumber: 'AC-74620',
        clerkUserId: null,
        customerName: 'Ananya Verma',
        customerEmail: 'ananya.v@example.com',
        customerPhone: '+91 98111 22334',

        shippingAddress: {
          street: '12-A, Golf Course Road',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122002',
          country: 'India',
        },
        items: [
          {
            id: 'noor-chikankari-anarkali-set',
            name: 'Noor Hand-Embroidered Chikankari Anarkali Set',
            price: 8499,
            quantity: 1,
            selectedSize: 'S',
            selectedColor: 'Ivory White',
            img: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
          },
        ],
        subtotal: 8499,
        shippingFee: 0,
        discountAmount: 0,
        totalAmount: 8499,
        paymentMethod: 'Cash on Delivery (COD)',
        paymentStatus: 'Pending',
        orderStatus: 'Processing',
        courierName: 'Delhivery Express',
        trackingNumber: 'DLV-88392019',
        estimatedDelivery: '4-5 Business Days',
        timeline: [
          { status: 'Order Placed', time: 'Today, 09:15 AM', completed: true, description: 'Order verified by our boutique' },
          { status: 'Handcrafting & Tailoring', time: 'Today, 11:30 AM', completed: true, description: 'Garment passed quality check & artisan review' },
          { status: 'Ready for Dispatch', time: 'Expected Tomorrow', completed: false, description: 'Awaiting courier pickup' },
          { status: 'In Transit', time: 'Pending', completed: false, description: 'Will be tracked live once dispatched' },
          { status: 'Delivered', time: 'Expected 30 Sep', completed: false, description: 'Estimated delivery' },
        ],
      },
    ]

    for (const ord of sampleOrders) {
      await pool.query(
        `INSERT INTO orders (
          "orderNumber", "clerkUserId", "customerName", "customerEmail", "customerPhone",
          "shippingAddress", items, subtotal, "shippingFee", "discountAmount", "totalAmount",
          "paymentMethod", "paymentStatus", "orderStatus", "courierName", "trackingNumber",
          "estimatedDelivery", timeline
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT ("orderNumber") DO NOTHING`,
        [
          ord.orderNumber,
          ord.clerkUserId,
          ord.customerName,
          ord.customerEmail,
          ord.customerPhone,
          JSON.stringify(ord.shippingAddress),
          JSON.stringify(ord.items),
          ord.subtotal,
          ord.shippingFee,
          ord.discountAmount,
          ord.totalAmount,
          ord.paymentMethod,
          ord.paymentStatus,
          ord.orderStatus,
          ord.courierName,
          ord.trackingNumber,
          ord.estimatedDelivery,
          JSON.stringify(ord.timeline),
        ]
      )
    }
  } catch (err) {
    console.error('Error seeding orders:', err)
  }
}

/**
 * Helper to generate simple sequential order reference numbers (e.g. '01', '02', '03'...).
 * Stored as two-digit (or higher) strings so they display as #01, #02 in UI and emails.
 */
async function generateSimpleOrderNumber(client: any): Promise<string> {
  const res = await client.query(`
    SELECT "orderNumber"
    FROM orders
    WHERE "orderNumber" ~ '^#?[0-9]+$'
    ORDER BY CAST(REPLACE("orderNumber", '#', '') AS INTEGER) DESC
    LIMIT 1
  `)

  let nextSeq = 1
  if (res.rows.length > 0 && res.rows[0].orderNumber) {
    const highest = parseInt(String(res.rows[0].orderNumber).replace(/^#+/, ''), 10)
    if (!isNaN(highest) && highest > 0) {
      nextSeq = highest + 1
    }
  }

  return String(nextSeq).padStart(2, '0')
}

/**
 * POST /api/orders
 * Secure order placement endpoint:
 * - Requires authenticated Clerk session (clerkUserId extracted strictly from getAuth(req).userId).
 * - Accepts only items [{ productVariantId, quantity }], paymentMethod ("PREPAID" | "COD"), and customer/shipping address.
 * - Computes all prices, subtotal, shippingFee, discountAmount, totalAmount, amountPayableNow, and amountDueOnDelivery strictly on the server from the database.
 * - Verifies variant existence and checks stock >= quantity.
 * - Executes in a single database transaction (inserts orders and order_items rows, rolls back on any error).
 * - Retries orderNumber generation up to 3 times on unique constraint collision.
 */
app.post('/api/orders', requireLogin, async (req, res) => {
  const auth = getAuth(req)
  const clerkUserId = auth?.userId

  if (!clerkUserId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required to place an order.' })
  }

  const {
    items,
    paymentMethod,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    notes,
    couponCode,
  } = req.body

  // 1. Validate customer information
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  const indianPhoneRegex = /^(?:\+91[\-\s]?)?[6-9]\d{9}$/
  const pincodeRegex = /^\d{6}$/

  if (
    !customerName ||
    typeof customerName !== 'string' ||
    customerName.trim().length < 2 ||
    customerName.trim().length > 100
  ) {
    return res.status(400).json({ error: 'Customer name is required (2-100 characters).' })
  }

  if (
    !customerEmail ||
    typeof customerEmail !== 'string' ||
    !emailRegex.test(customerEmail.trim()) ||
    customerEmail.trim().length > 255
  ) {
    return res.status(400).json({ error: 'A valid email address is required (max 255 characters).' })
  }

  if (
    !customerPhone ||
    typeof customerPhone !== 'string' ||
    !indianPhoneRegex.test(customerPhone.trim()) ||
    customerPhone.trim().length > 20
  ) {
    return res.status(400).json({
      error: 'A valid 10-digit Indian mobile number is required (e.g. 9876543210 or +919876543210).',
    })
  }

  // 2. Validate and whitelist shippingAddress fields
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return res.status(400).json({ error: 'Shipping address is required.' })
  }

  const street = typeof shippingAddress.street === 'string' ? shippingAddress.street.trim() : ''
  const city = typeof shippingAddress.city === 'string' ? shippingAddress.city.trim() : ''
  const state = typeof shippingAddress.state === 'string' && shippingAddress.state.trim() ? shippingAddress.state.trim() : 'India'
  const pincode = typeof shippingAddress.pincode === 'string' ? shippingAddress.pincode.trim() : ''
  const country = typeof shippingAddress.country === 'string' && shippingAddress.country.trim() ? shippingAddress.country.trim() : 'India'

  if (!street || street.length < 3 || street.length > 200) {
    return res.status(400).json({ error: 'Street address is required (3-200 characters).' })
  }
  if (!city || city.length < 2 || city.length > 100) {
    return res.status(400).json({ error: 'City is required (2-100 characters).' })
  }
  if (!pincode || !pincodeRegex.test(pincode)) {
    return res.status(400).json({ error: 'A valid 6-digit Indian PIN code is required (e.g. 400053).' })
  }

  const sanitizedShippingAddress = {
    street: street.slice(0, 200),
    city: city.slice(0, 100),
    state: state.slice(0, 100),
    pincode: pincode.slice(0, 6),
    country: country.slice(0, 50),
  }

  // 3. Validate paymentMethod ("PREPAID" or "COD" only)
  const normalizedPaymentMethod = String(paymentMethod || '').trim().toUpperCase()
  if (normalizedPaymentMethod !== 'PREPAID' && normalizedPaymentMethod !== 'COD') {
    return res.status(400).json({
      error: 'Invalid paymentMethod. Must be strictly "PREPAID" or "COD".',
    })
  }

  // 4. Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items must be a non-empty array.' })
  }

  const variantIds = items.map((i: any) => Number(i?.productVariantId))
  if (variantIds.some((id) => !id || !Number.isInteger(id) || id <= 0)) {
    return res.status(400).json({
      error: 'Each item must have a valid positive integer productVariantId.',
    })
  }

  // Check for duplicate variant IDs in the same order
  const uniqueIds = new Set(variantIds)
  if (uniqueIds.size !== variantIds.length) {
    return res.status(400).json({
      error: 'Duplicate productVariantId detected in items. Combine quantities into a single item.',
    })
  }

  // Validate quantities (integers between 1 and 10)
  for (const item of items) {
    const qty = Number(item.quantity)
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
      return res.status(400).json({
        error: `Invalid quantity (${item.quantity}) for productVariantId ${item.productVariantId}. Must be an integer between 1 and 10.`,
      })
    }
  }

  // 5. Database Transaction: verify DB prices & stock, compute totals, and create order
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Lookup internal user id from users table using "clerkUserId" column
    const userRes = await client.query(
      `SELECT id FROM users WHERE "clerkUserId" = $1 LIMIT 1`,
      [clerkUserId]
    )
    const internalUserId = userRes.rows[0]?.id || null

    let subtotal = 0
    const resolvedItems: Array<{
      productId: number
      productVariantId: number
      name: string
      price: number
      quantity: number
      size: string | null
      color: string | null
      imageUrl: string | null
    }> = []

    for (const item of items) {
      const variantId = Number(item.productVariantId)
      const quantity = Number(item.quantity)

      // Query database for authoritative price, stock, and garment specs.
      // Uses a correlated subquery for images to prevent any duplicate rows.
      const variantRes = await client.query(
        `SELECT 
           pv.id AS "variantId", 
           pv.price, 
           pv.stock, 
           pv.size, 
           pv.color, 
           COALESCE(
             pv."imageUrl", 
             (SELECT pi.url FROM product_images pi WHERE pi."productId" = p.id ORDER BY pi.position ASC LIMIT 1)
           ) AS "imageUrl",
           p.id AS "productId", 
           p.name AS "productName"
         FROM product_variants pv
         JOIN products p ON pv."productId" = p.id
         WHERE pv.id = $1`,
        [variantId]
      )

      if (variantRes.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          error: `Product variant with ID ${variantId} does not exist.`,
        })
      }

      const variant = variantRes.rows[0]

      // Stock availability check
      if (variant.stock < quantity) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          error: `Insufficient stock for "${variant.productName}" (${variant.size || 'Standard'}). Available: ${variant.stock}, requested: ${quantity}.`,
        })
      }

      const itemPrice = Number(variant.price)
      subtotal += itemPrice * quantity

      resolvedItems.push({
        productId: variant.productId,
        productVariantId: variant.variantId,
        name: variant.productName,
        price: itemPrice,
        quantity,
        size: variant.size || null,
        color: variant.color || null,
        imageUrl: variant.imageUrl || null,
      })
    }

    // 6. Server-side Coupon & Financial Calculations based on Business Rules:
    let appliedCouponCode: string | null = null
    let discountAmount = 0

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase()
      const couponRes = await client.query(
        `SELECT 
           code, description, discount_type AS "discountType", 
           discount_value AS "discountValue", min_order_amount AS "minOrderAmount", 
           max_discount_amount AS "maxDiscountAmount", is_active AS "isActive", expires_at AS "expiresAt"
         FROM coupons 
         WHERE UPPER(code) = $1 
         LIMIT 1`,
        [cleanCode]
      )

      if (couponRes.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: `Coupon "${cleanCode}" is invalid.` })
      }

      const coupon = couponRes.rows[0]
      if (!coupon.isActive) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: `Coupon "${cleanCode}" is no longer active.` })
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: `Coupon "${cleanCode}" has expired.` })
      }

      const minSpend = Number(coupon.minOrderAmount) || 0
      if (subtotal < minSpend) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          error: `Coupon "${cleanCode}" requires a minimum order of ₹${minSpend}. Your current subtotal is ₹${subtotal}.`,
        })
      }

      if (coupon.discountType === 'PERCENTAGE') {
        const percentDiscount = Math.round((subtotal * Number(coupon.discountValue)) / 100)
        const maxDiscount = coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : Infinity
        discountAmount = Math.min(percentDiscount, maxDiscount)
      } else {
        discountAmount = Math.min(Number(coupon.discountValue), subtotal)
      }

      appliedCouponCode = coupon.code

      // Increment coupon usage count
      await client.query(
        `UPDATE coupons SET usage_count = usage_count + 1 WHERE UPPER(code) = $1`,
        [cleanCode]
      )
    }

    // PREPAID: shippingFee = 0, totalAmount = discountedSubtotal, amountPayableNow = totalAmount, amountDueOnDelivery = 0.
    // COD: shippingFee = 200, totalAmount = discountedSubtotal + 200, amountPayableNow = 200, amountDueOnDelivery = discountedSubtotal.
    const isPrepaid = normalizedPaymentMethod === 'PREPAID'
    const shippingFee = isPrepaid ? 0 : COD_SHIPPING_FEE
    const discountedSubtotal = Math.max(0, subtotal - discountAmount)
    const totalAmount = discountedSubtotal + shippingFee
    const amountPayableNow = isPrepaid ? totalAmount : COD_SHIPPING_FEE
    const amountDueOnDelivery = isPrepaid ? 0 : discountedSubtotal

    const dateNow = new Date()
    const formattedDate = dateNow.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })

    const timeline = [
      { status: 'Order Placed', time: formattedDate, completed: true, description: 'Order created and awaiting payment confirmation.' },
      { status: 'Quality Inspection & Packaging', time: 'Upcoming', completed: false, description: 'Handcrafted inspection and luxury packaging.' },
      { status: 'Dispatched / In Transit', time: 'Upcoming', completed: false, description: 'Express courier dispatch.' },
      { status: 'Out for Delivery', time: 'Upcoming', completed: false, description: 'Courier agent delivers package to doorstep.' },
      { status: 'Delivered', time: 'Upcoming', completed: false, description: 'Package safely delivered.' },
    ]

    // 7. Insert Order Row with retry on orderNumber collision (simple format #01, #02...)
    let createdOrder: any = null
    let attempts = 0
    const maxAttempts = 5
    let candidateOrderNumber = await generateSimpleOrderNumber(client)

    while (attempts < maxAttempts && !createdOrder) {
      attempts++
      const orderNumber = candidateOrderNumber

      try {
        const orderInsertRes = await client.query(
          `INSERT INTO orders (
            "orderNumber", "clerkUserId", "userId", "customerName", "customerEmail", "customerPhone",
            "shippingAddress", items, subtotal, "shippingFee", "discountAmount", "totalAmount",
            "amountPayableNow", "amountDueOnDelivery", "paymentMethod", "paymentStatus", "orderStatus",
            "courierName", "trackingNumber", "estimatedDelivery", timeline, notes, "couponCode"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          RETURNING *`,
          [
            orderNumber,
            clerkUserId,
            internalUserId,
            customerName.trim(),
            customerEmail.trim().toLowerCase(),
            customerPhone.trim(),
            JSON.stringify(sanitizedShippingAddress),
            JSON.stringify(resolvedItems),
            subtotal,
            shippingFee,
            discountAmount,
            totalAmount,
            amountPayableNow,
            amountDueOnDelivery,
            normalizedPaymentMethod,
            'PENDING',
            'PENDING',
            null, // courierName - assigned when actually shipped by admin
            null, // trackingNumber - assigned when actually shipped by admin
            '3–5 Business Days',
            JSON.stringify(timeline),
            notes && typeof notes === 'string' ? notes.trim().slice(0, 500) : null,
            appliedCouponCode,
          ]
        )
        createdOrder = orderInsertRes.rows[0]
      } catch (insertErr: any) {
        if (insertErr.code === '23505' && attempts < maxAttempts) {
          console.warn(`[POST /api/orders] orderNumber collision on attempt ${attempts} (${orderNumber}), retrying with next number...`)
          const currentNum = parseInt(orderNumber, 10) || attempts
          candidateOrderNumber = String(currentNum + 1).padStart(2, '0')
          continue
        }
        throw insertErr
      }
    }

    if (!createdOrder) {
      throw new Error('Failed to generate a unique order number after multiple attempts.')
    }

    // 8. Insert into order_items relational table
    for (const item of resolvedItems) {
      await client.query(
        `INSERT INTO order_items (
          "orderId", "productId", "productVariantId", name, price, quantity, size, color, "imageUrl"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          createdOrder.id,
          item.productId,
          item.productVariantId,
          item.name,
          item.price,
          item.quantity,
          item.size,
          item.color,
          item.imageUrl,
        ]
      )
    }

    await client.query('COMMIT')

    // Fire-and-forget: Notify admin and customer for COD orders right after order is saved
    if (normalizedPaymentMethod === 'COD') {
      notifyNewOrder(createdOrder).catch(err => {
        console.error('[POST /api/orders] Failed to send COD new order notification:', err)
      })
      notifyCustomerOrderConfirmation(createdOrder).catch(err => {
        console.error('[POST /api/orders] Failed to send COD customer confirmation:', err)
      })
    }

    return res.status(201).json({
      order: createdOrder,
    })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error('[POST /api/orders] Transaction error:', err)
    return res.status(500).json({ error: 'Internal server error while placing order.' })
  } finally {
    client.release()
  }
})

/**
 * GET /api/orders/user/:userIdOrEmail
 * Get list of orders for a signed-in user by Clerk User ID or Email (real-time).
 */
app.get('/api/orders/user/:userIdOrEmail', async (req, res) => {
  const { userIdOrEmail } = req.params
  const auth = getAuth(req)
  const clerkUserId = auth?.userId
  const queryEmail = (req.query.email as string | undefined)?.toLowerCase().trim()
  const queryPhone = (req.query.phone as string | undefined)?.replace(/\D/g, '')

  try {
    const conditions: string[] = []
    const params: any[] = []

    if (clerkUserId) {
      params.push(clerkUserId)
      conditions.push(`"clerkUserId" = $${params.length}`)
    }

    if (userIdOrEmail && userIdOrEmail !== 'my-orders') {
      const cleanIdent = userIdOrEmail.trim()
      params.push(cleanIdent)
      params.push(cleanIdent.toLowerCase())
      conditions.push(`"clerkUserId" = $${params.length - 1} OR LOWER("customerEmail") = $${params.length}`)
    }

    if (queryEmail) {
      params.push(queryEmail)
      conditions.push(`LOWER("customerEmail") = $${params.length}`)
    }

    if (queryPhone && queryPhone.length >= 10) {
      params.push(`%${queryPhone.slice(-10)}%`)
      conditions.push(`REGEXP_REPLACE(COALESCE("customerPhone", ''), '\\D', '', 'g') LIKE $${params.length}`)
    }

    if (conditions.length === 0) {
      return res.json({ orders: [] })
    }

    const { rows } = await pool.query(
      `SELECT * FROM orders
       WHERE ${conditions.join(' OR ')}
       ORDER BY "createdAt" DESC`,
      params
    )

    // Deduplicate orders if matched across multiple conditions
    const uniqueOrders = Array.from(new Map(rows.map((r) => [r.orderNumber, r])).values())

    res.json({ orders: uniqueOrders })
  } catch (err) {
    console.error('Error fetching user orders:', err)
    res.status(500).json({ error: 'Could not fetch orders' })
  }
})

/**
 * GET /api/orders/track/:orderNumber
 * Public order tracking endpoint by order number
 */
app.get('/api/orders/track/:orderNumber', async (req, res) => {
  const { orderNumber } = req.params
  const phoneOrEmail = String(req.query.verify || '').trim().toLowerCase()

  if (!orderNumber) {
    return res.status(400).json({ error: 'Order number is required' })
  }

  try {
    const rawNum = String(orderNumber).trim()
    const cleanNum = rawNum.replace(/^#+/, '')

    const { rows } = await pool.query(
      `SELECT * FROM orders 
       WHERE UPPER("orderNumber") = UPPER($1) 
          OR UPPER("orderNumber") = UPPER($2) 
          OR UPPER(REPLACE("orderNumber", '#', '')) = UPPER($2) 
       LIMIT 1`,
      [rawNum, cleanNum]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found. Please verify your order number.' })
    }

    const order = rows[0]

    // If verification was provided, check it
    if (phoneOrEmail) {
      const matchEmail = order.customerEmail.toLowerCase() === phoneOrEmail
      const matchPhone = order.customerPhone.replace(/\D/g, '').includes(phoneOrEmail.replace(/\D/g, ''))
      if (!matchEmail && !matchPhone && phoneOrEmail.length > 3) {
        return res.status(403).json({ error: 'Email or phone number does not match this order.' })
      }
    }

    res.json({ order })
  } catch (err) {
    console.error('Error tracking order:', err)
    res.status(500).json({ error: 'Could not retrieve tracking details' })
  }
})

/**
 * POST /api/orders/:orderNumber/cancel
 * Cancel an order if still in Confirmed/Processing status
 */
app.post('/api/orders/:orderNumber/cancel', async (req, res) => {
  const { orderNumber } = req.params
  const { reason = 'Customer requested cancellation' } = req.body
  const rawNum = String(orderNumber ?? '').trim()
  const cleanNum = rawNum.replace(/^#+/, '')

  try {
    const checkRes = await pool.query(
      `SELECT * FROM orders 
       WHERE UPPER("orderNumber") = UPPER($1) 
          OR UPPER("orderNumber") = UPPER($2) 
          OR UPPER(REPLACE("orderNumber", '#', '')) = UPPER($2)`,
      [rawNum, cleanNum]
    )

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const order = checkRes.rows[0]
    if (['Shipped', 'In Transit', 'Out for Delivery', 'Delivered'].includes(order.orderStatus)) {
      return res.status(400).json({
        error: `Order cannot be cancelled automatically because it is already ${order.orderStatus}. Please contact support.`,
      })
    }

    const updatedTimeline = [
      ...(Array.isArray(order.timeline) ? order.timeline : []),
      {
        status: 'Order Cancelled',
        time: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        completed: true,
        description: `Cancelled: ${reason}`,
      },
    ]

    const { rows } = await pool.query(
      `UPDATE orders
       SET "orderStatus" = 'Cancelled', timeline = $1, notes = $2, "updatedAt" = now()
       WHERE id = $3
       RETURNING *`,
      [JSON.stringify(updatedTimeline), `Cancelled: ${reason}`, order.id]
    )

    res.json({ order: rows[0], message: 'Order has been cancelled successfully.' })
  } catch (err) {
    console.error('Error cancelling order:', err)
    res.status(500).json({ error: 'Could not cancel order' })
  }
})

/**
 * PATCH /api/orders/:orderNumber/whatsapp-confirmed
 */
app.patch('/api/orders/:orderNumber/whatsapp-confirmed', requireLogin, requireAdmin, async (req, res) => {
  const orderNumber = String(req.params.orderNumber ?? '').trim()
  try {
    const { rows } = await pool.query(
      `UPDATE orders
       SET 
         "whatsappConfirmedAt" = NOW(),
         "updatedAt" = NOW()
       WHERE UPPER("orderNumber") = UPPER($1)
       RETURNING *`,
      [orderNumber]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json({
      success: true,
      order: rows[0],
      message: `WhatsApp confirmation timestamp recorded for #${orderNumber}`,
    })
  } catch (err: any) {
    console.error('Error recording WhatsApp confirmation:', err)
    res.status(500).json({ error: err.message || 'Failed to record WhatsApp confirmation' })
  }
})

/**
 * PATCH /api/orders/:orderNumber/whatsapp-shipped
 */
app.patch('/api/orders/:orderNumber/whatsapp-shipped', requireLogin, requireAdmin, async (req, res) => {
  const orderNumber = String(req.params.orderNumber ?? '').trim()
  const { courierName, trackingId, trackingUrl } = req.body

  if (!courierName || typeof courierName !== 'string' || !courierName.trim()) {
    return res.status(400).json({ error: 'Courier name is required.' })
  }

  if (!trackingId || typeof trackingId !== 'string' || !trackingId.trim()) {
    return res.status(400).json({ error: 'Tracking ID is required.' })
  }

  if (!trackingUrl || typeof trackingUrl !== 'string' || !trackingUrl.trim() || !/^https?:\/\//i.test(trackingUrl.trim())) {
    return res.status(400).json({ error: 'Tracking URL is required and must start with http:// or https://' })
  }

  try {
    const currentRes = await pool.query(
      `SELECT timeline, "orderStatus" FROM orders WHERE UPPER("orderNumber") = UPPER($1) LIMIT 1`,
      [orderNumber]
    )

    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    let timeline = currentRes.rows[0].timeline || []
    if (typeof timeline === 'string') {
      try { timeline = JSON.parse(timeline) } catch (_) { timeline = [] }
    }

    const trimmedCourier = courierName.trim()
    const trimmedTrackingId = trackingId.trim()
    const trimmedTrackingUrl = trackingUrl.trim()

    let newOrderStatus = currentRes.rows[0].orderStatus
    if (newOrderStatus !== 'Delivered' && newOrderStatus !== 'Shipped') {
      newOrderStatus = 'Shipped'
      const nowFormatted = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
      timeline.push({
        status: 'Shipped',
        time: nowFormatted,
        completed: true,
        description: `Dispatched via ${trimmedCourier} (Tracking ID: ${trimmedTrackingId}). WhatsApp shipping update sent.`,
      })
    }

    const { rows } = await pool.query(
      `UPDATE orders
       SET 
         "courierName" = $1,
         "trackingId" = $2,
         "trackingNumber" = COALESCE("trackingNumber", $2),
         "trackingUrl" = $3,
         "whatsappShippedAt" = NOW(),
         "orderStatus" = $4,
         timeline = $5::jsonb,
         "updatedAt" = NOW()
       WHERE UPPER("orderNumber") = UPPER($6)
       RETURNING *`,
      [
        trimmedCourier,
        trimmedTrackingId,
        trimmedTrackingUrl,
        newOrderStatus,
        JSON.stringify(timeline),
        orderNumber,
      ]
    )

    res.json({
      success: true,
      order: rows[0],
      message: `Shipping information and WhatsApp update saved for #${orderNumber}`,
    })
  } catch (err: any) {
    console.error('Error updating WhatsApp shipped status:', err)
    res.status(500).json({ error: err.message || 'Failed to update WhatsApp shipped status' })
  }
})

initDb()

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})