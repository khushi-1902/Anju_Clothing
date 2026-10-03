import { ProductListingPage } from './ProductListingPage'
import { TrustBar } from '../components/TrustBar'
import { ReviewsSection } from '../components/ReviewsSection'

export function BestsellersPage() {
  return (
    <div className="space-y-8">
      <ProductListingPage mode="bestsellers" />
      <TrustBar />
      <ReviewsSection />
    </div>
  )
}
