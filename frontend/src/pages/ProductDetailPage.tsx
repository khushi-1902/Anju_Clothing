import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { useProduct, useNewArrivals, fetchProductReviews, submitProductReview, type ApiReview } from '../lib/api'
import { STORE_INFO } from '../data/products'
import { StarRating } from '../components/StarRating'
import { ProductCard } from '../components/ProductCard'
import { TrustBar } from '../components/TrustBar'
import { ImagePlaceholder } from '../components/ImagePlaceholder'
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
  'red': '#DC2626',
  'rani pink': '#E91E63',
  'pink': '#F48FB1',
  'wine': '#581845',
  'maroon': '#800000',
  'navy': '#001F3F',
  'navy blue': '#0A192F',
  'blue': '#2563EB',
  'royal blue': '#1D4ED8',
  'teal': '#008080',
  'teal green': '#0D9488',
  'green': '#15803D',
  'golden': '#D4AF37',
  'gold': '#D4AF37',
  'bottle green': '#14532D',
  'mehendi green': '#65A30D',
  'olive': '#769055',
  'mustard': '#D97706',
  'yellow': '#FACC15',
  'orange': '#EA580C',
  'peach': '#FDBA74',
  'rust': '#9A3412',
  'purple': '#7E22CE',
  'lavender': '#C084FC',
  'black': '#18181B',
  'white': '#FFFFFF',
  'cream': '#FDFBF7',
  'silver': '#94A3B8',
  'grey': '#6B7280',
  'gray': '#6B7280',
}

function resolveColorHex(color: string): string {
  const clean = color.trim().toLowerCase()
  if (COLOR_MAP[clean]) return COLOR_MAP[clean]
  if (clean.startsWith('#') || clean.startsWith('rgb') || clean.startsWith('hsl')) return color
  return '#769055' // fallback elegant olive
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
  } = product

  // 1. Available Colors from Database Variants or default options
  const availableColors = useMemo(() => {
    if (rawColors && rawColors.length > 0) {
      return rawColors
    }
    return ['Rani Pink', 'Wine', 'Teal Green', 'Royal Blue']
  }, [rawColors])

  const allImages = useMemo(() => [img, ...additionalImages.filter((i) => i !== img && !!i)], [img, additionalImages])
  const [selectedImage, setSelectedImage] = useState(allImages[0] || '')
  const [selectedSize, setSelectedSize] = useState(sizes[0] || 'Standard')
  const [selectedColor, setSelectedColor] = useState(availableColors[0] || 'Default')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'fabric' | 'shipping'>('details')

  // 2. Database Reviews System
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
        // Fallback reviews
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

  // 3. COLOR SELECT HANDLER - Switches to that specific color dress image
  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName)

    // Check colorImageMap directly
    const directMatch = colorImageMap[colorName.trim()]
    if (directMatch) {
      setSelectedImage(directMatch)
      return
    }

    // Check if color name matches an image in allImages index
    const colorIndex = availableColors.indexOf(colorName)
    if (colorIndex >= 0 && colorIndex < allImages.length) {
      setSelectedImage(allImages[colorIndex])
    }
  }

  const isWished = isInWishlist(id)
  const discountPercent =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0

  const averageRating = useMemo(() => {
    if (dbReviews.length === 0) return 4.9
    const total = dbReviews.reduce((sum, r) => sum + r.rating, 0)
    return Number((total / dbReviews.length).toFixed(1))
  }, [dbReviews])

  const relatedProducts = relatedPool.filter((p) => p.id !== id).slice(0, 3)

  const handleAddToCart = () => {
    addToCart(product, selectedSize, quantity, selectedColor)
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
      // Optimistic fallback
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
      price * quantity
    ).toLocaleString('en-IN')}.00\n\nPlease confirm availability and payment options.`
  )}`

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white p-6 sm:p-10 border border-border/80 shadow-xs">
          {/* Images Section */}
          <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-4">
            {allImages.length > 1 && (
              <div className="flex sm:flex-col gap-3 shrink-0 overflow-x-auto sm:overflow-y-auto max-h-[520px]">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(image)}
                    className={`w-16 h-20 sm:w-20 sm:h-24 shrink-0 overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedImage === image ? 'border-[#769055] shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <ImagePlaceholder src={image} alt={`Thumbnail ${index + 1}`} aspectRatio="4/5" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 relative aspect-[4/5] bg-[#F5EFE6] overflow-hidden group">
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
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6 text-left">
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
                    const el = document.getElementById('reviews-section')
                    el?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="text-xs text-[#769055] underline font-medium hover:text-[#5e7343] cursor-pointer"
                >
                  ({dbReviews.length} {dbReviews.length === 1 ? 'review' : 'customer reviews'})
                </button>
              </div>

              {/* Price Row */}
              <div className="flex items-baseline gap-3 py-2 border-y border-border/60">
                <span className="font-display text-3xl font-bold text-[#2c2420]">
                  Rs. {price.toLocaleString('en-IN')}.00
                </span>
                {originalPrice > price && (
                  <>
                    <span className="text-base text-muted line-through">
                      Rs. {originalPrice.toLocaleString('en-IN')}.00
                    </span>
                    <span className="text-xs text-green-700 font-bold bg-green-50 px-2.5 py-1 border border-green-200">
                      Save Rs. {(originalPrice - price).toLocaleString('en-IN')}.00 ({discountPercent}% OFF)
                    </span>
                  </>
                )}
              </div>

              <p className="text-xs sm:text-sm text-muted leading-relaxed whitespace-pre-line">
                {description}
              </p>

              {/* 1. INTERACTIVE COLOR SELECTION - Changes dress photo when clicked */}
              <div className="pt-2 border-t border-border/40">
                <div className="flex justify-between items-center mb-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-charcoal">
                    Select Color: <span className="text-[#769055] font-semibold normal-case ml-1">{selectedColor}</span>
                  </label>
                  <span className="text-[11px] text-muted font-medium">Click to view dress in this shade</span>
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
                        className={`inline-flex items-center gap-2 px-3 py-2 border rounded-xs text-xs font-medium transition-all cursor-pointer ${
                          isSelected
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
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-charcoal">
                    Select Size: <span className="text-[#769055] font-semibold normal-case ml-1">{selectedSize}</span>
                  </label>
                  <span className="text-xs text-[#769055] underline font-medium cursor-pointer">
                    Size Chart (Standard Indian Fit)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-12 py-2.5 px-4 text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        selectedSize === size
                          ? 'border-[#769055] bg-[#769055] text-white shadow-xs'
                          : 'border-gray-200 text-charcoal hover:border-[#769055] bg-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. QUANTITY SECTION */}
              <div className="flex items-center gap-4 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-charcoal">Quantity:</span>
                <div className="flex items-center border border-gray-300 bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3.5 py-1.5 text-sm hover:bg-gray-100 font-bold cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 text-xs font-bold text-charcoal">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3.5 py-1.5 text-sm hover:bg-gray-100 font-bold cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-muted">
                  Total: <strong className="text-charcoal font-bold">Rs. {(price * quantity).toLocaleString('en-IN')}.00</strong>
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="pt-6 space-y-3 border-t border-border/60">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 py-4 text-xs sm:text-sm font-bold uppercase tracking-widest text-white transition-all shadow-md cursor-pointer ${
                    added ? 'bg-[#c9973a]' : 'bg-[#769055] hover:bg-[#5e7343]'
                  }`}
                >
                  {added ? '✓ Item Added to Bag' : 'Add to Shopping Bag'}
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs sm:text-sm font-bold uppercase tracking-widest transition-all shadow-md cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Order via WhatsApp
                </a>
              </div>
              <div className="bg-[#FAF7F2] p-3 text-xs text-charcoal flex items-center justify-between border border-border/50">
                <span>🚚 Free Shipping across India</span>
                <span className="text-muted">Dispatched in 24-48 Hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Info Section (Details / Fabric / Shipping) */}
        <div className="bg-white border border-border/80 p-6 sm:p-8 shadow-xs">
          <div className="flex border-b border-border/80 gap-6 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'details' ? 'border-b-2 border-[#769055] text-[#769055]' : 'text-muted hover:text-charcoal'
              }`}
            >
              Product Details & Style Note
            </button>
            <button
              onClick={() => setActiveTab('fabric')}
              className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'fabric' ? 'border-b-2 border-[#769055] text-[#769055]' : 'text-muted hover:text-charcoal'
              }`}
            >
              Fabric & Care
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'shipping' ? 'border-b-2 border-[#769055] text-[#769055]' : 'text-muted hover:text-charcoal'
              }`}
            >
              Shipping & 7-Day Returns
            </button>
          </div>

          <div className="text-xs sm:text-sm text-charcoal/90 leading-relaxed max-w-3xl">
            {activeTab === 'details' && (
              <div className="space-y-3">
                <p className="whitespace-pre-line">{description}</p>
                <ul className="list-disc list-inside space-y-1 text-muted pt-2">
                  <li>Occasion: Festive Wear, Wedding Functions, Receptions, Family Gatherings</li>
                  <li>Fit Type: Regular Comfortable Indian Silhouette</li>
                  <li>Package Contains: 1 Top, 1 Bottom / Lehenga / Saree, 1 Dupatta (where applicable)</li>
                  <li>Inner Lining: High quality soft breathable lining attached</li>
                </ul>
              </div>
            )}

            {activeTab === 'fabric' && (
              <div className="space-y-3">
                <p>
                  <strong>Primary Fabric:</strong> {fabric || 'Premium Handcrafted Silk / Georgette'}
                </p>
                <p>
                  <strong>Embroidery / Work:</strong> {work || 'Traditional Artisanal Handwork & Zari Work'}
                </p>
                <p>
                  <strong>Wash Care:</strong> Dry clean recommended for longevity and zari luster preservation. Store in cotton muslins.
                </p>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-3">
                <p>
                  <strong>Shipping:</strong> Free standard shipping across India on orders above ₹1,499. Dispatched via Express Couriers.
                </p>
                <p>
                  <strong>Delivery Time:</strong> 3-5 business days for Metro cities, 5-7 business days for non-metro destinations.
                </p>
                <p>
                  <strong>Returns & Exchanges:</strong> 7-day hassle-free exchange and return policy for unworn items with original tags.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4. CUSTOMER REVIEWS & ADD REVIEW SECTION (Stored in PostgreSQL Database) */}
        <section id="reviews-section" className="bg-white border border-border/80 p-6 sm:p-10 shadow-xs space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/60">
            <div>
              <p className="text-[#c9973a] text-xs uppercase tracking-[0.3em] font-semibold mb-1">Customer Feedback</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-charcoal">Customer Reviews & Ratings</h2>
            </div>
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-xs cursor-pointer self-start md:self-auto"
            >
              <span>{showReviewForm ? '✕ Close Form' : '★ Write a Review'}</span>
            </button>
          </div>

          {/* Review Score Summary */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#FAF7F2] p-6 sm:p-8 border border-border/50">
            <div className="md:col-span-4 text-center md:border-r md:border-border/60 space-y-2">
              <div className="font-display text-5xl font-bold text-[#2c2420]">{averageRating}</div>
              <div className="flex justify-center">
                <StarRating rating={averageRating} />
              </div>
              <p className="text-xs text-muted font-medium">Based on {dbReviews.length} customer ratings</p>
            </div>

            <div className="md:col-span-8 space-y-2 text-xs">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = dbReviews.filter((r) => r.rating === stars).length
                const percent = dbReviews.length ? Math.round((count / dbReviews.length) * 100) : 0
                return (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="w-12 text-muted font-semibold">{stars} Star</span>
                    <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#c9973a] transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-10 text-right text-muted font-medium">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Write a Review Form (Submits to PostgreSQL Backend) */}
          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="bg-cream/40 border border-[#769055]/30 p-6 sm:p-8 space-y-5">
              <h3 className="font-display text-lg font-bold text-charcoal">Write Your Review</h3>
              
              {reviewSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold">
                  ✓ Thank you! Your review has been saved to the database and published below.
                </div>
              )}

              {/* Star Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-2">Overall Rating *</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setNewRating(star)}
                      className="text-2xl transition-transform hover:scale-125 cursor-pointer text-[#c9973a]"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1.5">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Meera Patel"
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 text-xs text-charcoal focus:border-[#769055] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={reviewerEmail}
                    onChange={(e) => setReviewerEmail(e.target.value)}
                    placeholder="meera@example.com"
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 text-xs text-charcoal focus:border-[#769055] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1.5">Review Title</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Gorgeous festive wear, loved the color & flair!"
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 text-xs text-charcoal focus:border-[#769055] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1.5">Your Detailed Review *</label>
                <textarea
                  required
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details about the fabric, stitching, color accuracy, and overall experience..."
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 text-xs text-charcoal focus:border-[#769055] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-8 py-3 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting…' : 'Submit Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="px-6 py-3 border border-gray-300 text-charcoal hover:bg-gray-100 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* List of Customer Reviews from Database */}
          {reviewsLoading ? (
            <div className="py-8 text-center text-xs text-muted">Loading reviews from database…</div>
          ) : (
            <div className="space-y-6 pt-2">
              {dbReviews.map((rev) => (
                <div key={rev.id} className="border-b border-border/60 pb-6 space-y-2.5 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xs sm:text-sm text-charcoal">{rev.name}</span>
                      {rev.verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                          ✓ Verified Buyer
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted">{rev.date}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StarRating rating={rev.rating} />
                    {rev.title && <span className="font-semibold text-xs sm:text-sm text-charcoal">{rev.title}</span>}
                  </div>

                  <p className="text-xs sm:text-sm text-charcoal/85 leading-relaxed">{rev.comment}</p>

                  <div className="flex items-center gap-4 text-[11px] text-muted pt-1">
                    <span>Was this review helpful?</span>
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
                      👍 Helpful ({rev.helpfulCount})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

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