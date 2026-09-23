import { TRUST_ITEMS } from '../data/products'

export function TrustBar() {
  return (
    <section className="bg-cream border-y border-border" aria-label="Customer assurances">
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {TRUST_ITEMS.map(({ icon, label, sub }) => (
          <div key={label} className="flex items-center gap-3.5 px-4 py-2 first:pl-0 last:pr-0">
            <span className="text-2xl sm:text-3xl shrink-0" role="img" aria-label={label}>
              {icon}
            </span>
            <div>
              <p className="text-xs sm:text-sm font-bold text-charcoal">{label}</p>
              <p className="text-[11px] text-muted">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
