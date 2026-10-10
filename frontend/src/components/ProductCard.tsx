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
    toggleWishlist(product)
  }

  const handleCardClick = () => {
    navigateTo('product-detail', id)
  }

  return (
    <div
      onClick={handleCardClick}
      className={`group relative bg-transparent flex flex-col transition-all duration-300 cursor-pointer ${className}`}
    >
      {/* 1. Dress Image Card Container with Rounded Corners */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#FAF7F2] aspect-[3/4] sm:aspect-[2/3] w-full border border-[#ebd5be] shadow-[0_4px_16px_rgba(196,147,50,0.18)] group-hover:shadow-[0_16px_38px_rgba(196,147,50,0.38)] group-hover:border-[#c9973a] transition-all duration-300 transform group-hover:-translate-y-1.5">

        {/* Crisp Dress Photo */}
        <img
          src={img || 'https://cdn.shopify.com/s/files/1/1020/9912/4593/files/79E22484-5C5D-46F7-8E73-C2646FEA540A.png?v=1789627932'}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105 block"
          onError={(e) => {
            const target = e.currentTarget
            target.src = 'https://cdn.shopify.com/s/files/1/1020/9912/4593/files/79E22484-5C5D-46F7-8E73-C2646FEA540A.png?v=1789627932'
          }}
        />

        {/* Soft gradient at the base so the add-to-bag bar sits with high contrast */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 via-black/5 to-transparent pointer-events-none" />

        {/* Top-Right Wishlist Heart Box — soft glass look */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-white/60 flex items-center justify-center hover:scale-110 hover:bg-white active:scale-95 transition-all z-10 cursor-pointer"
          aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${isWished ? 'text-red-500 fill-red-500' : 'text-charcoal stroke-current fill-none hover:text-red-500'}`}
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
          className={`absolute bottom-0 inset-x-0 py-2 sm:py-2.5 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer z-10 translate-y-0 opacity-100 sm:translate-y-full sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 ${added ? 'bg-[#c9973a]' : 'bg-[#769055] hover:bg-[#5e7343]'
            }`}
        >
          {added ? '✓ Added' : '+ Add to Bag'}
        </button>
      </div>

      {/* 2. Product Description Section */}
      <div className="pt-2 sm:pt-3 pb-1 px-0.5 text-left flex flex-col gap-0.5 sm:gap-1">
        {/* Badges / Labels moved to description */}
        {(product.isBestseller || tag === 'BESTSELLER' || isNew || tag === 'SALE') && (
          <div className="flex items-center gap-1.5 mb-0.5">
            {(product.isBestseller || tag === 'BESTSELLER') ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3e502a] text-white text-[8px] sm:text-[9.5px] font-serif uppercase tracking-widest shadow-xs">
                <span className="w-1 h-1 rounded-full bg-[#fae5a0]" />
                <span>Bestseller</span>
              </span>
            ) : isNew ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3e502a] text-white text-[8px] sm:text-[9.5px] font-serif uppercase tracking-widest shadow-xs">
                <span className="w-1 h-1 rounded-full bg-[#fae5a0]" />
                <span>New Arrival</span>
              </span>
            ) : tag === 'SALE' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8c2a2a] text-white text-[8px] sm:text-[9.5px] font-serif uppercase tracking-widest shadow-xs">
                <span className="w-1 h-1 rounded-full bg-[#ffcc66]" />
                <span>Sale</span>
              </span>
            ) : null}
          </div>
        )}

        {/* Product Title — clean modern typography */}
        <h3 className="text-xs sm:text-base font-semibold text-charcoal group-hover:text-[#769055] transition-colors line-clamp-1 leading-snug tracking-tight">
          {name}
        </h3>

        {/* Pricing Row: Current Price + Strikethrough + Discount Label */}
        <div className="flex items-center flex-wrap gap-1 sm:gap-1.5 pt-0.5">
          <span className="font-bold text-xs sm:text-base text-charcoal">
            ₹{price.toLocaleString('en-IN')}
          </span>
          {originalPrice > price && (
            <span className="text-[9px] sm:text-xs text-stone-400 line-through">
              ₹{originalPrice.toLocaleString('en-IN')}
            </span>
          )}
          {discountOffText && (
            <span className="text-[9px] sm:text-[11px] font-bold text-emerald-700">
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