import { STORE_INFO, CATEGORIES } from '../data/products'
import { useShop } from '../context/ShopContext'

export function Footer() {
  const { navigateTo } = useShop()

  const handleCategoryClick = (slug: string) => {
    navigateTo('all-products', undefined, slug)
  }

  return (
    <>
      {/* Main Olive Green Footer (Matching Exact Screenshot) */}
      <footer className="bg-[#769055] text-white pt-14 pb-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">

            {/* 1. ABOUT US */}
            <div className="space-y-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-white border-b border-white/20 pb-2 inline-block">
                About Us
              </h3>
              <p className="text-xs text-white/90 leading-relaxed">
                {STORE_INFO.name} is dedicated to handcrafted, timeless Indian ethnic wear. Blending authentic craftsmanship with modern trends to create silhouettes you love for every celebration.
              </p>
              
              {/* Social Media Icons */}
              <div className="flex items-center gap-3 pt-2">
                {[
                  { name: 'Instagram', icon: '📷' },
                  { name: 'Facebook', icon: '📘' },
                  { name: 'YouTube', icon: '▶️' },
                ].map(({ name, icon }) => (
                  <a
                    key={name}
                    href="#"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white hover:text-[#769055] transition-all flex items-center justify-center text-xs"
                    aria-label={name}
                  >
                    <span>{icon}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* 2. INFORMATION */}
            <div className="space-y-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-white border-b border-white/20 pb-2 inline-block">
                Information
              </h3>
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
            </div>

            {/* 3. CATEGORY */}
            <div className="space-y-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-white border-b border-white/20 pb-2 inline-block">
                Category
              </h3>
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
            </div>

            {/* 4. OUR ONLINE STORE */}
            <div className="space-y-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-white border-b border-white/20 pb-2 inline-block">
                Our Online Store
              </h3>
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
            </div>

          </div>
        </div>
      </footer>

      {/* Bottom Payment Bar & Copyright (White Background Strip) */}
      <div className="bg-white py-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Payment Badges (Mastercard, Visa, PayPal, GPay, UPI) */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold">
            <span className="px-2 py-1 bg-gray-100 text-gray-800 border border-gray-300 rounded-xs flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              Mastercard
            </span>
            <span className="px-2 py-1 bg-gray-100 text-blue-900 border border-gray-300 rounded-xs font-black">
              VISA
            </span>
            <span className="px-2 py-1 bg-gray-100 text-blue-700 border border-gray-300 rounded-xs font-bold">
              PayPal
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-800 border border-gray-300 rounded-xs">
              G Pay
            </span>
            <span className="px-2 py-1 bg-gray-100 text-orange-600 border border-gray-300 rounded-xs">
              UPI / RuPay
            </span>
          </div>

          {/* Copyright text */}
          <p className="text-xs text-gray-500 text-center sm:text-right">
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
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </>
  )
}
