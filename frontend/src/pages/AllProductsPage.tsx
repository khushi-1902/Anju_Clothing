import { useState, useMemo, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { FilterDrawer, FilterIcon } from '../components/FilterDrawer'
import { PRODUCTS, CATEGORIES } from '../data/products'
import { useShop } from '../context/ShopContext'
import {
  DEFAULT_FILTERS,
  applyFilters,
  countActiveFilters,
  getActiveFilterChips,
  getFacets,
  type ProductFilters,
} from '../utils/productFilters'

export function AllProductsPage() {
  const { categorySlug } = useParams<{ categorySlug?: string }>()
  const [searchParams] = useSearchParams()
  const { selectedCategory, searchQuery, setSearchQuery } = useShop()

  const urlCategory = categorySlug || searchParams.get('category') || selectedCategory || 'all'

  // All filter state lives in one object — this is what you'll send to the backend
  const [filters, setFilters] = useState<ProductFilters>({
    ...DEFAULT_FILTERS,
    category: urlCategory,
  })

  useEffect(() => {
    if (urlCategory) {
      setFilters(prev => ({ ...prev, category: urlCategory }))
    }
  }, [urlCategory])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [sortBy, setSortBy] = useState<string>('alphabetical-az')
  const [currentPageNum, setCurrentPageNum] = useState(1)

  const itemsPerPage = 9

  // Options + counts shown in the drawer.
  // BACKEND: replace with the facets returned by your API (same FilterFacets shape).
  const facets = useMemo(() => getFacets(PRODUCTS, CATEGORIES), [])

  // ── BACKEND HOOK-UP ─────────────────────────────────────────────────────────
  // `filters`, `searchQuery`, `sortBy` and `currentPageNum` are the full query state.
  // To switch to the API, build the query and fetch whenever it changes:
  //
  //   import { buildFilterQuery } from '../utils/productFilters'
  //   const query = buildFilterQuery(filters, {
  //     search: searchQuery, sort: sortBy, page: currentPageNum, limit: itemsPerPage,
  //   })
  //   useEffect(() => {
  //     fetch(`/api/products?${query}`).then(r => r.json()).then(setResult)  // { products, total }
  //   }, [query])
  //
  // Then render `result.products` and use `result.total` for the counts and pagination,
  // instead of the client-side filtering below.
  // ────────────────────────────────────────────────────────────────────────────

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return applyFilters(PRODUCTS, filters)
      .filter(product => {
        if (!q) return true
        return (
          product.name.toLowerCase().includes(q) ||
          product.category.toLowerCase().includes(q) ||
          (product.description && product.description.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => {
        if (sortBy === 'alphabetical-az') return a.name.localeCompare(b.name)
        if (sortBy === 'alphabetical-za') return b.name.localeCompare(a.name)
        if (sortBy === 'price-low') return a.price - b.price
        if (sortBy === 'price-high') return b.price - a.price
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
        return 0
      })
  }, [filters, searchQuery, sortBy])

  // Any change to what's being shown sends the user back to page 1
  useEffect(() => {
    setCurrentPageNum(1)
  }, [filters, searchQuery, sortBy])

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1
  const paginatedProducts = filteredProducts.slice(
    (currentPageNum - 1) * itemsPerPage,
    currentPageNum * itemsPerPage
  )

  const activeCount = countActiveFilters(filters)
  const chips = useMemo(() => getActiveFilterChips(filters, facets), [filters, facets])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPageNum(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const clearAllFilters = () => setFilters({ ...DEFAULT_FILTERS })

  return (
    <div className="min-h-screen py-8 sm:py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Toolbar: Filter button (left) + Sort (right) */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isFilterOpen}
            className="inline-flex items-center gap-2 h-10 px-4 border border-black bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <FilterIcon />
            <span>Filter</span>
            {activeCount > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-olive text-white text-[10px] font-bold flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <label htmlFor="sort-dropdown" className="hidden sm:block text-xs text-muted font-medium whitespace-nowrap">
              Sort by:
            </label>
            <select
              id="sort-dropdown"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              aria-label="Sort products"
              className="h-10 min-w-0 max-w-44 sm:max-w-none bg-white border border-gray-300 text-charcoal text-xs font-semibold px-3 focus:outline-none focus:border-olive cursor-pointer"
            >
              <option value="alphabetical-az">Alphabetically, A-Z</option>
              <option value="alphabetical-za">Alphabetically, Z-A</option>
              <option value="featured">Featured</option>
              <option value="price-low">Price, low to high</option>
              <option value="price-high">Price, high to low</option>
              <option value="rating">Best Rating</option>
            </select>
          </div>
        </div>

        {/* Result count + active filter chips */}
        <div className="flex flex-wrap items-center gap-2 py-4 mb-4">
          <span className="text-xs text-muted mr-1" aria-live="polite">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
          </span>

          {chips.map(chip => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 bg-cream border border-border pl-2.5 pr-1 py-1 text-xs text-charcoal"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => setFilters(chip.remove)}
                aria-label={`Remove filter: ${chip.label}`}
                className="w-5 h-5 flex items-center justify-center text-charcoal hover:text-olive cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </span>
          ))}

          {chips.length > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-1 text-xs text-olive underline font-semibold cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Active Search Query Reminder if applicable */}
        {searchQuery && (
          <div className="mb-6 flex items-center justify-between bg-cream p-3 border border-border">
            <span className="text-xs text-charcoal">
              Showing search results for: <strong>"{searchQuery}"</strong>
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-olive underline font-semibold cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* 3-Column Responsive Product Grid */}
        {paginatedProducts.length === 0 ? (
          <div className="text-center py-24 bg-cream/40 border border-border p-8 space-y-4">
            <div className="text-4xl">🔍</div>
            <h3 className="font-display text-xl font-bold text-charcoal">No outfits found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Please adjust your filters or search keywords to view other styles.
            </p>
            <button
              onClick={() => {
                clearAllFilters()
                setSearchQuery('')
              }}
              className="px-6 py-2 bg-olive text-white text-xs font-bold uppercase tracking-wider hover:bg-olive-dark transition-colors cursor-pointer"
            >
              Show All Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-8 lg:gap-10">
            {paginatedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Pagination (1 2 3 Next →) */}
        {totalPages > 1 && (
          <div className="mt-14 pt-8 border-t border-gray-100 flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(currentPageNum - 1)}
              disabled={currentPageNum === 1}
              className="px-3 py-1.5 text-xs font-semibold text-charcoal disabled:opacity-30 hover:text-olive transition-colors cursor-pointer"
              aria-label="Previous page"
            >
              ← Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                onClick={() => handlePageChange(num)}
                className={`w-8 h-8 flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${currentPageNum === num
                    ? 'bg-black text-white shadow-xs'
                    : 'text-charcoal hover:bg-cream'
                  }`}
              >
                {num}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPageNum + 1)}
              disabled={currentPageNum === totalPages}
              className="px-3 py-1.5 text-xs font-semibold text-charcoal disabled:opacity-30 hover:text-olive transition-colors cursor-pointer"
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Filter drawer */}
      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        facets={facets}
        resultCount={filteredProducts.length}
      />
    </div>
  )
}