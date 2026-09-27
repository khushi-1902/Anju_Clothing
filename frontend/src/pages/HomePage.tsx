import { Hero } from '../components/Hero'
import { FeatureBanner } from '../components/FeatureBanner'
import { ReviewsSection } from '../components/ReviewsSection'
import { ProductScroller } from '../components/ProductScroller'
import { ImagePlaceholder } from '../components/ImagePlaceholder'
import { CATEGORIES, PRODUCTS } from '../data/products'
import { useShop } from '../context/ShopContext'
import { useNewArrivals, useBestsellers, useSaleProducts } from '../lib/api'

/** Same button under every product section: "View More" on mobile, the full label from tablet up */
function ViewMoreButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="text-center mt-10 sm:mt-12">
      <button
        type="button"
        onClick={onClick}
        className="group inline-flex items-center gap-2 px-7 sm:px-9 py-3 sm:py-3.5 bg-white border border-[#769055] text-[#769055] hover:bg-[#769055] hover:text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 shadow-xs hover:shadow-lg cursor-pointer"
      >
        <span className="sm:hidden">View More</span>
        <span className="hidden sm:inline">{label}</span>
        <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span>
      </button>
    </div>
  )
}

/** Reusable section header — eyebrow, heading, subcopy, shared across product sections */
function SectionHeading({
  eyebrow,
  eyebrowTone = 'gold',
  heading,
  subcopy,
}: {
  eyebrow: string
  eyebrowTone?: 'gold' | 'dark'
  heading: string
  subcopy: string
}) {
  return (
    <div className="text-center mb-10 sm:mb-14 px-4">
      {eyebrowTone === 'gold' ? (
        <p className="text-[#c9973a] text-[11px] sm:text-xs uppercase tracking-[0.3em] font-semibold mb-2">
          {eyebrow}
        </p>
      ) : (
        <span className="inline-block bg-black text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest mb-3">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-charcoal leading-tight tracking-tight">
        {heading}
      </h2>

      {/* Ornamental divider — thin gold line flanking a rotated diamond, echoes jewelry motifs common in ethnic-wear branding */}
      <div className="flex items-center justify-center gap-2.5 mt-3.5" aria-hidden="true">
        <span className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-[#c9973a]/70" />
        <span className="w-2 h-2 rotate-45 border border-[#c9973a] bg-[#c9973a]/20" />
        <span className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-[#c9973a]/70" />
      </div>

      <p className="text-muted text-xs sm:text-sm mt-3 sm:mt-4 max-w-md mx-auto">
        {subcopy}
      </p>
    </div>
  )
}

/** Skeleton shaped to match ProductCard exactly (aspect-2/3, rounded image, same copy lines) so loading never causes layout jump */
function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="rounded-2xl sm:rounded-3xl overflow-hidden bg-[#FAF7F2] aspect-[2/3] w-full border border-stone-200/60" />
          <div className="pt-2.5 px-1 flex flex-col gap-1.5">
            <div className="h-2.5 bg-stone-200/70 rounded w-1/3" />
            <div className="h-3 bg-stone-200/70 rounded w-4/5" />
            <div className="h-3 bg-stone-200/70 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function HomePage() {
  const { navigateTo } = useShop()

  const { products: newArrivals, loading: newArrivalsLoading } = useNewArrivals(8)
  const { products: bestsellers, loading: bestsellersLoading } = useBestsellers(8)
  const { products: saleItems, loading: saleLoading } = useSaleProducts(8)

  return (
    <div className="space-y-0">
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. New Arrivals */}
      <section id="new-arrivals" className="py-14 sm:py-20 bg-ivory border-t border-border/40" aria-labelledby="new-arrivals-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading
            eyebrow="Just Dropped"
            heading="New Arrivals"
            subcopy="Freshly designed ethnic wear ready for the festive season"
          />

          {newArrivalsLoading ? (
            <ProductGridSkeleton />
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

      {/* 3. Feature Banner */}
      <FeatureBanner />

      {/* 4. Bestsellers */}
      <section id="bestsellers" className="py-14 sm:py-20 bg-white" aria-labelledby="bestsellers-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading
            eyebrow="Customer Loves"
            heading="Best Sellers"
            subcopy="Our most celebrated outfits loved by thousands of happy customers"
          />

          {bestsellersLoading ? (
            <ProductGridSkeleton />
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

      {/* 5. Mega Sale */}
      <section id="sale" className="py-14 sm:py-20 bg-ivory border-t border-border/40" aria-labelledby="sale-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading
            eyebrow="Limited Festive Deals"
            eyebrowTone="dark"
            heading="Mega Sale Collection"
            subcopy="Up to 54% off on selected luxury sets — while stock lasts"
          />

          {saleLoading ? (
            <ProductGridSkeleton />
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

      {/* 6. Customer Reviews */}
      <ReviewsSection />
    </div>
  )
}