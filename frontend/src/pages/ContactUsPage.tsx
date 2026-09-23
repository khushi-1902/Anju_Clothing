import { useState } from 'react'
import { STORE_INFO, FAQS } from '../data/products'
import { TrustBar } from '../components/TrustBar'

export function ContactUsPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setFormData({ name: '', phone: '', email: '', message: '' })
  }

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  return (
    <div className="min-h-screen py-12 bg-ivory space-y-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Centered Page Heading */}
        <div className="text-center mb-12">
          <p className="text-gold text-xs uppercase tracking-[0.3em] font-semibold mb-2">
            Get In Touch
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal">
            Contact Anju Clothings
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-3 max-w-lg mx-auto">
            Have questions about sizes, international orders, bridal collections, or customizations? Our team is always delighted to assist you.
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          
          {/* WhatsApp Direct */}
          <div className="bg-white p-6 border border-border/80 text-center flex flex-col items-center justify-between shadow-xs hover:border-olive transition-colors">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl mb-4">
              💬
            </div>
            <h3 className="font-display text-base font-bold text-charcoal mb-1">WhatsApp Chat</h3>
            <p className="text-xs text-muted mb-4">Instant support & custom orders</p>
            <a
              href={`https://wa.me/${STORE_INFO.phoneRaw}?text=Hi%20Anju%20Clothings,%20I%20have%20a%20question.`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-green-700 hover:underline inline-flex items-center gap-1"
            >
              Chat on WhatsApp →
            </a>
          </div>

          {/* Phone Call */}
          <div className="bg-white p-6 border border-border/80 text-center flex flex-col items-center justify-between shadow-xs hover:border-olive transition-colors">
            <div className="w-12 h-12 rounded-full bg-olive/10 text-olive flex items-center justify-center text-2xl mb-4">
              📞
            </div>
            <h3 className="font-display text-base font-bold text-charcoal mb-1">Call Support</h3>
            <p className="text-xs text-muted mb-4">{STORE_INFO.hours}</p>
            <a href={`tel:${STORE_INFO.phoneRaw}`} className="text-xs font-bold text-olive hover:underline">
              {STORE_INFO.phone}
            </a>
          </div>

          {/* Email Support */}
          <div className="bg-white p-6 border border-border/80 text-center flex flex-col items-center justify-between shadow-xs hover:border-olive transition-colors">
            <div className="w-12 h-12 rounded-full bg-gold/15 text-gold flex items-center justify-center text-2xl mb-4">
              ✉️
            </div>
            <h3 className="font-display text-base font-bold text-charcoal mb-1">Email Inquiries</h3>
            <p className="text-xs text-muted mb-4">Response within 24 business hours</p>
            <a href={`mailto:${STORE_INFO.email}`} className="text-xs font-bold text-charcoal hover:text-olive">
              {STORE_INFO.email}
            </a>
          </div>

          {/* Store Location */}
          <div className="bg-white p-6 border border-border/80 text-center flex flex-col items-center justify-between shadow-xs hover:border-olive transition-colors">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mb-4">
              📍
            </div>
            <h3 className="font-display text-base font-bold text-charcoal mb-1">Location</h3>
            <p className="text-xs text-muted mb-4">{STORE_INFO.address}</p>
            <span className="text-xs font-semibold text-charcoal">Pan-India Express Delivery</span>
          </div>
        </div>

        {/* Contact Form & Help Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white border border-border/80 p-6 sm:p-10 shadow-xs">
          
          {/* Inquiry Form */}
          <div className="lg:col-span-7">
            <h2 className="font-display text-2xl font-bold text-charcoal mb-2">Send Us a Message</h2>
            <p className="text-xs text-muted mb-6">
              Fill out the form below and our styling consultant will get back to you promptly.
            </p>

            {submitted ? (
              <div className="bg-olive/10 border border-olive/30 p-6 text-center space-y-3">
                <div className="text-3xl">✨</div>
                <h3 className="font-display text-lg font-bold text-olive">Thank you for reaching out!</h3>
                <p className="text-xs text-charcoal max-w-sm mx-auto">
                  We have received your message and will respond to you shortly via WhatsApp or Email.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-2 px-6 py-2 bg-olive text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-charcoal mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priya Sharma"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-cream/50 border border-border px-4 py-2.5 text-xs text-charcoal focus:outline-none focus:border-olive focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-charcoal mb-1">Phone / WhatsApp Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-cream/50 border border-border px-4 py-2.5 text-xs text-charcoal focus:outline-none focus:border-olive focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-cream/50 border border-border px-4 py-2.5 text-xs text-charcoal focus:outline-none focus:border-olive focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">Your Message or Inquiry *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Inquire about custom sizing, bridal order, delivery estimate, etc."
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-cream/50 border border-border px-4 py-2.5 text-xs text-charcoal focus:outline-none focus:border-olive focus:bg-white transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="px-8 py-3.5 bg-olive hover:bg-olive-dark text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-md cursor-pointer"
                >
                  Submit Inquiry
                </button>
              </form>
            )}
          </div>

          {/* Quick FAQ / WhatsApp callout */}
          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-border/80 pt-8 lg:pt-0 lg:pl-10 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-charcoal mb-4">
                Need Faster Assistance?
              </h3>
              <p className="text-xs text-muted leading-relaxed mb-6">
                For order status, sizing recommendations, or instant checkout support, WhatsApp our customer team directly.
              </p>

              <div className="space-y-3">
                <a
                  href={`https://wa.me/${STORE_INFO.phoneRaw}?text=Hi%20Anju%20Clothings,%20I%20need%20help%20with%20sizing.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 bg-green-50 border border-green-200 text-green-800 text-xs font-semibold hover:bg-green-100 transition-colors"
                >
                  <span>👗 Ask about Outfit Sizing & Fit</span>
                  <span>→</span>
                </a>

                <a
                  href={`https://wa.me/${STORE_INFO.phoneRaw}?text=Hi%20Anju%20Clothings,%20I%20would%20like%20to%20track%20my%20order.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 bg-cream border border-border text-charcoal text-xs font-semibold hover:bg-ivory transition-colors"
                >
                  <span>📦 Track Existing Order</span>
                  <span>→</span>
                </a>

                <a
                  href={`https://wa.me/${STORE_INFO.phoneRaw}?text=Hi%20Anju%20Clothings,%20I%20am%20interested%20in%20bulk/bridal%20orders.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 bg-cream border border-border text-charcoal text-xs font-semibold hover:bg-ivory transition-colors"
                >
                  <span>💍 Bulk & Bridal Inquiries</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border/60 text-xs text-muted">
              <p>⏱️ Working Hours: Monday to Saturday, 10:00 AM – 8:00 PM IST</p>
            </div>
          </div>
        </div>

        {/* FAQs Accordion (Centered Heading) */}
        <div className="pt-8">
          <div className="text-center mb-10">
            <p className="text-gold text-xs uppercase tracking-[0.3em] font-semibold mb-2">
              Common Inquiries
            </p>
            <h2 className="font-display text-3xl font-bold text-charcoal">
              Frequently Asked Questions
            </h2>
            <p className="text-muted text-xs sm:text-sm mt-2">
              Everything you need to know about ordering, delivery, and returns
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div key={index} className="bg-white border border-border/80 overflow-hidden shadow-xs">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-ivory/50 transition-colors"
                  >
                    <span className="font-display text-sm sm:text-base font-bold text-charcoal">
                      {faq.q}
                    </span>
                    <span className="text-lg font-bold text-olive shrink-0">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-muted leading-relaxed border-t border-gray-100 bg-ivory/20">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <TrustBar />
    </div>
  )
}
