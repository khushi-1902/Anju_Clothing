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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-bold animate-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-red-900 text-white border-red-700'
          }`}
        >
          <span>{toastMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#202223] tracking-tight">Products</h1>
            <span className="px-2.5 py-0.5 bg-[#FAF8F5] border border-[#EBE4D8] rounded-full text-xs font-bold text-[#769055]">
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="text-xs text-[#6D7175] mt-0.5">
            Create, update, upload Cloudinary media, and manage stock inventory for your catalog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E1E3E5] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="w-full sm:max-w-md flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search by title, handle, or fabric..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-[#FAF8F5] border border-gray-300 rounded-lg focus:outline-none focus:border-[#769055] focus:bg-white transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#202223] text-white text-xs font-bold rounded-lg hover:bg-black transition-colors cursor-pointer"
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
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
            >
              Reset
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-gray-500 font-semibold hidden sm:inline">Category:</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs bg-[#FAF8F5] border border-gray-300 rounded-lg focus:outline-none focus:border-[#769055] font-medium text-charcoal"
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
      <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EBE4D8] text-[11px] font-bold text-[#6D7175] uppercase tracking-wider">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Status & Tags</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4"><div className="h-12 w-64 bg-gray-200 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-16 bg-gray-200 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-14 bg-gray-200 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                    <td className="py-3 px-4 text-right"><div className="h-4 w-16 bg-gray-200 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : products.length > 0 ? (
                products.map((p) => {
                  const coverImage = p.images?.[0]?.url
                  const hasDiscount = p.comparePrice && p.comparePrice > p.price
                  const isOutOfStock = p.totalStock <= 0

                  return (
                    <tr key={p.id} className="hover:bg-[#FAF8F5]/60 transition-colors group">
                      
                      {/* Product Thumbnail & Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {coverImage ? (
                            <img
                              src={coverImage}
                              alt={p.name}
                              className="w-11 h-14 object-cover rounded-lg bg-gray-100 border border-gray-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-11 h-14 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-base text-gray-400 shrink-0">
                              👗
                            </div>
                          )}
                          <div className="min-w-0 max-w-sm">
                            <p className="font-bold text-[#202223] group-hover:text-[#769055] transition-colors truncate">
                              {p.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-400 font-mono truncate">
                                /{p.handle}
                              </span>
                              {p.fabric && (
                                <span className="text-[10px] text-[#C9973A] font-semibold truncate">
                                  • {p.fabric}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-charcoal">{p.category || 'Sarees'}</span>
                      </td>

                      {/* Pricing */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-[#202223]">
                            ₹{p.price.toLocaleString('en-IN')}
                          </p>
                          {hasDiscount && (
                            <p className="text-[10px] text-gray-400 line-through">
                              ₹{p.comparePrice?.toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Inventory */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isOutOfStock
                              ? 'bg-red-50 border border-red-200 text-red-700'
                              : p.totalStock <= 5
                              ? 'bg-amber-50 border border-amber-200 text-amber-800'
                              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          }`}
                        >
                          {isOutOfStock ? '0 in stock' : `${p.totalStock} in stock`}
                        </span>
                      </td>

                      {/* Badges / Status */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {p.isNewArrival && (
                            <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 text-[9px] font-bold rounded">
                              ✦ New
                            </span>
                          )}
                          {p.isBestseller && (
                            <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-bold rounded">
                              ★ Bestseller
                            </span>
                          )}
                          {p.isSale && (
                            <span className="px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 text-[9px] font-bold rounded">
                              % Sale
                            </span>
                          )}
                          {!p.isNewArrival && !p.isBestseller && !p.isSale && (
                            <span className="text-gray-400 text-[10px]">Standard</span>
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
                            className="p-1.5 text-gray-400 hover:text-[#769055] hover:bg-emerald-50 rounded transition-colors"
                            title="View on live storefront"
                          >
                            👁️
                          </a>

                          {/* Edit button */}
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-charcoal font-bold rounded text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            Edit
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete product"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <p className="text-2xl mb-2">👗</p>
                    <p className="font-bold text-charcoal">No products found</p>
                    <p className="text-xs text-gray-400 mt-1">
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-red-100 text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 border border-red-200 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              🗑️
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[#202223]">Delete Product?</h3>
              <p className="text-xs text-[#6D7175] leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-charcoal font-bold">"{productToDelete.name}"</strong>?
                This will also remove all associated photos and variant records.
              </p>
            </div>

            <div className="pt-2 flex gap-2.5">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-charcoal text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
