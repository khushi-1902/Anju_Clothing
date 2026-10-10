import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { STORE_INFO } from '../data/products'

type PolicyTab = 'shipping' | 'cod' | 'returns' | 'size-chart' | 'terms' | 'privacy'

interface TabConfig {
  id: PolicyTab
  label: string
  icon: string
  title: string
}

const TABS: TabConfig[] = [
  { id: 'shipping', label: 'Shipping & Delivery', icon: '🚚', title: 'Shipping & Delivery Policy' },
  { id: 'cod', label: 'Cash on Delivery', icon: '💵', title: 'Cash on Delivery (COD) Policy' },
  { id: 'returns', label: 'Return & Exchange', icon: '🔄', title: 'Return & Exchange Policy' },
  { id: 'size-chart', label: 'Size Guide & Chart', icon: '📏', title: 'Size Chart & Measurement Guide' },
  { id: 'terms', label: 'Terms & Conditions', icon: '📜', title: 'Terms & Conditions' },
  { id: 'privacy', label: 'Privacy Policy', icon: '🔒', title: 'Privacy Policy' },
]

export function PoliciesPage() {
  const location = useLocation()

  const getInitialTab = (): PolicyTab => {
    const searchParams = new URLSearchParams(location.search)
    const tabParam = searchParams.get('tab') as PolicyTab
    if (tabParam && TABS.some(t => t.id === tabParam)) return tabParam

    const path = location.pathname.toLowerCase()
    if (path.includes('shipping')) return 'shipping'
    if (path.includes('cod')) return 'cod'
    if (path.includes('return') || path.includes('exchange')) return 'returns'
    if (path.includes('size')) return 'size-chart'
    if (path.includes('privacy')) return 'privacy'
    if (path.includes('term')) return 'terms'

    return 'shipping'
  }

  const [activeTab, setActiveTab] = useState<PolicyTab>(getInitialTab)
  const [sizeUnit, setSizeUnit] = useState<'in' | 'cm'>('in')

  useEffect(() => {
    setActiveTab(getInitialTab())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location])

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Page Hero Header */}
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-[#c9973a] text-xs font-bold uppercase tracking-[0.25em] mb-2">
            Customer Information & Policies
          </p>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-charcoal tracking-tight">
            Anju Clothing Store Policies
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-2 max-w-xl mx-auto">
            Transparent, customer-friendly policies crafted for your seamless shopping experience.
          </p>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="bg-white p-2 rounded-2xl shadow-xs border border-[#ebd5be] mb-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#3e502a] text-white shadow-xs font-bold'
                      : 'text-charcoal hover:bg-[#FAF7F2] hover:text-[#3e502a]'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Policy Content Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-[#ebd5be] transition-all">
          
          {/* TAB 1: SHIPPING & DELIVERY */}
          {activeTab === 'shipping' && (
            <div className="space-y-6 text-charcoal">
              <div className="border-b border-[#ebd5be] pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚚</span>
                  <h2 className="font-serif font-bold text-xl sm:text-2xl text-charcoal">
                    Shipping & Delivery Policy
                  </h2>
                </div>
                <p className="text-xs text-muted mt-1">
                  Swift, reliable pan-India dispatch and delivery guidelines.
                </p>
              </div>

              {/* Delivery Timelines Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-[#ebd5be] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-[#3e502a]">
                      Prepaid Orders
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      FREE EXPRESS SHIPPING
                    </span>
                  </div>
                  <p className="text-lg font-bold text-charcoal">
                    Delivery Timeline: 4–5 days after dispatch
                  </p>
                  <p className="text-xs text-stone-600">
                    Applicable on all online prepaid payments including UPI, Credit/Debit Cards, NetBanking & Wallets.
                  </p>
                </div>

                <div className="bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-[#ebd5be] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-[#8c2a2a]">
                      Cash on Delivery (COD)
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                      +₹200 ADVANCE FEE
                    </span>
                  </div>
                  <p className="text-lg font-bold text-charcoal">
                    Delivery Timeline: 6–7 days after dispatch
                  </p>
                  <p className="text-xs text-stone-600">
                    Dispatched once the ₹200 advance shipping charge is paid. Balance outfit amount is paid at doorstep.
                  </p>
                </div>
              </div>

              {/* Urgent Orders Section */}
              <div className="bg-gradient-to-r from-[#3e502a] to-[#556e3b] text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="font-serif font-bold text-base sm:text-lg flex items-center justify-center sm:justify-start gap-2">
                    <span>⚡</span> Urgent Delivery & Rush Orders
                  </h3>
                  <p className="text-xs text-white/90 max-w-xl leading-relaxed">
                    We also accept urgent orders. For urgent delivery requirements, customers can contact us directly on WhatsApp for availability and express priority delivery options.
                  </p>
                </div>
                <a
                  href={`https://wa.me/${STORE_INFO.phoneRaw}?text=Hi%20Anju%20Clothing,%20I%20have%20an%20urgent%20order%20delivery%20request.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-[#c9973a] hover:bg-[#b08129] text-white text-xs font-bold uppercase tracking-wider rounded-xl shrink-0 transition-colors shadow-sm"
                >
                  WhatsApp for Urgent Order
                </a>
              </div>

              {/* Dispatch & Tracking Details */}
              <div className="space-y-3 pt-2 text-xs leading-relaxed text-stone-700">
                <h3 className="font-serif font-bold text-sm text-charcoal">Order Processing & Dispatch</h3>
                <ul className="list-disc list-inside space-y-1.5 pl-1 text-xs">
                  <li>Orders are processed and dispatched within <strong>24–48 business hours</strong> from our workshop.</li>
                  <li>Once dispatched, tracking links with live courier updates (via Bluedart, Delhivery, Xpressbees, DTDC) are shared via SMS, WhatsApp, and Email.</li>
                  <li>Prepaid orders receive complimentary express courier handling across all serviceable pincodes in India.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: COD POLICY */}
          {activeTab === 'cod' && (
            <div className="space-y-6 text-charcoal">
              <div className="border-b border-[#ebd5be] pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💵</span>
                  <h2 className="font-serif font-bold text-xl sm:text-2xl text-charcoal">
                    Cash on Delivery (COD) Policy
                  </h2>
                </div>
                <p className="text-xs text-muted mt-1">
                  Understand how Cash on Delivery orders are confirmed, dispatched, and delivered.
                </p>
              </div>

              {/* Highlight Box */}
              <div className="p-5 sm:p-6 bg-[#FAF7F2] rounded-2xl border-2 border-[#ebd5be] space-y-3">
                <p className="font-serif font-bold text-sm sm:text-base text-[#3e502a]">
                  Cash on Delivery is available across eligible orders.
                </p>
                <div className="p-4 bg-white rounded-xl border border-[#ebd5be] space-y-2 text-xs text-stone-800 leading-relaxed">
                  <p>
                    A <strong className="text-charcoal font-bold">₹200 COD shipping charge</strong> is applicable in addition to the outfit price.
                  </p>
                  <p>
                    This <strong className="text-charcoal font-bold">₹200 charge must be paid in advance</strong> to confirm the COD order.
                  </p>
                  <p>
                    The <strong className="text-charcoal font-bold">remaining outfit amount</strong> can be paid at the time of delivery.
                  </p>
                </div>
              </div>

              {/* Step by Step COD Flow */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-sm text-charcoal">How COD Ordering Works</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#ebd5be]">
                    <span className="w-6 h-6 rounded-full bg-[#3e502a] text-white flex items-center justify-center font-bold text-[11px] mb-2">1</span>
                    <h4 className="font-bold text-charcoal mb-1">Select COD at Checkout</h4>
                    <p className="text-stone-600">Choose Cash on Delivery during checkout and review your order summary.</p>
                  </div>
                  <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#ebd5be]">
                    <span className="w-6 h-6 rounded-full bg-[#3e502a] text-white flex items-center justify-center font-bold text-[11px] mb-2">2</span>
                    <h4 className="font-bold text-charcoal mb-1">Pay ₹200 Advance Fee</h4>
                    <p className="text-stone-600">Pay the ₹200 advance shipping fee securely online via UPI or card to confirm dispatch.</p>
                  </div>
                  <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#ebd5be]">
                    <span className="w-6 h-6 rounded-full bg-[#3e502a] text-white flex items-center justify-center font-bold text-[11px] mb-2">3</span>
                    <h4 className="font-bold text-charcoal mb-1">Pay Balance at Doorstep</h4>
                    <p className="text-stone-600">Pay the remaining garment price in cash or UPI to the delivery executive in 6–7 days.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RETURN & EXCHANGE */}
          {activeTab === 'returns' && (
            <div className="space-y-6 text-charcoal">
              <div className="border-b border-[#ebd5be] pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔄</span>
                  <h2 className="font-serif font-bold text-xl sm:text-2xl text-charcoal">
                    Return & Exchange Policy
                  </h2>
                </div>
                <p className="text-xs text-muted mt-1">
                  Important details regarding our exchange terms, defect reporting, and size changes.
                </p>
              </div>

              {/* No Refunds Notice */}
              <div className="p-4 sm:p-5 bg-red-50 rounded-2xl border border-red-200 text-red-900 space-y-1.5">
                <h3 className="font-serif font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>⚠️</span> Policy Overview: No Refunds or Returns
                </h3>
                <p className="text-xs leading-relaxed">
                  <strong>We do not offer refunds or returns.</strong> Every outfit is handcrafted with utmost care and individually quality-checked prior to dispatch.
                </p>
              </div>

              {/* 3 Exchange Situations */}
              <div className="space-y-4">
                <h3 className="font-serif font-bold text-base text-charcoal">
                  Exchange is available in the following situations:
                </h3>

                <div className="space-y-3">
                  {/* Case 1 */}
                  <div className="p-4 sm:p-5 bg-[#FAF7F2] rounded-2xl border border-[#ebd5be] flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#3e502a] text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                      ✓
                    </span>
                    <div className="space-y-1">
                      <h4 className="font-serif font-bold text-sm text-charcoal">
                        1. Incorrect Product Received
                      </h4>
                      <p className="text-xs text-stone-700 leading-relaxed">
                        If we have sent the wrong product, we will arrange a prompt exchange at zero additional expense to you.
                      </p>
                    </div>
                  </div>

                  {/* Case 2 */}
                  <div className="p-4 sm:p-5 bg-[#FAF7F2] rounded-2xl border border-[#ebd5be] flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#3e502a] text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                      ✓
                    </span>
                    <div className="space-y-1">
                      <h4 className="font-serif font-bold text-sm text-charcoal">
                        2. Damaged or Defective Product (Unboxing Video Required)
                      </h4>
                      <p className="text-xs text-stone-700 leading-relaxed">
                        If the product received is damaged or defective, the customer must contact us with the required proof/unboxing video, and the exchange will be processed as per our policy.
                      </p>
                      <p className="text-[11px] text-muted italic">
                        * Please record a continuous, uncut unboxing video when opening your package to facilitate swift verification.
                      </p>
                    </div>
                  </div>

                  {/* Case 3 */}
                  <div className="p-4 sm:p-5 bg-[#FAF7F2] rounded-2xl border border-[#ebd5be] flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#3e502a] text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                      ✓
                    </span>
                    <div className="space-y-1">
                      <h4 className="font-serif font-bold text-sm text-charcoal">
                        3. Size Exchange
                      </h4>
                      <p className="text-xs text-stone-700 leading-relaxed">
                        If we have sent the correct product but the customer wants a different size, size exchange is possible. In this case, the delivery/shipping charges for both sides will be borne by the customer.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How to initiate exchange */}
              <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#ebd5be] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5 text-center sm:text-left">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-charcoal">
                    Need Help With An Exchange?
                  </h4>
                  <p className="text-xs text-muted">
                    Contact our customer support team within 48 hours of delivery.
                  </p>
                </div>
                <a
                  href={`https://wa.me/${STORE_INFO.phoneRaw}?text=Hi%20Anju%20Clothing,%20I%20would%20like%20to%20request%20an%20exchange%20for%20my%20order.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#3e502a] hover:bg-[#324122] text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Contact Support on WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* TAB 4: SIZE CHART */}
          {activeTab === 'size-chart' && (
            <div className="space-y-6 text-charcoal">
              <div className="border-b border-[#ebd5be] pb-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📏</span>
                    <h2 className="font-serif font-bold text-xl sm:text-2xl text-charcoal">
                      Size Chart & Measurements
                    </h2>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Standard garment measurements for Indian ethnic wear & festive outfits.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-[#FAF7F2] border border-[#ebd5be] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSizeUnit('in')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      sizeUnit === 'in' ? 'bg-[#769055] text-white shadow-xs' : 'text-charcoal'
                    }`}
                  >
                    Inches (in)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizeUnit('cm')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      sizeUnit === 'cm' ? 'bg-[#769055] text-white shadow-xs' : 'text-charcoal'
                    }`}
                  >
                    Centimeters (cm)
                  </button>
                </div>
              </div>

              {/* Highlight Margin Banner */}
              <div className="p-3.5 bg-[#f4f7ee] border border-[#d6e2c3] rounded-xl text-xs text-[#3e502a] font-semibold flex items-center gap-2">
                <span>✨</span>
                <span>
                  <strong>2-Inch Inside Margin:</strong> All our handcrafted kurtis, suits, and dresses include a 2-inch fabric margin inside for easy alterations.
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#ebd5be]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF7F2] text-[#3e502a] border-b border-[#ebd5be] font-serif uppercase tracking-wider">
                      <th className="py-3 px-4 font-bold">Size</th>
                      <th className="py-3 px-4 font-bold">Bust ({sizeUnit})</th>
                      <th className="py-3 px-4 font-bold">Waist ({sizeUnit})</th>
                      <th className="py-3 px-4 font-bold">Hip ({sizeUnit})</th>
                      <th className="py-3 px-4 font-bold">Shoulder ({sizeUnit})</th>
                      <th className="py-3 px-4 font-bold">Length ({sizeUnit})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ebd5be]/50">
                    {[
                      { size: 'XS (34)', bIn: 34, bCm: 86, wIn: 28, wCm: 71, hIn: 36, hCm: 91, sIn: 14.0, sCm: 35.5, lIn: 44, lCm: 112 },
                      { size: 'S (36)', bIn: 36, bCm: 91, wIn: 30, wCm: 76, hIn: 38, hCm: 96, sIn: 14.5, sCm: 37.0, lIn: 44, lCm: 112 },
                      { size: 'M (38)', bIn: 38, bCm: 96, wIn: 32, wCm: 81, hIn: 40, hCm: 101, sIn: 15.0, sCm: 38.0, lIn: 45, lCm: 114 },
                      { size: 'L (40)', bIn: 40, bCm: 101, wIn: 34, wCm: 86, hIn: 42, hCm: 106, sIn: 15.5, sCm: 39.5, lIn: 45, lCm: 114 },
                      { size: 'XL (42)', bIn: 42, bCm: 106, wIn: 36, wCm: 91, hIn: 44, hCm: 112, sIn: 16.0, sCm: 40.5, lIn: 46, lCm: 117 },
                      { size: 'XXL (44)', bIn: 44, bCm: 112, wIn: 38, wCm: 96, hIn: 46, hCm: 117, sIn: 16.5, sCm: 42.0, lIn: 46, lCm: 117 },
                      { size: '3XL (46)', bIn: 46, bCm: 117, wIn: 40, wCm: 101, hIn: 48, hCm: 122, sIn: 17.0, sCm: 43.0, lIn: 46, lCm: 117 },
                    ].map((row, idx) => (
                      <tr key={row.size} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fffdfa]'}>
                        <td className="py-3 px-4 font-bold text-charcoal">{row.size}</td>
                        <td className="py-3 px-4 text-stone-700">{sizeUnit === 'in' ? `${row.bIn}"` : `${row.bCm} cm`}</td>
                        <td className="py-3 px-4 text-stone-700">{sizeUnit === 'in' ? `${row.wIn}"` : `${row.wCm} cm`}</td>
                        <td className="py-3 px-4 text-stone-700">{sizeUnit === 'in' ? `${row.hIn}"` : `${row.hCm} cm`}</td>
                        <td className="py-3 px-4 text-stone-700">{sizeUnit === 'in' ? `${row.sIn}"` : `${row.sCm} cm`}</td>
                        <td className="py-3 px-4 text-stone-700">{sizeUnit === 'in' ? `${row.lIn}"` : `${row.lCm} cm`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Custom Measurements Box */}
              <div className="p-5 bg-[#FAF7F2] rounded-2xl border border-[#ebd5be] space-y-2">
                <h4 className="font-serif font-bold text-sm text-charcoal">Custom Sizing & Measurements Note</h4>
                <p className="text-xs text-stone-700 leading-relaxed">
                  The measurements above are standard reference points. If you require custom blouse stitching, specific kurti length alterations, or bridal fits, please connect with our master tailors on WhatsApp before or immediately after placing your order.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: TERMS & CONDITIONS */}
          {activeTab === 'terms' && (
            <div className="space-y-6 text-charcoal text-xs leading-relaxed">
              <div className="border-b border-[#ebd5be] pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📜</span>
                  <h2 className="font-serif font-bold text-xl sm:text-2xl text-charcoal">
                    Terms & Conditions
                  </h2>
                </div>
                <p className="text-muted mt-1">
                  General terms governing purchases on Anju Clothing.
                </p>
              </div>

              <div className="space-y-4 text-stone-700">
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-sm text-charcoal">1. Handcrafted Product Nature</h3>
                  <p>
                    All garments at Anju Clothing are artisanal and handcrafted. Subtle nuances in weave, hand embroidery, block print, and color tonality are intrinsic qualities of authentic Indian craft.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-sm text-charcoal">2. Pricing & Orders</h3>
                  <p>
                    Prices listed on the website are inclusive of applicable taxes. In the event of a technical pricing error, we reserve the right to cancel or amend orders before dispatch with full notification to the customer.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-sm text-charcoal">3. Care Instructions</h3>
                  <p>
                    Due to the delicate nature of handwoven silks, pure georgettes, and zari embroideries, <strong>Professional Dry Clean Only</strong> is strictly recommended for all ethnic outfits.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 text-charcoal text-xs leading-relaxed">
              <div className="border-b border-[#ebd5be] pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔒</span>
                  <h2 className="font-serif font-bold text-xl sm:text-2xl text-charcoal">
                    Privacy Policy
                  </h2>
                </div>
                <p className="text-muted mt-1">
                  How we protect and respect your personal information.
                </p>
              </div>

              <div className="space-y-4 text-stone-700">
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-sm text-charcoal">1. Information Collection</h3>
                  <p>
                    We collect your name, delivery address, contact phone number, and email strictly for processing orders, communicating shipment tracking, and providing customer support.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-sm text-charcoal">2. Payment Security</h3>
                  <p>
                    We do not store your credit/debit card numbers or UPI PINs. All transactions are encrypted and processed through RBI-compliant, PCI-DSS certified payment gateways (Razorpay).
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-sm text-charcoal">3. Data Protection</h3>
                  <p>
                    We do not sell, rent, or trade your personal data with third-party advertising companies. Your data is strictly used for order fulfillment and authorized store notifications.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Contact / Help Banner */}
        <div className="mt-8 text-center bg-white p-6 rounded-2xl border border-[#ebd5be]">
          <h3 className="font-serif font-bold text-sm text-charcoal mb-1">
            Have Questions About Any Policy?
          </h3>
          <p className="text-xs text-muted mb-4">
            Our customer care team is happy to assist you with delivery timelines, custom sizes, or urgent orders.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/contact"
              className="px-5 py-2 rounded-full bg-[#FAF7F2] border border-[#ebd5be] text-charcoal text-xs font-bold hover:border-[#769055] transition-colors"
            >
              Contact Support
            </Link>
            <a
              href={`https://wa.me/${STORE_INFO.phoneRaw}?text=Hi%20Anju%20Clothing,%20I%20have%20a%20question%20about%20your%20store%20policies.`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-full bg-[#769055] text-white text-xs font-bold hover:bg-[#5e7343] transition-colors"
            >
              WhatsApp Us: {STORE_INFO.phone}
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
