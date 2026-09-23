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
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#FAF7F2] aspect-[2/3] w-full border border-stone-200/60 shadow-xs group-hover:shadow-md transition-shadow">
        
        {/* Crisp Dress Photo */}
        <ImagePlaceholder
          src={img}
          alt={name}
          aspectRatio="2/3"
          label={name}
        />

        {/* Top-Left Badges Stack (Discount & New) */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10 pointer-events-none">
          {discountPercent && (
            <span className="text-[10px] sm:text-[11px] font-bold tracking-tight px-2 py-0.5 text-white bg-[#1a1a1a]/95 rounded-xs shadow-xs">
              {discountPercent}
            </span>
          )}
          {isNew && (
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight px-2 py-0.5 text-white bg-[#37474F]/95 rounded-xs shadow-xs">
              New
            </span>
          )}
        </div>

        {/* Top-Right Clean Wishlist Heart Box (As in Reference Image 2) */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg bg-white/95 shadow-xs border border-gray-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-10 cursor-pointer"
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

        {/* Quick Add To Cart Button on Hover */}
        <button
          type="button"
          onClick={handleAddToCart}
          className={`absolute bottom-0 inset-x-0 py-2.5 text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer z-10 ${
            added
              ? 'bg-[#c9973a] translate-y-0 opacity-100'
              : 'bg-[#769055] hover:bg-[#5e7343] translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100'
          }`}
        >
          {added ? '✓ Added' : '+ Add to Bag'}
        </button>
      </div>

      {/* 2. Product Description Section (Cleanly BELOW the Card, Never Covering the Image) */}
      <div className="pt-2.5 pb-1 px-1 text-left flex flex-col gap-1">
        {/* Category or Brand Identifier */}
        <p className="text-[10px] sm:text-[11px] font-semibold text-muted uppercase tracking-wider line-clamp-1">
          {category || 'Anju Clothing'}
        </p>

        {/* Product Title / Description */}
        <h3 className="font-medium text-xs sm:text-[13px] text-charcoal group-hover:text-[#769055] transition-colors line-clamp-1 leading-snug">
          {name}
        </h3>

        {/* Pricing Row: Current Price + Strikethrough + Discount Label */}
        <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
          <span className="font-bold text-xs sm:text-sm text-charcoal">
            ₹{price.toLocaleString('en-IN')}
          </span>
          {originalPrice > price && (
            <span className="text-[10px] sm:text-xs text-muted line-through">
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
          <div className="flex items-center gap-1 pt-0.5">
            {colors.slice(0, 4).map((color, idx) => (
              <span
                key={idx}
                className="w-2.5 h-2.5 rounded-full border border-black/15"
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
