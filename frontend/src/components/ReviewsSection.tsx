import { REVIEWS } from '../data/products'
import { StarRating } from './StarRating'

export function ReviewsSection() {
  return (
    <section className="py-16 bg-white" aria-labelledby="reviews-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Centered Heading */}
        <div className="text-center mb-12">
          <p className="text-gold text-xs uppercase tracking-[0.3em] font-semibold mb-2">
            Real Experiences
          </p>
          <h2 id="reviews-heading" className="font-display text-3xl font-bold text-charcoal">
            Customer Reviews
          </h2>
          <p className="text-muted text-xs sm:text-sm mt-2">
            Hear from our festive community — real reviews coming soon
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {REVIEWS.map(r => (
            <div
              key={r.id}
              className="p-6 border border-border/80 bg-ivory/60 hover:bg-ivory hover:border-border transition-all flex flex-col justify-between shadow-xs hover:shadow-md"
            >
              <div>
                <StarRating rating={r.rating} />
                <p className="mt-4 text-xs sm:text-sm text-charcoal leading-relaxed italic">
                  "{r.text}"
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border/60">
                <p className="font-bold text-sm text-olive">{r.name}</p>
                {r.location && <p className="text-[11px] text-muted">{r.location}</p>}
                <p className="text-[10px] text-muted mt-1 bg-cream/70 inline-block px-2 py-0.5 font-medium">
                  Purchased: {r.product}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
