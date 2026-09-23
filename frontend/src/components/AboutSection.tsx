import { STORE_INFO } from '../data/products'

export function AboutSection() {
  const stats = [
    { num: STORE_INFO.estYear, label: 'Established Year' },
    { num: 'Pan-India', label: 'Fast Delivery' },
    { num: 'Premium', label: 'Handpicked Fabrics' },
    { num: '24-48h', label: 'Dispatch Time' },
  ]

  return (
    <section className="py-20 bg-cream border-t border-border/60">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="text-gold text-xs uppercase tracking-[0.3em] font-semibold mb-3">
          Our Heritage & Craft
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-charcoal mb-5">
          About {STORE_INFO.name}
        </h2>
        <p className="text-muted text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          We are passionate about celebrating India's rich artisanal heritage through beautifully crafted ethnic wear. From intricate zari-embroidered silk gowns to vibrant festive sharara sets, every silhouette is hand-finished for modern women who embrace tradition with contemporary flair. Pure fabrics, honest transparent pricing, and unmatched attention to detail guide everything we create.
        </p>

        {/* Stats Grid */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 pt-8 border-t border-border/80">
          {stats.map(({ num, label }) => (
            <div key={label} className="text-center p-3">
              <p className="font-display text-3xl sm:text-4xl font-bold text-olive">{num}</p>
              <p className="text-xs text-muted mt-1.5 font-semibold uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
