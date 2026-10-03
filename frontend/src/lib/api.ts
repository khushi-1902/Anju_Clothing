import { useEffect, useState } from 'react'
import type { Product } from '../types'

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
    categorySlug: p.category ? p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '',
    img: p.images[0]?.url ?? '',
    tag: isBestseller ? 'BESTSELLER' : isNewArrival ? 'NEW' : isSale ? 'SALE' : '',
    discount: p.discountPercent > 0 ? `-${p.discountPercent}%` : '',
    rating: 0,
    reviewCount: 0,
    description: '',
    fabric: p.fabric ?? '',
    work: '',
    sizes: unique(p.variants?.map((v) => v.size) || []),
    colors: unique(p.variants?.map((v) => v.color) || []),
    variants: p.variants,
    inStock: p.variants?.some((v) => v.stock > 0) || false,
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

export interface ApiCategory {
  name: string
  slug: string
  itemCount: number
  imageUrl: string
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  const res = await fetch(`${API_URL}/api/categories`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data: { categories: ApiCategory[] } = await res.json()
  return data.categories || []
}

export function useCategories() {
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats)
      })
      .catch((err) => {
        console.error('Error loading categories:', err)
        if (!cancelled) setCategories([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { categories, loading }
}

import type { FilterFacets, FacetOption } from '../utils/productFilters'
export type { FilterFacets, FacetOption }

export async function fetchFacets(): Promise<FilterFacets> {
  const res = await fetch(`${API_URL}/api/facets`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data: FilterFacets = await res.json()
  return data
}

export function useFacets() {
  const [facets, setFacets] = useState<FilterFacets>({
    categories: [],
    sizes: [],
    colors: [],
    fabrics: [],
    occasions: [],
    vendors: [],
    price: { min: 700, max: 3500, step: 50 },
    priceRange: { min: 700, max: 3500 },
    stock: { inStock: 0, outOfStock: 0 },
    total: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchFacets()
      .then((f) => {
        if (!cancelled) setFacets(f)
      })
      .catch((err) => {
        console.error('Error loading facets:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { facets, loading }
}

export function useNewArrivals(limit = 8) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchNewArrivals(limit)
      .then((p) => !cancelled && setProducts(p))
      .catch((err) => {
        console.error('Error loading new arrivals:', err)
        if (!cancelled) setProducts([])
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
      .catch((err) => {
        console.error('Error loading bestsellers:', err)
        if (!cancelled) setProducts([])
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
      .catch((err) => {
        console.error('Error loading sale products:', err)
        if (!cancelled) setProducts([])
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
  items: Product[]
  products: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
  facets: FilterFacets
  exactMatch: boolean
  similar: Product[]
}

export interface ProductsQueryOptions {
  page?: number
  limit?: number
  category?: string
  collection?: string
  sizes?: string[]
  size?: string[]
  colors?: string[]
  color?: string[]
  fabrics?: string[]
  fabric?: string[]
  occasions?: string[]
  occasion?: string[]
  stock?: string | null
  inStock?: boolean | string | null
  q?: string
  search?: string
  sort?: string
  minPrice?: number | null
  maxPrice?: number | null
  signal?: AbortSignal
}

export async function fetchProducts(options: ProductsQueryOptions = {}): Promise<ProductsResponse> {
  const params = new URLSearchParams()
  if (options.page) params.set('page', String(options.page))
  if (options.limit) params.set('limit', String(options.limit))
  if (options.category && options.category !== 'all') params.set('category', options.category)
  if (options.collection) params.set('collection', options.collection)
  
  const sizeArr = options.sizes || options.size || []
  if (sizeArr.length > 0) params.set('size', sizeArr.join(','))

  const colorArr = options.colors || options.color || []
  if (colorArr.length > 0) params.set('color', colorArr.join(','))

  const fabricArr = options.fabrics || options.fabric || []
  if (fabricArr.length > 0) params.set('fabric', fabricArr.join(','))

  const occasionArr = options.occasions || options.occasion || []
  if (occasionArr.length > 0) params.set('occasion', occasionArr.join(','))

  if (options.inStock !== undefined && options.inStock !== null && options.inStock !== '') {
    params.set('inStock', String(options.inStock))
  } else if (options.stock) {
    params.set('inStock', options.stock === 'in-stock' ? 'true' : 'false')
  }

  const queryText = options.q || options.search
  if (queryText) params.set('q', queryText)

  if (options.sort) params.set('sort', options.sort)
  if (options.minPrice !== undefined && options.minPrice !== null) params.set('minPrice', String(options.minPrice))
  if (options.maxPrice !== undefined && options.maxPrice !== null) params.set('maxPrice', String(options.maxPrice))

  const qs = params.toString()
  const res = await fetch(`${API_URL}/api/products${qs ? `?${qs}` : ''}`, {
    signal: options.signal,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data: {
    items?: ApiProduct[]
    products?: ApiProduct[]
    total: number
    page: number
    limit: number
    totalPages: number
    facets?: FilterFacets
    exactMatch?: boolean
    similar?: ApiProduct[]
  } = await res.json()

  const rawItems = data.items || data.products || []
  const items = rawItems.map(mapApiProduct)
  const rawSimilar = data.similar || []
  const similar = rawSimilar.map(mapApiProduct)

  return {
    items,
    products: items,
    total: data.total ?? items.length,
    page: data.page ?? 1,
    limit: data.limit ?? 12,
    totalPages: data.totalPages ?? 1,
    facets: data.facets || {
      categories: [],
      sizes: [],
      colors: [],
      fabrics: [],
      occasions: [],
      vendors: [],
      priceRange: { min: 700, max: 3500 },
      stock: { inStock: 0, outOfStock: 0 },
      total: data.total ?? 0,
    },
    exactMatch: data.exactMatch !== false,
    similar,
  }
}

// Converts Shopify's stored HTML into safe, readable plain text.
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
    categorySlug: p.category ? p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '',
    img: images[0] ?? '',
    additionalImages: images.slice(1),
    tag: p.isBestseller ? 'BESTSELLER' : p.isNewArrival ? 'NEW' : p.isSale ? 'SALE' : '',
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
          setNotFound(true)
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
  amountPayableNow?: number
  amountDueOnDelivery?: number
  paymentMethod: string
  paymentStatus: string
  orderStatus: string
  courierName?: string
  trackingNumber?: string
  estimatedDelivery?: string
  timeline: OrderTimelineEvent[]
  notes?: string
  createdAt: string
  updatedAt?: string
}

export interface CreateOrderPayload {
  items: Array<{
    productVariantId: number
    quantity: number
  }>
  paymentMethod: 'PREPAID' | 'COD'
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: ShippingAddress
  notes?: string
}

export async function createOrder(
  payload: CreateOrderPayload,
  token?: string | null
): Promise<Order> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Failed to place order.')
  }
  return data.order
}

export async function createPaymentOrder(
  orderNumber: string,
  token?: string | null
): Promise<{
  razorpayOrderId: string
  amount: number
  currency: string
  keyId: string
  orderId: number
  orderNumber: string
  paymentMethod: string
  amountPayableNow: number
  amountDueOnDelivery: number
}> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}/api/payments/create-order`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ orderNumber }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Failed to initialize payment order.')
  }
  return data
}

export async function verifyPayment(
  payload: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  },
  token?: string | null
): Promise<{
  success: boolean
  message: string
  orderNumber: string
  paymentStatus: string
  paymentMethod: string
  razorpayPaymentId: string
  amountPaid: number
  amountDueOnDelivery: number
  totalAmount: number
}> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}/api/payments/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Payment signature verification failed.')
  }
  return data
}

export async function fetchUserOrders(userIdOrEmail: string, token?: string | null): Promise<Order[]> {
  try {
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${API_URL}/api/orders/user/my-orders`, { headers })
    if (!res.ok) return []
    const data: { orders: Order[] } = await res.json()
    return data.orders || []
  } catch {
    return []
  }
}

export async function trackOrder(orderNumber: string, _verify?: string): Promise<Order> {
  const url = `${API_URL}/api/orders/${encodeURIComponent(orderNumber)}`
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