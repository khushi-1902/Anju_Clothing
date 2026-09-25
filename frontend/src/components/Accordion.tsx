import { useState, useRef, useId, type ReactNode } from 'react'

export interface AccordionItemData {
  title: string
  content: ReactNode
  defaultOpen?: boolean
}

function Item({
  title,
  content,
  isOpen,
  onToggle,
}: {
  title: string
  content: ReactNode
  isOpen: boolean
  onToggle: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const id = useId()

  return (
    <div className="border-b border-border/70 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`panel-${id}`}
        className="group flex w-full items-center justify-between gap-4 bg-[#FAF7F2] hover:bg-[#F3ECE0] px-4 sm:px-6 py-4 text-left transition-colors cursor-pointer"
      >
        <span
          className={`text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors ${
            isOpen ? 'text-[#769055]' : 'text-charcoal'
          }`}
        >
          {title}
        </span>

        <span
          className={`relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center bg-charcoal text-white transition-transform duration-300 ease-out group-hover:bg-black ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <span className="absolute h-[2px] w-3.5 sm:w-4 bg-white" />
          <span
            className={`absolute h-3.5 sm:h-4 w-[2px] bg-white transition-transform duration-300 ease-out ${
              isOpen ? 'scale-y-0' : 'scale-y-100'
            }`}
          />
        </span>
      </button>

      <div
        id={`panel-${id}`}
        role="region"
        style={{ maxHeight: isOpen ? panelRef.current?.scrollHeight ?? 2000 : 0 }}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out bg-white"
      >
        <div ref={panelRef} className="px-4 sm:px-6 py-5 sm:py-6 text-xs sm:text-sm text-charcoal/85 leading-relaxed">
          {content}
        </div>
      </div>
    </div>
  )
}

export function Accordion({
  items,
  allowMultiple = false,
  className = '',
}: {
  items: AccordionItemData[]
  allowMultiple?: boolean
  className?: string
}) {
  const [open, setOpen] = useState<Set<number>>(
    () => new Set(items.map((it, i) => (it.defaultOpen ? i : -1)).filter((i) => i >= 0))
  )

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(i)) {
        next.delete(i)
      } else {
        if (!allowMultiple) next.clear()
        next.add(i)
      }
      return next
    })

  return (
    <div className={`border border-border/80 shadow-xs ${className}`}>
      {items.map((item, i) => (
        <Item key={item.title} title={item.title} content={item.content} isOpen={open.has(i)} onToggle={() => toggle(i)} />
      ))}
    </div>
  )
}
