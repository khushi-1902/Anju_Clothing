const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export interface AdminStats {
  totalUsers: number
  totalOrders: number
  totalProducts: number
  pendingOrders: number
  totalRevenue: number
  avgOrderValue: number
  salesByDay: {
    date: string
    orders: number
    revenue: number
  }[]
}

export interface AdminOrder {
  id: number
  orderNumber: string
  clerkUserId?: string | null
  customerName: string
  customerEmail: string
  customerPhone?: string
  shippingAddress?: {
    street: string
    city: string
    state: string
    pincode: string
    country?: string
  }
  items: {
    id: string
    name: string
    price: number
    quantity: number
    selectedSize?: string
    selectedColor?: string
    img?: string
  }[]
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
  trackingId?: string | null
  trackingUrl?: string | null
  whatsappConfirmedAt?: string | null
  whatsappShippedAt?: string | null
  estimatedDelivery?: string
  notes?: string
  razorpayOrderId?: string | null
  razorpayPaymentId?: string | null
  timeline?: {
    status: string
    time: string
    completed: boolean
    description?: string
  }[]
  createdAt: string
  updatedAt?: string
}

export interface AdminProduct {
  id: number
  handle: string
  sku?: string | null
  name: string
  category: string | null
  fabric: string | null
  price: number
  comparePrice: number | null
  isNewArrival: boolean
  isBestseller: boolean
  isSale: boolean
  videoUrl?: string | null
  isCreatorsFavourite?: boolean
  totalStock: number
  images: { url: string; alt: string | null }[]
  variants: {
    id: number
    size: string | null
    color: string | null
    price: number
    compareAtPrice: number | null
    stock: number
    imageUrl: string | null
  }[]
  createdAt: string
}

export interface AdminUser {
  id: number
  clerkUserId: string
  email: string
  name: string | null
  role: 'CUSTOMER' | 'ADMIN'
  orderCount: number
  totalSpent: number
  createdAt: string
  updatedAt?: string
}

export interface AuthProfileResponse {
  user: {
    id?: number
    clerkUserId: string
    email?: string
    name?: string | null
    role: 'CUSTOMER' | 'ADMIN'
  }
  isAdmin: boolean
}

/**
 * Checks the user's role in PostgreSQL using Clerk session token.
 */
export async function checkAuthRole(token: string | null): Promise<AuthProfileResponse> {
  if (!token) {
    return {
      user: { clerkUserId: '', role: 'CUSTOMER' },
      isAdmin: false,
    }
  }

  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return {
        user: { clerkUserId: '', role: 'CUSTOMER' },
        isAdmin: false,
      }
    }
    throw new Error(`Failed to verify role: HTTP ${res.status}`)
  }

  return res.json()
}

/**
 * Fetches dashboard analytics and real PostgreSQL metrics.
 */
export async function fetchAdminStats(token: string): Promise<AdminStats> {
  const res = await fetch(`${API_URL}/api/admin/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to fetch stats: HTTP ${res.status}`)
  }

  return res.json()
}

/**
 * Fetches recent orders for dashboard.
 */
export async function fetchRecentOrders(token: string): Promise<AdminOrder[]> {
  const res = await fetch(`${API_URL}/api/admin/orders/recent`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to fetch recent orders: HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.orders || []
}

/**
 * Fetches all orders with optional status and search filter.
 */
export async function fetchAdminOrders(token: string, status?: string, search?: string): Promise<AdminOrder[]> {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.set('status', status)
  if (search && search.trim()) params.set('search', search.trim())
  const qs = params.toString()

  const res = await fetch(`${API_URL}/api/admin/orders${qs ? `?${qs}` : ''}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to fetch orders: HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.orders || []
}

/**
 * Fetches products list for admin.
 */
export async function fetchAdminProducts(token: string, search?: string, category?: string): Promise<AdminProduct[]> {
  const params = new URLSearchParams()
  if (search && search.trim()) params.set('search', search.trim())
  if (category && category !== 'all') params.set('category', category)
  const qs = params.toString()

  const res = await fetch(`${API_URL}/api/admin/products${qs ? `?${qs}` : ''}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to fetch products: HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.products || []
}

/**
 * Fetches single order details for admin inspection.
 */
export async function fetchAdminOrderDetail(token: string, orderNumber: string): Promise<AdminOrder> {
  const res = await fetch(`${API_URL}/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to fetch order details: HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.order
}

/**
 * Updates order status, payment status, courier & tracking info.
 */
export async function updateOrderStatus(
  token: string,
  orderNumber: string,
  payload: {
    orderStatus?: string
    paymentStatus?: string
    trackingNumber?: string
    courierName?: string
    estimatedDelivery?: string
    notes?: string
  }
): Promise<AdminOrder> {
  const res = await fetch(`${API_URL}/api/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to update order: HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.order
}

/**
 * Records that the order confirmation WhatsApp message was sent/opened.
 */
export async function markOrderWhatsAppConfirmed(
  token: string,
  orderNumber: string
): Promise<AdminOrder> {
  const res = await fetch(`${API_URL}/api/admin/orders/${encodeURIComponent(orderNumber)}/whatsapp-confirmed`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to record WhatsApp confirmation: HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.order
}

/**
 * Validates & records courier/tracking info and marks WhatsApp shipping message as sent/opened.
 */
export async function markOrderWhatsAppShipped(
  token: string,
  orderNumber: string,
  payload: {
    courierName: string
    trackingId: string
    trackingUrl: string
  }
): Promise<AdminOrder> {
  const res = await fetch(`${API_URL}/api/admin/orders/${encodeURIComponent(orderNumber)}/whatsapp-shipped`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to save shipping & WhatsApp details: HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.order
}

/**
 * Initiates Razorpay refund for an order via backend.
 */
export async function refundAdminOrder(
  token: string,
  orderNumber: string,
  amountInRupees?: number,
  reason?: string
): Promise<{ success: boolean; message: string; refundId: string; order: AdminOrder }> {
  const res = await fetch(`${API_URL}/api/payments/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderNumber, amountInRupees, reason }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Refund failed: HTTP ${res.status}`)
  }

  return await res.json()
}

/**
 * Uploads images to Cloudinary via backend.
 */
export async function uploadProductImages(
  token: string,
  files: File[]
): Promise<{ url: string; publicId: string }[]> {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('images', file)
  })

  const res = await fetch(`${API_URL}/api/admin/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to upload images: HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.images || []
}

export interface ProductInputPayload {
  name: string
  handle?: string
  sku?: string | null
  category: string
  fabric?: string
  work?: string
  descriptionHtml?: string
  price: number
  comparePrice?: number | null
  isNewArrival?: boolean
  isBestseller?: boolean
  isSale?: boolean
  videoUrl?: string | null
  isCreatorsFavourite?: boolean
  images: { url: string; alt?: string; position?: number }[]
  variants: {
    id?: number
    size?: string | null
    color?: string | null
    price?: number
    compareAtPrice?: number | null
    stock?: number
    imageUrl?: string | null
  }[]
}

/**
 * Creates a new product.
 */
export async function createAdminProduct(
  token: string,
  payload: ProductInputPayload
): Promise<AdminProduct> {
  const res = await fetch(`${API_URL}/api/admin/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to create product: HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.product
}

/**
 * Updates an existing product.
 */
export async function updateAdminProduct(
  token: string,
  id: number,
  payload: ProductInputPayload
): Promise<AdminProduct> {
  const res = await fetch(`${API_URL}/api/admin/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to update product: HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.product
}

/**
 * Deletes a product by ID.
 */
export async function deleteAdminProduct(
  token: string,
  id: number
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/api/admin/products/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to delete product: HTTP ${res.status}`)
  }

  return res.json()
}

/**
 * Fetches registered users from database.
 */
export async function fetchAdminUsers(
  token: string,
  search?: string,
  role?: string
): Promise<AdminUser[]> {
  const params = new URLSearchParams()
  if (search && search.trim()) params.set('search', search.trim())
  if (role && role !== 'all') params.set('role', role)
  const qs = params.toString()

  const res = await fetch(`${API_URL}/api/admin/users${qs ? `?${qs}` : ''}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to fetch users: HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.users || []
}

/**
 * Promotes or demotes user role between CUSTOMER and ADMIN.
 */
export async function updateUserRole(
  token: string,
  identifier: string | number,
  role: 'CUSTOMER' | 'ADMIN'
): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(identifier)}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to update user role: HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.user
}

export interface StoreSettings {
  defaultCourier: string
  flatFee: number
  freeThreshold: number
  estimatedDelivery: string
  codAdvanceAmount?: number
  supportPhone?: string
  supportEmail?: string
  announcementText?: string
}

export interface RawSettingItem {
  key: string
  value: string
  description?: string
  updatedAt?: string
}

/**
 * Fetches settings for admin dashboard.
 */
export async function fetchAdminSettings(token: string): Promise<{
  formatted: StoreSettings
  settings: RawSettingItem[]
}> {
  const res = await fetch(`${API_URL}/api/admin/settings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to fetch settings: HTTP ${res.status}`)
  }

  return res.json()
}

/**
 * Updates store settings in PostgreSQL.
 */
export async function updateAdminSettings(
  token: string,
  payload: Partial<StoreSettings> & { customKeyValues?: { key: string; value: string }[] }
): Promise<{ success: boolean; formatted: StoreSettings; settings: RawSettingItem[] }> {
  const res = await fetch(`${API_URL}/api/admin/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to update settings: HTTP ${res.status}`)
  }

  return res.json()
}

/**
 * Public helper to fetch shipping settings for storefront.
 */
export async function fetchPublicShippingSettings(): Promise<StoreSettings> {
  const res = await fetch(`${API_URL}/api/settings/shipping`)
  if (!res.ok) {
    return {
      defaultCourier: 'Blue Dart Express',
      flatFee: 99,
      freeThreshold: 1999,
      estimatedDelivery: '3–5 Business Days',
      codAdvanceAmount: 200,
    }
  }
  return res.json()
}



