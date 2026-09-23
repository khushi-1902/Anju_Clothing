/**
 * Product filtering — single source of truth for the filter state.
 *
 * Everything the user can filter by lives in ONE object (`ProductFilters`).
 * Today `applyFilters()` runs it against the local PRODUCTS array.
 * When the backend is ready, send the same object to the API with
 * `buildFilterQuery()` and render whatever comes back — the UI needs no changes.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type StockStatus = 'in-stock' | 'out-of-stock'

export interface ProductFilters {
    /** Category slug, or 'all' */
    category: string
    /** Text matched against the product name */
    title: string
    /** [min, max] in rupees, or null when the price filter is off */
    price: [number, number] | null
    sizes: string[]
    colors: string[]
    vendors: string[]
    stock: StockStatus | null
}

export const DEFAULT_FILTERS: ProductFilters = {
    category: 'all',
    title: '',
    price: null,
    sizes: [],
    colors: [],
    vendors: [],
    stock: null,
}

/**
 * The fields the filters read from a product.
 * `sizes`, `colors`, `vendor` and `inStock` are optional: if your product data
 * doesn't have them yet, the matching drawer section simply stays hidden.
 */
export interface FilterableProduct {
    name: string
    category: string
    categorySlug: string
    price: number
    sizes?: string[]
    colors?: string[]
    vendor?: string
    inStock?: boolean
}

export interface FacetOption {
    /** What gets stored in the filter state and sent to the backend */
    value: string
    /** What the user sees */
    label: string
    count: number
}

/**
 * Everything the drawer needs to render its options.
 * Built from local data now — later this can come straight from an API
 * response (e.g. GET /api/products/facets).
 */
export interface FilterFacets {
    categories: FacetOption[]
    sizes: FacetOption[]
    colors: FacetOption[]
    vendors: FacetOption[]
    price: { min: number; max: number; step: number }
    stock: { inStock: number; outOfStock: number }
    total: number
}

// ─── Small helpers ────────────────────────────────────────────────────────────

export const normalize = (value: string) => value.trim().toLowerCase()

export function formatPrice(value: number, withDecimals = false) {
    const formatted = value.toLocaleString('en-IN', {
        minimumFractionDigits: withDecimals ? 2 : 0,
        maximumFractionDigits: withDecimals ? 2 : 0,
    })
    return `Rs. ${formatted}`
}

const SIZE_ORDER = ['free size', 'xs', 's', 'm', 'l', 'xl', 'xxl', '2xl', '3xl', '4xl', '5xl', 'plus size']

const formatSizeLabel = (raw: string) => {
    const trimmed = raw.trim()
    // "xl" / "Xl" / "XI" style short codes → "XL"; longer names ("Free Size") stay as typed
    return /^[a-z0-9]{1,4}$/i.test(trimmed) ? trimmed.toUpperCase() : trimmed
}

/** Counts how many products carry each value. "Xl" and "XL" are treated as the same option. */
function countBy<T>(
    products: readonly T[],
    pick: (product: T) => string[] | undefined,
    format: (raw: string) => string = raw => raw.trim()
): FacetOption[] {
    const options = new Map<string, FacetOption>()

    for (const product of products) {
        const seenForProduct = new Set<string>()
        for (const raw of pick(product) ?? []) {
            const key = normalize(raw)
            if (!key || seenForProduct.has(key)) continue
            seenForProduct.add(key)

            const existing = options.get(key)
            if (existing) {
                existing.count += 1
            } else {
                const label = format(raw)
                options.set(key, { value: label, label, count: 1 })
            }
        }
    }

    return [...options.values()]
}

// ─── Facets ───────────────────────────────────────────────────────────────────

export function getFacets<T extends FilterableProduct>(
    products: readonly T[],
    categories: readonly { slug: string; name: string }[]
): FilterFacets {
    const prices = products.map(p => p.price).filter(Number.isFinite)
    const rawMin = prices.length ? Math.min(...prices) : 0
    const rawMax = prices.length ? Math.max(...prices) : 0
    const span = rawMax - rawMin
    const step = span > 2000 ? 50 : span > 500 ? 10 : 1
    const min = Math.floor(rawMin / step) * step
    const max = Math.max(Math.ceil(rawMax / step) * step, min + step)

    const sizes = countBy(products, p => p.sizes, formatSizeLabel).sort((a, b) => {
        const ia = SIZE_ORDER.indexOf(normalize(a.value))
        const ib = SIZE_ORDER.indexOf(normalize(b.value))
        if (ia === -1 && ib === -1) return a.label.localeCompare(b.label)
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
    })

    const byLabel = (a: FacetOption, b: FacetOption) => a.label.localeCompare(b.label)
    const outOfStock = products.filter(p => p.inStock === false).length

    return {
        categories: categories.map(c => ({
            value: c.slug,
            label: c.name,
            count: products.filter(p => p.categorySlug === c.slug).length,
        })),
        sizes,
        colors: countBy(products, p => p.colors).sort(byLabel),
        vendors: countBy(products, p => (p.vendor ? [p.vendor] : undefined)).sort(byLabel),
        price: { min, max, step },
        stock: { inStock: products.length - outOfStock, outOfStock },
        total: products.length,
    }
}

// ─── Filtering (client-side, until the backend takes over) ────────────────────

const hasAny = (values: string[] | undefined, selected: Set<string>) =>
    (values ?? []).some(v => selected.has(normalize(v)))

export function applyFilters<T extends FilterableProduct>(
    products: readonly T[],
    filters: ProductFilters
): T[] {
    const title = normalize(filters.title)
    const sizes = new Set(filters.sizes.map(normalize))
    const colors = new Set(filters.colors.map(normalize))
    const vendors = new Set(filters.vendors.map(normalize))

    return products.filter(product => {
        if (filters.category !== 'all' && product.categorySlug !== filters.category) return false
        if (title && !normalize(product.name).includes(title)) return false
        if (filters.price && (product.price < filters.price[0] || product.price > filters.price[1])) return false
        if (sizes.size && !hasAny(product.sizes, sizes)) return false
        if (colors.size && !hasAny(product.colors, colors)) return false
        if (vendors.size && !(product.vendor && vendors.has(normalize(product.vendor)))) return false
        // A product with no `inStock` field is treated as in stock
        if (filters.stock === 'in-stock' && product.inStock === false) return false
        if (filters.stock === 'out-of-stock' && product.inStock !== false) return false
        return true
    })
}

export function countActiveFilters(filters: ProductFilters): number {
    return (
        (filters.category !== 'all' ? 1 : 0) +
        (filters.title.trim() ? 1 : 0) +
        (filters.price ? 1 : 0) +
        filters.sizes.length +
        filters.colors.length +
        filters.vendors.length +
        (filters.stock ? 1 : 0)
    )
}

// ─── Active-filter chips (shown under the toolbar) ────────────────────────────

export interface FilterChip {
    id: string
    label: string
    /** Returns the filters with this one removed */
    remove: (filters: ProductFilters) => ProductFilters
}

export function getActiveFilterChips(filters: ProductFilters, facets: FilterFacets): FilterChip[] {
    const chips: FilterChip[] = []
    const labelOf = (options: FacetOption[], value: string) =>
        options.find(o => o.value === value)?.label ?? value

    if (filters.category !== 'all') {
        chips.push({
            id: `category:${filters.category}`,
            label: labelOf(facets.categories, filters.category),
            remove: f => ({ ...f, category: 'all' }),
        })
    }
    if (filters.title.trim()) {
        chips.push({
            id: 'title',
            label: `Title: “${filters.title.trim()}”`,
            remove: f => ({ ...f, title: '' }),
        })
    }
    if (filters.price) {
        chips.push({
            id: 'price',
            label: `${formatPrice(filters.price[0])} – ${formatPrice(filters.price[1])}`,
            remove: f => ({ ...f, price: null }),
        })
    }
    filters.sizes.forEach(value =>
        chips.push({
            id: `size:${value}`,
            label: `Size: ${labelOf(facets.sizes, value)}`,
            remove: f => ({ ...f, sizes: f.sizes.filter(v => v !== value) }),
        })
    )
    filters.colors.forEach(value =>
        chips.push({
            id: `color:${value}`,
            label: `Color: ${labelOf(facets.colors, value)}`,
            remove: f => ({ ...f, colors: f.colors.filter(v => v !== value) }),
        })
    )
    filters.vendors.forEach(value =>
        chips.push({
            id: `vendor:${value}`,
            label: `Vendor: ${labelOf(facets.vendors, value)}`,
            remove: f => ({ ...f, vendors: f.vendors.filter(v => v !== value) }),
        })
    )
    if (filters.stock) {
        chips.push({
            id: 'stock',
            label: filters.stock === 'in-stock' ? 'In stock' : 'Out of stock',
            remove: f => ({ ...f, stock: null }),
        })
    }

    return chips
}

// ─── Backend hand-off ─────────────────────────────────────────────────────────

/**
 * Turns the filter state into a query string for your API, e.g.
 *
 *   category=lehengas&minPrice=750&maxPrice=3000&sizes=M,L&colors=Pink&stock=in-stock&sort=price-low&page=1&limit=9
 *
 * Multi-value filters (sizes, colors, vendors) are comma-separated.
 * Match them case-insensitively on the server.
 */
export function buildFilterQuery(
    filters: ProductFilters,
    extra: { search?: string; sort?: string; page?: number; limit?: number } = {}
): string {
    const params = new URLSearchParams()

    if (filters.category !== 'all') params.set('category', filters.category)
    if (filters.title.trim()) params.set('title', filters.title.trim())
    if (filters.price) {
        params.set('minPrice', String(filters.price[0]))
        params.set('maxPrice', String(filters.price[1]))
    }
    if (filters.sizes.length) params.set('sizes', filters.sizes.join(','))
    if (filters.colors.length) params.set('colors', filters.colors.join(','))
    if (filters.vendors.length) params.set('vendors', filters.vendors.join(','))
    if (filters.stock) params.set('stock', filters.stock)

    if (extra.search?.trim()) params.set('search', extra.search.trim())
    if (extra.sort) params.set('sort', extra.sort)
    if (extra.page) params.set('page', String(extra.page))
    if (extra.limit) params.set('limit', String(extra.limit))

    return params.toString()
}