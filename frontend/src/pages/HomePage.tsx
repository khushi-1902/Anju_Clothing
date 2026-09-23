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

  const newArrivals = PRODUCTS.filter(p => p.isNewArrival)
  const bestsellers = PRODUCTS.filter(p => p.isBestseller)
  const saleItems = PRODUCTS.filter(p => p.isSale)

  const handleCategoryClick = (slug: string) => {
    navigateTo('all-products', undefined, slug)
  }

  return (
    <div className="space-y-0">
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Trust Assurances Bar */}
      <TrustBar />

      {/* 3. Shop Categories Section (Centered Heading) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16" aria-labelledby="categories-heading">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-[#c9973a] text-xs uppercase tracking-[0.3em] font-semibold mb-2">
            Curated Styles
          </p>
          <h2 id="categories-heading" className="font-display text-3xl sm:text-4xl font-bold text-charcoal">
            Shop By Category
          </h2>
          <p className="text-muted text-xs sm:text-sm mt-2 max-w-md mx-auto">
            Explore authentic handpicked Indian ensembles designed for every celebration
          </p>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 sm:gap-6 -mx-4 px-4 pb-2 scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:snap-none">
          {CATEGORIES.slice(0, 4).map(cat => (
            <div
              key={cat.id}
              role="button"
              tabIndex={0}
              onClick={() => handleCategoryClick(cat.slug)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleCategoryClick(cat.slug)
                }
              }}
              className="group flex-none w-[44vw] min-w-[150px] max-w-[210px] snap-start sm:w-auto sm:min-w-0 sm:max-w-none flex flex-col cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              {/* Category Dress Image with Rounded Corners & Extra Height (aspect 2:3) */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-[2/3] w-full bg-[#FAF7F2] border border-stone-200/60 shadow-xs group-hover:shadow-md transition-all">
                <ImagePlaceholder
                  src={cat.img}
                  alt={cat.name}
                  aspectRatio="2/3"
                  label={cat.name}
                />
              </div>

              {/* Category Details BELOW the Card */}
              <div className="pt-2.5 px-1 text-center">
                <span className="font-semibold text-xs sm:text-sm text-charcoal group-hover:text-[#769055] transition-colors block">
                  {cat.name}
                </span>
                <span className="text-[11px] text-[#769055] font-medium mt-0.5 inline-block group-hover:underline">
                  View Collection →
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

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

          <ProductScroller
            products={newArrivals}
            desktopLimit={4}
            desktopGridClassName="sm:grid-cols-2 lg:grid-cols-4"
          />

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

          <ProductScroller
            products={bestsellers}
            desktopLimit={4}
            desktopGridClassName="sm:grid-cols-2 lg:grid-cols-4"
          />

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

          <ProductScroller
            products={saleItems}
            desktopLimit={4}
            desktopGridClassName="sm:grid-cols-2 lg:grid-cols-4"
          />

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