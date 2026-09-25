import { useState, useMemo } from 'react'
import { ProductCard } from '../components/ProductCard'
import { ReviewsSection } from '../components/ReviewsSection'
import { TrustBar } from '../components/TrustBar'
import { useBestsellers } from '../lib/api'

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

export function BestsellersPage() {
  const { products: bestsellers, loading } = useBestsellers(100)
  const [currentPageNum, setCurrentPageNum] = useState(1)
  const itemsPerPage = 12

  const totalPages = Math.ceil(bestsellers.length / itemsPerPage) || 1
  const paginatedBestsellers = useMemo(() => {
    return bestsellers.slice(
      (currentPageNum - 1) * itemsPerPage,
      currentPageNum * itemsPerPage
    )
  }, [bestsellers, currentPageNum, itemsPerPage])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPageNum) {
      setCurrentPageNum(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const paginationPages = useMemo(
    () => getPaginationPages(currentPageNum, totalPages),
    [currentPageNum, totalPages]
  )

  return (
    <div className="min-h-screen py-12 bg-ivory space-y-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Centered Page Heading */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gold/15 border border-gold/40 text-[#769055] text-xs font-bold uppercase tracking-widest mb-3">
            ⭐ Most Loved Collection
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal uppercase tracking-wide">
            Shop Bestsellers
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-3 max-w-xl mx-auto">
            These viral silhouettes and festive classics are our highest-rated creations, frequently restocked by popular demand.
          </p>
          {!loading && bestsellers.length > 0 && (
            <p className="text-xs text-muted font-medium mt-3">
              Showing {bestsellers.length} bestselling outfits
            </p>
          )}
        </div>

        {/* Bestseller Products Grid (Responsive 2 cols mobile, 3 cols desktop) */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-sm text-stone-500">Loading bestsellers…</p>
          </div>
        ) : paginatedBestsellers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-stone-500">No bestselling outfits available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-8 lg:gap-10">
            {paginatedBestsellers.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Pagination Bar (Matching UI: ← Prev | 1 | 2 | 3 ... | Next →) */}
        {totalPages > 1 && (
          <nav
            role="navigation"
            aria-label="Bestsellers Pagination"
            className="mt-14 pt-8 border-t border-gray-200/80 flex items-center justify-center gap-2 sm:gap-3"
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
                        : 'text-charcoal hover:bg-stone-200/60 bg-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPageNum + 1)}
              disabled={currentPageNum === totalPages}
              className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-charcoal disabled:text-stone-300 hover:text-black transition-colors cursor-pointer disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              Next →
            </button>
          </nav>
        )}
      </div>

      {/* Trust Assurances */}
      <TrustBar />

      {/* Customer Testimonials */}
      <ReviewsSection />
    </div>
  )
}
