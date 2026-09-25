import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { pool } from './db'

const app = express()
const PORT = Number(process.env.PORT ?? 4000)

app.use(compression())
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json())

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
         p."isNewArrival", p."isBestseller", p."isSale", p."createdAt",
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

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
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
         p."isNewArrival", p."isBestseller", p."isSale", p."createdAt",
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

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    res.json({ products })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load bestsellers' })
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
         p."isNewArrival", p."isBestseller", p."isSale", p."createdAt",
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

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    res.json({ products })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load sale products' })
  }
}

app.get('/api/products/sale', handleSaleProducts)
app.get('/api/products/mega-sale', handleSaleProducts)

/**
 * GET /api/products
 * Paginated list of products with filtering, search, and sorting.
 * Query params:
 *   - page (default 1)
 *   - limit (default 9)
 *   - category (slug or name, default all)
 *   - search (keyword)
 *   - sort (alphabetical-az, alphabetical-za, price-low, price-high, newest, rating)
 *   - minPrice, maxPrice
 */
app.get('/api/products', async (req, res) => {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1)
  const requestedLimit = Number.parseInt(String(req.query.limit ?? '9'), 10)
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 9
  const offset = (page - 1) * limit

  const search = String(req.query.search ?? '').trim()
  const category = String(req.query.category ?? '').trim()
  const sort = String(req.query.sort ?? 'alphabetical-az')
  const minPrice = req.query.minPrice ? Number.parseInt(String(req.query.minPrice), 10) : null
  const maxPrice = req.query.maxPrice ? Number.parseInt(String(req.query.maxPrice), 10) : null

  const conditions: string[] = ['1=1']
  const params: any[] = []

  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(p.name ILIKE $${params.length} OR p.category ILIKE $${params.length} OR p.fabric ILIKE $${params.length} OR p."descriptionHtml" ILIKE $${params.length})`)
  }

  if (category && category !== 'all') {
    params.push(`%${category.replace(/-/g, ' ')}%`)
    conditions.push(`(p.category ILIKE $${params.length} OR p.handle ILIKE $${params.length})`)
  }

  if (minPrice !== null && !Number.isNaN(minPrice)) {
    params.push(minPrice)
    conditions.push(`p.price >= $${params.length}`)
  }

  if (maxPrice !== null && !Number.isNaN(maxPrice)) {
    params.push(maxPrice)
    conditions.push(`p.price <= $${params.length}`)
  }

  let orderBy = 'p.name ASC'
  if (sort === 'alphabetical-za') orderBy = 'p.name DESC'
  else if (sort === 'price-low') orderBy = 'p.price ASC'
  else if (sort === 'price-high') orderBy = 'p.price DESC'
  else if (sort === 'newest') orderBy = 'p."createdAt" DESC'
  else if (sort === 'featured') orderBy = 'p."isBestseller" DESC, p."isNewArrival" DESC, p."createdAt" DESC'

  const whereClause = conditions.join(' AND ')

  try {
    params.push(limit)
    const limitParamIdx = params.length
    params.push(offset)
    const offsetParamIdx = params.length

    const { rows } = await pool.query(
      `SELECT
         p.id, p.handle, p.name, p.category, p.fabric, p.price, p."comparePrice",
         p."isNewArrival", p."isBestseller", p."isSale", p."createdAt",
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
       LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
      params,
    )

    const total = rows.length > 0 ? Number.parseInt(String(rows[0].total_count), 10) : 0
    const totalPages = Math.ceil(total / limit) || 1

    const products = rows.map(({ total_count, ...p }) => ({
      ...p,
      discountPercent:
        p.comparePrice && p.comparePrice > p.price
          ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
          : 0,
    }))

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    res.json({
      products,
      total,
      page,
      limit,
      totalPages,
    })
  } catch (err) {
    console.error(err)
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
         p.price, p."comparePrice", p."isNewArrival", p."isBestseller", p."isSale", p."createdAt",
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
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
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
    `)
  } catch (err) {
    console.error('Error initializing product_reviews table:', err)
  }
}
initDb()

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})