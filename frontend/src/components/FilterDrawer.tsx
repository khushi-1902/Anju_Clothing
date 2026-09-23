import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  countActiveFilters,
  DEFAULT_FILTERS,
  formatPrice,
  normalize,
  type FacetOption,
  type FilterFacets,
  type ProductFilters,
} from '../utils/productFilters'

// ─── Icons (inline, no extra dependency) ──────────────────────────────────────

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function FilterIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconProps}>
      <path d="M4 6h8.75M17.25 6H20" />
      <circle cx="15" cy="6" r="2.25" />
      <path d="M4 12h2.75M11.25 12H20" />
      <circle cx="9" cy="12" r="2.25" />
      <path d="M4 18h9.75M18.25 18H20" />
      <circle cx="16" cy="18" r="2.25" />
    </svg>
  )
}

function CloseIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconProps}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconProps} strokeWidth={3}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ChevronIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconProps}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

// ─── Color swatches ───────────────────────────────────────────────────────────

const COLOR_HEX: Record<string, string> = {
  beige: '#EBD9B4',
  black: '#000000',
  blue: '#A9BCD6',
  'blush pink': '#F4C9CF',
  brown: '#8B5E3C',
  cream: '#FFF3D6',
  gold: '#D4AF37',
  green: '#4E9F6A',
  grey: '#9CA3AF',
  gray: '#9CA3AF',
  lavender: '#C9B8E8',
  lemon: '#FBEF8A',
  magenta: '#C2185B',
  maroon: '#7A1F2B',
  mint: '#B7E4C7',
  mustard: '#D9A521',
  navy: '#1F2A4D',
  'off white': '#F5F1E8',
  olive: '#7B7F3A',
  orange: '#F08A24',
  peach: '#FFCBA4',
  pink: '#F9B4CE',
  purple: '#7E4BA8',
  'rani pink': '#D6336C',
  red: '#D62828',
  'sky blue': '#87CEEB',
  silver: '#C0C0C0',
  teal: '#2A8C8C',
  turquoise: '#40C4C4',
  white: '#FFFFFF',
  wine: '#722F37',
  yellow: '#F7D63C',
}

const FALLBACK_SWATCH = '#E5E7EB'

const isLightColor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  const r = n >> 16
  const g = (n >> 8) & 255
  const b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

// ─── Shared building blocks ───────────────────────────────────────────────────

const outlineButton =
  'h-10 px-6 border border-black bg-white text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-black hover:text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-b border-gray-200">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-5 sm:px-6 [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-black">
        <span className="inline-block">
          <span className="block text-lg font-medium tracking-wide text-slate-600">{title}</span>
          <span className="mt-1.5 block h-0.5 w-full bg-black" />
        </span>
        <ChevronIcon className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-6 sm:px-6">{children}</div>
    </details>
  )
}

interface OptionProps {
  label: string
  count?: number
  checked: boolean
  onToggle: () => void
  /** 'round' = single choice (radio), 'square' = multiple choice (checkbox) */
  variant?: 'square' | 'round'
  name?: string
}

function Option({ label, count, checked, onToggle, variant = 'square', name }: OptionProps) {
  const round = variant === 'round'
  return (
    <label className="group flex cursor-pointer select-none items-center gap-3 py-2">
      <input
        type={round ? 'radio' : 'checkbox'}
        name={name}
        checked={checked}
        onChange={onToggle}
        // A radio can't be un-clicked natively; this lets "In stock" be switched off again
        onClick={round ? () => checked && onToggle() : undefined}
        className="peer sr-only"
      />
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black ${round ? 'rounded-full' : 'rounded-sm'
          } ${checked ? 'border-black bg-black text-white' : 'border-gray-300 bg-white group-hover:border-black'}`}
      >
        {checked && (round ? <span className="h-2 w-2 rounded-full bg-white" /> : <CheckIcon />)}
      </span>
      <span className="text-sm text-charcoal">{label}</span>
      {count !== undefined && <span className="text-sm text-gray-400">({count})</span>}
    </label>
  )
}

function ColorOption({
  option,
  checked,
  onToggle,
}: {
  option: FacetOption
  checked: boolean
  onToggle: () => void
}) {
  const hex = COLOR_HEX[normalize(option.value)] ?? FALLBACK_SWATCH
  return (
    <label className="flex min-w-0 cursor-pointer select-none items-center gap-3 py-1.5">
      <input type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
      <span
        style={{ backgroundColor: hex }}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-black/10 transition-shadow peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-black ${checked ? 'shadow-[0_0_0_2px_#fff,0_0_0_4px_#000]' : ''
          } ${isLightColor(hex) ? 'text-black' : 'text-white'}`}
      >
        {checked && <CheckIcon />}
      </span>
      <span className="truncate text-sm text-charcoal">
        {option.label} <span className="text-gray-400">({option.count})</span>
      </span>
    </label>
  )
}

// ─── Title filter ─────────────────────────────────────────────────────────────

function TitleFilter({ applied, onApply }: { applied: string; onApply: (value: string) => void }) {
  const [draft, setDraft] = useState(applied)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onApply(draft.trim())
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="filter-title" className="sr-only">
        Product title
      </label>
      <input
        id="filter-title"
        type="search"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="Search for product title"
        className="h-12 w-full border border-gray-300 bg-white px-4 text-sm text-charcoal placeholder:text-gray-400 focus:border-black focus:outline-none"
      />
      <button type="submit" className={outlineButton}>
        Filter
      </button>
    </form>
  )
}

// ─── Price filter (dual-handle slider) ────────────────────────────────────────

const THUMB_WIDTH = 14

interface PriceBounds {
  min: number
  max: number
  step: number
}

function PriceSlider({
  bounds,
  value,
  onChange,
}: {
  bounds: PriceBounds
  value: [number, number]
  onChange: (next: [number, number]) => void
}) {
  const { min, max, step } = bounds
  const [lo, hi] = value
  const range = Math.max(max - min, 1)
  const pct = (v: number) => ((v - min) / range) * 100

  // Native thumbs travel (width - thumbWidth), so nudge the fill to line up with them
  const fillLeft = `calc(${pct(lo)}% + ${(0.5 - pct(lo) / 100) * THUMB_WIDTH}px)`
  const fillWidth = `calc(${pct(hi) - pct(lo)}% + ${((pct(lo) - pct(hi)) / 100) * THUMB_WIDTH}px)`

  return (
    <div className="relative mx-2 h-8">
      <style>{`
        .price-range {
          position: absolute; left: 0; top: 0; width: 100%; height: 32px; margin: 0;
          background: transparent; pointer-events: none;
          -webkit-appearance: none; appearance: none; outline: none;
        }
        .price-range::-webkit-slider-runnable-track { -webkit-appearance: none; height: 32px; background: transparent; }
        .price-range::-moz-range-track { height: 32px; background: transparent; }
        .price-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; pointer-events: auto;
          width: ${THUMB_WIDTH}px; height: 26px; margin-top: 3px;
          background: #000; border: 0; border-radius: 0; cursor: grab;
        }
        .price-range::-moz-range-thumb {
          pointer-events: auto; width: ${THUMB_WIDTH}px; height: 26px;
          background: #000; border: 0; border-radius: 0; cursor: grab;
        }
        .price-range:active::-webkit-slider-thumb { cursor: grabbing; }
        .price-range:active::-moz-range-thumb { cursor: grabbing; }
        .price-range:focus-visible::-webkit-slider-thumb { outline: 2px solid #000; outline-offset: 3px; }
        .price-range:focus-visible::-moz-range-thumb { outline: 2px solid #000; outline-offset: 3px; }
      `}</style>

      <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-gray-300" />
      <div
        className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-black"
        style={{ left: fillLeft, width: fillWidth }}
      />

      <input
        type="range"
        className="price-range"
        aria-label="Minimum price"
        min={min}
        max={max}
        step={step}
        value={lo}
        onChange={e => onChange([Math.min(Number(e.target.value), hi - step), hi])}
        // When both handles sit near the right edge, the min handle must be the one on top
        style={{ zIndex: lo > min + range / 2 ? 5 : 3 }}
      />
      <input
        type="range"
        className="price-range"
        aria-label="Maximum price"
        min={min}
        max={max}
        step={step}
        value={hi}
        onChange={e => onChange([lo, Math.max(Number(e.target.value), lo + step)])}
        style={{ zIndex: 4 }}
      />
    </div>
  )
}

function PriceFilter({
  bounds,
  applied,
  onApply,
}: {
  bounds: PriceBounds
  applied: [number, number] | null
  onApply: (value: [number, number] | null) => void
}) {
  const [draft, setDraft] = useState<[number, number]>(applied ?? [bounds.min, bounds.max])
  const coversFullRange = draft[0] <= bounds.min && draft[1] >= bounds.max

  return (
    <div className="space-y-4">
      <PriceSlider bounds={bounds} value={draft} onChange={setDraft} />
      <p className="text-sm text-muted">
        Price: <strong className="font-bold text-charcoal">{formatPrice(draft[0], true)}</strong> —{' '}
        <strong className="font-bold text-charcoal">{formatPrice(draft[1], true)}</strong>
      </p>
      <button
        type="button"
        className={outlineButton}
        onClick={() => onApply(coversFullRange ? null : draft)}
      >
        Filter
      </button>
    </div>
  )
}

// ─── The drawer ───────────────────────────────────────────────────────────────

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  filters: ProductFilters
  onChange: (next: ProductFilters) => void
  facets: FilterFacets
  /** Number of products matching the current filters (shown on the footer button) */
  resultCount: number
}

export function FilterDrawer({ open, onClose, filters, onChange, facets, resultCount }: FilterDrawerProps) {
  const panelRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Scroll lock, Escape to close, focus trap, and focus restore
  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const { overflow, paddingRight } = document.body.style
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    closeButtonRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), summary, a[href]'
        )
      ).filter(el => el.offsetParent !== null)
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
      previouslyFocused?.focus()
    }
  }, [open])

  const activeCount = countActiveFilters(filters)

  const toggle = (key: 'sizes' | 'colors' | 'vendors', value: string) => {
    const current = filters[key]
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    onChange({ ...filters, [key]: next })
  }

  return (
    <div
      className={`fixed inset-0 z-[100] ${open ? 'visible' : 'invisible pointer-events-none transition-[visibility] delay-300'
        }`}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 motion-reduce:transition-none ${open ? 'opacity-100' : 'opacity-0'
          }`}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filter products"
        className={`absolute left-0 top-0 flex h-dvh w-[88%] max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${open ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between bg-black px-5 text-white sm:px-6">
          <h2 className="text-lg font-extrabold tracking-widest">FILTER</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="-mr-2 flex h-10 w-10 items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Sections (scrollable) */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {facets.categories.length > 0 && (
            <Section title="By Category">
              <Option
                variant="round"
                name="filter-category"
                label="All"
                count={facets.total}
                checked={filters.category === 'all'}
                onToggle={() => onChange({ ...filters, category: 'all' })}
              />
              {facets.categories.map(cat => (
                <Option
                  key={cat.value}
                  variant="round"
                  name="filter-category"
                  label={cat.label}
                  count={cat.count}
                  checked={filters.category === cat.value}
                  onToggle={() => onChange({ ...filters, category: cat.value })}
                />
              ))}
            </Section>
          )}

          <Section title="By Title">
            <TitleFilter
              key={filters.title}
              applied={filters.title}
              onApply={title => onChange({ ...filters, title })}
            />
          </Section>

          <Section title="By Price">
            <PriceFilter
              key={`${facets.price.min}-${facets.price.max}-${filters.price ? filters.price.join('-') : 'all'}`}
              bounds={facets.price}
              applied={filters.price}
              onApply={price => onChange({ ...filters, price })}
            />
          </Section>

          {facets.sizes.length > 0 && (
            <Section title="By Size">
              {facets.sizes.map(size => (
                <Option
                  key={size.value}
                  label={size.label}
                  count={size.count}
                  checked={filters.sizes.includes(size.value)}
                  onToggle={() => toggle('sizes', size.value)}
                />
              ))}
            </Section>
          )}

          {facets.colors.length > 0 && (
            <Section title="By Color">
              <div className="grid grid-cols-2 gap-x-3">
                {facets.colors.map(color => (
                  <ColorOption
                    key={color.value}
                    option={color}
                    checked={filters.colors.includes(color.value)}
                    onToggle={() => toggle('colors', color.value)}
                  />
                ))}
              </div>
            </Section>
          )}

          {facets.vendors.length > 0 && (
            <Section title="By Vendor">
              {facets.vendors.map(vendor => (
                <Option
                  key={vendor.value}
                  label={vendor.label}
                  count={vendor.count}
                  checked={filters.vendors.includes(vendor.value)}
                  onToggle={() => toggle('vendors', vendor.value)}
                />
              ))}
            </Section>
          )}

          <Section title="Product status">
            <Option
              variant="round"
              name="filter-stock"
              label="In stock"
              count={facets.stock.inStock}
              checked={filters.stock === 'in-stock'}
              onToggle={() => onChange({ ...filters, stock: filters.stock === 'in-stock' ? null : 'in-stock' })}
            />
            {facets.stock.outOfStock > 0 && (
              <Option
                variant="round"
                name="filter-stock"
                label="Out of stock"
                count={facets.stock.outOfStock}
                checked={filters.stock === 'out-of-stock'}
                onToggle={() =>
                  onChange({ ...filters, stock: filters.stock === 'out-of-stock' ? null : 'out-of-stock' })
                }
              />
            )}
          </Section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-3 border-t border-gray-200 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
            disabled={activeCount === 0}
            className="h-12 flex-1 border border-black bg-white text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-black cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-[2] bg-black px-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-olive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Show {resultCount} {resultCount === 1 ? 'product' : 'products'}
          </button>
        </div>
      </aside>
    </div>
  )
}