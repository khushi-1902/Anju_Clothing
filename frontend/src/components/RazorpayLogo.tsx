import React from 'react'

interface RazorpayLogoProps {
  className?: string
  height?: number | string
  variant?: 'full' | 'icon' | 'badge'
}

/**
 * Official Razorpay SVG Vector Logo Component
 * Renders the official Razorpay lightning/slanted emblem and stylized wordmark.
 */
export function RazorpayLogo({
  className = '',
  height = 24,
  variant = 'full',
}: RazorpayLogoProps) {
  if (variant === 'icon') {
    return (
      <svg
        className={`inline-block shrink-0 ${className}`}
        style={{ height }}
        viewBox="0 0 28 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Razorpay"
      >
        <path
          d="M17.067 0L4.933 13.6h9.067L9.6 32l13.467-15.467h-9.334L17.067 0z"
          fill="url(#rzp-gradient)"
        />
        <defs>
          <linearGradient
            id="rzp-gradient"
            x1="4.933"
            y1="0"
            x2="23.067"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#0C2340" />
            <stop offset="0.45" stopColor="#0C83FF" />
            <stop offset="1" stopColor="#0284C7" />
          </linearGradient>
        </defs>
      </svg>
    )
  }

  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0C2340]/5 border border-[#0C2340]/15 text-[#0C2340] text-[11px] font-semibold tracking-tight ${className}`}
      >
        <svg
          className="w-3 h-3.5 shrink-0"
          viewBox="0 0 28 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.067 0L4.933 13.6h9.067L9.6 32l13.467-15.467h-9.334L17.067 0z"
            fill="#0C83FF"
          />
        </svg>
        <span className="font-bold text-[#0C2340]">Razorpay</span>
        <span className="text-[9px] uppercase tracking-wider text-[#0C83FF] font-bold">Verified</span>
      </span>
    )
  }

  // Full Wordmark Logo
  return (
    <svg
      className={`inline-block shrink-0 ${className}`}
      style={{ height }}
      viewBox="0 0 135 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Razorpay"
    >
      {/* Razorpay Emblem Icon */}
      <path
        d="M13.2 0L2.4 12.1h8.1L6.6 28l12-13.7h-8.3L13.2 0z"
        fill="url(#rzp-full-gradient)"
      />
      
      {/* Typography: Razorpay */}
      <text
        x="24"
        y="19"
        fill="#0C2340"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize="17"
        letterSpacing="-0.5px"
      >
        Razor<tspan fill="#0C83FF">pay</tspan>
      </text>

      <defs>
        <linearGradient
          id="rzp-full-gradient"
          x1="2.4"
          y1="0"
          x2="18.6"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0C2340" />
          <stop offset="0.5" stopColor="#0C83FF" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
      </defs>
    </svg>
  )
}
