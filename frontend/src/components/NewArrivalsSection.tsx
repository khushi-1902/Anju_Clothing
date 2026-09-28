import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNewArrivals } from '../lib/api'
import { Product } from '../types'
import { useShop } from '../context/ShopContext'
import { MobileSlider } from './MobileSlider'

/**
 * Lotus crest that sits on the top edge of the header plaque.
 * Three petals + a base line, drawn in the site's gold.
 */
function LotusCrest() {
  return (
    <svg
      viewBox="0 0 56 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-11 h-7 sm:w-14 sm:h-9"
      aria-hidden="true"
    >
      {/* Outer petals */}
      <path
        d="M28 30 C14 30 5 23 3 13 C12 14 21 20 28 30 Z"
        fill="#c49332"
        fillOpacity="0.18"
        stroke="#c49332"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M28 30 C42 30 51 23 53 13 C44 14 35 20 28 30 Z"
        fill="#c49332"
        fillOpacity="0.18"
        stroke="#c49332"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Inner petals */}
      <path
        d="M28 30 C19 27 14 20 14 10 C21 13 26 20 28 30 Z"
        fill="#c49332"
        fillOpacity="0.28"
        stroke="#c49332"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M28 30 C37 27 42 20 42 10 C35 13 30 20 28 30 Z"
        fill="#c49332"
        fillOpacity="0.28"
        stroke="#c49332"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Centre petal */}
      <path
        d="M28 3 C34 11 34 21 28 30 C22 21 22 11 28 3 Z"
        fill="#c49332"
        fillOpacity="0.4"
        stroke="#c49332"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Base */}
      <path d="M12 32 H44" stroke="#c49332" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Gold rule that sits beside the heading: a fading line ending in a diamond
 * next to the title. Mirrored for the right side.
 */
function SideRule({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left'
  return (
    <div
      className={`flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 ${isLeft ? '' : 'flex-row-reverse'}`}
      aria-hidden="true"
    >
      <span
        className={`h-px flex-1 ${
          isLeft
            ? 'bg-gradient-to-r from-transparent to-[#c49332]'
            : 'bg-gradient-to-l from-transparent to-[#c49332]'
        }`}
      />
      <span className="w-1.5 h-1.5 rotate-45 border border-[#c49332] shrink-0" />
      <span className="w-2 h-2 rotate-45 bg-[#c49332] shrink-0" />
    </div>
  )
}

/**
 * Royal section header for New Arrivals: matching Best Sellers exact design
 */
function RoyalNewArrivalsHeader() {
  return (
    <div className="relative mb-6 sm:mb-8">
      <div className="flex flex-col items-center text-center">
        <LotusCrest />

        {/* Heading with gold rules on both sides */}
        <div className="mt-2 flex items-center w-full max-w-2xl gap-3 sm:gap-5">
          <SideRule side="left" />

          <h2
            id="new-arrivals-heading"
            className="shrink-0 font-serif text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-[#3e502a] tracking-wide leading-tight"
          >
            New Arrivals
          </h2>

          <SideRule side="right" />
        </div>

        <p className="mt-3 sm:mt-4 text-[#6d5b52] font-serif italic text-sm sm:text-base leading-relaxed max-w-md">
          Fresh styles for your beautiful festive moments
        </p>
      </div>

      {/* Desktop "View All" pill */}
      <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2">
        <Link
          to="/all-products?sort=newest"
          className="group inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-b from-[#5c7340] to-[#3e502a] text-white text-sm font-serif font-medium tracking-wide shadow-sm border border-[#c49332]/40 hover:from-[#4d6134] hover:to-[#33421f] hover:shadow-md hover:border-[#c49332] transition-all duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#5c7340]/60 min-h-[44px]"
        >
          <span>View All</span>
          <span className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </div>
  )
}

/**
 * Traditional Elegant Product Card for New Arrivals
 */
function TraditionalNewArrivalCard({ product }: { product: Product }) {
  const { id, name, price, originalPrice, img, category } = product
  const { addToCart, toggleWishlist, isInWishlist, navigateTo } = useShop()

  const [added, setAdded] = useState(false)
  const isWished = isInWishlist(id)

  const discountOffText =
    originalPrice > price
      ? `${Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF`
      : null

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addToCart(product, undefined, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleWishlist(id)
  }

  const handleCardClick = () => {
    navigateTo('product-detail', id)
  }

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col bg-[#fffcf7] rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 border border-[#e4cbaf] shadow-[0_8px_26px_rgba(196,147,50,0.22),0_2px_8px_rgba(196,147,50,0.12)] hover:shadow-[0_18px_42px_rgba(196,147,50,0.4),0_6px_16px_rgba(196,147,50,0.22)] hover:border-[#c9973a] transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer"
    >
      {/* 1. Image Frame Container with Inset Border & Soft Rounded Arch */}
      <div className="relative w-full aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden bg-[#faf5ee] border border-[#e8d5c0]/60 shadow-xs">
        
        {/* Full-Length Portrait Image */}
        <img
          src={img}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-106"
        />

        {/* Soft Contrast Gradient at Bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 via-black/10 to-transparent pointer-events-none" />

        {/* Top-Left Traditional "NEW" Tag */}
        <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#3e502a] text-white text-[10px] font-serif uppercase tracking-widest shadow-xs border border-white/20">
            <span className="w-1 h-1 rounded-full bg-[#fae5a0]" />
            <span>New</span>
          </span>
        </div>

        {/* Top-Right Glass Wishlist Button */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/85 backdrop-blur-xs shadow-xs border border-[#e8d5c0] flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all z-10 cursor-pointer"
          aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg
            className={`w-4 h-4 transition-colors ${
              isWished ? 'text-red-500 fill-red-500' : 'text-charcoal stroke-current fill-none hover:text-red-500'
            }`}
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>

        {/* Quick "Add to Bag" Slide-Up Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          className={`absolute bottom-0 inset-x-0 py-2.5 text-white text-[11px] sm:text-xs font-serif uppercase tracking-wider font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer z-10 translate-y-0 opacity-100 sm:translate-y-full sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 ${
            added
              ? 'bg-[#c9973a]'
              : 'bg-gradient-to-r from-[#4d6333] via-[#3e502a] to-[#4d6333] hover:from-[#354523] hover:to-[#354523]'
          }`}
        >
          <span>{added ? '✓ Added to Bag' : '+ Add to Bag'}</span>
        </button>
      </div>

      {/* 2. Product Description & Price Block */}
      <div className="pt-3 pb-1 px-1 flex flex-col gap-1 text-left">
        <span className="font-serif font-bold text-[#b88628] text-[10px] sm:text-[11px] uppercase tracking-[0.16em] line-clamp-1">
          {category || 'Festive Couture'}
        </span>

        <h3 className="font-serif font-bold text-sm sm:text-[0.95rem] text-[#2c2420] group-hover:text-[#3e502a] transition-colors line-clamp-1 leading-snug tracking-tight">
          {name}
        </h3>

        <div className="flex items-center flex-wrap gap-2 pt-0.5">
          <span className="font-serif font-bold text-sm sm:text-base text-[#3e502a]">
            ₹{price.toLocaleString('en-IN')}
          </span>
          
          {originalPrice > price && (
            <span className="text-[10px] sm:text-xs text-stone-400 line-through">
              ₹{originalPrice.toLocaleString('en-IN')}
            </span>
          )}

          {discountOffText && (
            <span className="text-[9px] sm:text-[10px] font-bold font-serif text-[#b88628] bg-[#fdf7ea] px-1.5 py-0.5 rounded-sm border border-[#e8c06a]/50">
              {discountOffText}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Selects 4 distinct dress styles for the 1-row grid
 */
function selectDiverseProducts(allProducts: Product[], count = 4): Product[] {
  if (!allProducts || allProducts.length === 0) return []

  const selected: Product[] = []
  const seenCategories = new Set<string>()

  for (const prod of allProducts) {
    const cat = prod.category || 'General'
    if (!seenCategories.has(cat)) {
      seenCategories.add(cat)
      selected.push(prod)
      if (selected.length === count) break
    }
  }

  if (selected.length < count) {
    for (const prod of allProducts) {
      if (!selected.some((s) => s.id === prod.id)) {
        selected.push(prod)
        if (selected.length === count) break
      }
    }
  }

  return selected.slice(0, count)
}

/**
 * Skeleton Loader matching Traditional Cards
 */
function TraditionalNewArrivalsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse flex flex-col p-3 bg-[#fffcf7] rounded-3xl border border-[#e4cbaf]/50">
          <div className="rounded-2xl bg-[#ebdccb]/60 aspect-[2/3] w-full" />
          <div className="pt-3 flex flex-col gap-2">
            <div className="h-2.5 bg-stone-200/80 rounded w-1/3" />
            <div className="h-3.5 bg-stone-200/80 rounded w-4/5" />
            <div className="h-3.5 bg-stone-200/80 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function NewArrivalsSection() {
  const { products, loading } = useNewArrivals(12)

  const diverseArrivals = useMemo(() => {
    return selectDiverseProducts(products, 4)
  }, [products])

  return (
    <section
      id="new-arrivals"
      aria-labelledby="new-arrivals-heading"
      className="py-8 sm:py-10 md:py-12 bg-[#faf5ef] border-t border-[#ebdccb]/60 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <RoyalNewArrivalsHeader />

        {/* 
          1 Row of 4 Traditional Product Cards on Desktop (md:grid-cols-4)
          Mobile (<768px): Horizontal swipe MobileSlider with peek widths
        */}
        {loading ? (
          <TraditionalNewArrivalsSkeleton />
        ) : (
          <MobileSlider
            itemCount={diverseArrivals.length}
            desktopGridClassName="md:grid-cols-4"
            showDesktopArrows={false}
            indicatorType="bar"
            gapClassName="gap-4 sm:gap-6 lg:gap-8"
          >
            {diverseArrivals.map((product) => (
              <TraditionalNewArrivalCard key={product.id} product={product} />
            ))}
          </MobileSlider>
        )}

        {/* View All button for screens narrower than lg */}
        <div className="lg:hidden text-center mt-5 sm:mt-6">
          <Link
            to="/all-products?sort=newest"
            className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-gradient-to-b from-[#5c7340] to-[#3e502a] text-white text-xs font-serif font-bold uppercase tracking-wider shadow-sm border border-[#c49332]/40 active:scale-95 transition-all min-h-[44px]"
          >
            <span>View All New Arrivals</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
