import { Hero } from '../components/Hero'
import { CollectionsSection } from '../components/CollectionsSection'
import { NewArrivalsSection } from '../components/NewArrivalsSection'
import { BestsellersSection } from '../components/BestsellersSection'
import { SaleSection } from '../components/SaleSection'
import { FeatureBanner } from '../components/FeatureBanner'
import { ReviewsSection } from '../components/ReviewsSection'

export function HomePage() {
  return (
    <div className="space-y-0">
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Explore Our Collections */}
      <CollectionsSection />

      {/* 3. New Arrivals */}
      <NewArrivalsSection />

      {/* 4. Feature Banner */}
      <FeatureBanner />

      {/* 5. Best Sellers */}
      <BestsellersSection />

      {/* 6. Mega Sale Collection */}
      <SaleSection />

      {/* 7. Customer Reviews */}
      <ReviewsSection />
    </div>
  )
}