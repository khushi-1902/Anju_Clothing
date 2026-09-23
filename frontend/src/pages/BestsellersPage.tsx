import { ProductCard } from '../components/ProductCard'
import { PRODUCTS } from '../data/products'
import { ReviewsSection } from '../components/ReviewsSection'
import { TrustBar } from '../components/TrustBar'

export function BestsellersPage() {
  const bestsellers = PRODUCTS.filter(p => p.isBestseller)

  return (
    <div className="min-h-screen py-12 bg-ivory space-y-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Centered Page Heading */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gold/15 border border-gold/40 text-[#769055] text-xs font-bold uppercase tracking-widest mb-3">
            ⭐ Most Loved Collection
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal">
            Shop Bestsellers
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-3 max-w-xl mx-auto">
            These viral silhouettes and festive classics are our highest-rated creations, frequently restocked by popular demand.
          </p>
        </div>

        {/* Bestseller Products Grid (Responsive 2 cols mobile, 3 cols desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-8 lg:gap-10">
          {bestsellers.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* Trust Assurances */}
      <TrustBar />

      {/* Customer Testimonials */}
      <ReviewsSection />
    </div>
  )
}
