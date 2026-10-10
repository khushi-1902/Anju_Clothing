import { useState, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { useProduct, useNewArrivals, fetchProductReviews, submitProductReview, type ApiReview } from '../lib/api'
import { STORE_INFO } from '../data/products'
import { StarRating } from '../components/StarRating'
import { ProductCard } from '../components/ProductCard'
import { ImagePlaceholder } from '../components/ImagePlaceholder'
import { Accordion, type AccordionItemData } from '../components/Accordion'
import { SizeChartModal } from '../components/SizeChartModal'
import type { Product } from '../types'

interface ReviewItem {
  id: string | number
  name: string
  rating: number
  title: string
  comment: string
  date: string
  verified: boolean
  helpfulCount: number
}

// Stable fallbacks so default values don't create a new object/array every render
const EMPTY_IMAGES: string[] = []
const EMPTY_COLORS: string[] = []
const EMPTY_COLOR_IMAGE_MAP: Record<string, string> = {}

const COLOR_MAP: Record<string, string> = {
  'red': '#DC2626',
  'dark red': '#991B1B',
  'blood red': '#B91C1C',
  'rani pink': '#E91E63',
  'rani': '#E91E63',
  'hot pink': '#FF1493',
  'pink': '#F48FB1',
  'blush pink': '#F8BBD0',
  'baby pink': '#FCE4EC',
  'dusty pink': '#D8829D',
  'onion pink': '#C47B89',
  'rose': '#E11D48',
  'wine': '#581845',
  'maroon': '#800000',
  'mahroon': '#800000',
  'burgundy': '#4A0E17',
  'navy': '#001F3F',
  'navy blue': '#0A192F',
  'blue': '#2563EB',
  'royal blue': '#1D4ED8',
  'sky blue': '#38BDF8',
  'skyblue': '#38BDF8',
  'ice blue': '#E0F2FE',
  'teal': '#008080',
  'teal green': '#0D9488',
  'peacock blue': '#005F73',
  'green': '#15803D',
  'dark green': '#064E3B',
  'bottle green': '#14532D',
  'mehendi green': '#65A30D',
  'mehendi': '#65A30D',
  'mehndi': '#65A30D',
  'pista green': '#93C572',
  'pista': '#93C572',
  'rama green': '#00A877',
  'rama': '#00A877',
  'mint green': '#A7F3D0',
  'olive': '#769055',
  'olive green': '#769055',
  'lime': '#84CC16',
  'golden': '#D4AF37',
  'gold': '#D4AF37',
  'mustard': '#D97706',
  'mustard yellow': '#D97706',
  'yellow': '#EAB308',
  'haldi yellow': '#F59E0B',
  'lemon yellow': '#FEF08A',
  'orange': '#EA580C',
  'rust': '#9A3412',
  'rust orange': '#9A3412',
  'peach': '#FDBA74',
  'coral': '#FB7185',
  'purple': '#7E22CE',
  'dark purple': '#581C87',
  'lavender': '#C084FC',
  'violet': '#7C3AED',
  'lilac': '#C8A2C8',
  'mauve': '#E0B0FF',
  'black': '#18181B',
  'white': '#FFFFFF',
  'off white': '#FAF8F5',
  'off-white': '#FAF8F5',
  'cream': '#FDFBF7',
  'beige': '#E5D3B3',
  'ivory': '#FFFFF0',
  'silver': '#94A3B8',
  'grey': '#6B7280',
  'gray': '#6B7280',
  'brown': '#78350F',
  'as shown in picture': '#C9973A',
  'as shown': '#C9973A',
}

function resolveColorHex(color: string): string {
  const clean = color.trim().toLowerCase()
  if (COLOR_MAP[clean]) return COLOR_MAP[clean]
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (clean.includes(key)) return val
  }
  if (clean.startsWith('#') || clean.startsWith('rgb') || clean.startsWith('hsl')) return color
  return '#C9973A'
}

/** Craft heritage reference used for the "About This Craft" panel — keyed by
 * terms that commonly appear in `fabric` / `work` fields. Falls back to a
 * general handcraft description when nothing matches. */
const CRAFT_LIBRARY: { match: RegExp; region: string; technique: string; note: string }[] = [
  {
    match: /zardozi/i,
    region: 'Lucknow, Uttar Pradesh',
    technique: 'Zardozi Embroidery',
    note: 'Metallic thread, beads and sequins are hand-stitched over a marked outline, a technique once reserved for royal courts and still practiced by hand today.',
  },
  {
    match: /chikankari/i,
    region: 'Lucknow, Uttar Pradesh',
    technique: 'Chikankari Embroidery',
    note: 'A shadow-work embroidery style stitched with white thread on fine fabric, where every motif is drawn and hand-embroidered by a single artisan from start to finish.',
  },
  {
    match: /gota\s*patti/i,
    region: 'Jaipur, Rajasthan',
    technique: 'Gota Patti Work',
    note: 'Metallic ribbon is cut and folded into motifs, then appliquéd by hand — a technique that can take a single artisan several days per garment.',
  },
  {
    match: /banarasi|katan|silk/i,
    region: 'Varanasi, Uttar Pradesh',
    technique: 'Handloom Weaving',
    note: 'Woven on traditional pit looms by master weavers, some pieces take upward of a week on the loom before a single thread is cut.',
  },
  {
    match: /mirror/i,
    region: 'Kutch, Gujarat',
    technique: 'Mirror (Shisha) Work',
    note: 'Small mirrors are set into hand-embroidered frames, a technique traditionally used to catch light across open desert landscapes.',
  },
  {
    match: /zari/i,
    region: 'Surat, Gujarat',
    technique: 'Zari Thread Work',
    note: 'Fine gold and silver-toned thread is woven or embroidered into the fabric, a craft with roots going back centuries in western India.',
  },
]

function getCraftStory(fabric?: string, work?: string) {
  const source = `${fabric || ''} ${work || ''}`
  for (const entry of CRAFT_LIBRARY) {
    if (entry.match.test(source)) return entry
  }
  return {
    region: 'Artisan workshops across India',
    technique: 'Hand-finished Craftsmanship',
    note: 'Every piece passes through several pairs of hands — cutting, stitching, finishing and quality checks — before it ever reaches you.',
  }
}

/* ------------------------------------------------------------------ */
/* Small shared presentational helpers                                 */
/* ------------------------------------------------------------------ */

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function HeartIcon({ className, filled }: { className: string; filled: boolean }) {
  return (
    <svg
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  )
}

export interface DropdownTabItem {
  id: string
  title: string
  content: ReactNode
}

/** Clean product detail dropdown accordions matching requested specification */
function ProductDetailDropdowns({
  items,
  openId,
  onToggle,
}: {
  items: DropdownTabItem[]
  openId: string | null
  onToggle: (id: string) => void
}) {
  return (
    <div className="space-y-2 border-t border-border/60 pt-4">
      {items.map((item) => {
        const isOpen = openId === item.id
        return (
          <div
            key={item.id}
            id={`dropdown-${item.id}`}
            className="border border-gray-200/90 rounded-xs overflow-hidden bg-white shadow-2xs transition-colors"
          >
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              aria-expanded={isOpen}
              className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left transition-colors cursor-pointer select-none ${
                isOpen ? 'bg-[#F4F5F7] border-b border-gray-200' : 'bg-[#F4F5F7] hover:bg-[#ECEEF2]'
              }`}
            >
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-gray-900 font-sans">
                {item.title}
              </span>
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-gray-900' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isOpen && (
              <div className="p-4 sm:p-5 bg-white text-xs sm:text-sm text-charcoal leading-relaxed animate-in fade-in duration-200">
                {item.content}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Auto-moving recommendation products scroller with manual navigation arrows */
function RecommendationCarousel({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)

  // Auto scroll effect: advances smoothly every 3.2 seconds
  useEffect(() => {
    if (products.length <= 1 || isPaused) return

    const interval = setInterval(() => {
      const el = scrollRef.current
      if (!el) return

      const maxScrollLeft = el.scrollWidth - el.clientWidth
      if (el.scrollLeft >= maxScrollLeft - 15) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        const firstCard = el.querySelector<HTMLElement>(':scope > div')
        const cardWidth = firstCard?.offsetWidth || 220
        el.scrollBy({ left: cardWidth + 14, behavior: 'smooth' })
      }
    }, 3200)

    return () => clearInterval(interval)
  }, [products.length, isPaused])

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const firstCard = el.querySelector<HTMLElement>(':scope > div')
    const cardWidth = firstCard?.offsetWidth || 220
    const scrollAmount = direction === 'left' ? -(cardWidth + 14) : (cardWidth + 14)
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }

  if (products.length === 0) return null

  return (
    <div
      className="relative group/rec"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
    >
      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-3 pt-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="w-[48%] min-w-[155px] max-w-[210px] sm:w-[240px] sm:min-w-[240px] lg:w-[270px] lg:min-w-[270px] shrink-0 snap-start"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Desktop/Tablet Navigation Arrows */}
      <button
        type="button"
        onClick={() => handleScroll('left')}
        aria-label="Previous recommendations"
        className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 border border-stone-200 text-charcoal shadow-md items-center justify-center opacity-0 group-hover/rec:opacity-100 hover:bg-white hover:scale-105 transition-all z-20 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => handleScroll('right')}
        aria-label="Next recommendations"
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 border border-stone-200 text-charcoal shadow-md items-center justify-center opacity-0 group-hover/rec:opacity-100 hover:bg-white hover:scale-105 transition-all z-20 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}


export function ProductDetailPage() {
  const { productId } = useParams<{ productId?: string }>()
  const { product, loading, notFound } = useProduct(productId)

  if (loading) {
    return (
      <div className="min-h-screen py-10 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white p-6 sm:p-10 border border-border/80">
            <div className="lg:col-span-6 aspect-[4/5] bg-stone-200" />
            <div className="lg:col-span-6 space-y-4">
              <div className="h-4 w-24 bg-stone-200" />
              <div className="h-8 w-3/4 bg-stone-200" />
              <div className="h-6 w-1/2 bg-stone-200" />
              <div className="h-24 w-full bg-stone-200" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-ivory px-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-charcoal">Product not found</h1>
        <p className="text-sm text-muted">This item may have sold out or the link is incorrect.</p>
      </div>
    )
  }

  return <ProductDetailBody product={product} />
}

function ProductDetailBody({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isInWishlist, navigateTo, openCart } = useShop()
  const { products: relatedPool } = useNewArrivals(16)

  useEffect(() => {
    document.title = `${product.name} - Ethnic Wear | Anju Clothing`
  }, [product])

  const {
    id,
    sku,
    name,
    price,
    originalPrice,
    category,
    categorySlug,
    img,
    additionalImages = EMPTY_IMAGES,
    tag,
    sold,
    discount,
    description,
    fabric,
    work,
    sizes = ['S', 'M', 'L', 'XL', 'XXL'],
    colors: rawColors = EMPTY_COLORS,
    colorImageMap = EMPTY_COLOR_IMAGE_MAP,
    variants = [],
  } = product

  const availableColors = useMemo(() => {
    if (rawColors && rawColors.length > 0) {
      return rawColors
    }
    const titleLower = name.toLowerCase()
    for (const colKey of Object.keys(COLOR_MAP)) {
      if (colKey === 'as shown in picture' || colKey === 'as shown') continue
      const regex = new RegExp(`\\b${colKey}\\b`, 'i')
      if (regex.test(titleLower)) {
        const formatted = colKey
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
        return [formatted]
      }
    }
    return ['As Shown in Picture']
  }, [rawColors, name])

  const allImages: string[] = useMemo(
    () => [img, ...(additionalImages || [])].filter((i): i is string => Boolean(i && i.trim())),
    [img, additionalImages]
  )
  const [selectedImage, setSelectedImage] = useState<string>(allImages[0] || '')
  const [selectedSize, setSelectedSize] = useState(sizes[0] || 'Standard')
  const [selectedColor, setSelectedColor] = useState(availableColors[0] || 'Default')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [showSizeChartModal, setShowSizeChartModal] = useState(false)

  const activeVariant = useMemo(() => {
    if (!variants || variants.length === 0) return null
    const matched = variants.find((v) => {
      const matchSize = selectedSize ? v.size === selectedSize : true
      const matchColor =
        selectedColor && selectedColor !== 'As Shown in Picture' && selectedColor !== 'Default'
          ? v.color?.toLowerCase() === selectedColor.toLowerCase()
          : true
      return matchSize && matchColor
    })
    return (
      matched ||
      variants.find((v) =>
        selectedColor && selectedColor !== 'As Shown in Picture' && selectedColor !== 'Default'
          ? v.color?.toLowerCase() === selectedColor.toLowerCase()
          : true
      ) ||
      variants[0]
    )
  }, [variants, selectedSize, selectedColor])

  const activePrice = activeVariant?.price ?? price
  const activeOriginalPrice = activeVariant?.compareAtPrice ?? originalPrice ?? activePrice
  const discountPercent =
    activeOriginalPrice > activePrice
      ? Math.round(((activeOriginalPrice - activePrice) / activeOriginalPrice) * 100)
      : 0

  const [dbReviews, setDbReviews] = useState<ReviewItem[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  const [showReviewForm, setShowReviewForm] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewerName, setReviewerName] = useState('')
  const [reviewerEmail, setReviewerEmail] = useState('')
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReviewsLoading(true)

    fetchProductReviews(id)
      .then((apiReviews: ApiReview[]) => {
        if (!cancelled) {
          if (apiReviews && apiReviews.length > 0) {
            setDbReviews(
              apiReviews.map((r) => ({
                id: r.id,
                name: r.name,
                rating: r.rating,
                title: r.title || 'Verified Customer Review',
                comment: r.comment,
                date: new Date(r.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }),
                verified: r.verified,
                helpfulCount: r.helpfulCount || 0,
              }))
            )
          } else {
            setDbReviews([
              {
                id: 'init-1',
                name: 'Pooja Sharma',
                rating: 5,
                title: 'Exceeded all expectations!',
                comment: 'The stitching and fabric quality are breathtaking. The zari border looks so regal in person and the fit is true to size.',
                date: '2 days ago',
                verified: true,
                helpfulCount: 14,
              },
              {
                id: 'init-2',
                name: 'Ananya Verma',
                rating: 5,
                title: 'Perfect for wedding season',
                comment: 'Wore this for my cousin’s sangeet and received endless compliments. Delivered within 3 days in beautiful packaging.',
                date: '1 week ago',
                verified: true,
                helpfulCount: 8,
              },
            ])
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDbReviews([
            {
              id: 'init-1',
              name: 'Pooja Sharma',
              rating: 5,
              title: 'Exceeded all expectations!',
              comment: 'The stitching and fabric quality are breathtaking. The zari border looks so regal in person and the fit is true to size.',
              date: '2 days ago',
              verified: true,
              helpfulCount: 14,
            },
          ])
        }
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  // Reset selections only when the product itself changes
  useEffect(() => {
    const initialColor = availableColors[0] || 'Default'
    setSelectedSize(sizes[0] || 'Standard')
    setSelectedColor(initialColor)
    setQuantity(1)

    const matchingImg = colorImageMap[initialColor.trim()] || allImages[0] || ''
    setSelectedImage(matchingImg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName)

    if (variants && variants.length > 0) {
      const variantWithImg = variants.find(
        (v) => v.color?.toLowerCase() === colorName.toLowerCase() && v.imageUrl
      )
      if (variantWithImg?.imageUrl) {
        setSelectedImage(variantWithImg.imageUrl)
        return
      }
    }

    const directMatch = colorImageMap[colorName.trim()]
    if (directMatch) {
      setSelectedImage(directMatch)
      return
    }

    const colorIndex = availableColors.indexOf(colorName)
    if (colorIndex >= 0 && colorIndex < allImages.length) {
      const imgTarget = allImages[colorIndex]
      if (imgTarget) {
        setSelectedImage(imgTarget)
      }
    }
  }

  const isWished = isInWishlist(id)

  const averageRating = useMemo(() => {
    if (dbReviews.length === 0) return 4.9
    const total = dbReviews.reduce((sum, r) => sum + r.rating, 0)
    return Number((total / dbReviews.length).toFixed(1))
  }, [dbReviews])

  const relatedProducts = useMemo(
    () => relatedPool.filter((p) => String(p.id) !== String(id)),
    [relatedPool, id]
  )

  const handleAddToCart = () => {
    addToCart(
      {
        ...product,
        price: activePrice,
        originalPrice: activeOriginalPrice,
      },
      selectedSize,
      quantity,
      selectedColor
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewerName.trim() || !reviewComment.trim()) return

    setSubmittingReview(true)
    try {
      const created = await submitProductReview(id, {
        name: reviewerName.trim(),
        rating: newRating,
        title: reviewTitle.trim() || 'Verified Customer Review',
        comment: reviewComment.trim(),
      })

      const formatted: ReviewItem = {
        id: created.id,
        name: created.name,
        rating: created.rating,
        title: created.title || 'Verified Customer Review',
        comment: created.comment,
        date: 'Just now',
        verified: true,
        helpfulCount: 0,
      }

      setDbReviews([formatted, ...dbReviews])
      setReviewSuccess(true)
      setReviewerName('')
      setReviewerEmail('')
      setReviewTitle('')
      setReviewComment('')
      setNewRating(5)

      setTimeout(() => {
        setReviewSuccess(false)
        setShowReviewForm(false)
      }, 2500)
    } catch (err) {
      console.error(err)
      const fallbackRev: ReviewItem = {
        id: `local-${Date.now()}`,
        name: reviewerName.trim(),
        rating: newRating,
        title: reviewTitle.trim() || 'Verified Customer Review',
        comment: reviewComment.trim(),
        date: 'Just now',
        verified: true,
        helpfulCount: 0,
      }
      setDbReviews([fallbackRev, ...dbReviews])
      setReviewSuccess(true)
      setTimeout(() => {
        setReviewSuccess(false)
        setShowReviewForm(false)
      }, 2500)
    } finally {
      setSubmittingReview(false)
    }
  }

  const whatsappUrl = `https://wa.me/${STORE_INFO.phoneRaw}?text=${encodeURIComponent(
    `Hello Anju Clothings! I would like to order:\n\n*Product:* ${name}\n*Size:* ${selectedSize}\n*Color:* ${selectedColor}\n*Quantity:* ${quantity}\n*Price:* Rs. ${(
      activePrice * quantity
    ).toLocaleString('en-IN')}.00\n\nPlease confirm availability and payment options.`
  )}`

  const handleBuyNow = () => {
    addToCart(product, selectedSize, quantity, selectedColor)
    openCart()
  }

  // ---- Magnifier (desktop in-place image zoom on hover) ----
  const imageWrapRef = useRef<HTMLDivElement>(null)
  const [zoomActive, setZoomActive] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = imageWrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoomPos({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) })
  }

  const craftStory = useMemo(() => getCraftStory(fabric, work), [fabric, work])

  // ---- Mobile-only state: swipeable gallery, craft toggle, accordion ----
  const galleryRef = useRef<HTMLDivElement>(null)
  const programmaticScrollRef = useRef(false)
  const skipSyncRef = useRef(false)
  const lockTimerRef = useRef<number | undefined>(undefined)
  const [activeSlide, setActiveSlide] = useState(0)
  const [craftOpen, setCraftOpen] = useState(false)
  const [mobileOpenKeys, setMobileOpenKeys] = useState<string[]>([])

  // One slide per unique image: gallery images plus any colour/variant images.
  const galleryImages: string[] = useMemo(() => {
    const extra = [
      ...Object.values(colorImageMap || {}),
      ...(variants || []).map((v) => v.imageUrl),
    ]
    const all = [...allImages, ...extra].filter((i): i is string => Boolean(i && i.trim()))
    return Array.from(new Set(all))
  }, [allImages, colorImageMap, variants])

  // Selecting a colour (or any selectedImage change) jumps the carousel to that slide.
  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false
      return
    }
    const el = galleryRef.current
    if (!el || el.clientWidth === 0) return
    const idx = galleryImages.indexOf(selectedImage)
    if (idx < 0) return
    setActiveSlide(idx)
    const target = idx * el.clientWidth
    if (Math.abs(el.scrollLeft - target) < 2) return
    programmaticScrollRef.current = true
    el.scrollTo({ left: target, behavior: 'smooth' })
    window.clearTimeout(lockTimerRef.current)
    lockTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false
    }, 600)
  }, [selectedImage, galleryImages])

  useEffect(() => () => window.clearTimeout(lockTimerRef.current), [])

  // Swiping updates the active slide and selectedImage.
  const handleGalleryScroll = () => {
    const el = galleryRef.current
    if (!el || el.clientWidth === 0 || programmaticScrollRef.current) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx === activeSlide) return
    setActiveSlide(idx)
    const nextImg = galleryImages[idx]
    if (nextImg && nextImg !== selectedImage) {
      skipSyncRef.current = true
      setSelectedImage(nextImg)
    }
  }

  const [openDropdownId, setOpenDropdownId] = useState<string | null>('description')
  const toggleDropdown = (dropdownId: string) =>
    setOpenDropdownId((prev) => (prev === dropdownId ? null : dropdownId))

  const openReviewsDropdown = () => {
    setOpenDropdownId('reviews')
    window.setTimeout(() => {
      document.getElementById('dropdown-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  const detailDropdownItems: DropdownTabItem[] = [
    {
      id: 'description',
      title: 'DESCRIPTION',
      content: (
        <div className="space-y-4">
          <p className="whitespace-pre-line text-charcoal/85 leading-relaxed">
            {description ||
              'Elevate your ethnic wardrobe with this handcrafted artisanal designer piece. Designed for premium comfort and timeless elegance.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs border-t border-border/40">
            {fabric && (
              <p>
                <strong className="text-charcoal font-semibold">Fabric:</strong> {fabric}
              </p>
            )}
            {work && (
              <p>
                <strong className="text-charcoal font-semibold">Work / Detailing:</strong> {work}
              </p>
            )}
            <p>
              <strong className="text-charcoal font-semibold">Inside Margin:</strong> 2-inch alteration margin included
            </p>
            <p>
              <strong className="text-charcoal font-semibold">Occasion:</strong> Festive, Weddings, Parties
            </p>
            <p>
              <strong className="text-charcoal font-semibold">Care:</strong> Professional Dry Clean Only
            </p>
          </div>

          <div className="pt-3 border-t border-border/40 space-y-2">
            <p className="font-bold text-xs uppercase tracking-wider text-charcoal">Delivery Timelines</p>
            <div className="space-y-1.5 p-3 bg-[#FAF7F2] rounded-xs border border-[#ebd5be] text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-[#3e502a]">Prepaid Orders:</span>
                <span className="text-charcoal">4–5 days after dispatch · Free Express Shipping</span>
              </div>
              <div className="flex items-center justify-between font-semibold border-t border-[#ebd5be]/60 pt-1.5">
                <span className="text-[#8c2a2a]">Cash on Delivery (COD):</span>
                <span className="text-charcoal">6–7 days after dispatch</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowSizeChartModal(true)}
              className="w-full py-2.5 px-4 bg-[#FAF7F2] hover:bg-[#ebd5be]/40 border border-[#ebd5be] rounded-xs text-charcoal font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <span>📏</span>
              <span>Open Interactive Size Chart & Measuring Guide</span>
            </button>
          </div>

          <div className="pt-3 border-t border-border/40 text-xs space-y-1 text-muted">
            <p className="font-semibold text-charcoal">Returns & Exchange Policy:</p>
            <p>We do not offer refunds. Exchange is available for wrong product, damaged / defective items with unboxing video, or size exchange.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'cod-policy',
      title: 'COD POLICY',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-charcoal">
          <p className="font-semibold text-[#3e502a]">
            Cash on Delivery is available across eligible Indian PIN codes.
          </p>
          <div className="p-3.5 bg-[#FAF7F2] rounded-xs border border-[#ebd5be] space-y-2 text-stone-700">
            <p>
              A <strong className="text-charcoal font-bold">₹200 COD shipping charge</strong> is applicable in addition to the outfit price.
            </p>
            <p>
              This <strong className="text-charcoal font-bold">₹200 charge must be paid in advance</strong> to confirm and dispatch your COD order.
            </p>
            <p>
              The <strong className="text-charcoal font-bold">remaining outfit amount</strong> can be paid at the time of delivery at your doorstep.
            </p>
          </div>
          <ul className="list-disc list-inside space-y-1 text-muted text-[11px] pt-1">
            <li>COD orders are verified and dispatched via Blue Dart / Delhivery express couriers.</li>
            <li>Cash or UPI on delivery is accepted at your doorstep by the courier agent.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'contact-us',
      title: 'CONTACT US',
      content: (
        <div className="space-y-3 text-xs text-charcoal">
          <p className="leading-relaxed">
            Have questions about sizing, customization, or urgent orders? Our styling and customer support team is here to assist you!
          </p>
          <div className="space-y-2 p-3 bg-[#FAF7F2] rounded-xs border border-[#ebd5be] text-xs">
            <p className="flex items-center gap-2">
              <strong className="text-charcoal font-bold">WhatsApp & Helpline:</strong>{' '}
              <a
                href={STORE_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#3e502a] font-bold hover:underline"
              >
                {STORE_INFO.phone}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <strong className="text-charcoal font-bold">Email:</strong>{' '}
              <a href={`mailto:${STORE_INFO.email}`} className="text-[#3e502a] font-bold hover:underline">
                {STORE_INFO.email}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <strong className="text-charcoal font-bold">Operating Hours:</strong>{' '}
              <span>{STORE_INFO.hours}</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'reviews',
      title: 'REVIEWS',
      content: (
        <div id="product-reviews-section" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <StarRating rating={averageRating} />
              <span className="font-bold text-charcoal text-sm">{averageRating} / 5.0</span>
              <span className="text-muted text-xs">({dbReviews.length} {dbReviews.length === 1 ? 'review' : 'ratings'})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer rounded-xs"
            >
              <span>{showReviewForm ? '✕ Close Form' : '★ Write a Review'}</span>
            </button>
          </div>

          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="bg-[#FAF7F2] border border-[#769055]/30 p-4 sm:p-5 rounded-xs space-y-4">
              <h4 className="text-sm font-bold text-charcoal uppercase tracking-wider">Write Your Review</h4>

              {reviewSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-xs">
                  ✓ Thank you! Your review has been submitted and published.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1.5">Rating *</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setNewRating(star)}
                      className="text-xl transition-transform hover:scale-125 cursor-pointer text-[#c9973a]"
                      aria-label={`Rate ${star} star`}
                    >
                      {(hoverRating || newRating) >= star ? '★' : '☆'}
                    </button>
                  ))}
                  <span className="text-xs text-muted font-medium ml-2">
                    {newRating === 5
                      ? '5/5 - Outstanding'
                      : newRating === 4
                        ? '4/5 - Very Good'
                        : newRating === 3
                          ? '3/5 - Average'
                          : newRating === 2
                            ? '2/5 - Below Average'
                            : '1/5 - Disappointed'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Meera Patel"
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-xs text-charcoal focus:border-[#769055] focus:outline-none rounded-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1">Email Address</label>
                  <input
                    type="email"
                    value={reviewerEmail}
                    onChange={(e) => setReviewerEmail(e.target.value)}
                    placeholder="meera@example.com"
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-xs text-charcoal focus:border-[#769055] focus:outline-none rounded-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1">Review Title</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Gorgeous festive wear, loved the flair!"
                  className="w-full px-3 py-2 bg-white border border-gray-300 text-xs text-charcoal focus:border-[#769055] focus:outline-none rounded-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1">Your Detailed Review *</label>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details about the fabric, stitching, color accuracy, and overall experience..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 text-xs text-charcoal focus:border-[#769055] focus:outline-none rounded-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-6 py-2.5 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:opacity-50 rounded-xs"
                >
                  {submittingReview ? 'Submitting…' : 'Submit Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2.5 border border-gray-300 text-charcoal hover:bg-gray-100 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer rounded-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {reviewsLoading ? (
            <p className="text-xs text-muted py-2">Loading customer reviews…</p>
          ) : dbReviews.length > 0 ? (
            <div className="space-y-4 pt-1">
              {dbReviews.map((rev) => (
                <div key={rev.id} className="border-t border-border/40 pt-3 space-y-1.5 text-xs text-left">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-charcoal">{rev.name}</span>
                      {rev.verified && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <span className="text-muted text-[11px]">{rev.date}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <StarRating rating={rev.rating} />
                    {rev.title && <span className="font-semibold text-charcoal ml-1">{rev.title}</span>}
                  </div>

                  <p className="text-charcoal/85 leading-relaxed">{rev.comment}</p>

                  <div className="flex items-center gap-3 text-[11px] text-muted pt-0.5">
                    <span>Helpful?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDbReviews(
                          dbReviews.map((r) =>
                            r.id === rev.id ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
                          )
                        )
                      }}
                      className="text-[#769055] hover:underline font-semibold cursor-pointer"
                    >
                      👍 ({rev.helpfulCount})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted py-2">No reviews yet for this product. Be the first to share your thoughts!</p>
          )}
        </div>
      ),
    },
  ]

  const hasMultipleColors = availableColors.length > 1

  return (
    <div className="min-h-screen pb-16 lg:pb-10 pt-0 lg:pt-10 bg-ivory">
      {/* ================================================================ */}
      {/* MOBILE LAYOUT (below lg)                                          */}
      {/* ================================================================ */}
      <div className="lg:hidden px-3 sm:px-4 py-3 space-y-3.5 pb-2">
        {/* 1. Breadcrumb Card */}
        <nav
          className="bg-white px-3.5 py-2.5 text-[11px] text-muted flex items-center gap-1.5 overflow-x-auto whitespace-nowrap border border-border/70 rounded-md shadow-2xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Breadcrumb"
        >
          <button onClick={() => navigateTo('home')} className="shrink-0 hover:text-olive transition-colors cursor-pointer">
            Home
          </button>
          <span className="shrink-0 text-border">/</span>
          <button
            onClick={() => navigateTo('all-products', undefined, categorySlug)}
            className="shrink-0 hover:text-olive transition-colors cursor-pointer"
          >
            {category || 'All Products'}
          </button>
          <span className="shrink-0 text-border">/</span>
          <span className="text-charcoal font-semibold truncate max-w-[180px]">{name}</span>
        </nav>

        {/* 2. Full Gallery Card */}
        <div className="relative bg-[#FAF7F2] border border-border/70 rounded-md overflow-hidden shadow-xs">
          <div
            ref={galleryRef}
            onScroll={handleGalleryScroll}
            className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {(galleryImages.length > 0 ? galleryImages : ['']).map((image, index) => (
              <div key={`${image}-${index}`} className="w-full basis-full shrink-0 snap-center snap-always">
                <ImagePlaceholder src={image} alt={`${name} - image ${index + 1}`} aspectRatio="4/5" label={name} />
              </div>
            ))}
          </div>

          {/* Badges (top-left) */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            {(tag || discount || discountPercent > 0) && (
              <span className="text-[11px] font-bold px-2.5 py-1 text-white bg-black/90 uppercase tracking-wider rounded-xs shadow-sm">
                {tag || discount || `${discountPercent}% OFF`}
              </span>
            )}
            {sold && (
              <span className="text-[11px] font-semibold px-2 py-0.5 text-charcoal bg-white/95 border border-border/60 rounded-xs shadow-2xs">
                🔥 {sold}
              </span>
            )}
          </div>

          {/* Wishlist heart (top-right) */}
          <button
            type="button"
            onClick={() => toggleWishlist(product)}
            aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWished}
            className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/95 backdrop-blur-xs border border-border/80 shadow-xs flex items-center justify-center cursor-pointer transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#769055]"
          >
            <HeartIcon className={`w-5 h-5 ${isWished ? 'text-red-500' : 'text-charcoal'}`} filled={isWished} />
          </button>

          {/* Counter pill (bottom-left) */}
          {galleryImages.length > 1 && (
            <span className="absolute bottom-3 left-3 z-10 text-[10px] font-bold tracking-wider text-white bg-black/75 backdrop-blur-xs px-2.5 py-1 rounded-full pointer-events-none">
              {Math.min(activeSlide + 1, galleryImages.length)} / {galleryImages.length}
            </span>
          )}
        </div>

        {/* 3. Product Info Card */}
        <div className="bg-white p-4 space-y-3.5 border border-border/70 rounded-md shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#c9973a] truncate">
                {category || 'Anju Clothing'}
              </span>
              {sku && (
                <span className="text-[10px] font-mono font-semibold text-stone-600 bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#ebd5be] shrink-0">
                  SKU: {sku}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-xs shrink-0">
              ✓ In Stock
            </span>
          </div>

          <h1 className="text-lg font-bold text-charcoal leading-snug tracking-tight line-clamp-2 break-words">
            {name}
          </h1>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openReviewsDropdown}
              aria-label={`${averageRating} out of 5 from ${dbReviews.length} reviews. View reviews`}
              className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#769055]"
            >
              <span>★ {averageRating}</span>
              <span className="w-px h-3 bg-emerald-300" />
              <span className="font-semibold text-emerald-800">
                {dbReviews.length} {dbReviews.length === 1 ? 'review' : 'reviews'}
              </span>
            </button>
            <span className="text-[11px] text-muted">100% Verified Quality</span>
          </div>

          {/* Price Card */}
          <div className="bg-[#FAF7F2] p-3 border border-border/70 rounded-xs flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-2xl font-bold tracking-tight text-[#2c2420]">
                  Rs. {activePrice.toLocaleString('en-IN')}.00
                </span>
                {activeOriginalPrice > activePrice && (
                  <>
                    <span className="text-xs text-muted line-through">
                      Rs. {activeOriginalPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-green-700 font-bold bg-green-50 px-1.5 py-0.5 border border-green-200 rounded-xs">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">Inclusive of all taxes · Free Shipping</p>
            </div>
          </div>
        </div>

        {/* 4. Options & Selection Card */}
        <div className="bg-white p-4 space-y-4 border border-border/70 rounded-md shadow-xs">
          {/* Colour */}
          {hasMultipleColors ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                Colour: <span className="text-[#769055] font-semibold normal-case ml-1">{selectedColor}</span>
              </label>
              <div
                className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="radiogroup"
                aria-label="Select colour"
              >
                {availableColors.map((colorName, idx) => {
                  const isSelected = selectedColor === colorName
                  return (
                    <button
                      key={idx}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={colorName}
                      onClick={() => handleColorSelect(colorName)}
                      className={`shrink-0 flex items-center gap-2 px-2.5 py-1.5 border rounded-xs text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#769055] bg-white ring-2 ring-[#769055]/40 text-charcoal shadow-2xs font-bold'
                          : 'border-border/80 bg-[#FAF7F2] text-charcoal hover:border-gray-400'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: resolveColorHex(colorName) }}
                      />
                      <span>{colorName}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-charcoal">
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                style={{ backgroundColor: resolveColorHex(selectedColor) }}
              />
              <span>Colour:</span>
              <span className="text-[#769055] font-semibold normal-case truncate">{selectedColor}</span>
            </div>
          )}

          {/* Size */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal">
                Size: <span className="text-[#769055] font-semibold normal-case ml-1">{selectedSize}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowSizeChartModal(true)}
                className="text-xs text-[#769055] underline font-medium cursor-pointer"
              >
                Size Guide
              </button>
            </div>
            <div
              className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="radiogroup"
              aria-label="Select size"
            >
              {sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={selectedSize === size}
                  onClick={() => setSelectedSize(size)}
                  className={`shrink-0 min-w-11 h-10 px-3.5 rounded-xs text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#769055] ${
                    selectedSize === size
                      ? 'border-[#769055] bg-[#769055] text-white shadow-2xs'
                      : 'border-border/80 text-charcoal bg-[#FAF7F2] hover:border-gray-400'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal">Quantity</span>
            <div className="flex items-center border border-border/80 bg-white rounded-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-9 text-base font-bold text-charcoal hover:bg-gray-100 cursor-pointer focus-visible:outline-none"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="w-8 text-center text-xs font-bold text-charcoal" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-9 text-base font-bold text-charcoal hover:bg-gray-100 cursor-pointer focus-visible:outline-none"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Delivery strip */}
          <div className="flex items-start gap-3 border border-border/80 bg-[#FAF7F2] p-3 rounded-xs">
            <svg
              className="w-5 h-5 shrink-0 text-[#769055] mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
              <circle cx="7" cy="17.5" r="1.7" />
              <circle cx="17" cy="17.5" r="1.7" />
            </svg>
            <ul className="text-xs text-charcoal space-y-0.5 min-w-0">
              <li className="font-semibold text-charcoal">Free shipping across India</li>
              <li className="text-muted text-[11px]">Dispatched within 24-48 hrs · COD Available</li>
            </ul>
          </div>

          {/* CTAs */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleBuyNow}
              className="w-full min-h-12 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-widest rounded-xs transition-colors shadow-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              Buy Now
            </button>
          </div>
        </div>

        {/* 5. Accordion Card (DESCRIPTION, COD POLICY, CONTACT US, REVIEWS) */}
        <div>
          <ProductDetailDropdowns items={detailDropdownItems} openId={openDropdownId} onToggle={toggleDropdown} />
        </div>

        {/* 7. You May Also Love Section (Auto-Moving Carousel) */}
        {relatedProducts.length > 0 && (
          <div className="pt-3 pb-1">
            <div className="mb-2 px-1">
              <p className="text-[#c9973a] text-[10px] uppercase tracking-[0.25em] font-bold">Complete The Look</p>
              <h2 className="text-base font-bold tracking-tight text-charcoal">You May Also Love</h2>
            </div>
            <RecommendationCarousel products={relatedProducts} />
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* DESKTOP LAYOUT (lg and above) — unchanged                         */}
      {/* ================================================================ */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14">
          {/* Breadcrumbs */}
          <nav className="text-xs text-muted flex items-center gap-2 overflow-x-auto whitespace-nowrap" aria-label="Breadcrumb">
            <button onClick={() => navigateTo('home')} className="hover:text-olive transition-colors cursor-pointer shrink-0">
              Home
            </button>
            <span className="shrink-0">/</span>
            <button
              onClick={() => navigateTo('all-products', undefined, categorySlug)}
              className="hover:text-olive transition-colors cursor-pointer shrink-0"
            >
              {category || 'All Products'}
            </button>
            <span className="shrink-0">/</span>
            <span className="text-charcoal font-semibold truncate">{name}</span>
          </nav>

          {/* Main Product Container */}
          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 bg-white p-3.5 sm:p-8 lg:p-10 border border-border/80 shadow-xs items-start">
            {/* Images & Brand Assurance Column (Synchronous Scrolling with Description) */}
            <div className="lg:col-span-6 min-w-0 flex flex-col gap-5 sm:gap-6">
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
                {allImages.length > 1 && (
                  <div className="flex sm:flex-col gap-2.5 sm:gap-3 shrink-0 overflow-x-auto sm:overflow-y-auto max-h-none sm:max-h-[520px] pb-1 sm:pb-0">
                    {allImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(image)}
                        className={`w-14 h-18 sm:w-20 sm:h-24 shrink-0 overflow-hidden border-2 transition-all cursor-pointer ${
                          selectedImage === image ? 'border-[#769055] shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <ImagePlaceholder src={image} alt={`Thumbnail ${index + 1}`} aspectRatio="4/5" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main image with in-place zoom (always clipped inside its own box) */}
                <div
                  ref={imageWrapRef}
                  className="flex-1 min-w-0 relative overflow-hidden group bg-[#FAF7F2] rounded-xs lg:cursor-zoom-in"
                  onMouseEnter={() => setZoomActive(true)}
                  onMouseLeave={() => setZoomActive(false)}
                  onMouseMove={handleImageMouseMove}
                >
                  <ImagePlaceholder src={selectedImage} alt={name} aspectRatio="4/5" label={name} />

                  {/* Zoom layer: desktop only, clipped by the parent's overflow-hidden */}
                  {zoomActive && selectedImage && (
                    <div
                      className="hidden lg:block absolute inset-0 z-[5] pointer-events-none bg-no-repeat bg-[#FAF7F2]"
                      style={{
                        backgroundImage: `url(${selectedImage})`,
                        backgroundSize: '250%',
                        backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                      }}
                    />
                  )}

                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-1.5 z-10">
                    {(tag || discount || discountPercent > 0) && (
                      <span className="text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 text-white bg-black/90 uppercase shadow-sm">
                        {tag || discount || `${discountPercent}% OFF`}
                      </span>
                    )}
                    {sold && (
                      <span className="text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 text-charcoal bg-white/90 backdrop-blur-xs shadow-xs">
                        🔥 {sold}
                      </span>
                    )}
                  </div>

                  {/* Zoom hint, desktop only */}
                  <span className="hidden lg:flex absolute bottom-3 right-3 z-10 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-charcoal bg-white/85 backdrop-blur-xs px-2 py-1 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    🔍 Hover to zoom
                  </span>
                </div>
              </div>

              {/* Luxury Guarantees & Brand Assurances (fills blank space below image) */}
              <div className="bg-[#FAF9F6] border border-[#E8D5C0]/90 rounded-xs p-4 sm:p-5 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-[#E8D5C0]/60 pb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c9973a]">
                    The Anju Promise
                  </span>
                  <span className="text-[10px] text-muted uppercase font-medium">Handcrafted with care</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-0.5">
                  <div className="flex items-start gap-2.5">
                    <span className="text-base shrink-0">✨</span>
                    <div>
                      <h4 className="text-xs font-bold text-charcoal">100% Authentic</h4>
                      <p className="text-[11px] text-muted leading-tight mt-0.5">Handpicked premium fabric & artisan craftsmanship</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-base shrink-0">✂️</span>
                    <div>
                      <h4 className="text-xs font-bold text-charcoal">2" Extra Margin</h4>
                      <p className="text-[11px] text-muted leading-tight mt-0.5">Tailored with internal seam margins for easy alteration</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-base shrink-0">🛡️</span>
                    <div>
                      <h4 className="text-xs font-bold text-charcoal">Quality Assured</h4>
                      <p className="text-[11px] text-muted leading-tight mt-0.5">Multi-point quality checks before dispatch</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Details & Selection Section */}
            <div className="lg:col-span-6 min-w-0 flex flex-col space-y-5 sm:space-y-6 text-left">
              <div className="space-y-3.5 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#c9973a]">
                      {category || 'Anju Clothing'}
                    </span>
                    {sku && (
                      <span className="text-[11px] font-mono font-semibold text-stone-600 bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#ebd5be]">
                        SKU: {sku}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleWishlist(product)}
                    className="flex items-center gap-1.5 text-xs text-charcoal hover:text-red-500 transition-colors p-1 cursor-pointer"
                  >
                    <HeartIcon
                      className={`w-5 h-5 ${isWished ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
                      filled={isWished}
                    />
                    <span className="font-semibold hidden sm:inline">{isWished ? 'Saved' : 'Wishlist'}</span>
                  </button>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-charcoal leading-snug tracking-tight">
                  {name}
                </h1>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <StarRating rating={averageRating} />
                  <span className="text-xs font-bold text-charcoal">{averageRating} / 5.0</span>
                  <button
                    onClick={() => {
                      const el = document.getElementById('product-accordion')
                      el?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="text-xs text-[#769055] underline font-medium hover:text-[#5e7343] cursor-pointer"
                  >
                    ({dbReviews.length} {dbReviews.length === 1 ? 'review' : 'customer reviews'})
                  </button>
                </div>

                {/* Price Row */}
                <div className="flex items-baseline justify-between py-2 border-y border-border/60 flex-wrap gap-y-1">
                  <div className="flex items-baseline gap-2.5 sm:gap-3 flex-wrap">
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#2c2420]">
                      Rs. {activePrice.toLocaleString('en-IN')}.00
                    </span>
                    {activeOriginalPrice > activePrice && (
                      <>
                        <span className="text-sm sm:text-base text-muted line-through">
                          Rs. {activeOriginalPrice.toLocaleString('en-IN')}.00
                        </span>
                        <span className="text-xs text-green-700 font-bold bg-green-50 px-2 py-0.5 border border-green-200">
                          {discountPercent}% OFF
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-emerald-700">In Stock</span>
                </div>
                <p className="text-[11px] text-muted -mt-2">Tax included. Free shipping across India.</p>

                {/* Color Selection */}
                <div className="pt-2 border-t border-border/40 space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-charcoal">
                      Colour: <span className="text-[#769055] font-semibold normal-case ml-1">{selectedColor}</span>
                    </label>
                    <span className="text-[11px] text-muted font-medium hidden sm:inline">Tap a shade to view the dress</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    {availableColors.map((colorName, idx) => {
                      const hex = resolveColorHex(colorName)
                      const isSelected = selectedColor === colorName

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleColorSelect(colorName)}
                          className={`inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-xs text-xs font-medium transition-all cursor-pointer ${isSelected
                            ? 'border-[#769055] bg-white ring-2 ring-[#769055]/40 text-charcoal shadow-xs font-bold scale-102'
                            : 'border-gray-200 bg-[#FAF7F2] text-charcoal hover:border-gray-400'
                            }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-black/15 shadow-2xs shrink-0"
                            style={{ backgroundColor: hex }}
                          />
                          <span>{colorName}</span>
                          {isSelected && <span className="text-[#769055] text-xs font-bold">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Size Selection */}
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-charcoal">
                      Size: <span className="text-[#769055] font-semibold normal-case ml-1">{selectedSize}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSizeChartModal(true)}
                      className="text-xs text-[#769055] underline font-medium cursor-pointer"
                    >
                      Size Guide
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-11 py-2 px-3 text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${selectedSize === size
                          ? 'border-[#769055] bg-[#769055] text-white shadow-xs'
                          : 'border-gray-200 text-charcoal hover:border-[#769055] bg-white'
                          }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity & CTA */}
                <div className="hidden lg:block pt-4 space-y-3 border-t border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-300 bg-white shrink-0">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3.5 py-2.5 text-sm hover:bg-gray-100 font-bold cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="px-3.5 py-2.5 text-xs font-bold text-charcoal min-w-8 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-3.5 py-2.5 text-sm hover:bg-gray-100 font-bold cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={handleAddToCart}
                      className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-white transition-all shadow-sm cursor-pointer ${added ? 'bg-[#c9973a]' : 'bg-[#769055] hover:bg-[#5e7343]'
                        }`}
                    >
                      {added ? '✓ Added' : 'Add To Cart'}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleWishlist(id)}
                      className="p-3 border border-gray-300 bg-white hover:border-gray-400 text-charcoal hover:text-red-500 transition-colors cursor-pointer shrink-0"
                      aria-label="Add to wishlist"
                    >
                      <HeartIcon
                        className={`w-5 h-5 ${isWished ? 'text-red-500 fill-red-500' : 'text-gray-500'}`}
                        filled={isWished}
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="w-full py-3.5 bg-black hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold uppercase tracking-widest transition-all shadow-md cursor-pointer"
                  >
                    Buy Now
                  </button>

                  <div className="bg-[#FAF7F2] p-2.5 text-xs text-charcoal flex items-center justify-between border border-border/50">
                    <span>🚚 Free Shipping across India</span>
                    <span className="text-muted">Dispatched in 24-48 Hours</span>
                  </div>
                </div>

                <div id="product-accordion" className="pt-1">
                  <ProductDetailDropdowns items={detailDropdownItems} openId={openDropdownId} onToggle={toggleDropdown} />
                </div>
              </div>
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <section className="pt-6 sm:pt-8 border-t border-border/60">
              <div className="text-center mb-6 sm:mb-8">
                <p className="text-[#c9973a] text-xs uppercase tracking-[0.3em] font-semibold mb-1.5">Complete The Look</p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal">You May Also Love</h2>
                <p className="text-muted text-xs sm:text-sm mt-1">Handpicked complementary styles tailored for your celebrations</p>
              </div>
              <RecommendationCarousel products={relatedProducts} />
            </section>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* MOBILE STICKY BAR: Wishlist + Add to Cart                         */}
      {/* ================================================================ */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border/80 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-3 pt-2.5"
        style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => toggleWishlist(product)}
            aria-pressed={isWished}
            aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
            className="min-h-12 flex items-center justify-center gap-2 bg-white border border-gray-300 text-charcoal text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors hover:border-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#769055]"
          >
            <HeartIcon className={`w-5 h-5 ${isWished ? 'text-red-500' : 'text-charcoal'}`} filled={isWished} />
            <span>{isWished ? 'Wishlisted' : 'Wishlist'}</span>
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            className={`min-h-12 text-xs font-bold uppercase tracking-wider text-white transition-colors shadow-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#769055] ${added ? 'bg-[#c9973a]' : 'bg-[#769055] hover:bg-[#5e7343]'
              }`}
          >
            {added ? '✓ Added' : 'Add To Cart'}
          </button>
        </div>
      </div>

      {/* Size Chart Modal */}
      <SizeChartModal isOpen={showSizeChartModal} onClose={() => setShowSizeChartModal(false)} />
    </div>
  )
}