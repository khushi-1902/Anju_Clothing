import type { ComponentProps } from 'react'
import { useRef } from 'react'
import { ProductCard } from './ProductCard'

type Product = ComponentProps<typeof ProductCard>['product']

interface ProductScrollerProps {
  products: Product[]
  /** Max products shown on tablet/desktop (sm and up) */
  desktopLimit?: number
  /** Max products in the mobile scroller */
  mobileLimit?: number
  /** Grid columns for sm and up */
  desktopGridClassName?: string
}

/**
 * Mobile  : Single-row swipeable horizontal scroller with snap (Myntra-style 1-row product carousel).
 * sm and up: Clean responsive grid.
 */
export function ProductScroller({
  products,
  desktopLimit = 4,
  mobileLimit = 10,
  desktopGridClassName = 'sm:grid-cols-2 lg:grid-cols-4',
}: ProductScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const visible = products.slice(0, Math.max(mobileLimit, desktopLimit))

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <div className="relative group/scroller">
      {/* Scroll container: Single Row horizontal scroll on mobile, responsive grid on sm+ */}
      <div
        ref={scrollRef}
        className={[
          // Mobile: strictly 1 row horizontal scroller that bleeds to edges with padding
          'flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory gap-3 sm:gap-6',
          '-mx-4 px-4 pb-3 pt-1 scroll-px-4',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          // sm and up: switch to standard grid layout
          'sm:grid sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:snap-none sm:gap-6 lg:gap-8',
          desktopGridClassName,
        ].join(' ')}
      >
        {visible.map((product, index) => (
          <div
            key={product.id}
            className={`flex-none w-[44vw] min-w-[155px] max-w-[210px] snap-start sm:w-auto sm:min-w-0 sm:max-w-none sm:flex-initial ${
              index >= desktopLimit ? 'sm:hidden' : ''
            }`}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Desktop/Tablet Left & Right Navigation Arrows */}
      <button
        type="button"
        onClick={() => handleScroll('left')}
        aria-label="Scroll left"
        className="hidden md:flex absolute -left-4 top-1/3 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 border border-stone-200 text-charcoal shadow-md items-center justify-center opacity-0 group-hover/scroller:opacity-100 hover:bg-white hover:scale-105 transition-all z-20 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => handleScroll('right')}
        aria-label="Scroll right"
        className="hidden md:flex absolute -right-4 top-1/3 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 border border-stone-200 text-charcoal shadow-md items-center justify-center opacity-0 group-hover/scroller:opacity-100 hover:bg-white hover:scale-105 transition-all z-20 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}