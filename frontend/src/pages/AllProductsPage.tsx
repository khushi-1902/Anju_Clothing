import { useState, useMemo, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { FilterDrawer, FilterIcon } from '../components/FilterDrawer'
import { PRODUCTS, CATEGORIES } from '../data/products'
import { useShop } from '../context/ShopContext'
import { fetchProducts } from '../lib/api'
import type { Product } from '../types'
import {
  DEFAULT_FILTERS,
  applyFilters,
  countActiveFilters,
  getActiveFilterChips,
  getFacets,
  type ProductFilters,
} from '../utils/productFilters'

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

export function AllProductsPage() {
  const { categorySlug } = useParams<{ categorySlug?: string }>()
  const [searchParams] = useSearchParams()
  const { selectedCategory, searchQuery, setSearchQuery } = useShop()

  const urlCategory = categorySlug || searchParams.get('category') || selectedCategory || 'all'

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
  const [loading, setLoading] = useState(true)

  const [productsList, setProductsList] = useState<Product[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [totalPagesCount, setTotalPagesCount] = useState<number>(1)

  const itemsPerPage = 9

  const facets = useMemo(() => getFacets(PRODUCTS, CATEGORIES), [])

  // Any change to filters/search/sort resets to page 1
  useEffect(() => {
    setCurrentPageNum(1)
  }, [filters, searchQuery, sortBy])

  // Fetch from API
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchProducts({
      page: currentPageNum,
      limit: itemsPerPage,
      category: filters.category,
      search: searchQuery || filters.title,
      sort: sortBy,
      minPrice: filters.price?.[0],
      maxPrice: filters.price?.[1],
    })
      .then(res => {
        if (!cancelled) {
          setProductsList(res.products)
          setTotalCount(res.total)
          setTotalPagesCount(res.totalPages)
        }
      })
      .catch(() => {
        // Fallback to local filtering if API unavailable
        if (!cancelled) {
          const q = searchQuery.trim().toLowerCase()
          const localFiltered = applyFilters(PRODUCTS, filters)
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

          const total = localFiltered.length
          const pages = Math.ceil(total / itemsPerPage) || 1
          setTotalCount(total)
          setTotalPagesCount(pages)
          setProductsList(
            localFiltered.slice(
              (currentPageNum - 1) * itemsPerPage,
              currentPageNum * itemsPerPage
            )
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentPageNum, itemsPerPage, filters, searchQuery, sortBy])

  const activeCount = countActiveFilters(filters)
  const chips = useMemo(() => getActiveFilterChips(filters, facets), [filters, facets])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPagesCount && page !== currentPageNum) {
      setCurrentPageNum(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const clearAllFilters = () => setFilters({ ...DEFAULT_FILTERS })

  const paginationPages = useMemo(
    () => getPaginationPages(currentPageNum, totalPagesCount),
    [currentPageNum, totalPagesCount]
  )

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
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {/* Result count + active filter chips */}
        <div className="flex flex-wrap items-center gap-2 py-4 mb-4">
          <span className="text-xs text-muted mr-1" aria-live="polite">
            {totalCount} {totalCount === 1 ? 'product' : 'products'}
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
        {loading ? (
          <div className="py-20 text-center">
            <p className="text-sm text-stone-500">Loading outfits…</p>
          </div>
        ) : productsList.length === 0 ? (
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
            {productsList.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Pagination Bar (Matching user screenshot: ← Prev | 1 | 2 | 3 ... | Next →) */}
        {totalPagesCount > 1 && (
          <nav
            role="navigation"
            aria-label="Pagination"
            className="mt-14 pt-8 border-t border-gray-100 flex items-center justify-center gap-2 sm:gap-3"
          >
            <button
              onClick={() => handlePageChange(currentPageNum - 1)}
              disabled={currentPageNum === 1}
              className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-charcoal disabled:text-stone-300 hover:text-black transition-colors cursor-pointer disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              ← Prev
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {paginationPages.map((item, idx) => {
                if (item === '...') {
                  return (
                    <span
                      key={`dots-${idx}`}
                      className="w-8 h-8 flex items-center justify-center text-xs font-medium text-stone-400 select-none"
                    >
                      ...
                    </span>
                  )
                }

                const pageNum = item as number
                const isActive = currentPageNum === pageNum

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={`Page ${pageNum}`}
                    className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-black text-white shadow-sm'
                        : 'text-charcoal hover:bg-stone-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPageNum + 1)}
              disabled={currentPageNum === totalPagesCount}
              className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-charcoal disabled:text-stone-300 hover:text-black transition-colors cursor-pointer disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              Next →
            </button>
          </nav>
        )}
      </div>

      {/* Filter drawer */}
      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        facets={facets}
        resultCount={totalCount}
      />
    </div>
  )
}