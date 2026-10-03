import React, { useState, useEffect, useId } from 'react'
import {
  formatPrice,
  normalize,
  type FacetOption,
  type FilterFacets,
  type ProductFilters,
} from '../utils/productFilters'

// ─── Color Swatches Map ───────────────────────────────────────────────────────
const COLOR_HEX: Record<string, string> = {
  beige: '#EBD9B4',
  black: '#1a1a1a',
  blue: '#4A7BB0',
  'blush pink': '#F4C9CF',
  brown: '#8B5E3C',
  chocolate: '#5C3317',
  cream: '#FFF3D6',
  gold: '#D4AF37',
  golden: '#D4AF37',
  green: '#3E8E41',
  grey: '#9CA3AF',
  gray: '#9CA3AF',
  lavender: '#B5A0D6',
  lemon: '#FBEF8A',
  magenta: '#C2185B',
  'magenta pink': '#C2185B',
  maroon: '#7A1F2B',
  mahroon: '#7A1F2B',
  mint: '#98D8AA',
  mustard: '#D9A521',
  navy: '#1F2A4D',
  'off white': '#F5F1E8',
  olive: '#7B7F3A',
  orange: '#E67E22',
  'onion pink': '#D98282',
  peach: '#F5A97F',
  pink: '#E87A90',
  'baby pink': '#FAD4D8',
  purple: '#7E4BA8',
  'dark-purple': '#4A154B',
  'rani pink': '#D6336C',
  red: '#D62828',
  'sky blue': '#5DADE2',
  skyblue: '#5DADE2',
  silver: '#C0C0C0',
  teal: '#2A8C8C',
  turquoise: '#20B2AA',
  violet: '#6C3483',
  white: '#FFFFFF',
  wine: '#722F37',
  yellow: '#F4D03F',
  'butter yellow': '#F9E79F',
}

const FALLBACK_SWATCH = '#D1D5DB'

const isLightColor = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ChevronIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()

  return (
    <div className="border-b border-stone-200/80 py-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full cursor-pointer items-center justify-between text-left focus-visible:outline-2 focus-visible:outline-[#3e502a]"
      >
        <span className="font-serif text-sm font-bold tracking-wide text-[#2c2420] uppercase">
          {title}
        </span>
        <ChevronIcon className={`h-4 w-4 text-stone-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id={contentId} className="pt-3.5 space-y-1.5">
          {children}
        </div>
      )}
    </div>
  )
}

interface FilterControlsProps {
  filters: ProductFilters
  onChange: (next: ProductFilters) => void
  facets: FilterFacets
  hideCategory?: boolean
}

export function FilterControls({
  filters,
  onChange,
  facets,
  hideCategory = false,
}: FilterControlsProps) {
  // Local debounced state for price range
  const priceMinBound = facets.priceRange?.min ?? 700
  const priceMaxBound = facets.priceRange?.max ?? 3500

  const [minInput, setMinInput] = useState<string>(filters.price ? String(filters.price[0]) : '')
  const [maxInput, setMaxInput] = useState<string>(filters.price ? String(filters.price[1]) : '')

  useEffect(() => {
    setMinInput(filters.price ? String(filters.price[0]) : '')
    setMaxInput(filters.price ? String(filters.price[1]) : '')
  }, [filters.price])

  // Debounce price input changes
  useEffect(() => {
    const handler = setTimeout(() => {
      const minVal = minInput ? Number(minInput) : priceMinBound
      const maxVal = maxInput ? Number(maxInput) : priceMaxBound
      
      const isFiltered = (minInput !== '' && minVal > priceMinBound) || (maxInput !== '' && maxVal < priceMaxBound)

      if (isFiltered) {
        if (!filters.price || filters.price[0] !== minVal || filters.price[1] !== maxVal) {
          onChange({
            ...filters,
            price: [minVal, maxVal],
          })
        }
      } else if (filters.price !== null) {
        onChange({
          ...filters,
          price: null,
        })
      }
    }, 400)

    return () => clearTimeout(handler)
  }, [minInput, maxInput, priceMinBound, priceMaxBound])

  const toggleArrayItem = (key: 'sizes' | 'colors' | 'fabrics' | 'occasions', value: string) => {
    const current = filters[key]
    const exists = current.includes(value)
    const next = exists ? current.filter(v => v !== value) : [...current, value]
    onChange({
      ...filters,
      [key]: next,
    })
  }

  const handleStockToggle = () => {
    onChange({
      ...filters,
      stock: filters.stock === 'in-stock' ? null : 'in-stock',
    })
  }

  return (
    <div className="w-full select-none text-xs">
      {/* 1. Availability */}
      <FilterSection title="Availability" defaultOpen={true}>
        <label className="group flex cursor-pointer items-center gap-2.5 py-1 text-xs text-charcoal hover:text-black">
          <input
            type="checkbox"
            checked={filters.stock === 'in-stock'}
            onChange={handleStockToggle}
            className="peer sr-only"
          />
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-[#3e502a] ${
              filters.stock === 'in-stock'
                ? 'border-[#3e502a] bg-[#3e502a] text-white'
                : 'border-stone-300 bg-white group-hover:border-black'
            }`}
          >
            {filters.stock === 'in-stock' && <CheckIcon className="w-3 h-3" />}
          </span>
          <span className="font-medium text-stone-800">In stock only</span>
          {facets.stock?.inStock !== undefined && facets.stock.inStock > 0 && (
            <span className="text-[11px] text-stone-400">({facets.stock.inStock})</span>
          )}
        </label>
      </FilterSection>

      {/* 2. Category (Hidden if page is locked to category) */}
      {!hideCategory && facets.categories && facets.categories.length > 0 && (
        <FilterSection title="Category" defaultOpen={true}>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            <label className="group flex cursor-pointer items-center gap-2.5 py-1 text-xs text-charcoal hover:text-black">
              <input
                type="radio"
                name="filter-cat"
                checked={filters.category === 'all' || !filters.category}
                onChange={() => onChange({ ...filters, category: 'all' })}
                className="peer sr-only"
              />
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  filters.category === 'all' || !filters.category
                    ? 'border-[#3e502a] bg-[#3e502a] text-white'
                    : 'border-stone-300 bg-white group-hover:border-black'
                }`}
              >
                {(filters.category === 'all' || !filters.category) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>
              <span className="font-medium text-stone-800">All Outfits</span>
            </label>

            {facets.categories.map((cat: any) => {
              const slug = cat.slug || cat.value
              const name = cat.name || cat.label
              const checked = filters.category.toLowerCase() === slug.toLowerCase()

              return (
                <label key={slug} className="group flex cursor-pointer items-center gap-2.5 py-1 text-xs text-charcoal hover:text-black">
                  <input
                    type="radio"
                    name="filter-cat"
                    checked={checked}
                    onChange={() => onChange({ ...filters, category: slug })}
                    className="peer sr-only"
                  />
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      checked
                        ? 'border-[#3e502a] bg-[#3e502a] text-white'
                        : 'border-stone-300 bg-white group-hover:border-black'
                    }`}
                  >
                    {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="truncate font-medium text-stone-800">{name}</span>
                  {cat.count !== undefined && (
                    <span className="text-[11px] text-stone-400">({cat.count})</span>
                  )}
                </label>
              )
            })}
          </div>
        </FilterSection>
      )}

      {/* 3. Price Range */}
      <FilterSection title="Price Range" defaultOpen={true}>
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2 text-stone-700">
            <div className="flex-1">
              <label htmlFor="min-price-input" className="block text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-1">
                Min (₹)
              </label>
              <input
                id="min-price-input"
                type="number"
                min={priceMinBound}
                max={priceMaxBound}
                placeholder={String(priceMinBound)}
                value={minInput}
                onChange={e => setMinInput(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-stone-300 text-xs font-semibold focus:outline-hidden focus:border-[#3e502a] rounded-xs"
              />
            </div>
            <span className="pt-4 text-stone-400">—</span>
            <div className="flex-1">
              <label htmlFor="max-price-input" className="block text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-1">
                Max (₹)
              </label>
              <input
                id="max-price-input"
                type="number"
                min={priceMinBound}
                max={priceMaxBound}
                placeholder={String(priceMaxBound)}
                value={maxInput}
                onChange={e => setMaxInput(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-stone-300 text-xs font-semibold focus:outline-hidden focus:border-[#3e502a] rounded-xs"
              />
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-stone-500 font-medium">
            <span>{formatPrice(priceMinBound)}</span>
            <span>{formatPrice(priceMaxBound)}</span>
          </div>
        </div>
      </FilterSection>

      {/* 4. Size Filter */}
      {facets.sizes && facets.sizes.length > 0 && (
        <FilterSection title="Size" defaultOpen={true}>
          <div className="grid grid-cols-2 gap-1.5">
            {facets.sizes.map((size: FacetOption) => {
              const checked = filters.sizes.includes(size.value)
              return (
                <label key={size.value} className="group flex cursor-pointer items-center gap-2 py-1 text-xs text-charcoal hover:text-black">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleArrayItem('sizes', size.value)}
                    className="peer sr-only"
                  />
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border transition-colors ${
                      checked
                        ? 'border-[#3e502a] bg-[#3e502a] text-white'
                        : 'border-stone-300 bg-white group-hover:border-black'
                    }`}
                  >
                    {checked && <CheckIcon className="w-3 h-3" />}
                  </span>
                  <span className="font-semibold text-stone-800">{size.label}</span>
                  <span className="text-[10px] text-stone-400">({size.count})</span>
                </label>
              )
            })}
          </div>
        </FilterSection>
      )}

      {/* 5. Color Filter with Swatches */}
      {facets.colors && facets.colors.length > 0 && (
        <FilterSection title="Color" defaultOpen={true}>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {facets.colors.map((color: FacetOption) => {
              const checked = filters.colors.includes(color.value)
              const hex = COLOR_HEX[normalize(color.value)] ?? FALLBACK_SWATCH
              const light = isLightColor(hex)

              return (
                <label key={color.value} className="group flex cursor-pointer items-center gap-2.5 py-1 text-xs text-charcoal hover:text-black">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleArrayItem('colors', color.value)}
                    className="peer sr-only"
                  />
                  <span
                    style={{ backgroundColor: hex }}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/15 shadow-xs transition-all ${
                      checked ? 'ring-2 ring-black ring-offset-1 scale-110' : 'group-hover:scale-105'
                    }`}
                  >
                    {checked && (
                      <CheckIcon className={`w-3 h-3 ${light ? 'text-black' : 'text-white'}`} />
                    )}
                  </span>
                  <span className="truncate font-medium text-stone-800">{color.label}</span>
                  <span className="text-[10px] text-stone-400">({color.count})</span>
                </label>
              )
            })}
          </div>
        </FilterSection>
      )}

      {/* 6. Fabric Filter */}
      {facets.fabrics && facets.fabrics.length > 0 && (
        <FilterSection title="Fabric" defaultOpen={true}>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {facets.fabrics.map((fabric: FacetOption) => {
              const checked = filters.fabrics.includes(fabric.value)
              return (
                <label key={fabric.value} className="group flex cursor-pointer items-center gap-2.5 py-1 text-xs text-charcoal hover:text-black">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleArrayItem('fabrics', fabric.value)}
                    className="peer sr-only"
                  />
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border transition-colors ${
                      checked
                        ? 'border-[#3e502a] bg-[#3e502a] text-white'
                        : 'border-stone-300 bg-white group-hover:border-black'
                    }`}
                  >
                    {checked && <CheckIcon className="w-3 h-3" />}
                  </span>
                  <span className="truncate font-medium text-stone-800">{fabric.label}</span>
                  <span className="text-[10px] text-stone-400">({fabric.count})</span>
                </label>
              )
            })}
          </div>
        </FilterSection>
      )}

      {/* 7. Occasion Filter */}
      {facets.occasions && facets.occasions.length > 0 && (
        <FilterSection title="Occasion" defaultOpen={true}>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {facets.occasions.map((occasion: FacetOption) => {
              const checked = filters.occasions.includes(occasion.value)
              return (
                <label key={occasion.value} className="group flex cursor-pointer items-center gap-2.5 py-1 text-xs text-charcoal hover:text-black">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleArrayItem('occasions', occasion.value)}
                    className="peer sr-only"
                  />
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border transition-colors ${
                      checked
                        ? 'border-[#3e502a] bg-[#3e502a] text-white'
                        : 'border-stone-300 bg-white group-hover:border-black'
                    }`}
                  >
                    {checked && <CheckIcon className="w-3 h-3" />}
                  </span>
                  <span className="truncate font-medium text-stone-800">{occasion.label}</span>
                  <span className="text-[10px] text-stone-400">({occasion.count})</span>
                </label>
              )
            })}
          </div>
        </FilterSection>
      )}
    </div>
  )
}
