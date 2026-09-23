import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { PRODUCTS, STORE_INFO } from '../data/products'
import { StarRating } from '../components/StarRating'
import { ProductCard } from '../components/ProductCard'
import { TrustBar } from '../components/TrustBar'
import { ImagePlaceholder } from '../components/ImagePlaceholder'

export function ProductDetailPage() {
  const { productId } = useParams<{ productId?: string }>()
  const { selectedProduct, addToCart, toggleWishlist, isInWishlist, navigateTo } = useShop()
  
  // Find product by URL param if provided, otherwise fallback to context or first product
  const product = (productId ? PRODUCTS.find(p => p.id === productId) : selectedProduct) || selectedProduct || PRODUCTS[0]

  useEffect(() => {
    if (product) {
      document.title = `${product.name} - Ethnic Wear | Anju Clothing`
    }
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
    rating,
    reviewCount,
    description,
    fabric,
    work,
    sizes = ['S', 'M', 'L', 'XL', 'XXL'],
    colors = ['#047857', '#9333EA', '#DC2626', '#D97706'],
  } = product

  const allImages = [img, ...additionalImages.filter(i => i !== img)]
  const [selectedImage, setSelectedImage] = useState(allImages[0])
  const [selectedSize, setSelectedSize] = useState(sizes[0] || 'Standard')
  const [selectedColor, setSelectedColor] = useState(colors[0] || '')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'fabric' | 'shipping'>('details')

  useEffect(() => {
    setSelectedImage(allImages[0])
    setSelectedSize(sizes[0] || 'Standard')
    setSelectedColor(colors[0] || '')
    setQuantity(1)
  }, [product])

  const isWished = isInWishlist(id)
  const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100)

  // Related products from same category
  const relatedProducts = PRODUCTS.filter(
    p => p.id !== id && (p.categorySlug === categorySlug || p.isBestseller)
  ).slice(0, 3)

  const handleAddToCart = () => {
    addToCart(product, selectedSize, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  // Construct WhatsApp direct order link
  const whatsappUrl = `https://wa.me/${STORE_INFO.phoneRaw}?text=${encodeURIComponent(
    `Hello Anju Clothings! I would like to order:\n\n*Product:* ${name}\n*Size:* ${selectedSize}\n*Color:* ${selectedColor}\n*Quantity:* ${quantity}\n*Price:* Rs. ${(
      price * quantity
    ).toLocaleString('en-IN')}.00\n\nPlease confirm availability and payment options.`
  )}`

  return (
    <div className="min-h-screen py-10 bg-ivory">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Breadcrumb */}
        <nav className="text-xs text-muted flex items-center gap-2" aria-label="Breadcrumb">
          <button onClick={() => navigateTo('home')} className="hover:text-olive transition-colors cursor-pointer">
            Home
          </button>
          <span>/</span>
          <button
            onClick={() => navigateTo('all-products', undefined, categorySlug)}
            className="hover:text-olive transition-colors cursor-pointer"
          >
            {category}
          </button>
          <span>/</span>
          <span className="text-charcoal font-semibold truncate max-w-[200px] sm:max-w-none">
            {name}
          </span>
        </nav>

        {/* Main Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white p-6 sm:p-10 border border-border/80 shadow-xs">
          
          {/* Left Gallery */}
          <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-4">
            
            {/* Thumbnail Strip */}
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

            {/* Main Featured Image / Placeholder */}
            <div className="flex-1 relative aspect-[4/5] bg-[#F5EFE6] overflow-hidden group">
              <ImagePlaceholder
                src={selectedImage}
                alt={name}
                aspectRatio="4/5"
                label={name}
              />

              {/* Tag / Discount */}
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

          {/* Right Product Details */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6 text-left">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-[#c9973a]">
                  {category}
                </span>
                
                {/* Wishlist Button */}
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="font-semibold">{isWished ? 'Saved' : 'Wishlist'}</span>
                </button>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-charcoal leading-snug">
                {name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3 min-h-[24px]">
                {typeof rating === 'number' && reviewCount !== undefined ? (
                  <>
                    <StarRating rating={rating} />
                    <span className="text-xs font-bold text-charcoal">{rating} / 5.0</span>
                    <span className="text-xs text-muted">({reviewCount} verified customer reviews)</span>
                  </>
                ) : (
                  <span className="text-xs text-muted">No reviews yet — be the first to review</span>
                )}
              </div>

              {/* Pricing */}
              <div className="flex items-baseline gap-3 py-2 border-y border-border/60">
                <span className="font-display text-3xl font-bold text-[#2c2420]">
                  Rs. {price.toLocaleString('en-IN')}.00
                </span>
                <span className="text-base text-muted line-through">
                  Rs. {originalPrice.toLocaleString('en-IN')}.00
                </span>
                <span className="text-xs text-green-700 font-bold bg-green-50 px-2.5 py-1 border border-green-200">
                  Save Rs. {(originalPrice - price).toLocaleString('en-IN')}.00 ({discountPercent}% OFF)
                </span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {description}
              </p>

              {/* Color Swatches */}
              {colors.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-charcoal block mb-2">
                    Available Colors:
                  </label>
                  <div className="flex items-center gap-2">
                    {colors.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedColor(color)}
                        className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                          selectedColor === color
                            ? 'scale-125 ring-2 ring-offset-2 ring-charcoal'
                            : 'border-black/20 hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                        title={`Color ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-charcoal">
                    Select Size:
                  </label>
                  <span className="text-xs text-[#769055] underline font-medium">
                    Size Chart (Standard Indian Fit)
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {sizes.map(size => (
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

              {/* Quantity Picker */}
              <div className="flex items-center gap-4 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-charcoal">
                  Quantity:
                </span>
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

            {/* Action Buttons */}
            <div className="pt-6 space-y-3 border-t border-border/60">
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Add to Bag */}
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 py-4 text-xs sm:text-sm font-bold uppercase tracking-widest text-white transition-all shadow-md cursor-pointer ${
                    added ? 'bg-[#c9973a]' : 'bg-[#769055] hover:bg-[#5e7343]'
                  }`}
                >
                  {added ? '✓ Item Added to Bag' : 'Add to Shopping Bag'}
                </button>

                {/* Direct WhatsApp Order */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs sm:text-sm font-bold uppercase tracking-widest transition-all shadow-md cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Order via WhatsApp
                </a>
              </div>

              {/* Delivery info snippet */}
              <div className="bg-[#FAF7F2] p-3 text-xs text-charcoal flex items-center justify-between border border-border/50">
                <span>🚚 Free Shipping across India</span>
                <span className="text-muted">Dispatched in 24-48 Hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Information Tabs */}
        <div className="bg-white border border-border/80 p-6 sm:p-8 shadow-xs">
          <div className="flex border-b border-border/80 gap-6 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'details'
                  ? 'border-b-2 border-[#769055] text-[#769055]'
                  : 'text-muted hover:text-charcoal'
              }`}
            >
              Product Details & Style Note
            </button>
            <button
              onClick={() => setActiveTab('fabric')}
              className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'fabric'
                  ? 'border-b-2 border-[#769055] text-[#769055]'
                  : 'text-muted hover:text-charcoal'
              }`}
            >
              Fabric & Care
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'shipping'
                  ? 'border-b-2 border-[#769055] text-[#769055]'
                  : 'text-muted hover:text-charcoal'
              }`}
            >
              Shipping & 7-Day Returns
            </button>
          </div>

          <div className="text-xs sm:text-sm text-charcoal/90 leading-relaxed max-w-3xl">
            {activeTab === 'details' && (
              <div className="space-y-3">
                <p>{description}</p>
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
                <p><strong>Primary Fabric:</strong> {fabric || 'Premium Handcrafted Silk/Georgette'}</p>
                <p><strong>Embroidery / Work:</strong> {work || 'Traditional Artisanal Handwork'}</p>
                <p><strong>Wash Care:</strong> Dry clean recommended for longevity and zari luster preservation. Store in cotton muslins.</p>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-3">
                <p><strong>Shipping:</strong> Free standard shipping across India on orders above ₹1,499. Orders are packed securely and dispatched via BlueDart / Delhivery.</p>
                <p><strong>Delivery Time:</strong> 3-5 business days for Metro cities, 5-7 business days for non-metro destinations.</p>
                <p><strong>Returns & Exchanges:</strong> We offer a 7-day hassle-free exchange and return policy for unworn items with original tags attached.</p>
              </div>
            )}
          </div>
        </div>

        {/* Assurances Bar */}
        <TrustBar />

        {/* Centered Heading for Related Recommendations (3 columns) */}
        <section className="pt-8">
          <div className="text-center mb-10">
            <p className="text-[#c9973a] text-xs uppercase tracking-[0.3em] font-semibold mb-2">
              Complete The Look
            </p>
            <h2 className="font-display text-3xl font-bold text-charcoal">
              You May Also Love
            </h2>
            <p className="text-muted text-xs sm:text-sm mt-2">
              Handpicked complementary styles tailored for your celebrations
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-8">
            {relatedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
