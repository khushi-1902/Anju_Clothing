import React, { useState, useEffect } from 'react'
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-[#232B1E]">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-[#233019] text-white border-[#344426]'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          <span>{toastMessage.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#1B2513] tracking-tight">Products</h1>
            <span className="px-2 py-0.5 bg-[#F0F5EB] border border-[#D5DFC9] rounded-md text-xs font-mono font-medium text-[#4A6333]">
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="text-xs text-[#5D6F4E] mt-0.5">
            Manage catalog dresses, upload Cloudinary media, and configure variant inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-[#E3E9DD] shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="w-full sm:max-w-md flex gap-2">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-[#7A8E6A] absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, handle, or fabric..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg focus:outline-none focus:border-[#769055] focus:bg-white transition-all text-[#232B1E]"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
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
              className="px-2.5 py-1.5 text-xs text-[#7A8E6A] hover:text-[#232B1E] transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-[#5D6F4E] font-medium hidden sm:inline">Category:</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-xs bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg focus:outline-none focus:border-[#769055] font-medium text-[#232B1E]"
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

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-[#E3E9DD] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F9F5] border-b border-[#EBEFE6] text-[11px] font-semibold text-[#5D6F4E] uppercase tracking-wider">
                <th className="py-3 px-4">Product</th>
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
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-16 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-14 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3 px-4 text-right"><div className="h-4 w-16 bg-[#F0F5EB] rounded ml-auto" /></td>
                  </tr>
                ))
              ) : products.length > 0 ? (
                products.map((p) => {
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
                        <div className="flex flex-wrap gap-1">
                          {p.isNewArrival && (
                            <span className="px-1.5 py-0.5 bg-[#F0F5EB] border border-[#D5DFC9] text-[#4A6333] text-[9px] font-semibold rounded">
                              New
                            </span>
                          )}
                          {p.isBestseller && (
                            <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-semibold rounded">
                              Bestseller
                            </span>
                          )}
                          {p.isSale && (
                            <span className="px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 text-[9px] font-semibold rounded">
                              Sale
                            </span>
                          )}
                          {!p.isNewArrival && !p.isBestseller && !p.isSale && (
                            <span className="text-[#7A8E6A] text-[10px]">Standard</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Live preview in new tab */}
                          <a
                            href={`/product/${p.handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-[#7A8E6A] hover:text-[#769055] hover:bg-[#F0F5EB] rounded transition-colors"
                            title="View on live storefront"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </a>

                          {/* Edit button */}
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="px-2.5 py-1 bg-white border border-[#D5DFC9] hover:bg-[#F0F5EB] hover:border-[#769055] text-[#3E522B] font-medium rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            Edit
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 text-[#7A8E6A] hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Delete product"
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
                  <td colSpan={6} className="py-12 text-center text-[#7A8E6A]">
                    <p className="font-medium text-[#3A4B29]">No products found</p>
                    <p className="text-xs text-[#7A8E6A] mt-1">
                      Try adjusting your search filter or click "+ Add Product" to create one.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleProductSaved}
        editingProduct={editingProduct}
      />

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto text-lg font-bold">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-[#1B2513]">Delete Product?</h3>
              <p className="text-xs text-[#5D6F4E] leading-relaxed">
                Are you sure you want to delete{' '}
                <strong className="text-[#1B2513] font-semibold">"{productToDelete.name}"</strong>?
                This will remove all associated photos and variant records.
              </p>
            </div>

            <div className="pt-2 flex gap-2.5">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2 bg-white border border-[#D5DFC9] hover:bg-[#F0F5EB] text-[#3E522B] text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
