import { useRef, useState } from 'react'
import { REVIEWS } from '../data/products'
import { StarRating } from './StarRating'

/**
 * Lotus crest that sits on the top edge of the header plaque.
 * Three petals + a base line, drawn in the site's gold.
 */
function LotusCrest() {
  return (
    <svg
      viewBox="0 0 56 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-11 h-7 sm:w-14 sm:h-9"
      aria-hidden="true"
    >
      {/* Outer petals */}
      <path
        d="M28 30 C14 30 5 23 3 13 C12 14 21 20 28 30 Z"
        fill="#c49332"
        fillOpacity="0.18"
        stroke="#c49332"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M28 30 C42 30 51 23 53 13 C44 14 35 20 28 30 Z"
        fill="#c49332"
        fillOpacity="0.18"
        stroke="#c49332"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Inner petals */}
      <path
        d="M28 30 C19 27 14 20 14 10 C21 13 26 20 28 30 Z"
        fill="#c49332"
        fillOpacity="0.28"
        stroke="#c49332"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M28 30 C37 27 42 20 42 10 C35 13 30 20 28 30 Z"
        fill="#c49332"
        fillOpacity="0.28"
        stroke="#c49332"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Centre petal */}
      <path
        d="M28 3 C34 11 34 21 28 30 C22 21 22 11 28 3 Z"
        fill="#c49332"
        fillOpacity="0.4"
        stroke="#c49332"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Base */}
      <path d="M12 32 H44" stroke="#c49332" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Gold rule that sits beside the heading: a fading line ending in a diamond
 * next to the title. Mirrored for the right side.
 */
function SideRule({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left'
  return (
    <div
      className={`flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 ${isLeft ? '' : 'flex-row-reverse'}`}
      aria-hidden="true"
    >
      <span
        className={`h-px flex-1 ${
          isLeft
            ? 'bg-gradient-to-r from-transparent to-[#c49332]'
            : 'bg-gradient-to-l from-transparent to-[#c49332]'
        }`}
      />
      <span className="w-1.5 h-1.5 rotate-45 border border-[#c49332] shrink-0" />
      <span className="w-2 h-2 rotate-45 bg-[#c49332] shrink-0" />
    </div>
  )
}

export function ReviewsSection() {
  const scrollerRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  // Work out which letter is closest to the left edge of the slider (mobile dots)
  const handleScroll = () => {
    const el = scrollerRef.current
    if (!el) return
    const left = el.getBoundingClientRect().left
    let best = 0
    let bestDist = Infinity
    Array.from(el.children).forEach((child, i) => {
      const dist = Math.abs(child.getBoundingClientRect().left - left)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    setActive(best)
  }

  const goTo = (index: number) => {
    const el = scrollerRef.current
    const target = el?.children[index] as HTMLElement | undefined
    target?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }

  return (
    <section className="py-8 sm:py-10 md:py-12 bg-cream/50 border-t border-[#ebdccb]/60 relative overflow-hidden" aria-labelledby="reviews-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Heading matching Best Sellers exact Royal Theme */}
        <div className="relative mb-6 sm:mb-8">
          <div className="flex flex-col items-center text-center">
            <LotusCrest />

            {/* Heading with gold rules on both sides */}
            <div className="mt-2 flex items-center w-full max-w-2xl gap-3 sm:gap-5">
              <SideRule side="left" />

              <h2
                id="reviews-heading"
                className="shrink-0 font-serif text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-[#3e502a] tracking-wide leading-tight"
              >
                Customer Reviews
              </h2>

              <SideRule side="right" />
            </div>

            <p className="mt-3 sm:mt-4 text-[#6d5b52] font-serif italic text-sm sm:text-base leading-relaxed max-w-md">
              Hear from our festive community — real experiences and heartfelt love
            </p>
          </div>
        </div>

        {/* Letters: swipe slider on mobile, grid from md up */}
        <ul
          ref={scrollerRef}
          onScroll={handleScroll}
          className="
            -mx-4 px-4 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6
            flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]
            md:mx-0 md:px-0 md:overflow-visible md:snap-none md:pb-0
            md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 lg:gap-7
          "
        >
          {REVIEWS.map((r) => (
            <li
              key={r.id}
              className="
                flex shrink-0 snap-start w-[84%] sm:w-[60%]
                md:w-auto md:shrink
                md:odd:-rotate-[0.8deg] md:even:rotate-[0.8deg] md:hover:rotate-0
                transition-transform duration-300
              "
            >
              <article className="relative flex flex-1 flex-col bg-gradient-to-b from-ivory to-cream border border-border shadow-[0_8px_22px_rgba(0,0,0,0.08)] p-1.5">
                {/* Inner hairline frame, like the border of letter paper */}
                <div className="relative flex flex-1 flex-col border border-gold/50 px-5 pt-5 pb-6">
                  <div className="flex items-center justify-between gap-3">
                    <StarRating rating={r.rating} />
                    {r.location && (
                      <span className="text-[11px] text-muted italic text-right">{r.location}</span>
                    )}
                  </div>

                  <div className="mt-4 flex-1">
                    <p className="font-display text-sm text-olive">Dear Team,</p>
                    <blockquote className="mt-2 font-display italic text-sm sm:text-[0.95rem] text-charcoal leading-[1.75]">
                      {r.text}
                    </blockquote>
                  </div>

                  <div className="mt-6 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display italic text-xs text-muted">With warm regards,</p>
                      <p className="mt-1 font-display italic font-bold text-lg text-olive leading-tight">
                        {r.name}
                      </p>
                    </div>

                    {/* Wax seal with the customer's initial */}
                    <span
                      aria-hidden="true"
                      className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full bg-olive text-cream font-display font-bold text-lg border-2 border-gold shadow-[0_2px_6px_rgba(0,0,0,0.25),inset_0_0_0_3px_rgba(255,255,255,0.12)]"
                    >
                      {r.name.trim().charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <p className="mt-4 pt-3 border-t border-dashed border-border text-[11px] text-muted">
                    <span className="font-display italic font-bold text-charcoal">P.S.</span>{' '}
                    Purchased: {r.product}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>

        {/* Slider dots, mobile only */}
        <div className="md:hidden mt-2 flex items-center justify-center" role="group" aria-label="Choose a review">
          {REVIEWS.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to review ${i + 1}`}
              aria-current={i === active}
              className="flex h-6 w-6 items-center justify-center focus:outline-hidden focus-visible:ring-2 focus-visible:ring-gold rounded-full"
            >
              <span
                className={`block rounded-full transition-all duration-200 ${i === active ? 'h-2 w-5 bg-gold' : 'h-2 w-2 bg-border'
                  }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}