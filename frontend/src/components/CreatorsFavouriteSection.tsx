import { useState, useRef, useEffect, memo } from 'react'
import { Link } from 'react-router-dom'
import { useCreatorsFavourites } from '../lib/api'
import { Product } from '../types'
import { useShop } from '../context/ShopContext'
import { MobileSlider } from './MobileSlider'

/**
 * Lotus crest that sits on the top edge of the header plaque.
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
      <path
        d="M28 3 C34 11 34 21 28 30 C22 21 22 11 28 3 Z"
        fill="#c49332"
        fillOpacity="0.4"
        stroke="#c49332"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M12 32 H44" stroke="#c49332" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Gold rule that sits beside the heading.
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
 * Royal section header matching Bestsellers & New Arrivals.
 */
function RoyalSectionHeader({ totalCount }: { totalCount: number }) {
  return (
    <div className="relative mb-6 sm:mb-8">
      <div className="flex flex-col items-center text-center">
        <LotusCrest />

        {/* Heading with gold rules on both sides */}
        <div className="mt-2 flex items-center justify-center w-full max-w-3xl gap-2 sm:gap-4 md:gap-5 px-2">
          <SideRule side="left" />

          <h2
            id="creators-favourite-heading"
            className="font-serif text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] font-bold text-[#3e502a] tracking-tight sm:tracking-wide leading-tight text-center whitespace-nowrap"
          >
            Creators' Favourite Collection
          </h2>

          <SideRule side="right" />
        </div>

        <p className="mt-2.5 sm:mt-3.5 text-[#6d5b52] font-serif italic text-xs sm:text-sm md:text-base leading-relaxed max-w-xl px-2">
          Hand-selected festive styles adored by top fashion stylists & influencers
        </p>
      </div>

      {/* Desktop "View All" pill */}
      <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2">
        <Link
          to="/creators-favourite"
          className="group inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-b from-[#5c7340] to-[#3e502a] text-white text-sm font-serif font-medium tracking-wide shadow-sm border border-[#c49332]/40 hover:from-[#4d6134] hover:to-[#33421f] hover:shadow-md hover:border-[#c49332] transition-all duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#5c7340]/60 min-h-[44px]"
        >
          <span>View All ({totalCount > 0 ? totalCount : 'All'})</span>
          <span className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </div>
  )
}

/**
 * Auto-optimize Cloudinary video URLs for zero-lag streaming.
 */
function getOptimizedVideoUrl(rawUrl: string): string {
  if (!rawUrl) return ''
  if (rawUrl.includes('cloudinary.com') && rawUrl.includes('/video/upload/')) {
    if (!rawUrl.includes('/video/upload/q_') && !rawUrl.includes('/video/upload/f_')) {
      return rawUrl.replace(
        '/video/upload/',
        '/video/upload/q_auto:good,f_auto,vc_auto,w_600/'
      )
    }
  }
  return rawUrl
}

/**
 * Traditional Elegant Product Card for Creators' Favourite
 * Uses the EXACT same design & structure as other homepage product cards.
 */
const TraditionalCreatorCard = memo(function TraditionalCreatorCard({ product }: { product: Product }) {
  const { id, name, price, originalPrice, img, videoUrl } = product
  const { addToCart, toggleWishlist, isInWishlist, navigateTo } = useShop()

  const [added, setAdded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const isWished = isInWishlist(id)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  const optimizedVideoSrc = videoUrl ? getOptimizedVideoUrl(videoUrl) : ''

  const discountOffText =
    originalPrice > price
      ? `${Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF`
      : null

  // Play video when cursor moves to the card
  const handleMouseEnter = () => {
    if (!videoRef.current || !optimizedVideoSrc) return
    setIsPlaying(true)
    const playPromise = videoRef.current.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay handled safely
      })
    }
  }

  // Pause and reset video when cursor leaves
  const handleMouseLeave = () => {
    if (!videoRef.current || !optimizedVideoSrc) return
    setIsPlaying(false)
    videoRef.current.pause()
    videoRef.current.currentTime = 0
  }

  // On touch/mobile devices without cursor hover, auto-play when in view
  useEffect(() => {
    if (!optimizedVideoSrc || !cardRef.current) return
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    if (!isTouchDevice) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!videoRef.current) return
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
          } else {
            videoRef.current.pause()
            setIsPlaying(false)
          }
        })
      },
      { threshold: [0, 0.5], rootMargin: '50px 0px' }
    )

    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [optimizedVideoSrc])

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addToCart(product, undefined, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleWishlist(product)
  }

  const handleCardClick = () => {
    navigateTo('product-detail', id)
  }

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative flex flex-col bg-[#fffcf7] rounded-xl sm:rounded-3xl p-2 sm:p-3 border border-[#e4cbaf] shadow-[0_4px_16px_rgba(196,147,50,0.18)] hover:shadow-[0_18px_42px_rgba(196,147,50,0.4)] hover:border-[#c9973a] transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer h-full select-none"
    >
      {/* 1. Image Frame Container with Inset Border */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[2/3] rounded-lg sm:rounded-2xl overflow-hidden bg-[#faf5ee] border border-[#e8d5c0]/60 shadow-xs">
        {/* Preview image: visible by default, smooth transition when video starts */}
        <img
          src={img}
          alt={name}
          loading="lazy"
          className={`w-full h-full object-cover object-top transition-all duration-500 ease-out group-hover:scale-106 ${
            optimizedVideoSrc && isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />

        {optimizedVideoSrc && (
          <>
            <video
              ref={videoRef}
              src={optimizedVideoSrc}
              poster={img}
              muted
              playsInline
              loop
              preload="metadata"
              className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-500 ease-out group-hover:scale-106 ${
                isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />

            {/* Reel Badge / Indicator */}
            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs pointer-events-none transition-all">
              <span className={`text-[10px] ${isPlaying ? 'text-red-400 animate-pulse' : 'text-[#fae5a0]'}`}>
                {isPlaying ? '●' : '▶'}
              </span>
              <span>{isPlaying ? 'Playing' : 'Reel'}</span>
            </div>
          </>
        )}

        {/* Soft Contrast Gradient at Bottom */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 via-black/10 to-transparent pointer-events-none" />

        {/* Top-Right Glass Wishlist Button */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/85 backdrop-blur-xs shadow-xs border border-[#e8d5c0] flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all z-10 cursor-pointer"
          aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
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
          className={`absolute bottom-0 inset-x-0 py-2 sm:py-2.5 text-white text-[10px] sm:text-xs font-serif uppercase tracking-wider font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer z-10 translate-y-0 opacity-100 sm:translate-y-full sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 ${
            added
              ? 'bg-[#c9973a]'
              : 'bg-gradient-to-r from-[#4d6333] via-[#3e502a] to-[#4d6333] hover:from-[#354523] hover:to-[#354523]'
          }`}
        >
          <span>{added ? '✓ Added' : '+ Add to Bag'}</span>
        </button>
      </div>

      {/* 2. Product Description & Price Block */}
      <div className="pt-2 sm:pt-3 pb-1 px-0.5 flex flex-col gap-0.5 sm:gap-1 text-left">
        {/* Label */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3e502a] text-white text-[8px] sm:text-[9.5px] font-serif uppercase tracking-widest shadow-xs">
            <span className="w-1 h-1 rounded-full bg-[#fae5a0]" />
            <span>Creators' Pick</span>
          </span>
        </div>

        <h3 className="font-serif font-bold text-xs sm:text-[0.95rem] text-[#2c2420] group-hover:text-[#3e502a] transition-colors line-clamp-1 leading-snug tracking-tight">
          {name}
        </h3>

        <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
          <span className="font-serif font-bold text-xs sm:text-base text-[#3e502a]">
            ₹{price.toLocaleString('en-IN')}
          </span>

          {originalPrice > price && (
            <span className="text-[9px] sm:text-xs text-stone-400 line-through">
              ₹{originalPrice.toLocaleString('en-IN')}
            </span>
          )}

          {discountOffText && (
            <span className="text-[8px] sm:text-[10px] font-bold font-serif text-[#b88628] bg-[#fdf7ea] px-1 sm:px-1.5 py-0.5 rounded-sm border border-[#e8c06a]/50">
              {discountOffText}
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

/**
 * Skeleton Loader matching Traditional Cards
 */
function TraditionalCreatorsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse flex flex-col p-3 bg-[#fffcf7] rounded-3xl border border-[#e4cbaf]/50">
          <div className="rounded-2xl bg-[#ebdccb]/60 aspect-[2/3] w-full" />
          <div className="pt-3 flex flex-col gap-2">
            <div className="h-2.5 bg-stone-200/80 rounded w-1/3" />
            <div className="h-3.5 bg-stone-200/80 rounded w-4/5" />
            <div className="h-3 bg-stone-200/80 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Creators' Favourite Collection Homepage Section
 * Displays exactly 4 curated creator cards in 1 row on desktop (lg:grid-cols-4)
 * and uses MobileSlider for smooth swipe on mobile screens.
 */
export function CreatorsFavouriteSection() {
  const { products, loading } = useCreatorsFavourites(12)

  // Keep exactly 4 cards for the homepage row
  const displayProducts = products.slice(0, 4)

  return (
    <section
      id="creators-favourite"
      className="py-8 sm:py-10 md:py-12 bg-[#faf5ef] border-t border-[#ebdccb]/60 relative overflow-hidden"
      aria-label="Creators' Favourite Collection"
    >
      {/* Faint gold dot pattern that fades out towards the cards */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(#c49332 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
          maskImage: 'linear-gradient(to bottom, black, transparent)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <RoyalSectionHeader totalCount={products.length} />

        {/* 
          1 Row of 4 Traditional Product Cards on Desktop (lg:grid-cols-4)
          Mobile (<1024px): Horizontal swipe MobileSlider with peek widths
        */}
        {loading ? (
          <TraditionalCreatorsSkeleton />
        ) : displayProducts.length > 0 ? (
          <MobileSlider
            itemCount={displayProducts.length}
            desktopGridClassName="lg:grid-cols-4"
            showDesktopArrows={false}
            indicatorType="bar"
            gapClassName="gap-4 sm:gap-6 lg:gap-8"
          >
            {displayProducts.map((product) => (
              <TraditionalCreatorCard key={product.id} product={product} />
            ))}
          </MobileSlider>
        ) : (
          <div className="text-center py-10 text-[#6d5b52] font-serif text-sm">
            Curating the newest creator collection pieces...
          </div>
        )}

        {/* View All button for screens narrower than lg */}
        <div className="lg:hidden text-center mt-5 sm:mt-6">
          <Link
            to="/creators-favourite"
            className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-gradient-to-b from-[#5c7340] to-[#3e502a] text-white text-xs font-serif font-bold uppercase tracking-wider shadow-sm border border-[#c49332]/40 active:scale-95 transition-all min-h-[44px]"
          >
            <span>View All Creators' Collection</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
