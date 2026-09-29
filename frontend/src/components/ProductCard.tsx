import { useState } from 'react'
import { Product } from '../types'
import { useShop } from '../context/ShopContext'
import { ImagePlaceholder } from './ImagePlaceholder'

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className = '' }: ProductCardProps) {
  const { id, name, price, originalPrice, img, tag, discount, category, isNewArrival, colors = [] } = product
  const { addToCart, toggleWishlist, isInWishlist, navigateTo } = useShop()

  const [added, setAdded] = useState(false)
  const isWished = isInWishlist(id)

  // Calculate discount percentage if not provided
  const discountPercent = discount || (originalPrice > price
    ? `-${Math.round(((originalPrice - price) / originalPrice) * 100)}%`
    : null)

  const discountOffText = originalPrice > price
    ? `${Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF`
    : null

  const isNew = isNewArrival || tag === 'NEW'

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
      className={`group relative bg-transparent flex flex-col transition-all duration-300 cursor-pointer ${className}`}
    >
      {/* 1. Dress Image Card Container with Rounded Corners (Tall Portrait 2:3 ratio to display dress) */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#FAF7F2] aspect-[2/3] w-full border border-[#ebd5be] shadow-[0_8px_24px_rgba(196,147,50,0.22),0_2px_8px_rgba(196,147,50,0.14)] group-hover:shadow-[0_16px_38px_rgba(196,147,50,0.38),0_4px_14px_rgba(196,147,50,0.2)] group-hover:border-[#c9973a] transition-all duration-300 transform group-hover:-translate-y-1.5">

        {/* Crisp Dress Photo — gentle zoom on hover for a more premium feel */}
        <div className="absolute inset-0 [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.06]">
          <ImagePlaceholder
            src={img}
            alt={name}
            aspectRatio="2/3"
            label={name}
          />
        </div>

        {/* Soft gradient at the base so white text/badges (if any) and the add-to-bag bar always sit on contrast */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />

        {/* Top-Left Badges Stack (Discount & New) — pill-shaped, on-brand gold/olive */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start z-10 pointer-events-none">
          {discountPercent && (
            <span className="text-[10px] sm:text-[11px] font-bold tracking-tight px-2.5 py-1 text-white bg-[#c9973a] rounded-full shadow-sm">
              {discountPercent}
            </span>
          )}
          {isNew && (
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight px-2.5 py-1 text-white bg-[#769055] rounded-full shadow-sm">
              New
            </span>
          )}
        </div>

        {/* Top-Right Wishlist Heart Box — soft glass look */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-white/60 flex items-center justify-center hover:scale-110 hover:bg-white active:scale-95 transition-all z-10 cursor-pointer"
          aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg
            className={`w-4 h-4 transition-colors ${isWished ? 'text-red-500 fill-red-500' : 'text-charcoal stroke-current fill-none hover:text-red-500'}`}
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

        {/* Quick Add To Cart Button — always visible on mobile (no hover state there), hover-reveal from sm up */}
        <button
          type="button"
          onClick={handleAddToCart}
          className={`absolute bottom-0 inset-x-0 py-2.5 text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer z-10 translate-y-0 opacity-100 sm:translate-y-full sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 ${added ? 'bg-[#c9973a]' : 'bg-[#769055] hover:bg-[#5e7343]'
            }`}
        >
          {added ? '✓ Added' : '+ Add to Bag'}
        </button>
      </div>

      {/* 2. Product Description Section — title now reads as a small heading, not a caption */}
      <div className="pt-3 pb-1 px-1 text-left flex flex-col gap-1">
        {/* Category or Brand Identifier */}
        <p className="text-[10px] sm:text-[11px] font-semibold text-[#c9973a] uppercase tracking-[0.12em] line-clamp-1">
          {category || 'Anju Clothing'}
        </p>

        {/* Product Title — clean modern typography */}
        <h3 className="text-sm sm:text-base font-semibold text-charcoal group-hover:text-[#769055] transition-colors line-clamp-1 leading-snug tracking-tight">
          {name}
        </h3>

        {/* Pricing Row: Current Price + Strikethrough + Discount Label */}
        <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
          <span className="font-bold text-sm sm:text-base text-charcoal">
            ₹{price.toLocaleString('en-IN')}
          </span>
          {originalPrice > price && (
            <span className="text-[10px] sm:text-xs text-stone-400 line-through">
              ₹{originalPrice.toLocaleString('en-IN')}
            </span>
          )}
          {discountOffText && (
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700">
              ({discountOffText})
            </span>
          )}
        </div>

        {/* Color variants if present */}
        {colors.length > 1 && (
          <div className="flex items-center gap-1.5 pt-1">
            {colors.slice(0, 4).map((color, idx) => (
              <span
                key={idx}
                className="w-3 h-3 rounded-full border border-black/15 ring-1 ring-transparent hover:ring-stone-300 transition-shadow"
                style={{ backgroundColor: color }}
              />
            ))}
            {colors.length > 4 && (
              <span className="text-[9px] text-muted font-medium">+{colors.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}