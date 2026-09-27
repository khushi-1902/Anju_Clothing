import { Router, Request, Response } from 'express'
import { pool } from '../../db'

export const adminProductsRouter = Router()

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

/**
 * GET /api/admin/products
 * Returns all products with their images, variants, and stock counts.
 */
adminProductsRouter.get('/', async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined
  const category = req.query.category as string | undefined

  try {
    let whereClause = ''
    const params: any[] = []

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`)
      whereClause += ` WHERE (LOWER(p.name) LIKE $${params.length} OR LOWER(p.handle) LIKE $${params.length} OR LOWER(COALESCE(p.fabric, '')) LIKE $${params.length})`
    }

    if (category && category !== 'all') {
      params.push(category)
      whereClause += whereClause ? ` AND p.category = $${params.length}` : ` WHERE p.category = $${params.length}`
    }

    const { rows } = await pool.query(
      `SELECT
         p.id, p.handle, p.name, p.category, p.fabric, p.work, p."descriptionHtml", p.price, p."comparePrice",
         p."isNewArrival", p."isBestseller", p."isSale", p."createdAt",
         COALESCE((
           SELECT json_agg(json_build_object('id', i.id, 'url', i.url, 'alt', i.alt, 'position', i.position) ORDER BY i.position)
           FROM product_images i WHERE i."productId" = p.id
         ), '[]'::json) AS images,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', v.id, 'size', v.size, 'color', v.color, 'price', v.price,
             'compareAtPrice', v."compareAtPrice", 'stock', v.stock, 'imageUrl', v."imageUrl"
           ) ORDER BY v.id)
           FROM product_variants v WHERE v."productId" = p.id
         ), '[]'::json) AS variants,
         COALESCE((SELECT SUM(stock)::int FROM product_variants WHERE "productId" = p.id), 0) AS "totalStock"
       FROM products p
       ${whereClause}
       ORDER BY p."createdAt" DESC`,
      params
    )

    res.json({ products: rows, total: rows.length })
  } catch (err: any) {
    console.error('Error fetching admin products:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch products' })
  }
})

/**
 * GET /api/admin/products/:idOrHandle
 * Single product detail for editing.
 */
adminProductsRouter.get('/:idOrHandle', async (req: Request, res: Response) => {
  const { idOrHandle } = req.params
  const isNumeric = /^\d+$/.test(idOrHandle)

  try {
    const { rows } = await pool.query(
      `SELECT
         p.id, p.handle, p.name, p.category, p.fabric, p.work, p."descriptionHtml", p.price, p."comparePrice",
         p."isNewArrival", p."isBestseller", p."isSale", p."createdAt",
         COALESCE((
           SELECT json_agg(json_build_object('id', i.id, 'url', i.url, 'alt', i.alt, 'position', i.position) ORDER BY i.position)
           FROM product_images i WHERE i."productId" = p.id
         ), '[]'::json) AS images,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', v.id, 'size', v.size, 'color', v.color, 'price', v.price,
             'compareAtPrice', v."compareAtPrice", 'stock', v.stock, 'imageUrl', v."imageUrl"
           ) ORDER BY v.id)
           FROM product_variants v WHERE v."productId" = p.id
         ), '[]'::json) AS variants,
         COALESCE((SELECT SUM(stock)::int FROM product_variants WHERE "productId" = p.id), 0) AS "totalStock"
       FROM products p
       WHERE ${isNumeric ? 'p.id = $1' : 'p.handle = $1'}
       LIMIT 1`,
      [isNumeric ? Number(idOrHandle) : idOrHandle]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }

    res.json({ product: rows[0] })
  } catch (err: any) {
    console.error('Error fetching product detail:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch product details' })
  }
})

/**
 * POST /api/admin/products
 * Create a new product with images and variants in a transaction.
 */
adminProductsRouter.post('/', async (req: Request, res: Response) => {
  const client = await pool.connect()

  try {
    const {
      name,
      handle: inputHandle,
      category,
      fabric,
      work,
      descriptionHtml,
      price,
      comparePrice,
      isNewArrival = false,
      isBestseller = false,
      isSale = false,
      images = [],
      variants = [],
    } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product title is required' })
    }

    if (!price || isNaN(Number(price))) {
      return res.status(400).json({ error: 'Valid selling price is required' })
    }

    // Generate unique handle if not provided
    let handle = slugify(inputHandle || name)
    if (!handle) handle = `product-${Date.now()}`

    // Ensure handle uniqueness
    const handleCheck = await client.query(`SELECT id FROM products WHERE handle = $1 LIMIT 1`, [handle])
    if (handleCheck.rows.length > 0) {
      handle = `${handle}-${Date.now().toString().slice(-4)}`
    }

    await client.query('BEGIN')

    // 1. Insert product (matching exact columns)
    const productInsert = await client.query(
      `INSERT INTO products (
         handle, name, category, fabric, work, "descriptionHtml",
         price, "comparePrice", "isNewArrival", "isBestseller", "isSale",
         "createdAt"
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING id`,
      [
        handle,
        name.trim(),
        category || 'Sarees',
        fabric || null,
        work || null,
        descriptionHtml || null,
        Math.round(Number(price)),
        comparePrice ? Math.round(Number(comparePrice)) : null,
        Boolean(isNewArrival),
        Boolean(isBestseller),
        Boolean(isSale),
      ]
    )

    const productId = productInsert.rows[0].id

    // 2. Insert images (matching exact columns: "productId", url, alt, position)
    if (Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const url = typeof img === 'string' ? img : img.url
        const alt = typeof img === 'object' ? img.alt || name : name
        const position = typeof img === 'object' && img.position != null ? img.position : i

        if (url && url.trim()) {
          await client.query(
            `INSERT INTO product_images ("productId", url, alt, position)
             VALUES ($1, $2, $3, $4)`,
            [productId, url.trim(), alt, position]
          )
        }
      }
    }

    // 3. Insert variants (matching exact columns: "productId", size, color, price, "compareAtPrice", stock, "imageUrl")
    const variantList = Array.isArray(variants) && variants.length > 0
      ? variants
      : [{ size: 'Free Size', color: null, price: Number(price), compareAtPrice: comparePrice ? Number(comparePrice) : null, stock: 10 }]

    for (const v of variantList) {
      await client.query(
        `INSERT INTO product_variants (
           "productId", size, color, price, "compareAtPrice", stock, "imageUrl"
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          productId,
          v.size || 'Free Size',
          v.color || null,
          v.price != null ? Math.round(Number(v.price)) : Math.round(Number(price)),
          v.compareAtPrice != null ? Math.round(Number(v.compareAtPrice)) : (comparePrice ? Math.round(Number(comparePrice)) : null),
          v.stock != null ? Number(v.stock) : 10,
          v.imageUrl || null,
        ]
      )
    }

    await client.query('COMMIT')

    // 4. Fetch full created product
    const { rows } = await client.query(
      `SELECT
         p.id, p.handle, p.name, p.category, p.fabric, p.work, p."descriptionHtml", p.price, p."comparePrice",
         p."isNewArrival", p."isBestseller", p."isSale", p."createdAt",
         COALESCE((
           SELECT json_agg(json_build_object('id', i.id, 'url', i.url, 'alt', i.alt, 'position', i.position) ORDER BY i.position)
           FROM product_images i WHERE i."productId" = p.id
         ), '[]'::json) AS images,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', v.id, 'size', v.size, 'color', v.color, 'price', v.price,
             'compareAtPrice', v."compareAtPrice", 'stock', v.stock, 'imageUrl', v."imageUrl"
           ) ORDER BY v.id)
           FROM product_variants v WHERE v."productId" = p.id
         ), '[]'::json) AS variants,
         COALESCE((SELECT SUM(stock)::int FROM product_variants WHERE "productId" = p.id), 0) AS "totalStock"
       FROM products p
       WHERE p.id = $1`,
      [productId]
    )

    res.status(201).json({ success: true, product: rows[0] })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error('Error creating product:', err)
    res.status(500).json({ error: err.message || 'Failed to create product' })
  } finally {
    client.release()
  }
})

/**
 * PUT /api/admin/products/:id
 * Update product, images, and variants.
 */
adminProductsRouter.put('/:id', async (req: Request, res: Response) => {
  const productId = Number(req.params.id)
  if (isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  const client = await pool.connect()

  try {
    const {
      name,
      handle: inputHandle,
      category,
      fabric,
      work,
      descriptionHtml,
      price,
      comparePrice,
      isNewArrival = false,
      isBestseller = false,
      isSale = false,
      images,
      variants,
    } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product title is required' })
    }

    let handle = inputHandle ? slugify(inputHandle) : slugify(name)
    if (!handle) handle = `product-${productId}`

    // Ensure handle uniqueness across other products
    const handleCheck = await client.query(
      `SELECT id FROM products WHERE handle = $1 AND id != $2 LIMIT 1`,
      [handle, productId]
    )
    if (handleCheck.rows.length > 0) {
      handle = `${handle}-${Date.now().toString().slice(-4)}`
    }

    await client.query('BEGIN')

    // 1. Update product main record
    const updateRes = await client.query(
      `UPDATE products
       SET handle = $1,
           name = $2,
           category = $3,
           fabric = $4,
           work = $5,
           "descriptionHtml" = $6,
           price = $7,
           "comparePrice" = $8,
           "isNewArrival" = $9,
           "isBestseller" = $10,
           "isSale" = $11
       WHERE id = $12
       RETURNING id`,
      [
        handle,
        name.trim(),
        category || 'Sarees',
        fabric || null,
        work || null,
        descriptionHtml || null,
        Math.round(Number(price)),
        comparePrice ? Math.round(Number(comparePrice)) : null,
        Boolean(isNewArrival),
        Boolean(isBestseller),
        Boolean(isSale),
        productId,
      ]
    )

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Product not found' })
    }

    // 2. Sync images if provided
    if (Array.isArray(images)) {
      await client.query(`DELETE FROM product_images WHERE "productId" = $1`, [productId])

      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const url = typeof img === 'string' ? img : img.url
        const alt = typeof img === 'object' ? img.alt || name : name
        const position = typeof img === 'object' && img.position != null ? img.position : i

        if (url && url.trim()) {
          await client.query(
            `INSERT INTO product_images ("productId", url, alt, position)
             VALUES ($1, $2, $3, $4)`,
            [productId, url.trim(), alt, position]
          )
        }
      }
    }

    // 3. Sync variants if provided
    if (Array.isArray(variants)) {
      await client.query(`DELETE FROM product_variants WHERE "productId" = $1`, [productId])

      for (const v of variants) {
        await client.query(
          `INSERT INTO product_variants (
             "productId", size, color, price, "compareAtPrice", stock, "imageUrl"
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            productId,
            v.size || 'Free Size',
            v.color || null,
            v.price != null ? Math.round(Number(v.price)) : Math.round(Number(price)),
            v.compareAtPrice != null ? Math.round(Number(v.compareAtPrice)) : (comparePrice ? Math.round(Number(comparePrice)) : null),
            v.stock != null ? Number(v.stock) : 10,
            v.imageUrl || null,
          ]
        )
      }
    }

    await client.query('COMMIT')

    // 4. Return updated product
    const { rows } = await client.query(
      `SELECT
         p.id, p.handle, p.name, p.category, p.fabric, p.work, p."descriptionHtml", p.price, p."comparePrice",
         p."isNewArrival", p."isBestseller", p."isSale", p."createdAt",
         COALESCE((
           SELECT json_agg(json_build_object('id', i.id, 'url', i.url, 'alt', i.alt, 'position', i.position) ORDER BY i.position)
           FROM product_images i WHERE i."productId" = p.id
         ), '[]'::json) AS images,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', v.id, 'size', v.size, 'color', v.color, 'price', v.price,
             'compareAtPrice', v."compareAtPrice", 'stock', v.stock, 'imageUrl', v."imageUrl"
           ) ORDER BY v.id)
           FROM product_variants v WHERE v."productId" = p.id
         ), '[]'::json) AS variants,
         COALESCE((SELECT SUM(stock)::int FROM product_variants WHERE "productId" = p.id), 0) AS "totalStock"
       FROM products p
       WHERE p.id = $1`,
      [productId]
    )

    res.json({ success: true, product: rows[0] })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error('Error updating product:', err)
    res.status(500).json({ error: err.message || 'Failed to update product' })
  } finally {
    client.release()
  }
})

/**
 * DELETE /api/admin/products/:id
 * Cascades delete images, variants, and product.
 */
adminProductsRouter.delete('/:id', async (req: Request, res: Response) => {
  const productId = Number(req.params.id)
  if (isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(`DELETE FROM product_images WHERE "productId" = $1`, [productId])
    await client.query(`DELETE FROM product_variants WHERE "productId" = $1`, [productId])
    const delRes = await client.query(`DELETE FROM products WHERE id = $1 RETURNING id, name`, [productId])

    if (delRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Product not found' })
    }

    await client.query('COMMIT')

    res.json({
      success: true,
      message: `Product "${delRes.rows[0].name}" deleted successfully`,
      deletedId: productId,
    })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error('Error deleting product:', err)
    res.status(500).json({ error: err.message || 'Failed to delete product' })
  } finally {
    client.release()
  }
})
