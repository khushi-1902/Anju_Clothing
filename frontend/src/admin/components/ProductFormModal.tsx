import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import {
  AdminProduct,
  createAdminProduct,
  updateAdminProduct,
  uploadProductImages,
  ProductInputPayload,
} from '../adminApi'

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (product: AdminProduct) => void
  editingProduct?: AdminProduct | null
}

const CATEGORIES = [
  'Sarees',
  'Lehengas',
  'Kurta Sets',
  'Anarkalis',
  'Gowns',
  'Co-ord Sets',
  'Indo-Western',
  'Festive Outfits',
]

const POPULAR_SIZES = ['Free Size', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']

interface FormVariant {
  id?: number
  size: string
  color: string
  stock: number
  price: string
  compareAtPrice: string
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingProduct,
}: ProductFormModalProps) {
  const { getToken } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [fabric, setFabric] = useState('')
  const [work, setWork] = useState('')
  const [descriptionHtml, setDescriptionHtml] = useState('')
  const [price, setPrice] = useState('')
  const [comparePrice, setComparePrice] = useState('')
  const [isNewArrival, setIsNewArrival] = useState(false)
  const [isBestseller, setIsBestseller] = useState(false)
  const [isSale, setIsSale] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [isCreatorsFavourite, setIsCreatorsFavourite] = useState(false)

  // Media
  const [images, setImages] = useState<{ url: string; alt?: string; position: number }[]>([])
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Variants
  const [variants, setVariants] = useState<FormVariant[]>([
    { size: 'Free Size', color: '', stock: 10, price: '', compareAtPrice: '' },
  ])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null)

  // Prefill for edit mode
  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name || '')
      setHandle(editingProduct.handle || '')
      setSku(editingProduct.sku || '')
      setCategory(editingProduct.category || CATEGORIES[0])
      setFabric(editingProduct.fabric || '')
      setWork((editingProduct as any).work || '')
      setDescriptionHtml((editingProduct as any).descriptionHtml || '')
      setPrice(editingProduct.price ? String(editingProduct.price) : '')
      setComparePrice(editingProduct.comparePrice ? String(editingProduct.comparePrice) : '')
      setIsNewArrival(Boolean(editingProduct.isNewArrival))
      setIsBestseller(Boolean(editingProduct.isBestseller))
      setIsSale(Boolean(editingProduct.isSale))
      setVideoUrl(editingProduct.videoUrl || '')
      setIsCreatorsFavourite(Boolean(editingProduct.isCreatorsFavourite))

      // Images
      if (editingProduct.images && editingProduct.images.length > 0) {
        setImages(
          editingProduct.images.map((img, idx) => ({
            url: img.url,
            alt: img.alt || editingProduct.name,
            position: idx,
          }))
        )
      } else {
        setImages([])
      }

      // Variants
      if (editingProduct.variants && editingProduct.variants.length > 0) {
        setVariants(
          editingProduct.variants.map((v) => ({
            id: v.id,
            size: v.size || 'Free Size',
            color: v.color || '',
            stock: v.stock,
            price: v.price ? String(v.price) : '',
            compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : '',
          }))
        )
      } else {
        setVariants([
          {
            size: 'Free Size',
            color: '',
            stock: 10,
            price: editingProduct.price ? String(editingProduct.price) : '',
            compareAtPrice: '',
          },
        ])
      }
    } else {
      // Reset for new product
      setName('')
      setHandle('')
      setSku('')
      setCategory(CATEGORIES[0])
      setFabric('')
      setWork('')
      setDescriptionHtml('')
      setPrice('')
      setComparePrice('')
      setIsNewArrival(true)
      setIsBestseller(false)
      setIsSale(false)
      setVideoUrl('')
      setIsCreatorsFavourite(false)
      setImages([])
      setVariants([{ size: 'Free Size', color: '', stock: 10, price: '', compareAtPrice: '' }])
    }
    setError(null)
  }, [editingProduct, isOpen])

  // Slug generator helper
  const handleNameChange = (val: string) => {
    setName(val)
    if (!editingProduct) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setHandle(generatedSlug)
    }
  }

  // Cloudinary Multi-File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      setUploadingImages(true)
      setError(null)
      const token = await getToken()
      const uploaded = await uploadProductImages(token || '', Array.from(files))

      const newImgs = uploaded.map((item, idx) => ({
        url: item.url,
        alt: name || 'Product image',
        position: images.length + idx,
      }))

      setImages((prev) => [...prev, ...newImgs])
    } catch (err: any) {
      console.error('Image upload error:', err)
      setError(err.message || 'Failed to upload image(s) to Cloudinary')
    } finally {
      setUploadingImages(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Cloudinary Video Upload Handler
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    // Check client-side file size (e.g. 100MB max)
    if (file.size > 100 * 1024 * 1024) {
      setVideoUploadError('Video file exceeds 100MB limit. Please select a shorter or compressed clip.')
      if (videoInputRef.current) videoInputRef.current.value = ''
      return
    }

    try {
      setUploadingVideo(true)
      setVideoUploadError(null)
      setError(null)
      const token = await getToken()
      const uploaded = await uploadProductImages(token || '', [file])
      if (uploaded && uploaded.length > 0 && uploaded[0].url) {
        setVideoUrl(uploaded[0].url)
        setIsCreatorsFavourite(true) // Automatically enable creators favourite flag when video is added!
      } else {
        throw new Error('Video uploaded but no URL was returned by server')
      }
    } catch (err: any) {
      console.error('Video upload error:', err)
      const msg = err.message || 'Failed to upload video to Cloudinary'
      setVideoUploadError(msg)
      setError(msg)
    } finally {
      setUploadingVideo(false)
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  // Add Image via Direct URL
  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return
    setImages((prev) => [
      ...prev,
      { url: imageUrlInput.trim(), alt: name || 'Product image', position: prev.length },
    ])
    setImageUrlInput('')
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSetCoverImage = (index: number) => {
    if (index === 0) return
    setImages((prev) => {
      const copy = [...prev]
      const [chosen] = copy.splice(index, 1)
      return [chosen, ...copy].map((item, idx) => ({ ...item, position: idx }))
    })
  }

  // Variant helpers
  const handleAddQuickSize = (size: string) => {
    if (variants.some((v) => v.size === size && !v.color)) return
    setVariants((prev) => [
      ...prev,
      { size, color: '', stock: 10, price: price, compareAtPrice: comparePrice },
    ])
  }

  const handleAddCustomVariant = () => {
    setVariants((prev) => [
      ...prev,
      { size: 'M', color: '', stock: 10, price: price, compareAtPrice: comparePrice },
    ])
  }

  const handleUpdateVariant = (index: number, field: keyof FormVariant, val: any) => {
    setVariants((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: val }
      return next
    })
  }

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) return
    setVariants((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Product title is required')
      return
    }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setError('Please enter a valid selling price')
      return
    }

    try {
      setSaving(true)
      setError(null)
      const token = await getToken()

      const payload: ProductInputPayload = {
        name: name.trim(),
        handle: handle.trim() || undefined,
        sku: sku.trim().toUpperCase() || undefined,
        category,
        fabric: fabric.trim() || undefined,
        work: work.trim() || undefined,
        descriptionHtml: descriptionHtml.trim() || undefined,
        price: Number(price),
        comparePrice: comparePrice && Number(comparePrice) > 0 ? Number(comparePrice) : undefined,
        isNewArrival,
        isBestseller,
        isSale,
        videoUrl: videoUrl.trim() || undefined,
        isCreatorsFavourite,
        images: images.map((img, idx) => ({
          url: img.url,
          alt: img.alt || name.trim(),
          position: idx,
        })),
        variants: variants.map((v) => ({
          id: v.id,
          size: v.size.trim() || 'Free Size',
          color: v.color.trim() || undefined,
          stock: Number(v.stock) || 0,
          price: v.price && Number(v.price) > 0 ? Number(v.price) : Number(price),
          compareAtPrice: v.compareAtPrice && Number(v.compareAtPrice) > 0 ? Number(v.compareAtPrice) : undefined,
        })),
      }

      let savedProduct: AdminProduct
      if (editingProduct) {
        savedProduct = await updateAdminProduct(token || '', editingProduct.id, payload)
      } else {
        savedProduct = await createAdminProduct(token || '', payload)
      }

      onSuccess(savedProduct)
      onClose()
    } catch (err: any) {
      console.error('Error saving product:', err)
      setError(err.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const discountPercent =
    comparePrice && Number(comparePrice) > Number(price) && Number(price) > 0
      ? Math.round(((Number(comparePrice) - Number(price)) / Number(comparePrice)) * 100)
      : 0

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border border-[#EBE4D8] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden text-charcoal">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-b border-[#EBE4D8] flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{editingProduct ? '✏️' : '✨'}</span>
              <h2 className="text-sm sm:text-base font-bold text-[#202223] truncate">
                {editingProduct ? `Edit: ${editingProduct.name}` : 'Add New Product'}
              </h2>
            </div>
            <p className="text-[11px] text-[#6D7175] mt-0.5 truncate hidden sm:block">
              {editingProduct
                ? 'Update product details, Cloudinary images, and variants.'
                : 'Publish a new handcrafted designer outfit to the store.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer text-base font-bold shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body (Scrollable Form) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2">
              <span className="text-sm leading-none">⚠️</span>
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="bg-white border border-[#E1E3E5] rounded-xl p-3.5 sm:p-5 shadow-xs space-y-3 sm:space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#769055] border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <span>🏷️</span> General Information
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#202223] mb-1">
                  Product Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Emerald Green Banarasi Silk Saree"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-charcoal focus:bg-white focus:outline-none focus:border-[#769055] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202223] mb-1">
                  Product SKU
                </label>
                <input
                  type="text"
                  placeholder={editingProduct ? "e.g. ANJ-0001" : "Auto-generated upon save (or specify custom SKU)"}
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  maxLength={50}
                  className="w-full bg-[#FAF8F5] border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-charcoal focus:bg-white focus:outline-none focus:border-[#769055] transition-colors uppercase"
                />
                <p className="text-[11px] text-[#6D7175] mt-1">
                  Auto-generated. You can change it, but it must be unique.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#202223] mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-charcoal focus:bg-white focus:outline-none focus:border-[#769055] transition-colors"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202223] mb-1">
                    Fabric / Material
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pure Silk, Georgette, Organza"
                    value={fabric}
                    onChange={(e) => setFabric(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-charcoal focus:bg-white focus:outline-none focus:border-[#769055] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202223] mb-1">
                    Craft / Work
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Zardozi, Hand Embroidered"
                    value={work}
                    onChange={(e) => setWork(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-charcoal focus:bg-white focus:outline-none focus:border-[#769055] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202223] mb-1">
                  Product Description / Craft Story
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the silhouette, embellishments, occasions, and styling notes..."
                  value={descriptionHtml}
                  onChange={(e) => setDescriptionHtml(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-gray-300 rounded-lg p-2.5 text-xs font-medium text-charcoal focus:bg-white focus:outline-none focus:border-[#769055] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-0.5">
                  URL Handle / Slug: <span className="font-mono text-[#769055]">/product/{handle || '...'}</span>
                </label>
                <input
                  type="text"
                  placeholder="custom-url-slug"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-700 focus:bg-white focus:outline-none focus:border-[#769055]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Storefront Flags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            
            {/* Pricing Card */}
            <div className="bg-white border border-[#E1E3E5] rounded-xl p-3.5 sm:p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#769055] border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <span>💰</span> Pricing
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#202223] mb-1">
                    Selling Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">₹</span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="3499"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-xs font-bold text-charcoal focus:bg-white focus:outline-none focus:border-[#769055]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202223] mb-1">
                    Compare Price (MRP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="4999"
                      value={comparePrice}
                      onChange={(e) => setComparePrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-[#FAF8F5] border border-gray-300 rounded-lg text-xs font-medium text-gray-600 focus:bg-white focus:outline-none focus:border-[#769055]"
                    />
                  </div>
                </div>
              </div>

              {discountPercent > 0 && (
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] font-bold text-emerald-800 flex items-center justify-between">
                  <span>Customer Savings:</span>
                  <span>{discountPercent}% OFF MRP</span>
                </div>
              )}
            </div>

            {/* Storefront Badges */}
            <div className="bg-white border border-[#E1E3E5] rounded-xl p-3.5 sm:p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#769055] border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <span>🏷️</span> Storefront Badges
              </h3>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNewArrival}
                    onChange={(e) => setIsNewArrival(e.target.checked)}
                    className="rounded text-[#769055] focus:ring-[#769055]"
                  />
                  <span className="font-semibold text-charcoal">Mark as New Arrival</span>
                  <span className="text-[10px] bg-[#F0F5EB] text-[#4A6333] px-1.5 py-0.2 rounded font-bold ml-auto">NEW</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBestseller}
                    onChange={(e) => setIsBestseller(e.target.checked)}
                    className="rounded text-[#769055] focus:ring-[#769055]"
                  />
                  <span className="font-semibold text-charcoal">Mark as Bestseller</span>
                  <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold ml-auto">HOT</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSale}
                    onChange={(e) => setIsSale(e.target.checked)}
                    className="rounded text-[#769055] focus:ring-[#769055]"
                  />
                  <span className="font-semibold text-charcoal">Include in Festive Sale</span>
                  <span className="text-[10px] bg-rose-100 text-rose-900 px-1.5 py-0.2 rounded font-bold ml-auto">SALE</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 hover:bg-amber-50 cursor-pointer border border-amber-200/60">
                  <input
                    type="checkbox"
                    checked={isCreatorsFavourite}
                    onChange={(e) => setIsCreatorsFavourite(e.target.checked)}
                    className="rounded text-[#c49332] focus:ring-[#c49332]"
                  />
                  <span className="font-semibold text-[#664b11]">Creators' Favourite Collection</span>
                  <span className="text-[10px] bg-[#c49332] text-white px-1.5 py-0.2 rounded font-bold ml-auto">CREATOR</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3A: Creators' Showcase Video (Cloudinary Auto-Transcoded) */}
          <div className="bg-white border-2 border-amber-200/70 rounded-xl p-3.5 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-gray-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#c49332] flex items-center gap-1.5">
                <span>🎬</span> Influencer & Creators' Video Reel (Homepage Card)
              </h3>
              <span className="text-[11px] text-[#6D7175]">Preview image by default • Plays video on cursor hover</span>
            </div>

            {/* Direct Collection Toggle */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="creators-favourite-direct"
                  checked={isCreatorsFavourite}
                  onChange={(e) => setIsCreatorsFavourite(e.target.checked)}
                  className="rounded text-[#c49332] focus:ring-[#c49332] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="creators-favourite-direct" className="cursor-pointer text-xs font-bold text-[#664b11]">
                  Feature in Homepage Influencer / Creators' Collection
                </label>
              </div>
              <span className="text-[10px] bg-[#c49332] text-white px-2 py-0.5 rounded-full font-bold">
                {isCreatorsFavourite ? '⭐ FEATURED' : 'OPTIONAL'}
              </span>
            </div>

            <p className="text-[11px] text-[#5D6F4E] leading-relaxed">
              Upload an MP4 or paste a video link. The homepage card will display the product photo as the preview and play this reel smoothly when the shopper moves their cursor over the card.
            </p>

            {videoUploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span className="font-semibold">{videoUploadError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setVideoUploadError(null)}
                  className="text-xs text-rose-600 hover:text-rose-900 font-bold px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Video Upload & URL */}
              <div className="space-y-2.5">
                <div
                  onClick={() => !uploadingVideo && videoInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all group ${
                    uploadingVideo
                      ? 'border-[#c49332] bg-amber-50/50 cursor-wait'
                      : 'border-[#d5cfc1] hover:border-[#c49332] bg-[#fbf9f4] hover:bg-white'
                  }`}
                >
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/*"
                    onChange={handleVideoUpload}
                    disabled={uploadingVideo}
                    className="hidden"
                  />
                  <div className="w-10 h-10 bg-white rounded-full shadow-xs border border-[#E1E3E5] mx-auto flex items-center justify-center text-base group-hover:scale-110 transition-transform">
                    {uploadingVideo ? (
                      <span className="inline-block w-4 h-4 border-2 border-[#c49332] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      '📹'
                    )}
                  </div>
                  <p className="text-xs font-bold text-[#202223] mt-2">
                    {uploadingVideo ? 'Uploading Video to Cloudinary (please wait)...' : 'Upload Video Reel from Computer (MP4 / WebM / MOV)'}
                  </p>
                  <p className="text-[10px] text-[#6D7175] mt-0.5">
                    {uploadingVideo ? 'Optimizing video for fast mobile & desktop streaming' : 'Supports video files up to 100MB'}
                  </p>
                </div>

                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    placeholder="Or paste Cloudinary/MP4 Video URL"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="flex-1 bg-[#FAF8F5] border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-charcoal focus:bg-white focus:outline-none focus:border-[#c49332]"
                  />
                  {videoUrl && (
                    <button
                      type="button"
                      onClick={() => setVideoUrl('')}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Video Preview */}
              <div className="bg-[#FAF8F5] border border-gray-200 rounded-xl p-2.5 flex items-center justify-center min-h-[140px]">
                {videoUrl ? (
                  <div className="relative w-full max-w-[180px] aspect-9/16 rounded-lg overflow-hidden bg-black shadow-md mx-auto">
                    <video
                      src={videoUrl}
                      muted
                      loop
                      playsInline
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Preview
                    </span>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 text-xs py-4">
                    <p>No video selected.</p>
                    <p className="text-[10px] mt-0.5 text-gray-400">If empty, photo cover will be displayed on homepage.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Cloudinary Images */}
          <div className="bg-white border border-[#E1E3E5] rounded-xl p-3.5 sm:p-5 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-gray-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#769055] flex items-center gap-1.5">
                <span>📸</span> Media & Product Photos ({images.length})
              </h3>
              <span className="text-[11px] text-[#6D7175]">First photo is the primary storefront cover</span>
            </div>

            {/* Drag and drop / file input box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#D5DFC9] hover:border-[#769055] bg-[#FAF8F5] hover:bg-white rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full shadow-xs border border-[#E1E3E5] mx-auto flex items-center justify-center text-lg sm:text-xl group-hover:scale-110 transition-transform">
                {uploadingImages ? '⏳' : '☁️'}
              </div>
              <p className="text-xs font-bold text-[#202223] mt-2">
                {uploadingImages ? 'Uploading to Cloudinary...' : 'Tap or Drag & Drop Photos Here'}
              </p>
              <p className="text-[10px] sm:text-[11px] text-[#6D7175] mt-0.5">
                PNG, JPG, WebP photos
              </p>
            </div>

            {/* Quick URL Input */}
            <div className="flex gap-2 items-center">
              <input
                type="url"
                placeholder="Or paste an image URL directly (https://...)"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="flex-1 bg-[#FAF8F5] border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-charcoal focus:bg-white focus:outline-none focus:border-[#769055]"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-charcoal text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                + Add URL
              </button>
            </div>

            {/* Uploaded Images Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-lg overflow-hidden border-2 bg-white shadow-xs aspect-3/4 flex flex-col"
                    style={{ borderColor: idx === 0 ? '#769055' : '#E1E3E5' }}
                  >
                    <img
                      src={img.url}
                      alt={img.alt || `Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Cover Photo Badge */}
                    {idx === 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-[#769055] text-white text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs">
                        Cover
                      </span>
                    )}

                    {/* Actions Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 sm:p-2">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-700 cursor-pointer shadow-md"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>

                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetCoverImage(idx)}
                          className="w-full py-1 bg-white/90 hover:bg-white text-charcoal text-[10px] font-bold rounded cursor-pointer transition-colors shadow-xs"
                        >
                          Set Cover
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Variants & Inventory */}
          <div className="bg-white border border-[#E1E3E5] rounded-xl p-3.5 sm:p-5 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#769055] flex items-center gap-1.5">
                  <span>📐</span> Sizes, Colors & Inventory
                </h3>
                <p className="text-[11px] text-[#6D7175]">
                  Configure stock quantities and sizes.
                </p>
              </div>

              {/* Quick Size Adders */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] font-bold text-gray-400 mr-1">Quick Add:</span>
                {POPULAR_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleAddQuickSize(sz)}
                    className="px-2 py-0.5 bg-gray-100 hover:bg-[#769055] hover:text-white text-charcoal text-[10px] font-bold rounded transition-colors cursor-pointer"
                  >
                    + {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile View: Variant Cards */}
            <div className="block sm:hidden space-y-2.5">
              {variants.map((v, idx) => (
                <div key={idx} className="p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#202223]">Variant #{idx + 1}</span>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
                      >
                        Remove ✕
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Size</label>
                      <input
                        type="text"
                        required
                        placeholder="M, L, Free Size"
                        value={v.size}
                        onChange={(e) => handleUpdateVariant(idx, 'size', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-bold text-charcoal"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Stock Qty</label>
                      <input
                        type="number"
                        min="0"
                        value={v.stock}
                        onChange={(e) => handleUpdateVariant(idx, 'stock', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-bold text-charcoal"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Color (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Green"
                        value={v.color}
                        onChange={(e) => handleUpdateVariant(idx, 'color', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-charcoal"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Price Override (₹)</label>
                      <input
                        type="number"
                        placeholder={price || 'Base'}
                        value={v.price}
                        onChange={(e) => handleUpdateVariant(idx, 'price', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-charcoal"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-bold">
                    <th className="pb-2">Size</th>
                    <th className="pb-2">Color (Optional)</th>
                    <th className="pb-2">Stock Qty</th>
                    <th className="pb-2">Variant Price (₹)</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {variants.map((v, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          required
                          placeholder="e.g. M, L, Free Size"
                          value={v.size}
                          onChange={(e) => handleUpdateVariant(idx, 'size', e.target.value)}
                          className="w-24 bg-[#FAF8F5] border border-gray-300 rounded px-2 py-1 text-xs font-bold text-charcoal"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          placeholder="e.g. Emerald Green"
                          value={v.color}
                          onChange={(e) => handleUpdateVariant(idx, 'color', e.target.value)}
                          className="w-28 bg-[#FAF8F5] border border-gray-300 rounded px-2 py-1 text-xs text-charcoal"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) => handleUpdateVariant(idx, 'stock', e.target.value)}
                          className="w-20 bg-[#FAF8F5] border border-gray-300 rounded px-2 py-1 text-xs font-bold text-charcoal"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          placeholder={price || 'Same as base'}
                          value={v.price}
                          onChange={(e) => handleUpdateVariant(idx, 'price', e.target.value)}
                          className="w-24 bg-[#FAF8F5] border border-gray-300 rounded px-2 py-1 text-xs text-charcoal"
                        />
                      </td>
                      <td className="py-2 text-right">
                        {variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="text-red-500 hover:text-red-700 font-bold px-2 py-1 text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddCustomVariant}
              className="text-xs font-bold text-[#769055] hover:text-[#5e7343] cursor-pointer flex items-center gap-1"
            >
              <span>+ Add another variant</span>
            </button>
          </div>

          {/* Form Actions in Modal Footer */}
          <div className="pt-3 border-t border-[#EBE4D8] flex items-center justify-end gap-2 sm:gap-3 sticky bottom-0 bg-[#FAF8F5] py-2 sm:py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-charcoal text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || uploadingImages}
              className="flex-1 sm:flex-initial px-5 sm:px-6 py-2.5 bg-[#769055] hover:bg-[#5e7343] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 text-center"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingProduct ? 'Update Product' : 'Publish Product'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
