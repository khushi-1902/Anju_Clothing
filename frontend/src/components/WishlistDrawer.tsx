import { useShop } from '../context/ShopContext'
import { PRODUCTS } from '../data/products'
import { ImagePlaceholder } from './ImagePlaceholder'

export function WishlistDrawer() {
  const {
    wishlist,
    isWishlistOpen,
    closeWishlist,
    toggleWishlist,
    addToCart,
    navigateTo,
  } = useShop()

  if (!isWishlistOpen) return null

  const wishedProducts = PRODUCTS.filter(p => wishlist.includes(p.id))

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Dark Backdrop */}
      <div
        onClick={closeWishlist}
        className="fixed inset-0 bg-charcoal/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-full sm:max-w-md flex pl-0 sm:pl-10 z-50 pointer-events-none">
        <div className="w-full h-full bg-white shadow-2xl flex flex-col justify-between pointer-events-auto">
          
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-ivory">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-charcoal">Your Wishlist</h2>
              <span className="text-xs bg-[#c9973a] text-white px-2 py-0.5 rounded-full font-bold">
                {wishedProducts.length}
              </span>
            </div>
            <button
              onClick={closeWishlist}
              className="p-2 text-gray-400 hover:text-charcoal transition-colors cursor-pointer"
              aria-label="Close wishlist"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {wishedProducts.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-4">
                <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto text-3xl">
                  💖
                </div>
                <h3 className="font-display text-lg font-bold text-charcoal">Your wishlist is empty</h3>
                <p className="text-xs text-muted max-w-xs mx-auto">
                  Save your favorite styles here while browsing to keep track of festive outfits!
                </p>
                <button
                  onClick={() => {
                    closeWishlist()
                    navigateTo('all-products')
                  }}
                  className="mt-2 px-6 py-2.5 bg-[#769055] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#5e7343] transition-colors cursor-pointer"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              wishedProducts.map(product => (
                <div
                  key={product.id}
                  className="flex gap-4 p-3 border border-border/60 bg-ivory/30 relative"
                >
                  <div className="w-20 h-24 shrink-0 overflow-hidden bg-cream">
                    <ImagePlaceholder
                      src={product.img}
                      alt={product.name}
                      aspectRatio="4/5"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between text-left">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4
                          onClick={() => {
                            closeWishlist()
                            navigateTo('product-detail', product.id)
                          }}
                          className="font-medium text-xs sm:text-sm text-charcoal hover:text-[#769055] transition-colors cursor-pointer line-clamp-1"
                        >
                          {product.name}
                        </h4>
                        <button
                          onClick={() => toggleWishlist(product.id)}
                          className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                          aria-label="Remove from wishlist"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs font-bold text-[#769055] mt-1">
                        Rs. {product.price.toLocaleString('en-IN')}.00
                        <span className="text-[11px] text-muted line-through font-normal ml-2">
                          Rs. {product.originalPrice.toLocaleString('en-IN')}.00
                        </span>
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        addToCart(product)
                        toggleWishlist(product.id)
                      }}
                      className="mt-2 py-1.5 px-3 bg-[#769055] hover:bg-[#5e7343] text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
                    >
                      Move to Bag
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {wishedProducts.length > 0 && (
            <div className="p-5 border-t border-gray-200 bg-ivory">
              <button
                onClick={() => {
                  wishedProducts.forEach(p => addToCart(p))
                  wishedProducts.forEach(p => toggleWishlist(p.id))
                }}
                className="w-full py-3 bg-[#c9973a] hover:bg-[#e8c06a] hover:text-[#769055] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
              >
                Move All to Bag ({wishedProducts.length})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
