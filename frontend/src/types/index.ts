export type PageType = 'home' | 'all-products' | 'bestsellers' | 'contact' | 'product-detail' | 'login' | 'signup' | 'account' | 'orders' | 'track-order'

export interface ShopUser {
  firstName: string
  lastName: string
  email: string
  phone?: string
}

export interface SignupPayload {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}

export interface Product {
  id: string
  name: string
  price: number
  originalPrice: number
  category: string
  categorySlug: string
  img?: string
  additionalImages?: string[]
  tag?: string
  sold?: string
  discount?: string
  rating?: number
  reviewCount?: number
  description?: string
  fabric?: string
  work?: string
  sizes?: string[]
  colors?: string[]
  variants?: { id?: number; size?: string | null; color?: string | null; price?: number; compareAtPrice?: number | null; imageUrl?: string | null }[]
  colorImageMap?: Record<string, string>
  inStock?: boolean
  isNewArrival?: boolean
  isBestseller?: boolean
  isSale?: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  img?: string
  itemCount?: number
}

export interface Review {
  id: string
  name: string
  rating: number
  text: string
  product: string
  date?: string
  location?: string
}

export interface CartItem {
  product: Product
  quantity: number
  selectedSize: string
  selectedColor?: string
}

export interface TrustItem {
  icon: string
  label: string
  sub: string
}
