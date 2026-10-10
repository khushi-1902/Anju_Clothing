import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { FilterDrawer } from '../components/FilterDrawer'
import { HorizontalFilterBar } from '../components/HorizontalFilterBar'
import { fetchProducts } from '../lib/api'
import type { Product } from '../types'
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  getActiveFilterChips,
  type ProductFilters,
  type FilterFacets,
} from '../utils/productFilters'

export type ListingMode = 'all-products' | 'category' | 'new-arrivals' | 'mega-sale' | 'bestsellers' | 'creators-favourite'

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
  const isCreatorsFavouriteMode = mode === 'creators-favourite'

  const collectionFilter = useMemo(() => {
    if (isNewArrivalsMode) return 'new-arrivals'
    if (isMegaSaleMode) return 'mega-sale'
    if (isBestsellersMode) return 'bestsellers'
    if (isCreatorsFavouriteMode) return 'creators-favourite'
    return searchParams.get('collection') || ''
  }, [isNewArrivalsMode, isMegaSaleMode, isBestsellersMode, isCreatorsFavouriteMode, searchParams])

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
    const inStockParam = searchParams.get('inStock') || searchParams.get('stock')

    let priceRange: [number, number] | null = null
    if (minPriceParam && maxPriceParam) {
      priceRange = [Number(minPriceParam), Number(maxPriceParam)]
    }

    return {
      category: categoryFilter,
      collection: collectionFilter,
      title: searchParams.get('q') || searchParams.get('search') || '',
      price: priceRange,
      sizes: sizeParam ? sizeParam.split(',').map(s => s.trim()).filter(Boolean) : [],
      colors: colorParam ? colorParam.split(',').map(s => s.trim()).filter(Boolean) : [],
      fabrics: fabricParam ? fabricParam.split(',').map(s => s.trim()).filter(Boolean) : [],
      occasions: occasionParam ? occasionParam.split(',').map(s => s.trim()).filter(Boolean) : [],
      vendors: [],
      stock: (inStockParam === 'true' || inStockParam === 'in-stock') ? 'in-stock' : null,
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
  const itemsPerPage = isCreatorsFavouriteMode ? 100 : 48

  // Update URL Search Params helper
  const updateUrlParams = useCallback(
    (newFilters: ProductFilters, newSort?: string, newPage?: number) => {
      const nextParams = new URLSearchParams()

      // Mode-specific preservation
      if (!isCategoryMode && newFilters.category && newFilters.category !== 'all') {
        nextParams.set('category', newFilters.category)
      }

      if (!isNewArrivalsMode && !isMegaSaleMode && !isBestsellersMode && !isCreatorsFavouriteMode && newFilters.collection) {
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

      setSearchParams(nextParams, { replace: true })
    },
    [isCategoryMode, isNewArrivalsMode, isMegaSaleMode, isBestsellersMode, isCreatorsFavouriteMode, sortBy, setSearchParams]
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
    if (filters.title) {
      list.push({ label: 'All Products', url: '/all-products' })
      list.push({ label: `Search: "${filters.title}"`, url: '' })
    } else if (isCategoryMode) {
      list.push({ label: 'All Products', url: '/all-products' })
      list.push({ label: categoryName || 'Category', url: '' })
    } else if (isNewArrivalsMode) {
      list.push({ label: 'New Arrivals', url: '' })
    } else if (isMegaSaleMode) {
      list.push({ label: 'Mega Sale Collection', url: '' })
    } else if (isBestsellersMode) {
      list.push({ label: 'Best Sellers', url: '' })
    } else if (isCreatorsFavouriteMode) {
      list.push({ label: "Creators' Favourite Collection", url: '' })
    } else {
      list.push({ label: 'All Products', url: '' })
    }
    return list
  }, [filters.title, isCategoryMode, isNewArrivalsMode, isMegaSaleMode, isBestsellersMode, isCreatorsFavouriteMode, categoryName])

  // Heading
  const heading = useMemo(() => {
    if (filters.title) {
      return `Search Results for "${filters.title}"`
    }
    if (isCategoryMode) {
      return categoryName || 'Category Collection'
    }
    if (isNewArrivalsMode) {
      return 'New Arrivals'
    }
    if (isMegaSaleMode) {
      return 'Mega Sale'
    }
    if (isBestsellersMode) {
      return 'Best Sellers'
    }
    if (isCreatorsFavouriteMode) {
      return "Creators' Favourite Collection"
    }
    return 'All Products'
  }, [filters.title, isCategoryMode, isNewArrivalsMode, isMegaSaleMode, isBestsellersMode, isCreatorsFavouriteMode, categoryName])

  const chips = useMemo(
    () =>
      getActiveFilterChips(filters, facets, {
        lockCategory: isCategoryMode,
        lockCollection: Boolean(isNewArrivalsMode || isMegaSaleMode || isBestsellersMode || isCreatorsFavouriteMode),
      }),
    [filters, facets, isCategoryMode, isNewArrivalsMode, isMegaSaleMode, isBestsellersMode, isCreatorsFavouriteMode]
  )

  const activeCount = countActiveFilters(filters, {
    lockCategory: isCategoryMode,
    lockCollection: Boolean(isNewArrivalsMode || isMegaSaleMode || isBestsellersMode || isCreatorsFavouriteMode),
  })

  // Pagination bounds
  const startItem = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
  const endItem = Math.min(currentPage * itemsPerPage, totalCount)
  const paginationPages = useMemo(
    () => getPaginationPages(currentPage, totalPagesCount),
    [currentPage, totalPagesCount]
  )

  return (
    <div className="min-h-screen bg-[#faf8f5] py-4 sm:py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-3 sm:mb-4">
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

        {/* Attractive Compact Page Header */}
        <div className="mb-4 sm:mb-6 text-center">
          <h1 className="font-display text-xl xs:text-2xl sm:text-3xl md:text-4xl font-semibold text-[#2c2420] tracking-tight px-1 leading-tight">
            {heading}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2 sm:mt-2.5" aria-hidden="true">
            <span className="h-px w-6 sm:w-12 md:w-14 bg-gradient-to-r from-transparent to-[#c9973a]/70" />
            <span className="w-1.5 h-1.5 rotate-45 border border-[#c9973a] bg-[#c9973a]/30" />
            <span className="h-px w-6 sm:w-12 md:w-14 bg-gradient-to-l from-transparent to-[#c9973a]/70" />
          </div>
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
          /* Main Section: Horizontal Filters + Results Count / Chips + Full-width Product Grid */
          <div>
            {/* Modern Horizontal Filter Bar */}
            <HorizontalFilterBar
              filters={filters}
              onChange={handleFilterChange}
              facets={facets}
              activeCount={activeCount}
              onOpenDrawer={() => setIsFilterOpen(true)}
              onClearAll={clearAllFilters}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              hideCategory={isCategoryMode}
            />

            {/* Results Count & Active Filter Chips Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              {/* Visible Results Count */}
              <div className="text-xs text-stone-600 font-medium" aria-live="polite">
                {!loading && totalCount > 0 && (
                  <span>
                    Showing <strong>{startItem}–{endItem}</strong> of <strong>{totalCount}</strong> products
                  </span>
                )}
              </div>

              {/* Active Filter Chips */}
              {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
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
            </div>

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
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
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
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
                    {(exactMatch ? productsList : similarProducts).map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Pagination Bar */}
            {!loading && !isCreatorsFavouriteMode && totalPagesCount > 1 && (
              <nav
                role="navigation"
                aria-label="Pagination"
                className="mt-10 sm:mt-12 pt-6 border-t border-stone-200 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2"
              >
                {/* Prev Button */}
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl disabled:opacity-40 hover:bg-stone-50 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
                  aria-label="Previous page"
                >
                  <span className="text-sm leading-none">‹</span>
                  <span className="hidden xs:inline">Prev</span>
                </button>

                {/* Mobile: Compact Page Numbers (< sm) */}
                <div className="flex sm:hidden items-center gap-1">
                  {Array.from(new Set([1, currentPage, totalPagesCount]))
                    .sort((a, b) => a - b)
                    .map((pageNum, idx, arr) => {
                      const prev = arr[idx - 1]
                      const showEllipsis = prev && pageNum - prev > 1
                      const isActive = currentPage === pageNum
                      return (
                        <div key={pageNum} className="flex items-center gap-1">
                          {showEllipsis && <span className="text-stone-400 text-xs px-0.5 select-none">…</span>}
                          <button
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            aria-current={isActive ? 'page' : undefined}
                            aria-label={`Page ${pageNum}`}
                            className={`min-w-8 h-8 px-2 flex items-center justify-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[#769055] text-white shadow-2xs'
                                : 'text-stone-700 bg-white border border-stone-200 hover:bg-stone-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        </div>
                      )
                    })}
                </div>

                {/* Desktop & Tablet: Full page buttons (sm+) */}
                <div className="hidden sm:flex items-center gap-1.5">
                  {paginationPages.map((item, idx) => {
                    if (item === '...') {
                      return (
                        <span
                          key={`dots-${idx}`}
                          className="w-9 h-9 flex items-center justify-center text-xs text-stone-400 select-none"
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
                        className={`w-9 h-9 flex items-center justify-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#769055] text-white shadow-2xs'
                            : 'text-stone-700 bg-white border border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPagesCount}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl disabled:opacity-40 hover:bg-stone-50 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
                  aria-label="Next page"
                >
                  <span className="hidden xs:inline">Next</span>
                  <span className="text-sm leading-none">›</span>
                </button>
              </nav>
            )}
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

