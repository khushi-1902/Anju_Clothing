import React, { useRef, useState, useEffect, useCallback } from 'react'

interface MobileSliderProps {
  children: React.ReactNode
  /** Number of items to render dots/progress accurately */
  itemCount?: number
  /** Tailwind grid classes for desktop/tablet (768px / md and above), e.g. 'md:grid-cols-4 lg:grid-cols-4' */
  desktopGridClassName?: string
  /** Whether to show desktop left/right navigation arrows */
  showDesktopArrows?: boolean
  /** Indicator style for mobile: 'bar' (thin progress line) or 'dots' (pagination dots) */
  indicatorType?: 'bar' | 'dots'
  /** Additional container classes */
  className?: string
  /** Gap between items on mobile and desktop */
  gapClassName?: string
}

/**
 * MobileSlider
 * - Below 768px (mobile): Native CSS scroll-snap horizontal swipe slider with peek widths (44% on 360-640px, 30% on 640-768px).
 * - 768px and up (md+): Standard responsive CSS grid layout.
 * - Touch-friendly momentum scrolling, hidden scrollbars, real-time scroll indicator.
 */
export function MobileSlider({
  children,
  itemCount,
  desktopGridClassName = 'md:grid-cols-4',
  showDesktopArrows = true,
  indicatorType = 'bar',
  className = '',
  gapClassName = 'gap-3.5 sm:gap-5 md:gap-6',
}: MobileSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Derive total items count from children if not explicitly provided
  const childArray = React.Children.toArray(children)
  const totalItems = itemCount ?? childArray.length

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = scrollWidth - clientWidth

    if (maxScroll > 0) {
      const progress = Math.min(Math.max(scrollLeft / maxScroll, 0), 1)
      setScrollProgress(progress)
      setCanScrollLeft(scrollLeft > 10)
      setCanScrollRight(scrollLeft < maxScroll - 10)

      if (totalItems > 1) {
        const itemWidth = scrollWidth / totalItems
        const currentIdx = Math.round(scrollLeft / itemWidth)
        setActiveIndex(Math.min(Math.max(currentIdx, 0), totalItems - 1))
      }
    }
  }, [totalItems])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    handleScroll()
    el.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      el.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [handleScroll])

  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const scrollAmount = el.clientWidth * 0.75
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <div className={`relative group/slider w-full ${className}`}>
      {/* Slider & Grid Wrapper */}
      <div
        ref={scrollRef}
        className={[
          // Mobile (<768px): horizontal flex swipe container with scroll snap
          'flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory',
          '-mx-4 px-4 sm:-mx-6 sm:px-6 py-2 scroll-px-4 sm:scroll-px-6',
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          '[-webkit-overflow-scrolling:touch]',
          // Desktop (>=768px): clean CSS Grid without scroll
          'md:grid md:overflow-visible md:mx-0 md:px-0 md:py-0 md:snap-none',
          desktopGridClassName,
          gapClassName,
        ].join(' ')}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child

          return (
            <div
              className={[
                // Mobile: ~44% viewport width (approx 2.2 cards visible), ~30% on sm (approx 3.2 cards visible)
                'flex-none w-[44vw] min-w-[150px] max-w-[220px]',
                'sm:w-[30vw] sm:min-w-[190px] sm:max-w-[260px]',
                'snap-start',
                // Desktop: reset width and snap for standard grid cell
                'md:w-auto md:min-w-0 md:max-w-none md:flex-initial md:snap-align-none',
              ].join(' ')}
            >
              {child}
            </div>
          )
        })}
      </div>

      {/* Desktop Prev/Next Navigation Arrows (768px+) */}
      {showDesktopArrows && totalItems > 3 && (
        <>
          <button
            type="button"
            onClick={() => scrollByAmount('left')}
            disabled={!canScrollLeft}
            aria-label="Previous items"
            className={`hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-ivory/95 border border-gold/40 text-charcoal shadow-md items-center justify-center backdrop-blur-xs transition-all duration-200 z-20 cursor-pointer hover:bg-white hover:border-gold hover:scale-105 active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-gold/60 ${
              canScrollLeft ? 'opacity-0 group-hover/slider:opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => scrollByAmount('right')}
            disabled={!canScrollRight}
            aria-label="Next items"
            className={`hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-ivory/95 border border-gold/40 text-charcoal shadow-md items-center justify-center backdrop-blur-xs transition-all duration-200 z-20 cursor-pointer hover:bg-white hover:border-gold hover:scale-105 active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-gold/60 ${
              canScrollRight ? 'opacity-0 group-hover/slider:opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Mobile Scroll Indicator (<768px) */}
      {totalItems > 2 && (
        <div className="md:hidden flex justify-center items-center pt-3 pb-1" aria-hidden="true">
          {indicatorType === 'bar' ? (
            // Elegant thin progress bar matching gold accent
            <div className="w-20 h-1 bg-border/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all duration-150 ease-out"
                style={{
                  width: `${Math.max(25, (1 / totalItems) * 100)}%`,
                  transform: `translateX(${scrollProgress * (100 / Math.max(0.25, 1 / totalItems) - 100)}%)`,
                }}
              />
            </div>
          ) : (
            // Subtle pagination dots
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(totalItems, 7) }).map((_, idx) => {
                const isActive = idx === Math.min(activeIndex, 6)
                return (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      isActive ? 'w-5 bg-gold' : 'w-1.5 bg-border/80'
                    }`}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
