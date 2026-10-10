/**
 * Product filtering — types and helpers for filter drawer & chips.
 */

export type StockStatus = 'in-stock' | 'out-of-stock'

export interface ProductFilters {
  /** Category slug, or 'all' */
  category: string
  /** Collection filter ('new-arrivals', 'bestsellers', 'mega-sale', 'sale', '') */
  collection: string
  /** Text matched against product search */
  title: string
  /** [min, max] in rupees, or null when price filter is off */
  price: [number, number] | null
  sizes: string[]
  colors: string[]
  fabrics: string[]
  occasions: string[]
  vendors: string[]
  stock: StockStatus | null
}

export const DEFAULT_FILTERS: ProductFilters = {
  category: 'all',
  collection: '',
  title: '',
  price: null,
  sizes: [],
  colors: [],
  fabrics: [],
  occasions: [],
  vendors: [],
  stock: null,
}

export interface FacetOption {
  value: string
  label: string
  count: number
  slug?: string
  name?: string
}

export interface FilterFacets {
  categories: FacetOption[]
  sizes: FacetOption[]
  colors: FacetOption[]
  fabrics: FacetOption[]
  occasions: FacetOption[]
  vendors: FacetOption[]
  priceRange?: { min: number; max: number; step?: number }
  price?: { min: number; max: number; step: number }
  stock: { inStock: number; outOfStock: number }
  total: number
}

export const normalize = (value: string) => value.trim().toLowerCase()

export function formatPrice(value: number, withDecimals = false) {
  const formatted = value.toLocaleString('en-IN', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  })
  return `Rs. ${formatted}`
}

export function countActiveFilters(
  filters: ProductFilters,
  lockCategoryOrOptions?: boolean | { lockCategory?: boolean; lockCollection?: boolean },
  lockCollectionParam = false
): number {
  let lockCategory = false
  let lockCollection = false

  if (typeof lockCategoryOrOptions === 'object' && lockCategoryOrOptions !== null) {
    lockCategory = Boolean(lockCategoryOrOptions.lockCategory)
    lockCollection = Boolean(lockCategoryOrOptions.lockCollection)
  } else {
    lockCategory = Boolean(lockCategoryOrOptions)
    lockCollection = lockCollectionParam
  }

  return (
    (!lockCategory && filters.category !== 'all' && filters.category !== '' ? 1 : 0) +
    (!lockCollection && filters.collection ? 1 : 0) +
    (filters.title.trim() ? 1 : 0) +
    (filters.price ? 1 : 0) +
    filters.sizes.length +
    filters.colors.length +
    filters.fabrics.length +
    filters.occasions.length +
    filters.vendors.length +
    (filters.stock ? 1 : 0)
  )
}

export interface FilterChip {
  id: string
  label: string
  /** Returns the filters with this one removed */
  remove: (filters: ProductFilters) => ProductFilters
}

export function getActiveFilterChips(
  filters: ProductFilters,
  facets: FilterFacets,
  options: { lockCategory?: boolean; lockCollection?: boolean } = {}
): FilterChip[] {
  const chips: FilterChip[] = []

  const getCatLabel = (val: string) => {
    const found = facets.categories?.find(c => (c.slug || c.value)?.toLowerCase() === val.toLowerCase())
    return found?.name || found?.label || val.replace(/-/g, ' ')
  }

  const labelOf = (list: FacetOption[] | undefined, value: string) =>
    list?.find(o => o.value.toLowerCase() === value.toLowerCase())?.label ?? value

  if (!options.lockCategory && filters.category !== 'all' && filters.category !== '') {
    chips.push({
      id: `category:${filters.category}`,
      label: `Category: ${getCatLabel(filters.category)}`,
      remove: f => ({ ...f, category: 'all' }),
    })
  }

  if (!options.lockCollection && filters.collection) {
    const colLabels: Record<string, string> = {
      'new-arrivals': 'New Arrivals',
      bestsellers: 'Best Sellers',
      sale: 'Mega Sale',
      'mega-sale': 'Mega Sale',
    }
    chips.push({
      id: `collection:${filters.collection}`,
      label: `Collection: ${colLabels[filters.collection] || filters.collection}`,
      remove: f => ({ ...f, collection: '' }),
    })
  }

  if (filters.title.trim()) {
    chips.push({
      id: 'title',
      label: `Search: “${filters.title.trim()}”`,
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
      remove: f => ({ ...f, sizes: f.sizes.filter(v => v.toLowerCase() !== value.toLowerCase()) }),
    })
  )

  filters.colors.forEach(value =>
    chips.push({
      id: `color:${value}`,
      label: `Color: ${labelOf(facets.colors, value)}`,
      remove: f => ({ ...f, colors: f.colors.filter(v => v.toLowerCase() !== value.toLowerCase()) }),
    })
  )

  filters.fabrics.forEach(value =>
    chips.push({
      id: `fabric:${value}`,
      label: `Fabric: ${labelOf(facets.fabrics, value)}`,
      remove: f => ({ ...f, fabrics: f.fabrics.filter(v => v.toLowerCase() !== value.toLowerCase()) }),
    })
  )

  filters.occasions.forEach(value =>
    chips.push({
      id: `occasion:${value}`,
      label: `Occasion: ${labelOf(facets.occasions, value)}`,
      remove: f => ({ ...f, occasions: f.occasions.filter(v => v.toLowerCase() !== value.toLowerCase()) }),
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
      label: filters.stock === 'in-stock' ? 'In stock only' : 'Out of stock',
      remove: f => ({ ...f, stock: null }),
    })
  }

  return chips
}