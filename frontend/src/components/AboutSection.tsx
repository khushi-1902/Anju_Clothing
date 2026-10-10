import { STORE_INFO } from '../data/products'

export function AboutSection() {
  const stats = [
    { num: STORE_INFO.estYear, label: 'Established Year' },
    { num: 'Pan-India', label: 'Fast Delivery' },
    { num: 'Premium', label: 'Handpicked Fabrics' },
    { num: '24-48h', label: 'Dispatch Time' },
  ]

  return (
    <section className="py-10 sm:py-16 md:py-20 bg-cream border-t border-border/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-gold text-[10px] sm:text-xs uppercase tracking-[0.3em] font-semibold mb-2 sm:mb-3">
          Our Heritage & Craft
        </p>
        <h2 className="font-display text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-3 sm:mb-5 leading-tight px-1">
          About {STORE_INFO.name}
        </h2>
        <p className="text-muted text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl mx-auto px-2">
          We are passionate about celebrating India's rich artisanal heritage through beautifully crafted ethnic wear. From intricate zari-embroidered silk gowns to vibrant festive sharara sets, every silhouette is hand-finished for modern women who embrace tradition with contemporary flair. Pure fabrics, honest transparent pricing, and unmatched attention to detail guide everything we create.
        </p>

        {/* Stats Grid */}
        <div className="mt-8 sm:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 md:gap-8 pt-6 sm:pt-8 border-t border-border/80">
          {stats.map(({ num, label }) => (
            <div key={label} className="text-center p-2 sm:p-3">
              <p className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-olive">{num}</p>
              <p className="text-[10px] sm:text-xs text-muted mt-1 font-semibold uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
