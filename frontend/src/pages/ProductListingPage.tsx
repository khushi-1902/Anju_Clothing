import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { FilterDrawer, FilterIcon } from '../components/FilterDrawer'
import { FilterControls } from '../components/FilterControls'
import { fetchProducts } from '../lib/api'
import type { Product } from '../types'
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  getActiveFilterChips,
  type ProductFilters,
  type FilterFacets,
} from '../utils/productFilters'

export type ListingMode = 'all-products' | 'category' | 'new-arrivals' | 'mega-sale' | 'bestsellers'

interface ProductListingPageProps {
  mode?: ListingMode
}

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total]
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  }
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const DEFAULT_FACETS: FilterFacets = {
  categories: [],
  sizes: [],
  colors: [],
  fabrics: [],
  occasions: [],
  vendors: [],
  price: { min: 500, max: 10000, step: 50 },
  priceRange: { min: 500, max: 10000 },
  stock: { inStock: 0, outOfStock: 0 },
  total: 0,
}

export function ProductListingPage({ mode = 'all-products' }: ProductListingPageProps) {
  const { categorySlug } = useParams<{ categorySlug?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Mode resolution
  const isCategoryMode = mode === 'category' || Boolean(categorySlug)
  const isNewArrivalsMode = mode === 'new-arrivals'
  const isMegaSaleMode = mode === 'mega-sale'
  const isBestsellersMode = mode === 'bestsellers'

  const collectionFilter = useMemo(() => {
    if (isNewArrivalsMode) return 'new-arrivals'
    if (isMegaSaleMode) return 'mega-sale'
    if (isBestsellersMode) return 'bestsellers'
    return searchParams.get('collection') || ''
  }, [isNewArrivalsMode, isMegaSaleMode, isBestsellersMode, searchParams])

  const categoryFilter = useMemo(() => {
    if (isCategoryMode && categorySlug) return categorySlug
    return searchParams.get('category') || 'all'
  }, [isCategoryMode, categorySlug, searchParams])

  // Extract filters from URL search params
  const filters: ProductFilters = useMemo(() => {
    const sizeParam = searchParams.get('size') || searchParams.get('sizes') || ''
    const colorParam = searchParams.get('color') || searchParams.get('colors') || ''
    const fabricParam = searchParams.get('fabric') || searchParams.get('fabrics') || ''
    const occasionParam = searchParams.get('occasion') || searchParams.get('occasions') || ''
    const minPriceParam = searchParams.get('minPrice')
    const maxPriceParam = searchParams.get('maxPrice')
    const inStockParam = searchParams.get('inStock')

    let priceRange: [number, number] | null = null
    if (minPriceParam && maxPriceParam) {
      priceRange = [Number(minPriceParam), Number(maxPriceParam)]
    }

    return {
      category: categoryFilter,
      collection: collectionFilter,
      title: searchParams.get('q') || searchParams.get('search') || '',
      price: priceRange,
      sizes: sizeParam ? sizeParam.split(',').filter(Boolean) : [],
      colors: colorParam ? colorParam.split(',').filter(Boolean) : [],
      fabrics: fabricParam ? fabricParam.split(',').filter(Boolean) : [],
      occasions: occasionParam ? occasionParam.split(',').filter(Boolean) : [],
      vendors: [],
      stock: inStockParam === 'true' ? 'in-stock' : null,
    }
  }, [searchParams, categoryFilter, collectionFilter])

  const sortBy = searchParams.get('sort') || (isNewArrivalsMode ? 'newest' : isBestsellersMode ? 'popularity' : 'featured')
  const currentPage = Number(searchParams.get('page')) || 1

  // API State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productsList, setProductsList] = useState<Product[]>([])
  const [similarProducts, setSimilarProducts] = useState<Product[]>([])
  const [exactMatch, setExactMatch] = useState<boolean>(true)
  const [facets, setFacets] = useState<FilterFacets>(DEFAULT_FACETS)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [totalPagesCount, setTotalPagesCount] = useState<number>(1)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const itemsPerPage = 12

  // Update URL Search Params helper
  const updateUrlParams = useCallback(
    (newFilters: ProductFilters, newSort?: string, newPage?: number) => {
      const nextParams = new URLSearchParams()

      // Mode-specific preservation
      if (!isCategoryMode && newFilters.category && newFilters.category !== 'all') {
        nextParams.set('category', newFilters.category)
      }

      if (!isNewArrivalsMode && !isMegaSaleMode && !isBestsellersMode && newFilters.collection) {
        nextParams.set('collection', newFilters.collection)
      }

      if (newFilters.sizes.length > 0) {
        nextParams.set('size', newFilters.sizes.join(','))
      }

      if (newFilters.colors.length > 0) {
        nextParams.set('color', newFilters.colors.join(','))
      }

      if (newFilters.fabrics.length > 0) {
        nextParams.set('fabric', newFilters.fabrics.join(','))
      }

      if (newFilters.occasions.length > 0) {
        nextParams.set('occasion', newFilters.occasions.join(','))
      }

      if (newFilters.price) {
        nextParams.set('minPrice', String(newFilters.price[0]))
        nextParams.set('maxPrice', String(newFilters.price[1]))
      }

      if (newFilters.stock === 'in-stock') {
        nextParams.set('inStock', 'true')
      }

      if (newFilters.title) {
        nextParams.set('q', newFilters.title)
      }

      const activeSort = newSort !== undefined ? newSort : sortBy
      if (activeSort && activeSort !== 'featured') {
        nextParams.set('sort', activeSort)
      }

      const activePage = newPage !== undefined ? newPage : 1
      if (activePage > 1) {
        nextParams.set('page', String(activePage))
      }

      setSearchParams(nextParams)
    },
    [isCategoryMode, isNewArrivalsMode, isMegaSaleMode, isBestsellersMode, sortBy, setSearchParams]
  )

  const handleFilterChange = (nextFilters: ProductFilters) => {
    updateUrlParams(nextFilters, sortBy, 1)
  }

  const handleSortChange = (newSort: string) => {
    updateUrlParams(filters, newSort, 1)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPagesCount && newPage !== currentPage) {
      updateUrlParams(filters, sortBy, newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const clearAllFilters = () => {
    const cleared: ProductFilters = {
      ...DEFAULT_FILTERS,
      category: isCategoryMode ? categoryFilter : 'all',
      collection: collectionFilter,
    }
    updateUrlParams(cleared, sortBy, 1)
  }

  // AbortController ref to cancel stale requests
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadData = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    setError(null)

    fetchProducts({
      page: currentPage,
      limit: itemsPerPage,
      category: filters.category,
      collection: filters.collection,
      sizes: filters.sizes,
      colors: filters.colors,
      fabrics: filters.fabrics,
      occasions: filters.occasions,
      stock: filters.stock,
      search: filters.title,
      sort: sortBy,
      minPrice: filters.price?.[0],
      maxPrice: filters.price?.[1],
      signal: controller.signal,
    })
      .then(res => {
        setProductsList(res.products || res.items || [])
        setSimilarProducts(res.similar || [])
        setExactMatch(res.exactMatch !== false)
        if (res.facets) {
          setFacets(res.facets)
        }
        setTotalCount(res.total || 0)
        setTotalPagesCount(res.totalPages || 1)
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          return // request was aborted by newer call
        }
        console.error('Error fetching product catalog:', err)
        setError('Failed to load products. Please check your network connection.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [currentPage, itemsPerPage, filters, sortBy])

  useEffect(() => {
    loadData()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [loadData])

  // Category name lookup
  const categoryFacet = useMemo(() => {
    if (!isCategoryMode || !categorySlug) return null
    return facets.categories.find(
      c =>
        (c.slug && c.slug.toLowerCase() === categorySlug.toLowerCase()) ||
        (c.value && c.value.toLowerCase() === categorySlug.toLowerCase())
    )
  }, [isCategoryMode, categorySlug, facets.categories])

  const categoryName = categoryFacet?.name || categoryFacet?.label || (categorySlug ? categorySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '')

  // Clean category not found validation
  const isCategoryNotFound = isCategoryMode && !loading && !categoryFacet && productsList.length === 0 && !filters.title

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const list = [{ label: 'Home', url: '/' }]
    if (isCategoryMode) {
      list.push({ label: 'All Products', url: '/all-products' })
      list.push({ label: categoryName || 'Category', url: '' })
    } else if (isNewArrivalsMode) {
      list.push({ label: 'New Arrivals', url: '' })
    } else if (isMegaSaleMode) {
      list.push({ label: 'Mega Sale Collection', url: '' })
    } else if (isBestsellersMode) {
      list.push({ label: 'Best Sellers', url: '' })
    } else {
      list.push({ label: 'All Products', url: '' })
    }
    return list
  }, [isCategoryMode, isNewArrivalsMode, isMegaSaleMode, isBestsellersMode, categoryName])

  // Heading and Subheading
  const { heading, subheading, badge } = useMemo(() => {
    if (isCategoryMode) {
      return {
        badge: 'Handcrafted Heritage',
        heading: categoryName || 'Category Collection',
        subheading: `Authentic handcrafted ${categoryName || 'ethnic wear'} curated with timeless Indian craftsmanship.`,
      }
    }
    if (isNewArrivalsMode) {
      return {
        badge: '⭐ Fresh Season Drops',
        heading: 'New Arrivals',
        subheading: 'Fresh festive silhouettes & royal ethnic designs newly added to our bridal and party collections.',
      }
    }
    if (isMegaSaleMode) {
      return {
        badge: '🔥 Limited Time Savings',
        heading: 'Mega Sale Collection',
        subheading: 'Exclusive festive offers up to 50% off on luxury suits, anarkalis, and sarees — while stocks last.',
      }
    }
    if (isBestsellersMode) {
      return {
        badge: '👑 Most Celebrated Outfits',
        heading: 'Shop Bestsellers',
        subheading: 'Our most celebrated creations, loved by thousands of happy customers across the globe.',
      }
    }
    return {
      badge: 'Luxury Ethnic Wear',
      heading: 'All Products & Outfits',
      subheading: 'Explore our complete catalog of handcrafted lehengas, anarkalis, sarees, shararas, and festive sets.',
    }
  }, [isCategoryMode, isNewArrivalsMode, isMegaSaleMode, isBestsellersMode, categoryName])

  const chips = useMemo(
    () =>
      getActiveFilterChips(filters, facets, {
        lockCategory: isCategoryMode,
        lockCollection: Boolean(isNewArrivalsMode || isMegaSaleMode || isBestsellersMode),
      }),
    [filters, facets, isCategoryMode, isNewArrivalsMode, isMegaSaleMode, isBestsellersMode]
  )

  const activeCount = countActiveFilters(filters, {
    lockCategory: isCategoryMode,
    lockCollection: Boolean(isNewArrivalsMode || isMegaSaleMode || isBestsellersMode),
  })

  // Pagination bounds
  const startItem = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
  const endItem = Math.min(currentPage * itemsPerPage, totalCount)
  const paginationPages = useMemo(
    () => getPaginationPages(currentPage, totalPagesCount),
    [currentPage, totalPagesCount]
  )

  return (
    <div className="min-h-screen bg-[#faf8f5] py-6 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-4 sm:mb-6">
          <ol className="flex items-center space-x-2 text-xs text-stone-500 font-medium">
            {breadcrumbs.map((item, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <li key={idx} className="flex items-center space-x-2">
                  {idx > 0 && <span className="text-stone-400">/</span>}
                  {item.url && !isLast ? (
                    <Link to={item.url} className="hover:text-[#3e502a] transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-[#3e502a] font-semibold">{item.label}</span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Page Banner Header */}
        <div className="mb-6 sm:mb-8 border-b border-stone-200/80 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3e502a]/10 border border-[#3e502a]/20 text-[#3e502a] text-[11px] font-serif font-bold uppercase tracking-wider mb-2.5">
            {badge}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#2c2420]">
            {heading}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-600 font-serif max-w-2xl leading-relaxed">
            {subheading}
          </p>
        </div>

        {/* Category Not Found State */}
        {isCategoryNotFound ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 sm:p-14 text-center shadow-xs my-8">
            <div className="text-4xl mb-3">🌿</div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2c2420] mb-2">
              Category Not Found
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto mb-6">
              We couldn't find any category matching "{categorySlug}". Explore our complete collection of authentic handcrafted outfits.
            </p>
            <Link
              to="/all-products"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#3e502a] text-white text-xs font-serif font-bold uppercase tracking-wider rounded-xs hover:bg-[#324122] transition-colors"
            >
              <span>Explore All Products</span>
              <span>→</span>
            </Link>
          </div>
        ) : (
          /* Main Layout: Desktop Sidebar + Product Grid */
          <div className="lg:grid lg:grid-cols-4 lg:gap-8 xl:gap-10">
            
            {/* Desktop Sticky Filter Sidebar */}
            <aside className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-3 rounded-2xl bg-white p-5 border border-stone-200/90 shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base font-bold uppercase tracking-wider text-[#3e502a]">
                      Filters
                    </span>
                    {activeCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3e502a] px-1.5 text-[10px] font-bold text-white">
                        {activeCount}
                      </span>
                    )}
                  </div>
                  {activeCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-[11px] font-semibold text-[#3e502a] hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <FilterControls
                  filters={filters}
                  onChange={handleFilterChange}
                  facets={facets}
                  hideCategory={isCategoryMode}
                />
              </div>
            </aside>

            {/* Right Main Column: Toolbar + Chips + Grid + Pagination */}
            <section className="lg:col-span-3">
              
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 bg-white p-3 sm:p-4 rounded-xl border mb-4 shadow-2xs">
                {/* Mobile Filter Toggle */}
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={isFilterOpen}
                  className="lg:hidden inline-flex items-center gap-2 h-9 px-3.5 border border-stone-300 bg-[#faf8f5] text-[#2c2420] text-xs font-bold uppercase tracking-wider hover:bg-stone-100 rounded-xs transition-colors cursor-pointer"
                >
                  <FilterIcon className="w-4 h-4 text-[#3e502a]" />
                  <span>Filters</span>
                  {activeCount > 0 && (
                    <span className="min-w-5 h-5 px-1 rounded-full bg-[#3e502a] text-white text-[10px] font-bold flex items-center justify-center">
                      {activeCount}
                    </span>
                  )}
                </button>

                {/* Visible Results Count text */}
                <div className="text-xs text-stone-600 font-medium" aria-live="polite">
                  {!loading && totalCount > 0 && (
                    <span>
                      Showing <strong>{startItem}-{endItem}</strong> of <strong>{totalCount}</strong> outfits
                    </span>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-dropdown" className="text-xs text-stone-500 font-medium whitespace-nowrap">
                    Sort by:
                  </label>
                  <select
                    id="sort-dropdown"
                    value={sortBy}
                    onChange={e => handleSortChange(e.target.value)}
                    aria-label="Sort products"
                    className="h-9 bg-[#faf8f5] border border-stone-300 text-[#2c2420] text-xs font-semibold px-2.5 rounded-xs focus:outline-hidden focus:border-[#3e502a] cursor-pointer"
                  >
                    <option value="featured">Featured Collection</option>
                    <option value="newest">Newest First</option>
                    <option value="popularity">Most Popular / Bestsellers</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="discount">Highest Discount</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Chips */}
              {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  <span className="text-[11px] font-medium text-stone-500 mr-1">Active:</span>
                  {chips.map(chip => (
                    <span
                      key={chip.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#f4ece1] border border-[#e2d5c3] px-3 py-1 text-xs text-[#2c2420]"
                    >
                      <span>{chip.label}</span>
                      <button
                        type="button"
                        onClick={() => handleFilterChange(chip.remove(filters))}
                        aria-label={`Remove filter: ${chip.label}`}
                        className="text-stone-500 hover:text-red-700 transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs font-semibold text-[#3e502a] underline ml-1 hover:text-[#253218] cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Keyword Search Reminder */}
              {filters.title && (
                <div className="mb-4 flex items-center justify-between bg-white p-3 rounded-lg border border-stone-200">
                  <span className="text-xs text-stone-700">
                    Results for keyword: <strong>"{filters.title}"</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFilterChange({ ...filters, title: '' })}
                    className="text-xs text-[#3e502a] font-semibold underline cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              )}

              {/* Error State with Retry Button */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50/80 p-6 text-center my-6">
                  <p className="text-sm font-semibold text-red-800 mb-3">{error}</p>
                  <button
                    type="button"
                    onClick={loadData}
                    className="px-5 py-2 bg-[#3e502a] text-white text-xs font-bold uppercase tracking-wider rounded-xs hover:bg-[#324122] transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Loading Skeletons */}
              {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse flex flex-col bg-white rounded-2xl p-3 border border-stone-200/80"
                    >
                      <div className="rounded-xl bg-stone-200/70 aspect-[2/3] w-full" />
                      <div className="pt-3 space-y-2">
                        <div className="h-3 bg-stone-200 rounded w-1/3" />
                        <div className="h-4 bg-stone-200 rounded w-3/4" />
                        <div className="h-4 bg-stone-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No Exact Matches Warning & Fallback */}
              {!loading && !exactMatch && similarProducts.length > 0 && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900">
                  <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 mb-1">
                    <span>⚠️</span> No exact matches found for your selected filters
                  </p>
                  <p className="text-xs text-amber-800">
                    We've curated similar handcrafted styles you may love from our collection:
                  </p>
                </div>
              )}

              {/* Product Grid */}
              {!loading && !error && (
                <>
                  {productsList.length === 0 && similarProducts.length === 0 ? (
                    <div className="rounded-2xl border border-stone-200 bg-white p-8 sm:p-14 text-center my-6">
                      <div className="text-4xl mb-3">🔍</div>
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2c2420] mb-2">
                        No outfits found
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto mb-5">
                        Try adjusting your filters, selecting fewer options, or clearing your search.
                      </p>
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="px-6 py-2.5 bg-[#3e502a] text-white text-xs font-serif font-bold uppercase tracking-wider rounded-xs hover:bg-[#324122] transition-colors cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-6">
                      {(exactMatch ? productsList : similarProducts).map(product => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Pagination Bar */}
              {!loading && totalPagesCount > 1 && (
                <nav
                  role="navigation"
                  aria-label="Pagination"
                  className="mt-12 pt-6 border-t border-stone-200 flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:text-stone-300 hover:text-black transition-colors cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    ← Prev
                  </button>

                  <div className="flex items-center gap-1">
                    {paginationPages.map((item, idx) => {
                      if (item === '...') {
                        return (
                          <span
                            key={`dots-${idx}`}
                            className="w-8 h-8 flex items-center justify-center text-xs text-stone-400 select-none"
                          >
                            ...
                          </span>
                        )
                      }
                      const pageNum = item as number
                      const isActive = currentPage === pageNum
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => handlePageChange(pageNum)}
                          aria-current={isActive ? 'page' : undefined}
                          aria-label={`Page ${pageNum}`}
                          className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-xs font-bold rounded-xs transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#3e502a] text-white shadow-xs'
                              : 'text-stone-700 bg-white border border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPagesCount}
                    className="px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:text-stone-300 hover:text-black transition-colors cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    Next →
                  </button>
                </nav>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Mobile Slide-over Drawer */}
      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onChange={handleFilterChange}
        facets={facets}
        resultCount={totalCount}
        hideCategory={isCategoryMode}
        onClearAll={clearAllFilters}
      />
    </div>
  )
}
