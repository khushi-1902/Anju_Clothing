import { useEffect, useState } from 'react'
import type { Product } from '../types'
import { PRODUCTS } from '../data/products'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

interface ApiVariant {
  id: number
  size: string | null
  color: string | null
  price: number
  compareAtPrice: number | null
  stock: number
  imageUrl: string | null
}

interface ApiProduct {
  id: number
  handle: string
  name: string
  category: string | null
  fabric: string | null
  price: number
  comparePrice: number | null
  images: { url: string; alt: string | null }[]
  variants: ApiVariant[]
  discountPercent: number
  isNewArrival?: boolean
  isBestseller?: boolean
  isSale?: boolean
}

const unique = (arr: (string | null)[]) =>
  [...new Set(arr.filter((x): x is string => !!x))]

export function mapApiProduct(p: ApiProduct): Product {
  const isBestseller = Boolean(p.isBestseller)
  const isNewArrival = Boolean(p.isNewArrival)
  const isSale = Boolean(p.isSale)

  return {
    id: p.handle,
    name: p.name,
    price: p.price,
    originalPrice: p.comparePrice ?? p.price,
    category: p.category ?? '',
    categorySlug: '',
    img: p.images[0]?.url ?? '',
    tag: isBestseller ? 'BESTSELLER' : isNewArrival ? 'NEW' : isSale ? 'SALE' : '',
    discount: p.discountPercent > 0 ? `-${p.discountPercent}%` : '',
    rating: 0,
    reviewCount: 0,
    description: '',
    fabric: p.fabric ?? '',
    work: '',
    sizes: unique(p.variants.map((v) => v.size)),
    colors: unique(p.variants.map((v) => v.color)),
    inStock: p.variants.some((v) => v.stock > 0),
    isNewArrival,
    isBestseller,
    isSale,
  }
}

export async function fetchNewArrivals(limit = 8): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/products/new-arrivals?limit=${limit}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data: { products: ApiProduct[] } = await res.json()
  return data.products.map(mapApiProduct)
}

export function useNewArrivals(limit = 8) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchNewArrivals(limit)
      .then((p) => !cancelled && setProducts(p))
      .catch(() => {
        // API down: fall back to the static data so the page never looks empty
        if (!cancelled) setProducts(PRODUCTS.filter((p) => p.isNewArrival).slice(0, limit))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [limit])

  return { products, loading }
}

interface ApiProductDetail extends ApiProduct {
  descriptionHtml: string | null
  work: string | null
  isNewArrival: boolean
  isBestseller: boolean
  isSale: boolean
}

export async function fetchBestsellers(limit = 8): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/products/bestsellers?limit=${limit}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data: { products: ApiProduct[] } = await res.json()
  return data.products.map(mapApiProduct)
}

export function useBestsellers(limit = 8) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchBestsellers(limit)
      .then((p) => !cancelled && setProducts(p))
      .catch(() => {
        if (!cancelled) setProducts(PRODUCTS.filter((p) => p.isBestseller).slice(0, limit))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [limit])

  return { products, loading }
}

export async function fetchSaleProducts(limit = 8): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/products/sale?limit=${limit}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data: { products: ApiProduct[] } = await res.json()
  return data.products.map(mapApiProduct)
}

export function useSaleProducts(limit = 8) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchSaleProducts(limit)
      .then((p) => !cancelled && setProducts(p))
      .catch(() => {
        if (!cancelled) setProducts(PRODUCTS.filter((p) => p.isSale).slice(0, limit))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [limit])

  return { products, loading }
}

export const useMegaSale = useSaleProducts
export const useSale = useSaleProducts

export interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ProductsQueryOptions {
  page?: number
  limit?: number
  category?: string
  search?: string
  sort?: string
  minPrice?: number | null
  maxPrice?: number | null
}

export async function fetchProducts(options: ProductsQueryOptions = {}): Promise<ProductsResponse> {
  const params = new URLSearchParams()
  if (options.page) params.set('page', String(options.page))
  if (options.limit) params.set('limit', String(options.limit))
  if (options.category && options.category !== 'all') params.set('category', options.category)
  if (options.search) params.set('search', options.search)
  if (options.sort) params.set('sort', options.sort)
  if (options.minPrice !== undefined && options.minPrice !== null) params.set('minPrice', String(options.minPrice))
  if (options.maxPrice !== undefined && options.maxPrice !== null) params.set('maxPrice', String(options.maxPrice))

  const qs = params.toString()
  const res = await fetch(`${API_URL}/api/products${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data: { products: ApiProduct[]; total: number; page: number; limit: number; totalPages: number } = await res.json()
  return {
    products: data.products.map(mapApiProduct),
    total: data.total,
    page: data.page,
    limit: data.limit,
    totalPages: data.totalPages,
  }
}
// Converts Shopify's stored HTML into safe, readable plain text.
// Deliberately never uses dangerouslySetInnerHTML — stripping tags removes
// any injection risk instead of relying on a sanitizer library.
function stripHtml(html: string | null): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
}

function mapApiProductDetail(p: ApiProductDetail): Product {
  const images = p.images.map((i) => i.url)
  const colorImageMap: Record<string, string> = {}
  for (const v of p.variants) {
    if (v.color && v.imageUrl && !colorImageMap[v.color.trim()]) {
      colorImageMap[v.color.trim()] = v.imageUrl
    }
  }

  return {
    id: p.handle,
    name: p.name,
    price: p.price,
    originalPrice: p.comparePrice ?? p.price,
    category: p.category ?? '',
    categorySlug: '',
    img: images[0] ?? '',
    additionalImages: images.slice(1),
    tag: p.isNewArrival ? 'NEW' : p.isSale ? 'SALE' : '',
    discount: p.discountPercent > 0 ? `-${p.discountPercent}%` : '',
    rating: undefined,
    reviewCount: undefined,
    description: stripHtml(p.descriptionHtml),
    fabric: p.fabric ?? '',
    work: p.work ?? '',
    sizes: unique(p.variants.map((v) => v.size)),
    colors: unique(p.variants.map((v) => v.color)),
    variants: p.variants,
    colorImageMap,
    inStock: p.variants.some((v) => v.stock > 0),
    isNewArrival: p.isNewArrival,
    isBestseller: p.isBestseller,
    isSale: p.isSale,
  }
}

export interface ApiReview {
  id: number
  name: string
  rating: number
  title: string | null
  comment: string
  verified: boolean
  helpfulCount: number
  createdAt: string
}

export async function fetchProductReviews(handle: string): Promise<ApiReview[]> {
  try {
    const res = await fetch(`${API_URL}/api/products/${encodeURIComponent(handle)}/reviews`)
    if (!res.ok) return []
    const data: { reviews: ApiReview[] } = await res.json()
    return data.reviews || []
  } catch {
    return []
  }
}

export async function submitProductReview(
  handle: string,
  review: { name: string; rating: number; title?: string; comment: string }
): Promise<ApiReview> {
  const res = await fetch(`${API_URL}/api/products/${encodeURIComponent(handle)}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  })
  if (!res.ok) throw new Error('Could not submit review')
  const data: { review: ApiReview } = await res.json()
  return data.review
}

async function fetchProduct(handle: string): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products/${encodeURIComponent(handle)}`)
  if (res.status === 404) throw new Error('not-found')
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data: { product: ApiProductDetail } = await res.json()
  return mapApiProductDetail(data.product)
}

export function useProduct(handle: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!handle) {
      setLoading(false)
      setNotFound(true)
      return
    }
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    fetchProduct(handle)
      .then((p) => {
        if (!cancelled) setProduct(p)
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = PRODUCTS.find(
            (p) => p.id === handle || p.id.toLowerCase() === handle.toLowerCase()
          )
          if (fallback) {
            setProduct(fallback)
          } else {
            setNotFound(true)
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [handle])

  return { product, loading, notFound }
}


export interface OrderTimelineEvent {
  status: string
  time: string
  completed: boolean
  description?: string
}

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  selectedSize?: string
  selectedColor?: string
  img?: string
}

export interface ShippingAddress {
  street: string
  city: string
  state: string
  pincode: string
  country?: string
}

export interface Order {
  id?: number
  orderNumber: string
  clerkUserId?: string | null
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: ShippingAddress
  items: OrderItem[]
  subtotal: number
  shippingFee: number
  discountAmount: number
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  orderStatus: string
  courierName?: string
  trackingNumber?: string
  estimatedDelivery?: string
  timeline: OrderTimelineEvent[]
  createdAt: string
  updatedAt?: string
}

export async function createOrder(payload: Omit<Order, 'orderNumber' | 'createdAt' | 'timeline'>): Promise<Order> {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to place order')
  }
  const data: { order: Order } = await res.json()
  return data.order
}

export async function fetchUserOrders(userIdOrEmail: string): Promise<Order[]> {
  try {
    const res = await fetch(`${API_URL}/api/orders/user/${encodeURIComponent(userIdOrEmail)}`)
    if (!res.ok) return []
    const data: { orders: Order[] } = await res.json()
    return data.orders || []
  } catch {
    return []
  }
}

export async function trackOrder(orderNumber: string, verify?: string): Promise<Order> {
  const url = `${API_URL}/api/orders/track/${encodeURIComponent(orderNumber)}${
    verify ? `?verify=${encodeURIComponent(verify)}` : ''
  }`
  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Order not found')
  }
  const data: { order: Order } = await res.json()
  return data.order
}

export async function cancelOrder(orderNumber: string, reason?: string): Promise<Order> {
  const res = await fetch(`${API_URL}/api/orders/${encodeURIComponent(orderNumber)}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Could not cancel order')
  }
  const data: { order: Order } = await res.json()
  return data.order
}