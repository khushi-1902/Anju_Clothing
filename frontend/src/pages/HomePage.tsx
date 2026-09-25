import { Hero } from '../components/Hero'
import { TrustBar } from '../components/TrustBar'
import { FeatureBanner } from '../components/FeatureBanner'
import { ReviewsSection } from '../components/ReviewsSection'
import { AboutSection } from '../components/AboutSection'
import { Newsletter } from '../components/Newsletter'
import { ProductScroller } from '../components/ProductScroller'
import { ImagePlaceholder } from '../components/ImagePlaceholder'
import { CATEGORIES, PRODUCTS } from '../data/products'
import { useShop } from '../context/ShopContext'
import { useNewArrivals, useBestsellers, useSaleProducts } from '../lib/api'
/** Same button under every product section: "View More" on mobile, the full label from tablet up */
function ViewMoreButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="text-center mt-8 sm:mt-10">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 px-8 py-3 bg-white border border-[#769055] text-[#769055] hover:bg-[#769055] hover:text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-xs hover:shadow-md cursor-pointer"
      >
        <span className="sm:hidden">View More</span>
        <span className="hidden sm:inline">{label}</span>
        <span aria-hidden="true">→</span>
      </button>
    </div>
  )
}

export function HomePage() {
  const { navigateTo } = useShop()

  const { products: newArrivals, loading: newArrivalsLoading } = useNewArrivals(8)
  const { products: bestsellers, loading: bestsellersLoading } = useBestsellers(8)
  const { products: saleItems, loading: saleLoading } = useSaleProducts(8)

  const handleCategoryClick = (slug: string) => {
    navigateTo('all-products', undefined, slug)
  }

  return (
    <div className="space-y-0">
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Trust Assurances Bar */}
      <TrustBar />
      {/* 4. New Arrivals Section (Centered Heading - 4 Cards Per Row) */}
      <section id="new-arrivals" className="py-12 sm:py-16 bg-ivory border-t border-border/40" aria-labelledby="new-arrivals-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-[#c9973a] text-xs uppercase tracking-[0.3em] font-semibold mb-2">
              Just Dropped
            </p>
            <h2 id="new-arrivals-heading" className="font-display text-3xl sm:text-4xl font-bold text-charcoal">
              New Arrivals
            </h2>
            <p className="text-muted text-xs sm:text-sm mt-2">
              Freshly designed ethnic wear ready for the festive season
            </p>
          </div>

          {newArrivalsLoading ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : (
            <ProductScroller
              products={newArrivals}
              desktopLimit={4}
              desktopGridClassName="sm:grid-cols-2 lg:grid-cols-4"
            />
          )}
          <ViewMoreButton
            label="Explore All New Arrivals"
            onClick={() => navigateTo('all-products')}
          />
        </div>
      </section>

      {/* 5. Feature Banner */}
      <FeatureBanner />

      {/* 6. Bestsellers Section (Centered Heading - 4 Cards Per Row) */}
      <section id="bestsellers" className="py-12 sm:py-16 bg-white" aria-labelledby="bestsellers-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-[#c9973a] text-xs uppercase tracking-[0.3em] font-semibold mb-2">
              Customer Loves
            </p>
            <h2 id="bestsellers-heading" className="font-display text-3xl sm:text-4xl font-bold text-charcoal">
              Best Sellers
            </h2>
            <p className="text-muted text-xs sm:text-sm mt-2">
              Our most celebrated outfits loved by thousands of happy customers
            </p>
          </div>

          {bestsellersLoading ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : (
            <ProductScroller
              products={bestsellers}
              desktopLimit={4}
              desktopGridClassName="sm:grid-cols-2 lg:grid-cols-4"
            />
          )}

          <ViewMoreButton
            label="View All Bestsellers"
            onClick={() => navigateTo('bestsellers')}
          />
        </div>
      </section>

      {/* 7. Mega Sale Section (Centered Heading - 4 Cards Per Row) */}
      <section id="sale" className="py-12 sm:py-16 bg-ivory border-t border-border/40" aria-labelledby="sale-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block bg-black text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest mb-2">
              Limited Festive Deals
            </span>
            <h2 id="sale-heading" className="font-display text-3xl sm:text-4xl font-bold text-charcoal">
              Mega Sale Collection
            </h2>
            <p className="text-muted text-xs sm:text-sm mt-2 font-medium">
              Up to 54% off on selected luxury sets — while stock lasts
            </p>
          </div>

          {saleLoading ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : (
            <ProductScroller
              products={saleItems}
              desktopLimit={4}
              desktopGridClassName="sm:grid-cols-2 lg:grid-cols-4"
            />
          )}

          <ViewMoreButton
            label="View All Sale Items"
            onClick={() => navigateTo('all-products')}
          />
        </div>
      </section>

      {/* 8. Customer Reviews Section */}
      <ReviewsSection />

      {/* 9. Brand Heritage & Story */}
      <AboutSection />

      {/* 10. Newsletter Section */}
      <Newsletter />
    </div>
  )
}