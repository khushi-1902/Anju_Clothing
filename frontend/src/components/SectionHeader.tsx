interface SectionHeaderProps {
  eyebrow?: string
  eyebrowTone?: 'gold' | 'olive' | 'dark'
  title: string
  subcopy?: string
  id?: string
  className?: string
  align?: 'center' | 'left'
}

/**
 * Reusable Section Header with luxury ethnic-wear aesthetics:
 * - Playfair / Tenor Sans display serif typography
 * - Delicate gold ornament divider with diamond motif
 * - Responsive sizing and balanced line wrapping
 */
export function SectionHeader({
  eyebrow,
  eyebrowTone = 'gold',
  title,
  subcopy,
  id,
  className = '',
  align = 'center',
}: SectionHeaderProps) {
  const isCentered = align === 'center'

  return (
    <header className={`mb-6 sm:mb-10 md:mb-12 ${isCentered ? 'text-center' : 'text-left'} ${className}`}>
      {eyebrow && (
        <div className={`mb-1.5 sm:mb-2.5 flex ${isCentered ? 'justify-center' : 'justify-start'}`}>
          {eyebrowTone === 'gold' && (
            <span className="text-gold text-[10px] sm:text-xs uppercase tracking-[0.25em] font-bold">
              {eyebrow}
            </span>
          )}
          {eyebrowTone === 'olive' && (
            <span className="text-olive text-[10px] sm:text-xs uppercase tracking-[0.25em] font-bold">
              {eyebrow}
            </span>
          )}
          {eyebrowTone === 'dark' && (
            <span className="inline-block bg-charcoal text-ivory text-[9px] sm:text-[10px] font-bold px-2.5 sm:px-3 py-0.5 sm:py-1 uppercase tracking-widest rounded-xs">
              {eyebrow}
            </span>
          )}
        </div>
      )}

      {/* Main Section Heading */}
      <h2
        id={id}
        className="font-display text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-charcoal leading-tight tracking-tight px-1"
      >
        {title}
      </h2>

      {/* Small ornament divider beside / below section title with rotated diamond */}
      <div
        className={`flex items-center gap-2 sm:gap-2.5 mt-2.5 sm:mt-3.5 ${isCentered ? 'justify-center' : 'justify-start'}`}
        aria-hidden="true"
      >
        <span className="h-px w-6 sm:w-12 md:w-14 bg-gradient-to-r from-transparent to-gold/70" />
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rotate-45 border border-gold bg-gold/25" />
        <span className="h-px w-6 sm:w-12 md:w-14 bg-gradient-to-l from-transparent to-gold/70" />
      </div>

      {subcopy && (
        <p
          className={`text-muted text-xs sm:text-sm md:text-base mt-2.5 sm:mt-3.5 leading-relaxed px-2 ${
            isCentered ? 'max-w-xl mx-auto' : 'max-w-xl'
          }`}
        >
          {subcopy}
        </p>
      )}
    </header>
  )
}
