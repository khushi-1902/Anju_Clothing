import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { fetchAdminProducts, deleteAdminProduct, AdminProduct } from '../adminApi'
import { ProductFormModal } from '../components/ProductFormModal'

const CATEGORY_OPTIONS = [
  'all',
  'Sarees',
  'Lehengas',
  'Kurta Sets',
  'Anarkalis',
  'Gowns',
  'Co-ord Sets',
  'Indo-Western',
  'Festive Outfits',
]

export function AdminProductsPage() {
  const { getToken } = useAuth()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'influencer' | 'has_video' | 'bestseller' | 'new_arrival' | 'sale'>('all')
  const [previewVideoUrl, setPreviewVideoUrl] = useState<{ url: string; title: string } | null>(null)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)

  // Delete confirmation modal state
  const [productToDelete, setProductToDelete] = useState<AdminProduct | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Feedback banner
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) return
      const data = await fetchAdminProducts(token, search, category)
      setProducts(data)
    } catch (err: any) {
      console.error('Failed to load products:', err)
      showToast(err.message || 'Failed to load products', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [category])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadProducts()
  }

  const handleOpenAddModal = () => {
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (p: AdminProduct) => {
    setEditingProduct(p)
    setIsModalOpen(true)
  }

  const handleProductSaved = (saved: AdminProduct) => {
    showToast(
      editingProduct
        ? `Successfully updated "${saved.name}"!`
        : `Successfully published "${saved.name}" to the store!`
    )
    loadProducts()
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return

    try {
      setDeleting(true)
      const token = await getToken()
      await deleteAdminProduct(token || '', productToDelete.id)
      showToast(`Deleted "${productToDelete.name}" from catalog.`)
      setProductToDelete(null)
      loadProducts()
    } catch (err: any) {
      console.error('Failed to delete product:', err)
      showToast(err.message || 'Failed to delete product', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeFilterTab === 'influencer') return p.isCreatorsFavourite
      if (activeFilterTab === 'has_video') return Boolean(p.videoUrl && p.videoUrl.trim())
      if (activeFilterTab === 'bestseller') return p.isBestseller
      if (activeFilterTab === 'new_arrival') return p.isNewArrival
      if (activeFilterTab === 'sale') return p.isSale
      return true
    })
  }, [products, activeFilterTab])

  const influencerCount = useMemo(() => products.filter((p) => p.isCreatorsFavourite).length, [products])
  const videoCount = useMemo(() => products.filter((p) => Boolean(p.videoUrl && p.videoUrl.trim())).length, [products])

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-8 sm:pb-12 font-sans text-[#232B1E]">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 p-3.5 sm:p-4 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-[#233019] text-white border-[#344426]'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          <span>{toastMessage.type === 'success' ? '✓' : '⚠️'}</span>
          <span className="flex-1 truncate">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-[#1B2513] tracking-tight">Products</h1>
            <span className="px-2 py-0.5 bg-[#F0F5EB] border border-[#D5DFC9] rounded-md text-xs font-mono font-semibold text-[#4A6333]">
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="text-xs text-[#5D6F4E] mt-0.5">
            Manage catalog dresses, media gallery, video reels, and variant inventory.
          </p>
        </div>

        <div>
          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>+ Add New Product</span>
          </button>
        </div>
      </div>

      {/* Quick Collection & Video Reel Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setActiveFilterTab('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeFilterTab === 'all'
              ? 'bg-[#233019] text-white shadow-xs'
              : 'bg-white border border-[#D5DFC9] text-[#4A6333] hover:bg-[#F0F5EB]'
          }`}
        >
          <span>All Products</span>
          <span className="text-[10px] opacity-75 font-mono">({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilterTab('influencer')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeFilterTab === 'influencer'
              ? 'bg-[#c49332] text-white shadow-xs'
              : 'bg-amber-50/70 border border-amber-200 text-[#856119] hover:bg-amber-100/60'
          }`}
        >
          <span>⭐ Influencers / Creators</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/40">
            {influencerCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilterTab('has_video')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeFilterTab === 'has_video'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-purple-50 border border-purple-200 text-purple-900 hover:bg-purple-100'
          }`}
        >
          <span>🎬 With Video Reels</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/40">
            {videoCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilterTab('bestseller')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeFilterTab === 'bestseller'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'bg-white border border-[#D5DFC9] text-[#4A6333] hover:bg-[#F0F5EB]'
          }`}
        >
          <span>🔥 Bestsellers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilterTab('new_arrival')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeFilterTab === 'new_arrival'
              ? 'bg-[#4A6333] text-white shadow-xs'
              : 'bg-white border border-[#D5DFC9] text-[#4A6333] hover:bg-[#F0F5EB]'
          }`}
        >
          <span>✨ New Arrivals</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilterTab('sale')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeFilterTab === 'sale'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-white border border-[#D5DFC9] text-[#4A6333] hover:bg-[#F0F5EB]'
          }`}
        >
          <span>🏷️ Sale</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-[#E3E9DD] shadow-2xs flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-[#7A8E6A] absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, SKU, handle, fabric..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg focus:outline-none focus:border-[#769055] focus:bg-white transition-all text-[#232B1E]"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Filter
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setCategory('all')
              }}
              className="px-2.5 py-2 text-xs text-[#7A8E6A] hover:text-[#232B1E] transition-colors cursor-pointer shrink-0"
            >
              Reset
            </button>
          )}
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5D6F4E] font-medium hidden md:inline shrink-0">Category:</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg focus:outline-none focus:border-[#769055] font-semibold text-[#232B1E]"
          >
            <option value="all">All Categories</option>
            {CATEGORY_OPTIONS.filter((c) => c !== 'all').map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Section */}
      <div className="bg-white rounded-xl border border-[#E3E9DD] shadow-2xs overflow-hidden">
        
        {/* Mobile View: Product Cards */}
        <div className="block sm:hidden divide-y divide-[#EBEFE6]">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3.5 flex gap-3 animate-pulse">
                <div className="w-16 h-20 bg-[#F0F5EB] rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-[#F0F5EB] rounded" />
                  <div className="h-3 w-1/2 bg-[#F0F5EB] rounded" />
                  <div className="h-4 w-1/3 bg-[#F0F5EB] rounded" />
                </div>
              </div>
            ))
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((p) => {
              const coverImage = p.images?.[0]?.url
              const hasDiscount = p.comparePrice && p.comparePrice > p.price
              const isOutOfStock = p.totalStock <= 0

              return (
                <div key={p.id} className="p-3.5 space-y-3 hover:bg-[#F9FAF7] transition-colors">
                  <div className="flex gap-3">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={p.name}
                        className="w-16 h-20 object-cover rounded-lg bg-[#F0F5EB] border border-[#D5DFC9] shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-20 bg-[#F0F5EB] rounded-lg border border-[#D5DFC9] flex items-center justify-center text-xs text-[#7A8E6A] shrink-0">
                        👗
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <h3 className="font-bold text-xs text-[#1B2513] line-clamp-2 leading-snug">
                          {p.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {p.sku && (
                          <span className="text-[10px] font-mono bg-[#E8EFE2] text-[#2C3B1E] font-bold px-1.5 py-0.2 rounded border border-[#C5D6B6]">
                            {p.sku}
                          </span>
                        )}
                        <span className="text-[10px] bg-[#F0F5EB] text-[#4A6333] font-semibold px-1.5 py-0.2 rounded border border-[#D5DFC9]">
                          {p.category || 'Ethnic Wear'}
                        </span>
                        {p.isCreatorsFavourite && (
                          <span className="text-[10px] bg-[#fae5a0] text-[#664b11] font-bold px-1.5 py-0.2 rounded border border-[#c49332]/40">
                            ⭐ INFLUENCER
                          </span>
                        )}
                        {p.videoUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewVideoUrl({ url: p.videoUrl!, title: p.name })
                            }}
                            className="text-[10px] bg-purple-100 text-purple-900 font-bold px-1.5 py-0.2 rounded border border-purple-300 hover:bg-purple-200 cursor-pointer"
                          >
                            🎬 REEL
                          </button>
                        )}
                        {p.fabric && (
                          <span className="text-[10px] text-[#5D6F4E] font-medium">
                            • {p.fabric}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2 pt-0.5">
                        <span className="font-bold text-xs text-[#1B2513]">
                          ₹{p.price.toLocaleString('en-IN')}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] text-[#7A8E6A] line-through">
                            ₹{p.comparePrice?.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span
                          className={`ml-auto text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700'
                              : p.totalStock <= 5
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {isOutOfStock ? 'Out of stock' : `${p.totalStock} in stock`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Mobile */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#EBEFE6]">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="flex-1 py-1.5 px-3 bg-[#F0F5EB] hover:bg-[#E3EBD9] text-[#3E522B] text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setProductToDelete(p)}
                      className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="py-12 text-center text-[#7A8E6A] text-xs p-4">
              <p className="font-semibold text-[#202E15]">No products found</p>
              <p className="text-[11px] mt-1">Try resetting your search filter or click &quot;+ Add Product&quot;.</p>
            </div>
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F9F5] border-b border-[#EBEFE6] text-[11px] font-semibold text-[#5D6F4E] uppercase tracking-wider">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Badges</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEFE6]">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4"><div className="h-12 w-64 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-16 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-16 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-14 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3 px-4 text-right"><div className="h-4 w-16 bg-[#F0F5EB] rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const coverImage = p.images?.[0]?.url
                  const hasDiscount = p.comparePrice && p.comparePrice > p.price
                  const isOutOfStock = p.totalStock <= 0

                  return (
                    <tr key={p.id} className="hover:bg-[#F9FAF7] transition-colors group">
                      
                      {/* Product Thumbnail & Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {coverImage ? (
                            <img
                              src={coverImage}
                              alt={p.name}
                              className="w-11 h-14 object-cover rounded-lg bg-[#F0F5EB] border border-[#D5DFC9] shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-14 bg-[#F0F5EB] rounded-lg border border-[#D5DFC9] flex items-center justify-center text-xs text-[#7A8E6A] shrink-0">
                              No Image
                            </div>
                          )}
                          <div className="min-w-0 max-w-sm">
                            <p className="font-semibold text-[#1B2513] group-hover:text-[#769055] transition-colors truncate">
                              {p.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-[#7A8E6A] font-mono truncate">
                                /{p.handle}
                              </span>
                              {p.fabric && (
                                <span className="text-[10px] text-[#4A6333] font-medium truncate">
                                  • {p.fabric}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.sku ? (
                          <span className="font-mono text-[11px] font-bold text-[#3E522B] bg-[#F0F5EB] px-2 py-0.5 rounded border border-[#DCE6D2]">
                            {p.sku}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-[#232B1E]">{p.category || 'Sarees'}</span>
                      </td>

                      {/* Pricing */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-[#1B2513] tabular-nums">
                            ₹{p.price.toLocaleString('en-IN')}
                          </p>
                          {hasDiscount && (
                            <p className="text-[10px] text-[#7A8E6A] line-through tabular-nums">
                              ₹{p.comparePrice?.toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Inventory */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium tabular-nums ${
                            isOutOfStock
                              ? 'bg-rose-50 border border-rose-200 text-rose-700'
                              : p.totalStock <= 5
                              ? 'bg-amber-50 border border-amber-200 text-amber-800'
                              : 'bg-[#F0F5EB] border border-[#D5DFC9] text-[#4A6333]'
                          }`}
                        >
                          {isOutOfStock ? '0 in stock' : `${p.totalStock} in stock`}
                        </span>
                      </td>

                      {/* Badges / Status */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {p.isCreatorsFavourite && (
                            <span className="px-1.5 py-0.5 bg-[#fae5a0] border border-[#c49332]/40 text-[#664b11] text-[9.5px] font-bold rounded flex items-center gap-0.5">
                              <span>⭐</span> INFLUENCER
                            </span>
                          )}
                          {p.videoUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPreviewVideoUrl({ url: p.videoUrl!, title: p.name })
                              }}
                              className="px-1.5 py-0.5 bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-900 text-[9.5px] font-bold rounded flex items-center gap-0.5 cursor-pointer transition-colors shadow-2xs"
                              title="Click to preview video reel"
                            >
                              <span>🎬</span> REEL
                            </button>
                          )}
                          {p.isNewArrival && (
                            <span className="px-1.5 py-0.5 bg-[#F0F5EB] border border-[#D5DFC9] text-[#4A6333] text-[9px] font-semibold rounded">
                              NEW
                            </span>
                          )}
                          {p.isBestseller && (
                            <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-semibold rounded">
                              HOT
                            </span>
                          )}
                          {p.isSale && (
                            <span className="px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-semibold rounded">
                              SALE
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-[#5D6F4E] hover:text-[#202E15] hover:bg-[#F0F5EB] rounded-lg transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>

                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#7A8E6A] text-xs">
                    <p className="font-semibold text-[#202E15]">No products found</p>
                    <p className="text-[11px] mt-1">Try resetting your search filter or click &quot;+ Add Product&quot;.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl border border-[#E3E9DD]">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-sm text-[#1B2513]">Delete Product</h3>
              <p className="text-xs text-[#5D6F4E]">
                Are you sure you want to permanently delete &quot;<strong className="text-[#1B2513]">{productToDelete.name}</strong>&quot;? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2 text-xs font-semibold bg-[#F0F5EB] hover:bg-[#E3EBD9] text-[#202E15] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2 text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Form Modal (Add / Edit) */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleProductSaved}
        editingProduct={editingProduct}
      />

      {/* Video Reel Preview Modal */}
      {previewVideoUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewVideoUrl(null)}
        >
          <div
            className="bg-[#1C1F1A] text-white rounded-2xl max-w-xs w-full overflow-hidden border border-[#c49332]/40 shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">🎬</span>
                <h4 className="text-xs font-bold text-[#fae5a0] truncate">
                  {previewVideoUrl.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewVideoUrl(null)}
                className="text-gray-400 hover:text-white text-xs p-1 cursor-pointer shrink-0 ml-2"
              >
                ✕
              </button>
            </div>

            <div className="aspect-9/16 max-h-[460px] mx-auto rounded-xl overflow-hidden bg-black shadow-inner">
              <video
                src={previewVideoUrl.url}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
              <span>Homepage Reel Preview</span>
              <button
                type="button"
                onClick={() => setPreviewVideoUrl(null)}
                className="px-3 py-1 bg-[#3E522B] hover:bg-[#506937] text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
