import React, { useState } from 'react'
import { useShop } from '../context/ShopContext'

interface CouponsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CouponsModal({ isOpen, onClose }: CouponsModalProps) {
  const {
    availableCoupons,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    cartSubtotal,
    couponLoading,
  } = useShop()

  const [inputCode, setInputCode] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [applyingCode, setApplyingCode] = useState<string | null>(null)

  if (!isOpen) return null

  const handleApply = async (codeToApply: string) => {
    setFeedback(null)
    setApplyingCode(codeToApply)
    const res = await applyCoupon(codeToApply)
    setApplyingCode(null)

    if (res.success) {
      setFeedback({ type: 'success', message: res.message })
      setInputCode('')
      setTimeout(() => {
        onClose()
      }, 1200)
    } else {
      setFeedback({ type: 'error', message: res.message })
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputCode.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a coupon code.' })
      return
    }
    handleApply(inputCode.trim())
  }

  return (
    <div
      className="fixed inset-0 z-60 overflow-y-auto font-sans flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer animate-in fade-in duration-200"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-[#FAF9F6] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FAF5EE] border border-[#E8D5C0] flex items-center justify-center text-[#c49332] text-sm">
              🏷️
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 font-serif uppercase tracking-tight">
                Apply Coupons & Offers
              </h3>
              <p className="text-[11px] text-gray-500">
                Cart Value: <strong className="text-gray-900 font-bold">₹{cartSubtotal.toLocaleString('en-IN')}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close coupons modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Coupon Input Bar */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
              Enter Coupon Code
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value.toUpperCase())
                    if (feedback) setFeedback(null)
                  }}
                  placeholder="e.g. WELCOME10, ANJU15"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-gray-900 placeholder:text-gray-400 placeholder:font-sans placeholder:normal-case focus:bg-white focus:border-[#3e502a] focus:ring-1 focus:ring-[#3e502a] focus:outline-none transition-all"
                />
                {inputCode && (
                  <button
                    type="button"
                    onClick={() => setInputCode('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={couponLoading || !inputCode.trim()}
                className="px-5 py-2.5 bg-[#3e502a] hover:bg-[#324122] disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
              >
                {couponLoading && applyingCode === inputCode ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Apply'
                )}
              </button>
            </div>

            {/* Feedback Alert */}
            {feedback && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}
              >
                <span>{feedback.type === 'success' ? '✓' : '⚠️'}</span>
                <span className="font-medium">{feedback.message}</span>
              </div>
            )}
          </form>

          {/* Currently Applied Coupon Banner */}
          {appliedCoupon && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-sm">
                  ✓
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-emerald-950 tracking-wider">
                      {appliedCoupon.code}
                    </span>
                    <span className="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      APPLIED
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Saved <strong className="font-extrabold text-emerald-950">₹{appliedCoupon.discountAmount.toLocaleString('en-IN')}</strong> with this coupon
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeCoupon}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}

          {/* Exclusive Promo Code Information */}
          <div className="bg-[#FAF9F6] border border-[#E8D5C0]/80 rounded-xl p-4 text-xs text-gray-600 space-y-2">
            <div className="flex items-center gap-2 text-gray-900 font-bold uppercase tracking-wider text-[11px]">
              <span className="text-sm">🏷️</span>
              <span>Exclusive Promotion Policy</span>
            </div>
            <p className="leading-relaxed text-gray-600 text-[11px]">
              Discount coupons are exclusive and shared directly by Anju Clothing via personalized WhatsApp, SMS, or admin invitations.
            </p>
            <p className="leading-relaxed text-gray-500 text-[11px]">
              If our admin or customer support team provided you with an exclusive discount code, enter it above and tap <strong className="text-gray-800">Apply</strong> to instantly calculate your savings.
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-[11px] text-gray-500 shrink-0">
          <span>Official Anju Clothing Promo System</span>
          <button
            onClick={onClose}
            className="text-gray-700 hover:text-gray-900 font-bold underline cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
