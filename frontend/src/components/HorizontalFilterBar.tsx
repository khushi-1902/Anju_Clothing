import React, { useState, useRef, useEffect } from 'react'
import {
  formatPrice,
  normalize,
  type FacetOption,
  type FilterFacets,
  type ProductFilters,
} from '../utils/productFilters'
import { FilterIcon } from './FilterDrawer'

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
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ChevronDownIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

interface HorizontalFilterBarProps {
  filters: ProductFilters
  onChange: (next: ProductFilters) => void
  facets: FilterFacets
  activeCount: number
  onOpenDrawer: () => void
  onClearAll: () => void
  sortBy: string
  onSortChange: (sort: string) => void
  hideCategory?: boolean
}

type DropdownKey = 'category' | 'size' | 'color' | 'price' | 'fabric' | 'occasion' | 'availability' | null

export function HorizontalFilterBar({
  filters,
  onChange,
  facets,
  activeCount,
  onOpenDrawer,
  onClearAll,
  sortBy,
  onSortChange,
  hideCategory = false,
}: HorizontalFilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Bounds for price
  const priceMinBound = facets.priceRange?.min ?? facets.price?.min ?? 500
  const priceMaxBound = facets.priceRange?.max ?? facets.price?.max ?? 10000

  const [minInput, setMinInput] = useState<string>(filters.price ? String(filters.price[0]) : '')
  const [maxInput, setMaxInput] = useState<string>(filters.price ? String(filters.price[1]) : '')

  useEffect(() => {
    setMinInput(filters.price ? String(filters.price[0]) : '')
    setMaxInput(filters.price ? String(filters.price[1]) : '')
  }, [filters.price])

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const toggleDropdown = (key: DropdownKey) => {
    setOpenDropdown(prev => (prev === key ? null : key))
  }

  const toggleArrayItem = (key: 'sizes' | 'colors' | 'fabrics' | 'occasions', value: string) => {
    const current = filters[key]
    const exists = current.includes(value)
    const next = exists ? current.filter(v => v !== value) : [...current, value]
    onChange({
      ...filters,
      [key]: next,
    })
  }

  const applyPriceInputs = (minValStr: string, maxValStr: string) => {
    const minVal = minValStr ? Number(minValStr) : priceMinBound
    const maxVal = maxValStr ? Number(maxValStr) : priceMaxBound

    const isFiltered =
      (minValStr !== '' && minVal > priceMinBound) || (maxValStr !== '' && maxVal < priceMaxBound)

    if (isFiltered) {
      onChange({
        ...filters,
        price: [minVal, maxVal],
      })
    } else {
      onChange({
        ...filters,
        price: null,
      })
    }
  }

  // Active status helpers for chip styling
  const isCategoryActive = !hideCategory && Boolean(filters.category && filters.category !== 'all')
  const isSizeActive = filters.sizes.length > 0
  const isColorActive = filters.colors.length > 0
  const isPriceActive = Boolean(filters.price)
  const isFabricActive = filters.fabrics.length > 0
  const isOccasionActive = filters.occasions.length > 0
  const isStockActive = filters.stock === 'in-stock'

  // Selected Category name helper
  const selectedCategoryName = React.useMemo(() => {
    if (!filters.category || filters.category === 'all') return ''
    const found = facets.categories?.find(
      c => (c.slug || c.value)?.toLowerCase() === filters.category.toLowerCase()
    )
    return found?.name || found?.label || filters.category.replace(/-/g, ' ')
  }, [filters.category, facets.categories])

  return (
    <div ref={containerRef} className="relative z-30 mb-5">
      {/* ─── DESKTOP & TABLET ROW: Horizontal Filter Chips + Sort ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-stone-200/80">
        
        {/* Horizontal Scrollable Chips Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 sm:mx-0 sm:px-0">
          
          {/* Main "FILTERS" Brand Button */}
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label="Open all filters drawer"
            className="inline-flex items-center gap-2 shrink-0 h-9 px-4 rounded-lg bg-[#3e502a] text-white text-xs font-serif font-bold uppercase tracking-wider hover:bg-[#324122] transition-colors shadow-2xs cursor-pointer focus-visible:outline-2 focus-visible:outline-[#3e502a]"
          >
            <FilterIcon className="w-3.5 h-3.5 text-[#e8c06a]" />
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white text-[#3e502a] px-1 text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </button>

          {/* 1. Category Dropdown */}
          {!hideCategory && facets.categories && facets.categories.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggleDropdown('category')}
                aria-expanded={openDropdown === 'category'}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none ${
                  isCategoryActive
                    ? 'bg-[#3e502a]/10 border-[#3e502a] text-[#3e502a] font-semibold'
                    : 'bg-white border-stone-300/80 text-[#2c2420] hover:border-stone-400 hover:bg-[#faf8f5]'
                }`}
              >
                <span>{isCategoryActive ? selectedCategoryName : 'Categories'}</span>
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 text-stone-500 transition-transform duration-200 ${
                    openDropdown === 'category' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'category' && (
                <div className="absolute top-full left-0 mt-1.5 w-60 rounded-xl bg-white p-2.5 shadow-xl border border-stone-200 max-h-72 overflow-y-auto z-50 text-xs">
                  <div className="px-2 py-1 mb-1 font-serif text-[11px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                    Select Category
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...filters, category: 'all' })
                      setOpenDropdown(null)
                    }}
                    className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                      filters.category === 'all' || !filters.category
                        ? 'bg-[#3e502a]/10 text-[#3e502a] font-semibold'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>All Outfits</span>
                    {(filters.category === 'all' || !filters.category) && (
                      <CheckIcon className="w-3.5 h-3.5 text-[#3e502a]" />
                    )}
                  </button>

                  {facets.categories.map(cat => {
                    const slug = cat.slug || cat.value
                    const name = cat.name || cat.label
                    const isSelected = filters.category?.toLowerCase() === slug?.toLowerCase()

                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => {
                          onChange({ ...filters, category: slug })
                          setOpenDropdown(null)
                        }}
                        className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#3e502a]/10 text-[#3e502a] font-semibold'
                            : 'text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <span className="truncate pr-2">{name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {cat.count !== undefined && (
                            <span className="text-[10px] text-stone-400">({cat.count})</span>
                          )}
                          {isSelected && <CheckIcon className="w-3.5 h-3.5 text-[#3e502a]" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. Size Dropdown */}
          {facets.sizes && facets.sizes.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggleDropdown('size')}
                aria-expanded={openDropdown === 'size'}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none ${
                  isSizeActive
                    ? 'bg-[#3e502a]/10 border-[#3e502a] text-[#3e502a] font-semibold'
                    : 'bg-white border-stone-300/80 text-[#2c2420] hover:border-stone-400 hover:bg-[#faf8f5]'
                }`}
              >
                <span>Size</span>
                {isSizeActive && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3e502a] text-white px-1 text-[10px] font-bold">
                    {filters.sizes.length}
                  </span>
                )}
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 text-stone-500 transition-transform duration-200 ${
                    openDropdown === 'size' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'size' && (
                <div className="absolute top-full left-0 mt-1.5 w-52 rounded-xl bg-white p-3 shadow-xl border border-stone-200 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                    <span className="font-serif text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      Sizes
                    </span>
                    {isSizeActive && (
                      <button
                        type="button"
                        onClick={() => onChange({ ...filters, sizes: [] })}
                        className="text-[11px] font-medium text-[#3e502a] hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {facets.sizes.map((size: FacetOption) => {
                      const checked = filters.sizes.includes(size.value)
                      return (
                        <label
                          key={size.value}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-stone-50 cursor-pointer"
                        >
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
                                : 'border-stone-300 bg-white'
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
                </div>
              )}
            </div>
          )}

          {/* 3. Color Dropdown */}
          {facets.colors && facets.colors.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggleDropdown('color')}
                aria-expanded={openDropdown === 'color'}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none ${
                  isColorActive
                    ? 'bg-[#3e502a]/10 border-[#3e502a] text-[#3e502a] font-semibold'
                    : 'bg-white border-stone-300/80 text-[#2c2420] hover:border-stone-400 hover:bg-[#faf8f5]'
                }`}
              >
                <span>Color</span>
                {isColorActive && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3e502a] text-white px-1 text-[10px] font-bold">
                    {filters.colors.length}
                  </span>
                )}
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 text-stone-500 transition-transform duration-200 ${
                    openDropdown === 'color' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'color' && (
                <div className="absolute top-full left-0 mt-1.5 w-60 rounded-xl bg-white p-3 shadow-xl border border-stone-200 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                    <span className="font-serif text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      Colors
                    </span>
                    {isColorActive && (
                      <button
                        type="button"
                        onClick={() => onChange({ ...filters, colors: [] })}
                        className="text-[11px] font-medium text-[#3e502a] hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                    {facets.colors.map((color: FacetOption) => {
                      const checked = filters.colors.includes(color.value)
                      const hex = COLOR_HEX[normalize(color.value)] ?? FALLBACK_SWATCH
                      const light = isLightColor(hex)

                      return (
                        <label
                          key={color.value}
                          className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-stone-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              style={{ backgroundColor: hex }}
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-black/15 shadow-2xs ${
                                checked ? 'ring-2 ring-black ring-offset-1' : ''
                              }`}
                            >
                              {checked && (
                                <CheckIcon
                                  className={`w-2.5 h-2.5 ${light ? 'text-black' : 'text-white'}`}
                                />
                              )}
                            </span>
                            <span className="truncate font-medium text-stone-800">{color.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            <span className="text-[10px] text-stone-400">({color.count})</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleArrayItem('colors', color.value)}
                              className="peer sr-only"
                            />
                            <span
                              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-xs border transition-colors ${
                                checked
                                  ? 'border-[#3e502a] bg-[#3e502a] text-white'
                                  : 'border-stone-300 bg-white'
                              }`}
                            >
                              {checked && <CheckIcon className="w-2.5 h-2.5" />}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Price Dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => toggleDropdown('price')}
              aria-expanded={openDropdown === 'price'}
              className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none ${
                isPriceActive
                  ? 'bg-[#3e502a]/10 border-[#3e502a] text-[#3e502a] font-semibold'
                  : 'bg-white border-stone-300/80 text-[#2c2420] hover:border-stone-400 hover:bg-[#faf8f5]'
              }`}
            >
              <span>
                {isPriceActive && filters.price
                  ? `₹${filters.price[0]}–₹${filters.price[1]}`
                  : 'Price'}
              </span>
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-stone-500 transition-transform duration-200 ${
                  openDropdown === 'price' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openDropdown === 'price' && (
              <div className="absolute top-full left-0 mt-1.5 w-64 rounded-xl bg-white p-3.5 shadow-xl border border-stone-200 z-50 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-stone-100">
                  <span className="font-serif text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Price Range
                  </span>
                  {isPriceActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setMinInput('')
                        setMaxInput('')
                        onChange({ ...filters, price: null })
                      }}
                      className="text-[11px] font-medium text-[#3e502a] hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1">
                    <label className="block text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-1">
                      Min (₹)
                    </label>
                    <input
                      type="number"
                      min={priceMinBound}
                      max={priceMaxBound}
                      placeholder={String(priceMinBound)}
                      value={minInput}
                      onChange={e => setMinInput(e.target.value)}
                      className="w-full h-8 px-2 bg-stone-50 border border-stone-300 rounded-md text-xs font-semibold focus:outline-hidden focus:border-[#3e502a]"
                    />
                  </div>
                  <span className="pt-4 text-stone-400">—</span>
                  <div className="flex-1">
                    <label className="block text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-1">
                      Max (₹)
                    </label>
                    <input
                      type="number"
                      min={priceMinBound}
                      max={priceMaxBound}
                      placeholder={String(priceMaxBound)}
                      value={maxInput}
                      onChange={e => setMaxInput(e.target.value)}
                      className="w-full h-8 px-2 bg-stone-50 border border-stone-300 rounded-md text-xs font-semibold focus:outline-hidden focus:border-[#3e502a]"
                    />
                  </div>
                </div>

                <div className="flex justify-between text-[11px] text-stone-500 font-medium mb-3">
                  <span>{formatPrice(priceMinBound)}</span>
                  <span>{formatPrice(priceMaxBound)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    applyPriceInputs(minInput, maxInput)
                    setOpenDropdown(null)
                  }}
                  className="w-full h-8 rounded-md bg-[#3e502a] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#324122] transition-colors cursor-pointer"
                >
                  Apply Price
                </button>
              </div>
            )}
          </div>

          {/* 5. Fabric Dropdown */}
          {facets.fabrics && facets.fabrics.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggleDropdown('fabric')}
                aria-expanded={openDropdown === 'fabric'}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none ${
                  isFabricActive
                    ? 'bg-[#3e502a]/10 border-[#3e502a] text-[#3e502a] font-semibold'
                    : 'bg-white border-stone-300/80 text-[#2c2420] hover:border-stone-400 hover:bg-[#faf8f5]'
                }`}
              >
                <span>Fabric</span>
                {isFabricActive && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3e502a] text-white px-1 text-[10px] font-bold">
                    {filters.fabrics.length}
                  </span>
                )}
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 text-stone-500 transition-transform duration-200 ${
                    openDropdown === 'fabric' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'fabric' && (
                <div className="absolute top-full left-0 mt-1.5 w-56 rounded-xl bg-white p-3 shadow-xl border border-stone-200 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                    <span className="font-serif text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      Fabric
                    </span>
                    {isFabricActive && (
                      <button
                        type="button"
                        onClick={() => onChange({ ...filters, fabrics: [] })}
                        className="text-[11px] font-medium text-[#3e502a] hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {facets.fabrics.map((fabric: FacetOption) => {
                      const checked = filters.fabrics.includes(fabric.value)
                      return (
                        <label
                          key={fabric.value}
                          className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-stone-50 cursor-pointer"
                        >
                          <span className="truncate font-medium text-stone-800">{fabric.label}</span>
                          <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            <span className="text-[10px] text-stone-400">({fabric.count})</span>
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
                                  : 'border-stone-300 bg-white'
                              }`}
                            >
                              {checked && <CheckIcon className="w-3 h-3" />}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. Occasion Dropdown */}
          {facets.occasions && facets.occasions.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggleDropdown('occasion')}
                aria-expanded={openDropdown === 'occasion'}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none ${
                  isOccasionActive
                    ? 'bg-[#3e502a]/10 border-[#3e502a] text-[#3e502a] font-semibold'
                    : 'bg-white border-stone-300/80 text-[#2c2420] hover:border-stone-400 hover:bg-[#faf8f5]'
                }`}
              >
                <span>Occasion</span>
                {isOccasionActive && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3e502a] text-white px-1 text-[10px] font-bold">
                    {filters.occasions.length}
                  </span>
                )}
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 text-stone-500 transition-transform duration-200 ${
                    openDropdown === 'occasion' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'occasion' && (
                <div className="absolute top-full left-0 mt-1.5 w-56 rounded-xl bg-white p-3 shadow-xl border border-stone-200 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                    <span className="font-serif text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      Occasion
                    </span>
                    {isOccasionActive && (
                      <button
                        type="button"
                        onClick={() => onChange({ ...filters, occasions: [] })}
                        className="text-[11px] font-medium text-[#3e502a] hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {facets.occasions.map((occasion: FacetOption) => {
                      const checked = filters.occasions.includes(occasion.value)
                      return (
                        <label
                          key={occasion.value}
                          className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-stone-50 cursor-pointer"
                        >
                          <span className="truncate font-medium text-stone-800">{occasion.label}</span>
                          <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            <span className="text-[10px] text-stone-400">({occasion.count})</span>
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
                                  : 'border-stone-300 bg-white'
                              }`}
                            >
                              {checked && <CheckIcon className="w-3 h-3" />}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. Availability Toggle */}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                stock: filters.stock === 'in-stock' ? null : 'in-stock',
              })
            }
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-xs font-medium shrink-0 transition-all cursor-pointer select-none ${
              isStockActive
                ? 'bg-[#3e502a]/10 border-[#3e502a] text-[#3e502a] font-semibold'
                : 'bg-white border-stone-300/80 text-[#2c2420] hover:border-stone-400 hover:bg-[#faf8f5]'
            }`}
          >
            <span
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-xs border transition-colors ${
                isStockActive
                  ? 'border-[#3e502a] bg-[#3e502a] text-white'
                  : 'border-stone-400 bg-white'
              }`}
            >
              {isStockActive && <CheckIcon className="w-2.5 h-2.5" />}
            </span>
            <span>In stock only</span>
          </button>

          {/* Clear All Inline Link */}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-semibold text-[#3e502a] hover:text-[#253218] hover:underline whitespace-nowrap ml-1 px-2 py-1 cursor-pointer shrink-0"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Desktop Sort Dropdown (Right-aligned) */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <label
            htmlFor="desktop-sort-dropdown"
            className="text-xs text-stone-500 font-medium whitespace-nowrap"
          >
            Sort by:
          </label>
          <div className="relative">
            <select
              id="desktop-sort-dropdown"
              value={sortBy}
              onChange={e => onSortChange(e.target.value)}
              aria-label="Sort products"
              className="h-9 bg-white border border-stone-300/90 text-[#2c2420] text-xs font-medium pl-3 pr-8 rounded-lg focus:outline-hidden focus:border-[#3e502a] shadow-2xs appearance-none cursor-pointer"
            >
              <option value="featured">Featured Collection</option>
              <option value="newest">Newest First</option>
              <option value="popularity">Most Popular / Bestsellers</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="discount">Highest Discount</option>
            </select>
            <ChevronDownIcon className="w-3.5 h-3.5 text-stone-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ─── MOBILE ONLY SORT ROW ─── */}
      <div className="lg:hidden flex items-center justify-between gap-3 pt-3">
        <div className="flex items-center gap-2 w-full">
          <label
            htmlFor="mobile-sort-dropdown"
            className="text-xs text-stone-500 font-medium whitespace-nowrap shrink-0"
          >
            Sort by:
          </label>
          <div className="relative flex-1">
            <select
              id="mobile-sort-dropdown"
              value={sortBy}
              onChange={e => onSortChange(e.target.value)}
              aria-label="Sort products"
              className="w-full h-9 bg-white border border-stone-300 text-[#2c2420] text-xs font-semibold pl-3 pr-8 rounded-lg focus:outline-hidden focus:border-[#3e502a] shadow-2xs appearance-none cursor-pointer"
            >
              <option value="featured">Featured Collection</option>
              <option value="newest">Newest First</option>
              <option value="popularity">Most Popular / Bestsellers</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="discount">Highest Discount</option>
            </select>
            <ChevronDownIcon className="w-3.5 h-3.5 text-stone-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  )
}
