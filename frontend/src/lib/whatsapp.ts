/**
 * WhatsApp Click-to-Chat Utilities for Anju Clothing
 * Direct customer communications via https://wa.me click-to-chat links.
 */

/**
 * Normalizes Indian phone numbers:
 * - Strips all non-digits
 * - 10 digits starting with 6-9 -> "91" + digits
 * - "0" + 10 digits starting with 6-9 (11 digits starting with 0) -> "91" + last 10 digits
 * - 12 digits starting with "91" (and 3rd digit 6-9) -> as is
 * - Returns null otherwise
 */
export function normalizeIndianPhone(raw?: string | null): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')

  // 10 digits: 9876543210
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return `91${digits}`
  }

  // 11 digits with leading 0: 09876543210
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]\d{9}$/.test(digits.slice(1))) {
    return `91${digits.slice(1)}`
  }

  // 12 digits with country code 91: 919876543210
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) {
    return digits
  }

  return null
}

/**
 * Formats a phone number for UI display: +91 98765 43210
 */
export function formatDisplayPhone(raw?: string | null): string {
  if (!raw) return '—'
  const normalized = normalizeIndianPhone(raw)
  if (normalized && normalized.length === 12) {
    const national = normalized.slice(2)
    return `+91 ${national.slice(0, 5)} ${national.slice(5)}`
  }
  return String(raw).trim()
}

/**
 * Formats a timestamp into friendly format: e.g. "07 Oct, 9:30 pm"
 */
export function formatWhatsAppTimestamp(dateInput?: string | Date | null): string {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return ''

  const dayMonth = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase()

  return `${dayMonth}, ${time}`
}

/**
 * Encodes and builds the click-to-chat URL
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

/**
 * Cleans order number so it does not end up with duplicate '#' marks
 */
function sanitizeOrderNumber(orderNumber: string): string {
  return String(orderNumber || '').replace(/^#+/, '').trim()
}

/**
 * Builds Order Confirmation message
 */
export function buildConfirmedMessage(order: {
  customerName?: string
  orderNumber: string
}): string {
  const name = (order.customerName || 'Valued Customer').trim()
  const cleanOrderNum = sanitizeOrderNumber(order.orderNumber)

  return `Hi ${name}, your order #${cleanOrderNum} has been confirmed! ❤️

Thank you for shopping with us.

We will notify you once your order has been shipped.`
}

/**
 * Builds Items Summary string:
 * "{productName} - {size} × {quantity}" joined by ", "
 * Omit " - {size}" if no size.
 */
export function buildItemsSummary(items?: any[]): string {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Ordered Outfits'
  }

  return items
    .map((item) => {
      const name = item.name || item.productName || item.title || 'Item'
      const size = item.selectedSize || item.size || ''
      const qty = item.quantity || item.qty || 1
      const sizePart = size ? ` - ${size}` : ''
      return `${name}${sizePart} × ${qty}`
    })
    .join(', ')
}

/**
 * Builds Order Shipped message
 */
export function buildShippedMessage(
  order: {
    customerName?: string
    orderNumber: string
    items?: any[]
  },
  shipping: {
    courier: string
    trackingId: string
    trackingUrl: string
  }
): string {
  const name = (order.customerName || 'Valued Customer').trim()
  const cleanOrderNum = sanitizeOrderNumber(order.orderNumber)
  const itemsSummary = buildItemsSummary(order.items)
  const courier = (shipping.courier || 'Courier Partner').trim()
  const trackingId = (shipping.trackingId || '').trim()
  const trackingUrl = (shipping.trackingUrl || '').trim()

  return `Hi ${name}, your order is on the way! 🚚✨

Order: #${cleanOrderNum}
Courier: ${courier}
Tracking ID: ${trackingId}

🔗 Track here: ${trackingUrl}

🛍️ *${itemsSummary}*

📹 Please note: An unboxing video is mandatory for any exchange request. Kindly record a clear video while opening your parcel.

Thank you for shopping with us ❤️`
}

/**
 * Opens WhatsApp link in a secure new tab
 */
export function openWhatsAppLink(link: string): void {
  window.open(link, '_blank', 'noopener,noreferrer')
}
