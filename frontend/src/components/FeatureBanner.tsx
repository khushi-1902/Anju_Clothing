import { useShop } from '../context/ShopContext'

export function FeatureBanner() {
  const { navigateTo } = useShop()

  return (
    <section className="relative py-20 overflow-hidden bg-olive" aria-label="Creators Favourite Spotlight">
      <img
        src="https://images.unsplash.com/photo-1645862755924-9f4e7f200b83?w=1600&h=600&fit=crop&auto=format"
        alt="Creators favourite collection"
        className="absolute inset-0 w-full h-full object-cover object-center mix-blend-multiply opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-olive/90 via-olive/75 to-olive/90" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
        <p className="text-gold-light text-xs uppercase tracking-[0.3em] font-semibold mb-3">
          Influencer & Creator Picks
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 drop-shadow-sm">
          Creators' Favourite Collection
        </h2>
        <p className="text-white/90 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed">
          Pieces hand-selected by India's top fashion stylists — designed to photograph gracefully and drape with effortless comfort.
        </p>
        <button
          onClick={() => navigateTo('all-products')}
          className="inline-block px-8 py-3.5 text-xs font-bold uppercase tracking-widest border-2 border-gold-light text-gold-light hover:bg-gold-light hover:text-olive transition-all transform hover:scale-105 cursor-pointer shadow-md"
        >
          Explore Collection
        </button>
      </div>
    </section>
  )
}
