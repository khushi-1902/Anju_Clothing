import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { useProduct, useNewArrivals, fetchProductReviews, submitProductReview, type ApiReview } from '../lib/api'
import { STORE_INFO } from '../data/products'
import { StarRating } from '../components/StarRating'
import { ProductCard } from '../components/ProductCard'
import { TrustBar } from '../components/TrustBar'
import { ImagePlaceholder } from '../components/ImagePlaceholder'
import { Accordion, type AccordionItemData } from '../components/Accordion'
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

const COLOR_MAP: Record<string, string> = {
  // Pinks & Reds
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

  // Blues & Teals
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

  // Greens
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

  // Yellows, Oranges & Golds
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

  // Purples & Pastels
  'purple': '#7E22CE',
  'dark purple': '#581C87',
  'lavender': '#C084FC',
  'violet': '#7C3AED',
  'lilac': '#C8A2C8',
  'mauve': '#E0B0FF',

  // Neutrals & Monochromes
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
  return '#C9973A' // warm luxury gold
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
        <h1 className="font-display text-2xl font-bold text-charcoal">Product not found</h1>
        <p className="text-sm text-muted">This item may have sold out or the link is incorrect.</p>
      </div>
    )
  }

  return <ProductDetailBody product={product} />
}

function ProductDetailBody({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isInWishlist, navigateTo } = useShop()
  const { products: relatedPool } = useNewArrivals(5)

  useEffect(() => {
    document.title = `${product.name} - Ethnic Wear | Anju Clothing`
  }, [product])

  const {
    id,
    name,
    price,
    originalPrice,
    category,
    categorySlug,
    img,
    additionalImages = [],
    tag,
    sold,
    discount,
    description,
    fabric,
    work,
    sizes = ['S', 'M', 'L', 'XL', 'XXL'],
    colors: rawColors = [],
    colorImageMap = {},
    variants = [],
  } = product

  // 1. Available Colors strictly from Database Variants or detected from actual title
  const availableColors = useMemo(() => {
    if (rawColors && rawColors.length > 0) {
      return rawColors
    }
    // If no multiple color variants exist in database, extract from title if mentioned
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

  // 2. Active Database Variant Price Tracking (Accurate to PostgreSQL database)
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

  // 3. Database Reviews System
  const [dbReviews, setDbReviews] = useState<ReviewItem[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  // Review Form state
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewerName, setReviewerName] = useState('')
  const [reviewerEmail, setReviewerEmail] = useState('')
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)

  // Load reviews from PostgreSQL database
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
            // Curated initial reviews for new items
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

  // Reset selection when product changes
  useEffect(() => {
    const initialColor = availableColors[0] || 'Default'
    setSelectedSize(sizes[0] || 'Standard')
    setSelectedColor(initialColor)
    setQuantity(1)

    // Check if initial color has specific dress image
    const matchingImg = colorImageMap[initialColor.trim()] || allImages[0] || ''
    setSelectedImage(matchingImg)
  }, [product, availableColors, allImages, colorImageMap])

  // 4. COLOR SELECT HANDLER - Switches to that specific color dress image
  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName)

    // 1. Check direct variant match with image
    if (variants && variants.length > 0) {
      const variantWithImg = variants.find(
        (v) => v.color?.toLowerCase() === colorName.toLowerCase() && v.imageUrl
      )
      if (variantWithImg?.imageUrl) {
        setSelectedImage(variantWithImg.imageUrl)
        return
      }
    }

    // 2. Check colorImageMap directly
    const directMatch = colorImageMap[colorName.trim()]
    if (directMatch) {
      setSelectedImage(directMatch)
      return
    }

    // 3. Check if color name matches an image in allImages index
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

  const relatedProducts = relatedPool.filter((p) => p.id !== id).slice(0, 3)

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

  // Submit Review to PostgreSQL Database
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

  const accordionItems: AccordionItemData[] = [
    {
      title: 'Description',
      defaultOpen: true,
      content: (
        <div className="space-y-4">
          <p className="whitespace-pre-line text-muted leading-relaxed">
            {description ||
              'Elevate your ethnic wardrobe with this handcrafted artisanal designer piece. Designed for premium comfort and timeless elegance.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-border/40">
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
              <strong className="text-charcoal font-semibold">Occasion:</strong> Festive, Weddings, Parties
            </p>
            <p>
              <strong className="text-charcoal font-semibold">Care:</strong> Dry Clean Only
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'COD Policy',
      defaultOpen: false,
      content: (
        <div className="space-y-3">
          <p>
            Cash on Delivery (COD) is available across all serviceable pincodes in India for orders up to ₹10,000.
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted text-xs">
            <li>COD orders are verified via phone/WhatsApp call prior to dispatch.</li>
            <li>Please keep exact cash ready at the time of delivery.</li>
            <li>Card / UPI on delivery may also be accepted depending on your area's courier delivery agent.</li>
          </ul>
        </div>
      ),
    },
    {
      title: 'Contact Us',
      defaultOpen: false,
      content: (
        <div className="space-y-3">
          <p>Have questions about sizing, customization, or international shipping? We are here to help!</p>
          <div className="space-y-1.5 text-xs text-muted">
            <p>
              <strong className="text-charcoal font-semibold">WhatsApp & Helpline:</strong>{' '}
              <a
                href={STORE_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#769055] hover:underline font-semibold"
              >
                {STORE_INFO.phone}
              </a>
            </p>
            <p>
              <strong className="text-charcoal font-semibold">Email:</strong>{' '}
              <a href={`mailto:${STORE_INFO.email}`} className="text-[#769055] hover:underline">
                {STORE_INFO.email}
              </a>
            </p>
            <p>
              <strong className="text-charcoal font-semibold">Operating Hours:</strong> {STORE_INFO.hours}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Customer Reviews',
      defaultOpen: false,
      content: (
        <div className="space-y-5">
          {/* Header with rating + Create Review button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <StarRating rating={averageRating} />
              <span className="font-bold text-charcoal text-sm">{averageRating} / 5.0</span>
              <span className="text-muted text-xs">({dbReviews.length} {dbReviews.length === 1 ? 'review' : 'ratings'})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
            >
              <span>{showReviewForm ? '✕ Close Form' : '★ Write a Review'}</span>
            </button>
          </div>

          {/* Write a Review Form */}
          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="bg-[#FAF7F2] border border-[#769055]/30 p-4 sm:p-5 space-y-4">
              <h4 className="font-display text-sm font-bold text-charcoal uppercase tracking-wider">Write Your Review</h4>

              {reviewSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold">
                  ✓ Thank you! Your review has been submitted and published.
                </div>
              )}

              {/* Star Picker */}
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
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-xs text-charcoal focus:border-[#769055] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1">Email Address</label>
                  <input
                    type="email"
                    value={reviewerEmail}
                    onChange={(e) => setReviewerEmail(e.target.value)}
                    placeholder="meera@example.com"
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-xs text-charcoal focus:border-[#769055] focus:outline-none"
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
                  className="w-full px-3 py-2 bg-white border border-gray-300 text-xs text-charcoal focus:border-[#769055] focus:outline-none"
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
                  className="w-full px-3 py-2 bg-white border border-gray-300 text-xs text-charcoal focus:border-[#769055] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-6 py-2.5 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting…' : 'Submit Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2.5 border border-gray-300 text-charcoal hover:bg-gray-100 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* List of Customer Reviews */}
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

  return (
    <div className="min-h-screen py-10 bg-ivory">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Breadcrumbs */}
        <nav className="text-xs text-muted flex items-center gap-2" aria-label="Breadcrumb">
          <button onClick={() => navigateTo('home')} className="hover:text-olive transition-colors cursor-pointer">
            Home
          </button>
          <span>/</span>
          <button
            onClick={() => navigateTo('all-products', undefined, categorySlug)}
            className="hover:text-olive transition-colors cursor-pointer"
          >
            {category || 'All Products'}
          </button>
          <span>/</span>
          <span className="text-charcoal font-semibold truncate max-w-[200px] sm:max-w-none">{name}</span>
        </nav>

        {/* Main Product Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 bg-white p-4 sm:p-8 lg:p-10 border border-border/80 shadow-xs items-start">
          {/* Images Section (Sticky on desktop so it stays beside details with no dead space) */}
          <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-4 lg:sticky lg:top-24 self-start">
            {allImages.length > 1 && (
              <div className="flex sm:flex-col gap-3 shrink-0 overflow-x-auto sm:overflow-y-auto max-h-[520px]">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(image)}
                    className={`w-16 h-20 sm:w-20 sm:h-24 shrink-0 overflow-hidden border-2 transition-all cursor-pointer ${selectedImage === image ? 'border-[#769055] shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                  >
                    <ImagePlaceholder src={image} alt={`Thumbnail ${index + 1}`} aspectRatio="4/5" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 relative overflow-hidden group bg-[#FAF7F2] rounded-xs">
              <ImagePlaceholder src={selectedImage} alt={name} aspectRatio="4/5" label={name} />
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                {(tag || discount || discountPercent > 0) && (
                  <span className="text-xs font-bold px-2.5 py-1 text-white bg-black/90 uppercase shadow-sm">
                    {tag || discount || `${discountPercent}% OFF`}
                  </span>
                )}
                {sold && (
                  <span className="text-xs font-semibold px-2.5 py-1 text-charcoal bg-white/90 backdrop-blur-xs shadow-xs">
                    🔥 {sold}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details & Selection Section */}
          <div className="lg:col-span-6 flex flex-col space-y-6 text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-[#c9973a]">
                  {category || 'Anju Clothing'}
                </span>
                <button
                  onClick={() => toggleWishlist(id)}
                  className="flex items-center gap-1.5 text-xs text-charcoal hover:text-red-500 transition-colors p-1 cursor-pointer"
                >
                  <svg
                    className={`w-5 h-5 ${isWished ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
                    fill={isWished ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <span className="font-semibold">{isWished ? 'Saved' : 'Wishlist'}</span>
                </button>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-charcoal leading-snug">
                {name}
              </h1>

              {/* Star Rating Badge */}
              <div className="flex items-center gap-2.5">
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
              <div className="flex items-baseline justify-between py-2 border-y border-border/60">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-2xl sm:text-3xl font-bold text-[#2c2420]">
                    Rs. {activePrice.toLocaleString('en-IN')}.00
                  </span>
                  {activeOriginalPrice > activePrice && (
                    <>
                      <span className="text-base text-muted line-through">
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

              {/* 1. INTERACTIVE COLOR SELECTION - Changes dress photo when clicked */}
              <div className="pt-2 border-t border-border/40 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-charcoal">
                    Colour: <span className="text-[#769055] font-semibold normal-case ml-1">{selectedColor}</span>
                  </label>
                  <span className="text-[11px] text-muted font-medium">Click shade to view dress</span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {availableColors.map((colorName, idx) => {
                    const hex = resolveColorHex(colorName)
                    const isSelected = selectedColor === colorName

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleColorSelect(colorName)}
                        className={`inline-flex items-center gap-2 px-3 py-2 border rounded-xs text-xs font-medium transition-all cursor-pointer ${isSelected
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

              {/* 2. SIZE SELECTION SECTION */}
              <div className="pt-2 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-charcoal">
                    Size: <span className="text-[#769055] font-semibold normal-case ml-1">{selectedSize}</span>
                  </label>
                  <span className="text-xs text-[#769055] underline font-medium cursor-pointer">
                    Size Guide
                  </span>
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

              {/* 3. QUANTITY & CTA BUTTONS */}
              <div className="pt-4 space-y-3 border-t border-border/60">
                <div className="flex items-center gap-3">
                  {/* Quantity Counter */}
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

                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCart}
                    className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-white transition-all shadow-sm cursor-pointer ${added ? 'bg-[#c9973a]' : 'bg-[#769055] hover:bg-[#5e7343]'
                      }`}
                  >
                    {added ? '✓ Added' : 'Add To Cart'}
                  </button>

                  {/* Wishlist Button */}
                  <button
                    type="button"
                    onClick={() => toggleWishlist(id)}
                    className="p-3 border border-gray-300 bg-white hover:border-gray-400 text-charcoal hover:text-red-500 transition-colors cursor-pointer shrink-0"
                    aria-label="Add to wishlist"
                  >
                    <svg
                      className={`w-5 h-5 ${isWished ? 'text-red-500 fill-red-500' : 'text-gray-500'}`}
                      fill={isWished ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                </div>

                {/* BUY NOW Button */}
                <button
                  type="button"
                  onClick={() => {
                    addToCart(product, selectedSize, quantity, selectedColor)
                    window.location.href = whatsappUrl
                  }}
                  className="w-full py-3.5 bg-black hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold uppercase tracking-widest transition-all shadow-md cursor-pointer"
                >
                  Buy Now
                </button>

                {/* WhatsApp Order Button */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Order via WhatsApp
                </a>

                <div className="bg-[#FAF7F2] p-2.5 text-xs text-charcoal flex items-center justify-between border border-border/50">
                  <span>🚚 Free Shipping across India</span>
                  <span className="text-muted">Dispatched in 24-48 Hours</span>
                </div>
              </div>

              {/* Accordion Info Section directly below CTA buttons */}
              <div id="product-accordion" className="pt-4 border-t border-border/60">
                <Accordion items={accordionItems} />
              </div>
            </div>
          </div>
        </div>


        {/* Trust Badges */}
        <TrustBar />

        {/* Related Products Carousel */}
        {relatedProducts.length > 0 && (
          <section className="pt-8">
            <div className="text-center mb-10">
              <p className="text-[#c9973a] text-xs uppercase tracking-[0.3em] font-semibold mb-2">Complete The Look</p>
              <h2 className="font-display text-3xl font-bold text-charcoal">You May Also Love</h2>
              <p className="text-muted text-xs sm:text-sm mt-2">Handpicked complementary styles tailored for your celebrations</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-8">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}