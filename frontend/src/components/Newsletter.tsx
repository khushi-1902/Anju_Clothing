import { useState } from 'react'

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubscribed(true)
      setEmail('')
    }
  }

  return (
    <section className="py-16 bg-olive text-white" aria-labelledby="newsletter-heading">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <p className="text-gold-light text-xs uppercase tracking-[0.3em] font-semibold mb-2">
          Stay Connected
        </p>
        <h2 id="newsletter-heading" className="font-display text-3xl sm:text-4xl font-bold mb-3">
          Get Exclusive Festive Offers
        </h2>
        <p className="text-white/80 text-xs sm:text-sm max-w-lg mx-auto mb-8">
          Join our VIP club for early access to new arrivals, festive drop alerts, and exclusive subscriber-only coupon codes.
        </p>

        {subscribed ? (
          <div className="bg-white/15 border border-white/30 py-3.5 px-6 max-w-md mx-auto text-sm font-semibold tracking-wide text-gold-light">
            ✨ Thank you for subscribing! Check your inbox soon for your 10% welcome voucher.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="email"
              required
              placeholder="Enter your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 text-sm bg-white/10 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:border-white focus:bg-white/20 transition-all"
            />
            <button
              type="submit"
              className="px-7 py-3 text-xs font-bold uppercase tracking-wider text-olive bg-gold-light hover:bg-gold transition-colors whitespace-nowrap cursor-pointer shadow-md"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
