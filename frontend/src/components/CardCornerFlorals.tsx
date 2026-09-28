/**
 * Royal Gold Corner Filigree Scrollwork
 * Metallic 24K gold ornament corners framing the bottom of the arch card.
 */
export function CardCornerFlorals() {
  return (
    <div
      className="absolute -bottom-1 -inset-x-2.5 h-12 pointer-events-none z-30 flex justify-between items-end"
      aria-hidden="true"
    >
      {/* Left Corner 24K Gold Filigree */}
      <div className="relative w-14 sm:w-16 h-12 shrink-0">
        <svg
          viewBox="0 0 75 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
        >
          {/* Main Gold Outer Vine */}
          <path
            d="M6 52 C4 36 10 24 22 14 C26 11 32 14 30 20 C28 27 20 34 22 42 C24 48 34 50 48 48 C58 46 66 50 72 52"
            stroke="url(#goldFiligreeGrad1)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />

          {/* Secondary Filigree Curl */}
          <path
            d="M14 46 C8 40 10 30 18 28 C24 26 26 32 20 36 C16 38 12 44 14 46 Z"
            fill="url(#goldFiligreeGrad2)"
            stroke="#9e701e"
            strokeWidth="0.8"
          />

          {/* Gold Lotus Leaf */}
          <path
            d="M20 20 C18 10 26 4 34 10 C30 18 26 20 20 20 Z"
            fill="url(#goldFiligreeGrad1)"
            stroke="#9e701e"
            strokeWidth="0.8"
          />

          {/* Bottom Gold Flourish */}
          <path
            d="M32 46 C38 40 48 42 50 48 C44 51 36 50 32 46 Z"
            fill="url(#goldFiligreeGrad2)"
            stroke="#9e701e"
            strokeWidth="0.7"
          />

          {/* Gold Beads */}
          <circle cx="10" cy="18" r="2.2" fill="#fdf0c2" stroke="#9e701e" strokeWidth="0.7" />
          <circle cx="26" cy="8" r="2.4" fill="#fae5a0" stroke="#9e701e" strokeWidth="0.7" />
          <circle cx="36" cy="24" r="2" fill="#e8c06a" stroke="#9e701e" strokeWidth="0.7" />
          <circle cx="62" cy="46" r="2.2" fill="#fae5a0" stroke="#9e701e" strokeWidth="0.7" />

          <defs>
            <linearGradient id="goldFiligreeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fae5a0" />
              <stop offset="45%" stopColor="#d4a742" />
              <stop offset="85%" stopColor="#b88628" />
              <stop offset="100%" stopColor="#7a5510" />
            </linearGradient>
            <linearGradient id="goldFiligreeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fdf0c2" />
              <stop offset="50%" stopColor="#e8c06a" />
              <stop offset="100%" stopColor="#9e701e" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Center Delicate Gold Border Bevel */}
      <div className="flex-1 h-3 flex items-center justify-center px-1 mb-0.5 opacity-90">
        <svg viewBox="0 0 100 10" fill="none" className="w-full h-full">
          <path
            d="M0 6 Q25 1 50 6 T100 6"
            stroke="#d4a742"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="35" cy="4" r="1.4" fill="#fae5a0" />
          <circle cx="50" cy="6" r="2" fill="#fdf0c2" stroke="#a27828" strokeWidth="0.5" />
          <circle cx="65" cy="4" r="1.4" fill="#fae5a0" />
        </svg>
      </div>

      {/* Right Corner 24K Gold Filigree (Mirrored) */}
      <div className="relative w-14 sm:w-16 h-12 shrink-0 scale-x-[-1]">
        <svg
          viewBox="0 0 75 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
        >
          <path
            d="M6 52 C4 36 10 24 22 14 C26 11 32 14 30 20 C28 27 20 34 22 42 C24 48 34 50 48 48 C58 46 66 50 72 52"
            stroke="url(#goldFiligreeGrad1)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M14 46 C8 40 10 30 18 28 C24 26 26 32 20 36 C16 38 12 44 14 46 Z"
            fill="url(#goldFiligreeGrad2)"
            stroke="#9e701e"
            strokeWidth="0.8"
          />
          <path
            d="M20 20 C18 10 26 4 34 10 C30 18 26 20 20 20 Z"
            fill="url(#goldFiligreeGrad1)"
            stroke="#9e701e"
            strokeWidth="0.8"
          />
          <path
            d="M32 46 C38 40 48 42 50 48 C44 51 36 50 32 46 Z"
            fill="url(#goldFiligreeGrad2)"
            stroke="#9e701e"
            strokeWidth="0.7"
          />
          <circle cx="10" cy="18" r="2.2" fill="#fdf0c2" stroke="#9e701e" strokeWidth="0.7" />
          <circle cx="26" cy="8" r="2.4" fill="#fae5a0" stroke="#9e701e" strokeWidth="0.7" />
          <circle cx="36" cy="24" r="2" fill="#e8c06a" stroke="#9e701e" strokeWidth="0.7" />
          <circle cx="62" cy="46" r="2.2" fill="#fae5a0" stroke="#9e701e" strokeWidth="0.7" />
        </svg>
      </div>
    </div>
  )
}
