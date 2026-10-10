import { useState } from 'react'
import { STORE_INFO } from '../data/products'

interface SizeChartModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SizeRow {
  size: string
  bustIn: number
  bustCm: number
  waistIn: number
  waistCm: number
  hipIn: number
  hipCm: number
  shoulderIn: number
  shoulderCm: number
  lengthIn: number
  lengthCm: number
}

const SIZE_DATA: SizeRow[] = [
  { size: 'XS (34)', bustIn: 34, bustCm: 86, waistIn: 28, waistCm: 71, hipIn: 36, hipCm: 91, shoulderIn: 14.0, shoulderCm: 35.5, lengthIn: 44, lengthCm: 112 },
  { size: 'S (36)', bustIn: 36, bustCm: 91, waistIn: 30, waistCm: 76, hipIn: 38, hipCm: 96, shoulderIn: 14.5, shoulderCm: 37.0, lengthIn: 44, lengthCm: 112 },
  { size: 'M (38)', bustIn: 38, bustCm: 96, waistIn: 32, waistCm: 81, hipIn: 40, hipCm: 101, shoulderIn: 15.0, shoulderCm: 38.0, lengthIn: 45, lengthCm: 114 },
  { size: 'L (40)', bustIn: 40, bustCm: 101, waistIn: 34, waistCm: 86, hipIn: 42, hipCm: 106, shoulderIn: 15.5, shoulderCm: 39.5, lengthIn: 45, lengthCm: 114 },
  { size: 'XL (42)', bustIn: 42, bustCm: 106, waistIn: 36, waistCm: 91, hipIn: 44, hipCm: 112, shoulderIn: 16.0, shoulderCm: 40.5, lengthIn: 46, lengthCm: 117 },
  { size: 'XXL (44)', bustIn: 44, bustCm: 112, waistIn: 38, waistCm: 96, hipIn: 46, hipCm: 117, shoulderIn: 16.5, shoulderCm: 42.0, lengthIn: 46, lengthCm: 117 },
  { size: '3XL (46)', bustIn: 46, bustCm: 117, waistIn: 40, waistCm: 101, hipIn: 48, hipCm: 122, shoulderIn: 17.0, shoulderCm: 43.0, lengthIn: 46, lengthCm: 117 },
]

export function SizeChartModal({ isOpen, onClose }: SizeChartModalProps) {
  const [unit, setUnit] = useState<'in' | 'cm'>('in')
  const isInch = unit === 'in'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#e8d5c0] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#FAF7F2] px-5 py-4 border-b border-[#ebd5be] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#769055]/15 text-[#769055] flex items-center justify-center text-sm font-bold">
              📏
            </span>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-charcoal">
                Size Chart & Measurement Guide
              </h3>
              <p className="text-[11px] text-muted">Garment body measurements in standard sizing</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 text-charcoal hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Unit Switcher & Margin Tag */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-[#FAF7F2] border border-[#ebd5be] rounded-lg">
              <button
                type="button"
                onClick={() => setUnit('in')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  isInch ? 'bg-[#769055] text-white shadow-xs' : 'text-charcoal hover:text-[#769055]'
                }`}
              >
                Inches (in)
              </button>
              <button
                type="button"
                onClick={() => setUnit('cm')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  !isInch ? 'bg-[#769055] text-white shadow-xs' : 'text-charcoal hover:text-[#769055]'
                }`}
              >
                Centimeters (cm)
              </button>
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs text-[#3e502a] font-semibold bg-[#f4f7ee] border border-[#d6e2c3] px-2.5 py-1 rounded-full">
              ✨ <strong>2-Inch Inside Margin</strong> for easy alteration
            </span>
          </div>

          {/* Size Table */}
          <div className="overflow-x-auto rounded-xl border border-[#ebd5be]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF7F2] text-[#3e502a] border-b border-[#ebd5be] font-serif uppercase tracking-wider">
                  <th className="py-2.5 px-3 font-bold">Size</th>
                  <th className="py-2.5 px-3 font-bold">Bust ({unit})</th>
                  <th className="py-2.5 px-3 font-bold">Waist ({unit})</th>
                  <th className="py-2.5 px-3 font-bold">Hip ({unit})</th>
                  <th className="py-2.5 px-3 font-bold">Shoulder ({unit})</th>
                  <th className="py-2.5 px-3 font-bold">Length ({unit})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebd5be]/50">
                {SIZE_DATA.map((row, idx) => (
                  <tr
                    key={row.size}
                    className={idx % 2 === 0 ? 'bg-white hover:bg-[#FAF7F2]/50' : 'bg-[#fffdfa] hover:bg-[#FAF7F2]/50'}
                  >
                    <td className="py-2.5 px-3 font-bold text-charcoal">{row.size}</td>
                    <td className="py-2.5 px-3 text-stone-700">{isInch ? `${row.bustIn}"` : `${row.bustCm} cm`}</td>
                    <td className="py-2.5 px-3 text-stone-700">{isInch ? `${row.waistIn}"` : `${row.waistCm} cm`}</td>
                    <td className="py-2.5 px-3 text-stone-700">{isInch ? `${row.hipIn}"` : `${row.hipCm} cm`}</td>
                    <td className="py-2.5 px-3 text-stone-700">{isInch ? `${row.shoulderIn}"` : `${row.shoulderCm} cm`}</td>
                    <td className="py-2.5 px-3 text-stone-700">{isInch ? `${row.lengthIn}"` : `${row.lengthCm} cm`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How to Measure Guidelines */}
          <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#ebd5be] space-y-2.5">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#3e502a]">
              How To Measure Accurately
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
              <p>
                <strong>1. Bust:</strong> Measure around the fullest part of your chest with a relaxed measuring tape.
              </p>
              <p>
                <strong>2. Waist:</strong> Measure around your natural waistline, just above the belly button.
              </p>
              <p>
                <strong>3. Hip:</strong> Measure around the fullest part of your hips/seat area.
              </p>
              <p>
                <strong>4. Shoulder:</strong> Measure horizontally from one shoulder bone corner across to the other.
              </p>
            </div>
          </div>

          {/* Custom Sizing & Urgent Orders Banner */}
          <div className="bg-gradient-to-r from-[#3e502a] to-[#4d6333] text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-sm">
            <div className="space-y-0.5">
              <p className="font-serif font-bold text-sm">Need Custom Stitching or Urgent Delivery?</p>
              <p className="text-[11px] text-white/90">
                Contact our styling master on WhatsApp for custom measurements & rush dispatch.
              </p>
            </div>
            <a
              href={`https://wa.me/${STORE_INFO.phoneRaw}?text=Hi%20Anju%20Clothing,%20I%20need%20size%20guidance%20or%20custom%20measurements.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#c9973a] hover:bg-[#b08129] text-white text-xs font-bold rounded-lg shadow-sm shrink-0 transition-colors"
            >
              <span>💬 WhatsApp Us</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
