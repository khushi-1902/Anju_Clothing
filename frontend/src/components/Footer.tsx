import { useState } from 'react'
import { FaFacebookF, FaInstagram, FaYoutube } from 'react-icons/fa'
import { STORE_INFO, CATEGORIES } from '../data/products'
import { useShop } from '../context/ShopContext'

type SectionKey = 'about' | 'information' | 'category' | 'store'

/* Payment logo marks — real brand shapes/colors, inlined so no image assets or extra deps are needed */
const MastercardLogo = () => (
  <svg viewBox="0 0 40 24" className="w-8 h-5" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="12" r="10" fill="#EB001B" />
    <circle cx="25" cy="12" r="10" fill="#F79E1B" />
    <path d="M20 4.5a10 10 0 000 15 10 10 0 000-15z" fill="#FF5F00" />
  </svg>
)

const VisaLogo = () => (
  <svg viewBox="0 0 48 16" className="w-11 h-4" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="13" fontFamily="Arial, Helvetica, sans-serif" fontStyle="italic" fontWeight="800" fontSize="16" fill="#FFFFFF" letterSpacing="-0.5">
      VISA
    </text>
  </svg>
)

const PayPalLogo = () => (
  <svg viewBox="0 0 60 16" className="w-14 h-4" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="13" fontFamily="Arial, Helvetica, sans-serif" fontStyle="italic" fontWeight="800" fontSize="15">
      <tspan fill="#003087">Pay</tspan>
      <tspan fill="#009CDE">Pal</tspan>
    </text>
  </svg>
)

const GooglePayLogo = () => (
  <svg viewBox="0 0 74 24" className="w-14 h-4" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0,2) scale(0.42)">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </g>
    <text x="24" y="16" fontFamily="Arial, Helvetica, sans-serif" fontWeight="500" fontSize="13" fill="#3C4043">
      Pay
    </text>
  </svg>
)

export function Footer() {
  const { navigateTo } = useShop()
  const [openSection, setOpenSection] = useState<SectionKey | null>(null)

  const handleCategoryClick = (slug: string) => {
    navigateTo('all-products', undefined, slug)
  }

  const toggleSection = (key: SectionKey) => {
    setOpenSection(prev => (prev === key ? null : key))
  }

  const aboutContent = (
    <>
      <p className="text-xs text-white/90 leading-relaxed">
        {STORE_INFO.name} is dedicated to handcrafted, timeless Indian ethnic wear. Blending authentic craftsmanship with modern trends to create silhouettes you love for every celebration.
      </p>

      {/* Social Media Icons */}
      <div className="flex items-center gap-3 pt-2">
        {[
          { name: 'Facebook', Icon: FaFacebookF },
          { name: 'Instagram', Icon: FaInstagram },
          { name: 'YouTube', Icon: FaYoutube },
        ].map(({ name, Icon }) => (
          <a
            key={name}
            href="#"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white hover:text-[#769055] transition-all flex items-center justify-center"
            aria-label={name}
          >
            <Icon className="w-3.5 h-3.5" />
          </a>
        ))}
      </div>
    </>
  )

  const informationContent = (
    <ul className="space-y-2 text-xs text-white/90">
      <li>
        <button onClick={() => navigateTo('contact')} className="hover:underline cursor-pointer">
          Privacy Policy
        </button>
      </li>
      <li>
        <button onClick={() => navigateTo('contact')} className="hover:underline cursor-pointer">
          Exchange & Return Policy
        </button>
      </li>
      <li>
        <button onClick={() => navigateTo('contact')} className="hover:underline cursor-pointer">
          Shipping Policy
        </button>
      </li>
      <li>
        <button onClick={() => navigateTo('contact')} className="hover:underline cursor-pointer">
          Terms & Conditions
        </button>
      </li>
      <li>
        <button onClick={() => navigateTo('contact')} className="hover:underline cursor-pointer">
          Contact Details
        </button>
      </li>
    </ul>
  )

  const categoryContent = (
    <ul className="space-y-2 text-xs text-white/90">
      <li>
        <button onClick={() => navigateTo('home')} className="hover:underline cursor-pointer">
          Home
        </button>
      </li>
      <li>
        <button onClick={() => navigateTo('all-products')} className="hover:underline cursor-pointer">
          All Products
        </button>
      </li>
      <li>
        <button onClick={() => navigateTo('bestsellers')} className="hover:underline cursor-pointer">
          Shop Bestsellers
        </button>
      </li>
      {CATEGORIES.map(cat => (
        <li key={cat.id}>
          <button
            onClick={() => handleCategoryClick(cat.slug)}
            className="hover:underline cursor-pointer"
          >
            {cat.name}
          </button>
        </li>
      ))}
    </ul>
  )

  const storeContent = (
    <div className="space-y-2.5 text-xs text-white/90">
      <p className="font-medium">Monday – Saturday</p>
      <p className="font-medium">10:00 AM – 8:00 PM</p>
      <p className="pt-1 flex items-center gap-1.5">
        <span>📱 WhatsApp:</span>
        <a
          href={`https://wa.me/${STORE_INFO.phoneRaw}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold underline hover:text-white"
        >
          {STORE_INFO.phone}
        </a>
      </p>
      <p className="flex items-center gap-1.5">
        <span>✉️ Email:</span>
        <a href={`mailto:${STORE_INFO.email}`} className="hover:underline">
          {STORE_INFO.email}
        </a>
      </p>
    </div>
  )

  const sections: { key: SectionKey; title: string; content: React.ReactNode }[] = [
    { key: 'about', title: 'About Us', content: aboutContent },
    { key: 'information', title: 'Information', content: informationContent },
    { key: 'category', title: 'Category', content: categoryContent },
    { key: 'store', title: 'Our Online Store', content: storeContent },
  ]

  return (
    <>
      {/* Main Olive Green Footer */}
      <footer className="bg-[#769055] text-white">
        {/* Desktop: 4-column grid (unchanged) */}
        <div className="hidden lg:block pt-14 pb-12">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
              {sections.map(section => (
                <div key={section.key} className="space-y-4">
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest text-white border-b border-white/20 pb-2 inline-block">
                    {section.title}
                  </h3>
                  {section.content}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile / Tablet: accordion (matches reference) */}
        <div className="lg:hidden">
          {sections.map((section, idx) => {
            const isOpen = openSection === section.key
            return (
              <div
                key={section.key}
                className={idx !== 0 ? 'border-t border-white/20' : undefined}
              >
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between px-5 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-display text-sm font-bold uppercase tracking-widest text-white">
                    {section.title}
                  </span>
                  <span className="text-xl leading-none text-white shrink-0">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-6 space-y-4">{section.content}</div>
                )}
              </div>
            )
          })}
        </div>
      </footer>

      {/* Bottom Payment Bar & Copyright (White Background Strip) */}
      <div className="bg-white py-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center gap-4">

          {/* Payment Badges (Mastercard, PayPal, Visa, Google Pay) */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="w-14 h-9 bg-black rounded-md flex items-center justify-center">
              <MastercardLogo />
            </span>
            <span className="w-14 h-9 bg-white border border-gray-300 rounded-md flex items-center justify-center">
              <PayPalLogo />
            </span>
            <span className="w-14 h-9 bg-[#1A1F71] rounded-md flex items-center justify-center">
              <VisaLogo />
            </span>
            <span className="w-14 h-9 bg-white border border-gray-300 rounded-md flex items-center justify-center">
              <GooglePayLogo />
            </span>
          </div>

          {/* Copyright text */}
          <p className="text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} {STORE_INFO.name}. All Rights Reserved.
          </p>
        </div>
      </div>

      {/* Floating WhatsApp Quick Chat Button */}
      <a
        href={`https://wa.me/${STORE_INFO.phoneRaw}?text=Hi%20Anju%20Clothings,%20I%20have%20an%20inquiry.`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#1EBE5D] text-white p-3.5 rounded-full shadow-2xl transition-all transform hover:scale-110 flex items-center justify-center cursor-pointer"
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </>
  )
}