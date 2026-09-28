import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategories } from '../lib/api'
import { MobileSlider } from './MobileSlider'
import { CardCornerFlorals } from './CardCornerFlorals'

/**
 * High-resolution full-length ethnic wear photography from the store database
 * Perfectly paired with each dress category type.
 */
const CATEGORY_ITEMS: {
  id: string
  name: string
  slug: string
  imageUrl: string
  linkTo: string
}[] = [
  {
    id: 'anarkali-sets',
    name: 'Anarkali Sets',
    slug: 'anarkali-sets',
    imageUrl: 'https://cdn.shopify.com/s/files/1/1020/9912/4593/files/79E22484-5C5D-46F7-8E73-C2646FEA540A.png?v=1789627932',
    linkTo: '/all-products?category=Anarkali%20Sets',
  },
  {
    id: 'sarees',
    name: 'Sarees',
    slug: 'sarees',
    imageUrl: 'https://cdn.shopify.com/s/files/1/1020/9912/4593/files/2927D7AB-CC1A-44E0-B09A-B6380F53BA1A.png?v=1789195260',
    linkTo: '/all-products?category=Saris',
  },
  {
    id: 'kurta-sets',
    name: 'Kurta Sets',
    slug: 'kurta-sets',
    imageUrl: 'https://cdn.shopify.com/s/files/1/1020/9912/4593/files/A8835CE6-1489-403A-BFE0-2A4D9D09ECE7.png?v=1783761445',
    linkTo: '/all-products?category=Kurtas%20%26%20Kurta%20Sets',
  },
  {
    id: 'sharara-sets',
    name: 'Sharara Sets',
    slug: 'sharara-sets',
    imageUrl: 'https://cdn.shopify.com/s/files/1/1020/9912/4593/files/196A1AC2-315D-4803-991A-71A5A856782F.jpg?v=1783925338',
    linkTo: '/all-products?category=Salwar%20Kameez%20%26%20Suit%20Sets',
  },
  {
    id: 'palazzo-sets',
    name: 'Palazzo Sets',
    slug: 'palazzo-sets',
    imageUrl: 'https://cdn.shopify.com/s/files/1/1020/9912/4593/files/9F419097-C5B2-415F-9E18-2CA4156622DB.png?v=1789564514',
    linkTo: '/all-products?category=Salwar%20Kameez%20%26%20Suit%20Sets',
  },
  {
    id: 'new-arrivals',
    name: 'New Arrivals',
    slug: 'new-arrivals',
    imageUrl: 'https://cdn.shopify.com/s/files/1/1020/9912/4593/files/463CF62D-507B-4220-853E-6D7708DB3FB9.png?v=1789114671',
    linkTo: '/all-products?sort=newest',
  },
]

/**
 * Lotus crest that sits on the top edge of the header plaque.
 * Three petals + a base line, drawn in the site's gold.
 */
function LotusCrest() {
  return (
    <svg
      viewBox="0 0 56 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-11 h-7 sm:w-14 sm:h-9"
      aria-hidden="true"
    >
      {/* Outer petals */}
      <path
        d="M28 30 C14 30 5 23 3 13 C12 14 21 20 28 30 Z"
        fill="#c49332"
        fillOpacity="0.18"
        stroke="#c49332"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M28 30 C42 30 51 23 53 13 C44 14 35 20 28 30 Z"
        fill="#c49332"
        fillOpacity="0.18"
        stroke="#c49332"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Inner petals */}
      <path
        d="M28 30 C19 27 14 20 14 10 C21 13 26 20 28 30 Z"
        fill="#c49332"
        fillOpacity="0.28"
        stroke="#c49332"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M28 30 C37 27 42 20 42 10 C35 13 30 20 28 30 Z"
        fill="#c49332"
        fillOpacity="0.28"
        stroke="#c49332"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Centre petal */}
      <path
        d="M28 3 C34 11 34 21 28 30 C22 21 22 11 28 3 Z"
        fill="#c49332"
        fillOpacity="0.4"
        stroke="#c49332"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Base */}
      <path d="M12 32 H44" stroke="#c49332" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Gold rule that sits beside the heading: a fading line ending in a diamond
 * next to the title. Mirrored for the right side.
 */
function SideRule({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left'
  return (
    <div
      className={`flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 ${isLeft ? '' : 'flex-row-reverse'}`}
      aria-hidden="true"
    >
      <span
        className={`h-px flex-1 ${
          isLeft
            ? 'bg-gradient-to-r from-transparent to-[#c49332]'
            : 'bg-gradient-to-l from-transparent to-[#c49332]'
        }`}
      />
      <span className="w-1.5 h-1.5 rotate-45 border border-[#c49332] shrink-0" />
      <span className="w-2 h-2 rotate-45 bg-[#c49332] shrink-0" />
    </div>
  )
}

/**
 * Single Arched Collection Card
 */
function CollectionArchCard({ item }: { item: typeof CATEGORY_ITEMS[0] }) {
  const [imgSrc, setImgSrc] = useState(item.imageUrl)

  return (
    <Link
      to={item.linkTo}
      className="group relative flex flex-col w-full focus:outline-hidden focus:ring-2 focus:ring-[#c9973a]/70 rounded-t-[100px] sm:rounded-t-[120px] md:rounded-t-[140px] transition-all duration-300 transform group-hover:-translate-y-2 select-none"
    >
      {/* 
        Outer Arched Card with Metallic Golden Double Rim & Shadow
        Taller vertical aspect ratio (aspect-[1/2.02]) so model is completely uncropped
      */}
      <div className="relative w-full rounded-t-[100px] sm:rounded-t-[120px] md:rounded-t-[140px] rounded-b-2xl p-[3px] bg-gradient-to-b from-[#eec975] via-[#c9973a] to-[#9e701e] shadow-[0_10px_28px_rgba(184,134,40,0.22)] group-hover:shadow-[0_18px_42px_rgba(184,134,40,0.36)] transition-all duration-300">
        
        {/* Inner Arch Container */}
        <div className="relative w-full rounded-t-[97px] sm:rounded-t-[117px] md:rounded-t-[137px] rounded-b-[13px] overflow-hidden bg-[#faf5ee]">
          
          {/* Full-Length Portrait Image Frame */}
          <div className="relative w-full aspect-[1/2.02] sm:aspect-[1/2.06] overflow-hidden bg-[#faf5ee]">
            <img
              src={imgSrc}
              alt={`${item.name} Ethnic Wear Collection`}
              loading="lazy"
              onError={() => setImgSrc(CATEGORY_ITEMS[0].imageUrl)}
              className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            />

            {/* Subtle bottom gradient to ensure badge contrast */}
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/25 via-black/5 to-transparent pointer-events-none" />
          </div>

          {/* 
            Overlapping Bottom Badge with Lotus Tab Notch
            Positioned at the very bottom so 75%-80% of model image is completely unobstructed!
          */}
          <div className="absolute inset-x-2 sm:inset-x-2.5 bottom-2 sm:bottom-2.5 z-10">
            
            {/* Top Tab for the Lotus Emblem */}
            <div className="flex justify-center -mb-2.5 relative z-20">
              <div className="px-2 pt-1 pb-1 bg-[#fffaf1] border-t border-x border-[#d4af37]/70 rounded-t-full shadow-xs flex items-center justify-center">
                <div className="w-5 h-3.5 sm:w-6 sm:h-4 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full">
                  <LotusCrest />
                </div>
              </div>
            </div>

            {/* Main Badge Container */}
            <div className="relative bg-[#fffaf1] border border-[#d4af37]/70 rounded-2xl sm:rounded-3xl pt-1.5 sm:pt-2 pb-2.5 sm:pb-3 px-2 text-center shadow-md shadow-black/10 group-hover:border-[#c9973a] transition-all duration-300">
              
              {/* Category Name in Rich Dark Olive Green Serif */}
              <h3 className="font-serif font-bold text-xs sm:text-sm md:text-[0.95rem] text-[#3e502a] tracking-tight leading-snug line-clamp-1 mb-1.5 pt-0.5">
                {item.name}
              </h3>

              {/* Pill "Shop Now →" Button in Rich Dark Olive Green */}
              <div className="flex justify-center items-center">
                <span className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1 min-h-[30px] sm:min-h-[32px] rounded-full bg-gradient-to-b from-[#5c7340] to-[#41542a] text-white text-[10px] sm:text-[11px] font-serif font-medium tracking-wide shadow-xs group-hover:from-[#4d6134] group-hover:to-[#33421f] transition-all duration-200">
                  <span>Shop Now</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
                    →
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 
          Royal 24K Gold Filigree Scrollwork on outer corners
        */}
        <CardCornerFlorals />
      </div>
    </Link>
  )
}

/**
 * Skeleton Loader matching tall arch shape
 */
function CollectionsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5 max-w-7xl mx-auto px-4 sm:px-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse flex flex-col">
          <div className="w-full rounded-t-[110px] rounded-b-xl aspect-[1/2.05] bg-[#ebdccb]/60 border-2 border-[#d4af37]/40 relative overflow-hidden">
            <div className="absolute inset-x-2.5 bottom-2.5 h-20 bg-[#fffaf1]/90 rounded-2xl border border-[#d4af37]/30 flex flex-col items-center justify-center p-2 gap-1.5">
              <div className="w-8 h-4 rounded-full bg-[#d4af37]/40 -mt-5" />
              <div className="h-3 w-16 bg-[#3e502a]/30 rounded" />
              <div className="h-5 w-20 bg-[#495c2f]/40 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function CollectionsSection() {
  const { loading } = useCategories()

  // 1. Loading State
  if (loading) {
    return (
      <section
        id="explore-collections"
        aria-labelledby="collections-heading"
        className="py-8 sm:py-10 md:py-12 bg-[#fcf8f2] border-y border-[#ebdccb]/60 relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 mb-6 sm:mb-8">
          <div className="flex flex-col items-center text-center">
            <LotusCrest />

            {/* Heading with gold rules on both sides */}
            <div className="mt-2 flex items-center w-full max-w-2xl gap-3 sm:gap-5">
              <SideRule side="left" />

              <h2
                id="collections-heading"
                className="shrink-0 font-serif text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-[#3e502a] tracking-wide leading-tight"
              >
                Explore Our Collections
              </h2>

              <SideRule side="right" />
            </div>

            <p className="mt-3 sm:mt-4 text-[#6d5b52] font-serif italic text-sm sm:text-base leading-relaxed max-w-md">
              Handcrafted ensembles celebrating Indian heritage & festive charm
            </p>
          </div>
        </div>
        <CollectionsSkeleton />
      </section>
    )
  }

  return (
    <section
      id="explore-collections"
      aria-labelledby="collections-heading"
      className="py-8 sm:py-10 md:py-12 bg-[#fcf8f2] border-y border-[#ebdccb]/60 relative overflow-hidden"
    >
      {/* Background Soft Glow Accent */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[38rem] h-[38rem] bg-[#e8c06a]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Section Heading matching Best Sellers exact Royal Theme */}
        <div className="relative mb-6 sm:mb-8">
          <div className="flex flex-col items-center text-center">
            <LotusCrest />

            {/* Heading with gold rules on both sides */}
            <div className="mt-2 flex items-center w-full max-w-2xl gap-3 sm:gap-5">
              <SideRule side="left" />

              <h2
                id="collections-heading"
                className="shrink-0 font-serif text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-[#3e502a] tracking-wide leading-tight"
              >
                Explore Our Collections
              </h2>

              <SideRule side="right" />
            </div>

            <p className="mt-3 sm:mt-4 text-[#6d5b52] font-serif italic text-sm sm:text-base leading-relaxed max-w-md">
              Handcrafted ensembles celebrating Indian heritage & festive charm
            </p>
          </div>
        </div>

        {/* 
          Responsive Layout:
          - Desktop (1024px+): 6 in one row
          - Tablet (768px): 3 per row
          - Mobile (<768px): MobileSlider with ~2.2 cards visible
        */}
        <MobileSlider
          itemCount={CATEGORY_ITEMS.length}
          desktopGridClassName="md:grid-cols-3 lg:grid-cols-6"
          showDesktopArrows={false}
          indicatorType="bar"
          gapClassName="gap-3.5 sm:gap-4 md:gap-5"
        >
          {CATEGORY_ITEMS.map((item) => (
            <CollectionArchCard key={item.id} item={item} />
          ))}
        </MobileSlider>
      </div>
    </section>
  )
}
