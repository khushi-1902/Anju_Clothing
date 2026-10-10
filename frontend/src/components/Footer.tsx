import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaFacebookF, FaInstagram, FaYoutube } from 'react-icons/fa'
import { STORE_INFO, CATEGORIES } from '../data/products'
import { useShop } from '../context/ShopContext'

type SectionKey = 'about' | 'information' | 'category' | 'store'

/* Payment logo marks — authentic brand shapes/colors, perfectly centered horizontally and vertically */
const MastercardLogo = () => (
  <svg viewBox="0 0 48 30" className="w-10 h-6" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
    <circle cx="18" cy="15" r="9" fill="#EB001B" />
    <circle cx="30" cy="15" r="9" fill="#F79E1B" />
    <path
      d="M24 8.64a8.96 8.96 0 013.36 6.36 8.96 8.96 0 01-3.36 6.36 8.96 8.96 0 01-3.36-6.36 8.96 8.96 0 013.36-6.36z"
      fill="#FF5F00"
    />
  </svg>
)

const VisaLogo = () => (
  <svg viewBox="0 0 54 30" className="w-11 h-6" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
    <text
      x="27"
      y="15.5"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="Impact, Arial Black, -apple-system, sans-serif"
      fontStyle="italic"
      fontWeight="900"
      fontSize="16"
      fill="#FFFFFF"
      letterSpacing="0.8px"
    >
      VISA
    </text>
  </svg>
)

const PayPalLogo = () => (
  <svg viewBox="0 0 58 30" className="w-12 h-6" xmlns="http://www.w3.org/2000/svg" aria-label="PayPal">
    <text
      x="29"
      y="15.5"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      fontStyle="italic"
      fontWeight="900"
      fontSize="14.5"
      letterSpacing="-0.2px"
    >
      <tspan fill="#003087">Pay</tspan>
      <tspan fill="#0079C1">Pal</tspan>
    </text>
  </svg>
)

const GooglePayLogo = () => (
  <svg viewBox="0 0 58 30" className="w-12 h-6" xmlns="http://www.w3.org/2000/svg" aria-label="Google Pay">
    {/* Centered group for G-logo + Pay text */}
    <g transform="translate(6, 6)">
      {/* Google "G" logo */}
      <g transform="scale(0.38) translate(0, 2)">
        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
        <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
        <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
        <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
      </g>
      {/* "Pay" text */}
      <text
        x="21"
        y="10"
        dominantBaseline="central"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fontWeight="600"
        fontSize="13"
        fill="#3C4043"
      >
        Pay
      </text>
    </g>
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
        <Link to="/policies?tab=shipping" className="hover:underline hover:text-[#fae5a0] transition-colors">
          Shipping & Delivery Policy
        </Link>
      </li>
      <li>
        <Link to="/policies?tab=cod" className="hover:underline hover:text-[#fae5a0] transition-colors">
          Cash on Delivery (COD) Policy
        </Link>
      </li>
      <li>
        <Link to="/policies?tab=returns" className="hover:underline hover:text-[#fae5a0] transition-colors">
          Exchange & Return Policy
        </Link>
      </li>
      <li>
        <Link to="/policies?tab=size-chart" className="hover:underline hover:text-[#fae5a0] transition-colors">
          Size Guide & Measurements Chart
        </Link>
      </li>
      <li>
        <Link to="/policies?tab=terms" className="hover:underline hover:text-[#fae5a0] transition-colors">
          Terms & Conditions
        </Link>
      </li>
      <li>
        <Link to="/policies?tab=privacy" className="hover:underline hover:text-[#fae5a0] transition-colors">
          Privacy Policy
        </Link>
      </li>
      <li>
        <Link to="/contact" className="hover:underline hover:text-[#fae5a0] transition-colors">
          Contact & Customer Support
        </Link>
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
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white border-b border-white/20 pb-2 inline-block">
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
                  <span className="text-sm font-bold uppercase tracking-widest text-white">
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
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <span className="w-14 h-9 bg-black rounded-lg flex items-center justify-center shadow-xs border border-black/10 overflow-hidden" title="Mastercard">
              <MastercardLogo />
            </span>
            <span className="w-14 h-9 bg-white border border-gray-300 rounded-lg flex items-center justify-center shadow-xs overflow-hidden" title="PayPal">
              <PayPalLogo />
            </span>
            <span className="w-14 h-9 bg-[#1A1F71] border border-[#141858] rounded-lg flex items-center justify-center shadow-xs overflow-hidden" title="Visa">
              <VisaLogo />
            </span>
            <span className="w-14 h-9 bg-white border border-gray-300 rounded-lg flex items-center justify-center shadow-xs overflow-hidden" title="Google Pay">
              <GooglePayLogo />
            </span>
          </div>

          {/* Copyright text */}
          <p className="text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} {STORE_INFO.name}. All Rights Reserved.
          </p>
        </div>
      </div>
    </>
  )
}