import { ProductListingPage } from './ProductListingPage'
import { ReviewsSection } from '../components/ReviewsSection'

export function BestsellersPage() {
  return (
    <div className="space-y-8">
      <ProductListingPage mode="bestsellers" />
      <ReviewsSection />
    </div>
  )
}
