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
import { initSettingsTable } from './initSettingsTable'
import { COD_SHIPPING_FEE } from './config/pricing'

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

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
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
 * GET /api/categories
 * Returns list of distinct categories with representative image, item count, and slug.
 */
app.get('/api/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         p.category AS name,
         LOWER(REGEXP_REPLACE(REGEXP_REPLACE(p.category, '[&]', 'and', 'g'), '[^a-zA-Z0-9]+', '-', 'g')) AS slug,
         COUNT(p.id)::int AS "itemCount",
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
       WHERE p.category IS NOT NULL AND TRIM(p.category) != ''
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

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
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
 * Helper to generate unique order reference codes.
 * e.g. AC-M1A2B3-7849
 */
function generateOrderNumber(): string {
  const timestampPart = Date.now().toString(36).toUpperCase()
  const randomPart = Math.floor(1000 + Math.random() * 9000)
  return `AC-${timestampPart}-${randomPart}`
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

    // 6. Server-side Financial Calculations based on Business Rules:
    // PREPAID: shippingFee = 0, totalAmount = subtotal, amountPayableNow = subtotal, amountDueOnDelivery = 0.
    // COD: shippingFee = 200, totalAmount = subtotal + 200, amountPayableNow = 200, amountDueOnDelivery = subtotal.
    const isPrepaid = normalizedPaymentMethod === 'PREPAID'
    const shippingFee = isPrepaid ? 0 : COD_SHIPPING_FEE
    const discountAmount = 0
    const totalAmount = subtotal + shippingFee
    const amountPayableNow = isPrepaid ? subtotal : COD_SHIPPING_FEE
    const amountDueOnDelivery = isPrepaid ? 0 : subtotal

    const trackingNumber = `BLUEDART-${Math.floor(10000000 + Math.random() * 90000000)}`

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

    // 7. Insert Order Row with retry on orderNumber collision
    let createdOrder: any = null
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts && !createdOrder) {
      attempts++
      const orderNumber = generateOrderNumber()

      try {
        const orderInsertRes = await client.query(
          `INSERT INTO orders (
            "orderNumber", "clerkUserId", "userId", "customerName", "customerEmail", "customerPhone",
            "shippingAddress", items, subtotal, "shippingFee", "discountAmount", "totalAmount",
            "amountPayableNow", "amountDueOnDelivery", "paymentMethod", "paymentStatus", "orderStatus",
            "courierName", "trackingNumber", "estimatedDelivery", timeline, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
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
            'Blue Dart Express',
            trackingNumber,
            '3–5 Business Days',
            JSON.stringify(timeline),
            notes && typeof notes === 'string' ? notes.trim().slice(0, 500) : null,
          ]
        )
        createdOrder = orderInsertRes.rows[0]
      } catch (insertErr: any) {
        if (insertErr.code === '23505' && attempts < maxAttempts) {
          console.warn(`[POST /api/orders] orderNumber collision on attempt ${attempts}, retrying...`)
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
 * Get list of orders for a signed-in user by Clerk User ID or Email
 */
app.get('/api/orders/user/:userIdOrEmail', async (req, res) => {
  const { userIdOrEmail } = req.params
  if (!userIdOrEmail) {
    return res.status(400).json({ error: 'User identifier required' })
  }

  try {
    const { rows } = await pool.query(
      `SELECT * FROM orders
       WHERE "clerkUserId" = $1 OR "customerEmail" ILIKE $1
       ORDER BY "createdAt" DESC`,
      [userIdOrEmail.trim()]
    )

    res.json({ orders: rows })
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
    const { rows } = await pool.query(
      `SELECT * FROM orders WHERE UPPER("orderNumber") = UPPER($1) LIMIT 1`,
      [orderNumber.trim()]
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

  try {
    const checkRes = await pool.query(
      'SELECT * FROM orders WHERE UPPER("orderNumber") = UPPER($1)',
      [orderNumber.trim()]
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
       WHERE UPPER("orderNumber") = UPPER($3)
       RETURNING *`,
      [JSON.stringify(updatedTimeline), `Cancelled: ${reason}`, orderNumber.trim()]
    )

    res.json({ order: rows[0], message: 'Order has been cancelled successfully.' })
  } catch (err) {
    console.error('Error cancelling order:', err)
    res.status(500).json({ error: 'Could not cancel order' })
  }
})

initDb()

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})