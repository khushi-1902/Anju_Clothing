import { useEffect, useRef } from 'react'
import { FilterControls } from './FilterControls'
import {
  countActiveFilters,
  type FilterFacets,
  type ProductFilters,
} from '../utils/productFilters'

export function FilterIcon({ className = 'w-4 h-4' }: { className?: string }) {
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
      <path d="M4 6h8.75M17.25 6H20" />
      <circle cx="15" cy="6" r="2.25" />
      <path d="M4 12h2.75M11.25 12H20" />
      <circle cx="9" cy="12" r="2.25" />
      <path d="M4 18h9.75M18.25 18H20" />
      <circle cx="16" cy="18" r="2.25" />
    </svg>
  )
}

function CloseIcon({ className = 'w-5 h-5' }: { className?: string }) {
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
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  filters: ProductFilters
  onChange: (next: ProductFilters) => void
  facets: FilterFacets
  resultCount: number
  hideCategory?: boolean
  onClearAll: () => void
}

export function FilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  facets,
  resultCount,
  hideCategory = false,
  onClearAll,
}: FilterDrawerProps) {
  const panelRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

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

  const activeCount = countActiveFilters(filters, {
    lockCategory: hideCategory,
    lockCollection: Boolean(filters.collection),
  })

  return (
    <div
      className={`fixed inset-0 z-[100] ${
        open ? 'visible' : 'invisible pointer-events-none transition-[visibility] delay-300'
      }`}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 motion-reduce:transition-none ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Slide-over Drawer */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filter products"
        className={`absolute left-0 top-0 flex h-dvh w-[85%] max-w-[380px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-[#faf6f0] px-4 text-[#2c2420]">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-base font-bold uppercase tracking-wider text-[#3e502a]">
              Filters
            </h2>
            {activeCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3e502a] px-1.5 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-200/60 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#3e502a]"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable Filter Controls */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2">
          <FilterControls
            filters={filters}
            onChange={onChange}
            facets={facets}
            hideCategory={hideCategory}
          />
        </div>

        {/* Sticky Footer */}
        <div className="flex shrink-0 items-center gap-2.5 border-t border-stone-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg">
          <button
            type="button"
            onClick={onClearAll}
            disabled={activeCount === 0}
            className="h-11 flex-1 rounded-xs border border-stone-300 bg-white text-xs font-bold uppercase tracking-wider text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-[1.6] rounded-xs bg-[#3e502a] px-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#324122] cursor-pointer"
          >
            Apply Filters {resultCount > 0 ? `(${resultCount})` : ''}
          </button>
        </div>
      </aside>
    </div>
  )
}