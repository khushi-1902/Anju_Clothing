import React, { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { fetchAdminSettings, updateAdminSettings, StoreSettings, RawSettingItem } from '../adminApi'

const COURIER_OPTIONS = ['Blue Dart Express', 'Delhivery', 'DTDC Express', 'India Post Speed Post', 'Shiprocket Express', 'Shadowfax']

export function AdminSettingsPage() {
  const { getToken } = useAuth()
  const { user } = useUser()

  // Form states
  const [defaultCourier, setDefaultCourier] = useState('Blue Dart Express')
  const [flatFee, setFlatFee] = useState('99')
  const [freeThreshold, setFreeThreshold] = useState('1999')
  const [estimatedDelivery, setEstimatedDelivery] = useState('3–5 Business Days')
  const [codAdvanceAmount, setCodAdvanceAmount] = useState('200')
  const [supportPhone, setSupportPhone] = useState('+91 9625923308')
  const [supportEmail, setSupportEmail] = useState('orders@anjuclothing.com')
  const [announcementText, setAnnouncementText] = useState('✦ Complimentary Express Shipping on Orders Above ₹1,999 ✦')

  // Raw PostgreSQL key-values
  const [rawSettings, setRawSettings] = useState<RawSettingItem[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const loadSettings = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) return
      const data = await fetchAdminSettings(token)

      if (data.formatted) {
        setDefaultCourier(data.formatted.defaultCourier || 'Blue Dart Express')
        setFlatFee(String(data.formatted.flatFee ?? 99))
        setFreeThreshold(String(data.formatted.freeThreshold ?? 1999))
        setEstimatedDelivery(data.formatted.estimatedDelivery || '3–5 Business Days')
        setCodAdvanceAmount(String(data.formatted.codAdvanceAmount ?? 200))
        setSupportPhone(data.formatted.supportPhone || '+91 9625923308')
        setSupportEmail(data.formatted.supportEmail || 'orders@anjuclothing.com')
        setAnnouncementText(data.formatted.announcementText || '✦ Complimentary Express Shipping on Orders Above ₹1,999 ✦')
      }

      setRawSettings(data.settings || [])
    } catch (err: any) {
      console.error('Failed to load settings:', err)
      showToast(err.message || 'Failed to load store settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      const token = await getToken()
      if (!token) return

      const res = await updateAdminSettings(token, {
        defaultCourier,
        flatFee: Number(flatFee) || 0,
        freeThreshold: Number(freeThreshold) || 0,
        estimatedDelivery,
        codAdvanceAmount: Number(codAdvanceAmount) || 0,
        supportPhone,
        supportEmail,
        announcementText,
      })

      setRawSettings(res.settings || [])
      showToast('Shipping & Store settings saved to database!')
    } catch (err: any) {
      console.error('Failed to save settings:', err)
      showToast(err.message || 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 text-charcoal">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-bold animate-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-red-900 text-white border-red-700'
          }`}
        >
          <span>{toastMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#202223] tracking-tight">
            Shipping & Store Settings
          </h1>
          <p className="text-xs text-[#6D7175] mt-0.5">
            Configure delivery fees, free shipping thresholds, couriers, and store contact info stored in PostgreSQL.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Card 1: Shipping & Delivery Configuration */}
        <div className="bg-white p-5 sm:p-7 rounded-xl border border-[#E1E3E5] shadow-xs space-y-5">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#202223] flex items-center gap-2">
                <span>🚚</span> Shipping Rates & Delivery Thresholds
              </h2>
              <p className="text-xs text-[#6D7175] mt-0.5">
                These rates dynamically calculate customer checkout shipping costs and courier labels.
              </p>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase rounded border border-emerald-200">
              Live Checkout Connected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#202223] mb-1">
                Default Courier Carrier
              </label>
              <input
                type="text"
                list="courier-options"
                required
                placeholder="e.g. Blue Dart Express"
                value={defaultCourier}
                onChange={(e) => setDefaultCourier(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#769055] font-medium"
              />
              <datalist id="courier-options">
                {COURIER_OPTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="text-[10px] text-gray-500 mt-1">Default carrier assigned when fulfilling customer orders.</p>
            </div>

            <div>
              <label className="block font-bold text-[#202223] mb-1">
                Estimated Delivery Timeline Text
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 3–5 Business Days"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#769055] font-medium"
              />
              <p className="text-[10px] text-gray-500 mt-1">Displayed on the product detail page and checkout review.</p>
            </div>

            <div>
              <label className="block font-bold text-[#202223] mb-1">
                Flat Standard Shipping Fee (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="99"
                  value={flatFee}
                  onChange={(e) => setFlatFee(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 bg-[#FAF8F5] border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#769055] font-bold"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Charged on orders below the free shipping threshold.</p>
            </div>

            <div>
              <label className="block font-bold text-[#202223] mb-1">
                Free Shipping Order Threshold (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="1999"
                  value={freeThreshold}
                  onChange={(e) => setFreeThreshold(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 bg-[#FAF8F5] border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#769055] font-bold text-emerald-900"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Cart totals at or above this amount receive complimentary free delivery.</p>
            </div>

            <div>
              <label className="block font-bold text-[#202223] mb-1">
                COD Extra Online Booking Fee (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="200"
                  value={codAdvanceAmount}
                  onChange={(e) => setCodAdvanceAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 bg-[#FAF8F5] border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#769055] font-bold text-amber-900"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Extra fee paid online to confirm COD order (full actual dress price is paid on delivery).</p>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="bg-gradient-to-r from-[#FAF8F5] to-amber-50/40 p-4 rounded-xl border border-[#EBE4D8] space-y-2 text-xs">
            <h4 className="font-bold text-[#202223] flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#C9973A]">
              <span>💡</span> Live Checkout Customer Preview
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <p className="font-semibold text-gray-500 text-[11px]">Cart: ₹1,499 (&lt; ₹{freeThreshold})</p>
                <div className="flex justify-between font-bold text-xs mt-1">
                  <span>Shipping:</span>
                  <span className="text-charcoal">+₹{flatFee}</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-200">
                <p className="font-semibold text-emerald-800 text-[11px]">Cart: ₹2,499 (≥ ₹{freeThreshold})</p>
                <div className="flex justify-between font-bold text-xs mt-1">
                  <span>Shipping:</span>
                  <span className="text-emerald-700 uppercase">FREE DELIVERY ✓</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-amber-300">
                <p className="font-semibold text-amber-900 text-[11px]">COD Order: ₹2,499 Dress</p>
                <div className="text-[11px] font-bold text-charcoal mt-1 space-y-0.5">
                  <div className="flex justify-between text-amber-800">
                    <span>Extra Fee (Online Now):</span>
                    <span>+₹{codAdvanceAmount}</span>
                  </div>
                  <div className="flex justify-between text-emerald-900">
                    <span>Pay on Delivery:</span>
                    <span>₹2,499 (Actual Price)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Storefront Contact & Announcement Banner */}
        <div className="bg-white p-5 sm:p-7 rounded-xl border border-[#E1E3E5] shadow-xs space-y-4 text-xs">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-[#202223] flex items-center gap-2">
              <span>📣</span> Storefront Announcement & Customer Support
            </h2>
            <p className="text-xs text-[#6D7175] mt-0.5">
              Contact numbers and promo banner displayed across the top announcement bar.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-bold text-[#202223] mb-1">
                Top Announcement Bar Promo Text
              </label>
              <input
                type="text"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#769055]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#202223] mb-1">
                  WhatsApp & Support Hotline
                </label>
                <input
                  type="text"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#769055]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#202223] mb-1">
                  Customer Support Email
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#769055]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-[#769055] hover:bg-[#5e7343] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <span>Save Settings</span>
            )}
          </button>
        </div>
      </form>

      {/* Card 3: PostgreSQL store_settings Key-Value Inspector Table */}
      <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-xs overflow-hidden mt-6">
        <div className="p-4 bg-[#FAF8F5] border-b border-[#EBE4D8] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#202223]">
              🗄️ PostgreSQL `store_settings` Key-Value Table
            </h3>
            <p className="text-[11px] text-[#6D7175]">
              Real-time database key-values driving checkout and storefront services.
            </p>
          </div>
          <span className="text-[11px] font-mono text-gray-500">
            {rawSettings.length} keys in database
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-bold text-[#6D7175] uppercase tracking-wider bg-white">
                <th className="py-2.5 px-4 font-mono">Key</th>
                <th className="py-2.5 px-4">Value</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4 text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rawSettings.map((s) => (
                <tr key={s.key} className="hover:bg-gray-50/60 font-mono text-[11px]">
                  <td className="py-2.5 px-4 font-bold text-[#769055]">{s.key}</td>
                  <td className="py-2.5 px-4 font-semibold text-charcoal">{s.value}</td>
                  <td className="py-2.5 px-4 text-gray-500 font-sans text-xs">{s.description || '—'}</td>
                  <td className="py-2.5 px-4 text-right text-gray-400 text-[10px]">
                    {s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString('en-IN') : 'Just now'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
