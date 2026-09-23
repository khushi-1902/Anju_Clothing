import { useState } from 'react'
import { useShop } from '../context/ShopContext'
import { StarRating } from './StarRating'

export function QuickViewModal() {
  const { quickViewProduct, setQuickViewProduct, addToCart, navigateTo, toggleWishlist, isInWishlist } = useShop()
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  if (!quickViewProduct) return null

  const { id, name, price, originalPrice, img, rating, reviewCount, description, sizes, fabric, work } = quickViewProduct
  const isWished = isInWishlist(id)
  const activeSize = selectedSize || sizes?.[0] || 'Standard'
  const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100)

  const handleAddToCart = () => {
    addToCart(quickViewProduct, activeSize, quantity)
    setAdded(true)
    setTimeout(() => {
      setAdded(false)
      setQuickViewProduct(null)
    }, 1200)
  }

  const handleViewFullDetails = () => {
    setQuickViewProduct(null)
    navigateTo('product-detail', id)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        onClick={() => setQuickViewProduct(null)}
        className="fixed inset-0 bg-charcoal/70 backdrop-blur-xs transition-opacity"
      />

      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white shadow-2xl overflow-hidden border border-border">
          
          {/* Close button */}
          <button
            onClick={() => setQuickViewProduct(null)}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-charcoal hover:bg-cream transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2">
            
            {/* Image */}
            <div className="relative bg-cream aspect-[4/5] sm:aspect-auto">
              <img
                src={img}
                alt={name}
                className="w-full h-full object-cover object-top"
              />
            </div>

            {/* Info */}
            <div className="p-6 flex flex-col justify-between text-left">
              <div className="space-y-3">
                {rating && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={rating} />
                    <span className="text-xs text-muted">({reviewCount} reviews)</span>
                  </div>
                )}

                <h3 className="font-display text-xl font-bold text-charcoal">{name}</h3>

                <div className="flex items-baseline gap-2.5">
                  <span className="font-bold text-xl text-olive">₹{price.toLocaleString()}</span>
                  <span className="text-sm text-muted line-through">₹{originalPrice.toLocaleString()}</span>
                  <span className="text-xs text-green-700 font-bold">{discountPercent}% OFF</span>
                </div>

                <p className="text-xs text-muted line-clamp-3 leading-relaxed">
                  {description}
                </p>

                {/* Fabric & Work snippet */}
                <div className="text-[11px] space-y-1 py-2 border-y border-border/60">
                  {fabric && <p><strong className="text-charcoal">Fabric:</strong> {fabric}</p>}
                  {work && <p><strong className="text-charcoal">Work:</strong> {work}</p>}
                </div>

                {/* Sizes */}
                {sizes && sizes.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-charcoal block mb-2">Select Size:</label>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`px-3 py-1 text-xs font-semibold border transition-all cursor-pointer ${
                            activeSize === size
                              ? 'border-olive bg-olive text-white shadow-xs'
                              : 'border-gray-200 text-charcoal hover:border-olive'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs font-bold text-charcoal">Quantity:</span>
                  <div className="flex items-center border border-gray-300">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-2.5 py-1 text-xs hover:bg-gray-100 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-xs font-bold">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-2.5 py-1 text-xs hover:bg-gray-100 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={handleAddToCart}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer ${
                      added ? 'bg-gold' : 'bg-olive hover:bg-olive-dark'
                    }`}
                  >
                    {added ? 'Added to Bag ✓' : 'Add to Bag'}
                  </button>
                  <button
                    onClick={() => toggleWishlist(id)}
                    className="px-3 border border-gray-300 hover:border-olive flex items-center justify-center cursor-pointer"
                    aria-label="Wishlist"
                  >
                    <svg
                      className={`w-5 h-5 ${isWished ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
                      fill={isWished ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={handleViewFullDetails}
                  className="w-full text-center text-xs font-semibold text-olive hover:underline py-1 cursor-pointer"
                >
                  View Complete Product Specifications →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
