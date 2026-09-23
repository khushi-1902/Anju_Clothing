interface ImagePlaceholderProps {
  src?: string
  alt: string
  aspectRatio?: '2/3' | '3/4' | '4/5' | '16/6' | '1/1'
  className?: string
  label?: string
}

export function ImagePlaceholder({
  src,
  alt,
  aspectRatio = '2/3',
  className = '',
  label = 'Outfit',
}: ImagePlaceholderProps) {
  const aspectClass = {
    '2/3': 'aspect-[2/3]',
    '3/4': 'aspect-[3/4]',
    '4/5': 'aspect-[4/5]',
    '16/6': 'aspect-[16/6]',
    '1/1': 'aspect-square',
  }[aspectRatio]

  const isPlaceholder = !src || src === 'placeholder' || src.trim() === ''

  if (!isPlaceholder) {
    return (
      <div className={`relative overflow-hidden bg-[#FAF7F2] w-full ${aspectClass} ${className}`}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const parent = e.currentTarget.parentElement
            if (parent) {
              parent.classList.add('flex', 'items-center', 'justify-center')
              const fallback = document.createElement('div')
              fallback.className = 'flex flex-col items-center justify-center p-3 text-center text-muted text-xs'
              fallback.innerHTML = `<span class="text-2xl mb-1">✨</span><span class="font-medium text-[11px] text-charcoal/70">${label}</span>`
              parent.appendChild(fallback)
            }
          }}
        />
      </div>
    )
  }

  // Pure clean minimalistic placeholder
  return (
    <div
      className={`relative overflow-hidden bg-[#FAF7F2] border border-[#E8D5C0]/40 w-full ${aspectClass} flex flex-col items-center justify-center p-4 text-center transition-all duration-300 group-hover:bg-[#F3ECE0] ${className}`}
    >
      <div className="relative z-10 flex flex-col items-center justify-center space-y-1.5">
        <div className="w-10 h-10 rounded-full bg-white/90 shadow-xs flex items-center justify-center text-[#769055] transition-transform group-hover:scale-105">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        <span className="font-display font-medium text-xs text-charcoal/80">
          {label}
        </span>
      </div>
    </div>
  )
}
