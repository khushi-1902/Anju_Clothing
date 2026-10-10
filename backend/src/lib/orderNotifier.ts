import nodemailer from 'nodemailer'

/**
 * Escapes user-supplied text to prevent HTML injection in emails.
 */
function escapeHtml(value: any): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Ensures order ID displays with a clean leading `#` (e.g. #01, #02).
 */
function formatDisplayOrderNumber(orderNumber: any, id?: any): string {
  const raw = String(orderNumber || id || '').trim()
  if (!raw) return '#01'
  return raw.startsWith('#') ? raw : `#${raw}`
}

/**
 * Renders an image thumbnail element for an order item.
 * Supports absolute HTTPS URLs and falls back gracefully to a neat placeholder icon.
 */
function renderItemImage(item: any): string {
  const rawUrl = item.imageUrl || item.image || item.img || item.product?.img || item.product?.imageUrl
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.startsWith('http')) {
    return `
      <div style="width: 56px; height: 72px; background-color: #faf5ee; border-radius: 6px; border: 1px solid #ebdccb; text-align: center; line-height: 72px; font-size: 22px;">
        👗
      </div>
    `
  }

  const cleanUrl = escapeHtml(rawUrl.trim())
  const altText = escapeHtml(item.name || item.title || 'Outfit')
  return `
    <img 
      src="${cleanUrl}" 
      alt="${altText}" 
      width="56" 
      height="72" 
      style="width: 56px; height: 72px; object-fit: cover; border-radius: 6px; border: 1px solid #ebdccb; display: block;" 
    />
  `
}

/**
 * Formats shipping address into clean readable lines.
 */
function formatShippingAddress(addr: any): string {
  if (!addr) return 'Not provided'
  let parsed = addr
  if (typeof addr === 'string') {
    try {
      parsed = JSON.parse(addr)
    } catch {
      return escapeHtml(addr)
    }
  }

  const parts = [
    parsed.street || parsed.addressLine1 || parsed.address,
    parsed.landmark ? `Landmark: ${parsed.landmark}` : null,
    parsed.city,
    parsed.state,
    parsed.pincode ? `PIN: ${parsed.pincode}` : null,
    parsed.country || 'India',
  ].filter(Boolean)

  return parts.map(p => escapeHtml(p)).join('<br/>')
}

/**
 * Normalizes order items list into an array.
 */
function normalizeItems(rawItems: any): any[] {
  if (!rawItems) return []
  if (Array.isArray(rawItems)) return rawItems
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

let warnedMissingConfig = false

/**
 * Creates and caches nodemailer transporter.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 465)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    if (!warnedMissingConfig) {
      console.warn('[orderNotifier] SMTP environment variables missing (SMTP_HOST, SMTP_USER, SMTP_PASS). Order email notifications disabled.')
      warnedMissingConfig = true
    }
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for port 465, false for 587 or other ports
    auth: {
      user,
      pass,
    },
  })
}

/**
 * Sends HTML notification email to ADMIN_NOTIFY_EMAIL for a newly confirmed order.
 * - Customer name is prominently highlighted in subject line and body.
 * - Simple order number (e.g. #01).
 * - Displays item thumbnail image for each ordered outfit.
 * - Fire-and-forget: Catches all errors and never throws.
 */
export async function notifyNewOrder(order: any): Promise<void> {
  try {
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL
    if (!adminEmail) {
      if (!warnedMissingConfig) {
        console.warn('[orderNotifier] ADMIN_NOTIFY_EMAIL is not set. Admin notification skipped.')
        warnedMissingConfig = true
      }
      return
    }

    const transporter = getTransporter()
    if (!transporter) return

    const displayOrderNumber = escapeHtml(formatDisplayOrderNumber(order.orderNumber, order.id))
    const totalAmount = Number(order.totalAmount ?? 0).toLocaleString('en-IN')
    const paymentMethod = escapeHtml(order.paymentMethod || 'PREPAID')
    const paymentStatus = escapeHtml(order.paymentStatus || 'PAID')
    const amountDue = Number(order.amountDueOnDelivery ?? 0)
    const amountPayableNow = Number(order.amountPayableNow ?? order.totalAmount ?? 0).toLocaleString('en-IN')

    const customerName = escapeHtml(order.customerName || 'Customer')
    const customerPhone = escapeHtml(order.customerPhone || 'N/A')
    const customerEmail = escapeHtml(order.customerEmail || 'N/A')
    const addressHtml = formatShippingAddress(order.shippingAddress)

    const items = normalizeItems(order.items)
    const itemsRowsHtml = items
      .map((item: any) => {
        const name = escapeHtml(item.name || item.title || 'Outfit')
        const size = escapeHtml(item.size || item.selectedSize || 'Standard')
        const color = item.color || item.selectedColor ? escapeHtml(item.color || item.selectedColor) : null
        const qty = Number(item.quantity || 1)
        const price = Number(item.price || 0).toLocaleString('en-IN')
        const lineTotal = (Number(item.price || 0) * qty).toLocaleString('en-IN')
        const imageCell = renderItemImage(item)

        return `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 8px; width: 60px; vertical-align: middle;">
              ${imageCell}
            </td>
            <td style="padding: 10px 8px; text-align: left; vertical-align: middle;">
              <strong style="color: #2d2621; font-size: 14px;">${name}</strong><br/>
              <span style="font-size: 12px; color: #777;">Size: <strong>${size}</strong>${color ? ` &bull; Color: ${color}` : ''}</span>
            </td>
            <td style="padding: 10px 8px; text-align: center; vertical-align: middle; font-size: 14px;">${qty}</td>
            <td style="padding: 10px 8px; text-align: right; vertical-align: middle; font-size: 14px;">₹${price}</td>
            <td style="padding: 10px 8px; text-align: right; font-weight: bold; vertical-align: middle; font-size: 14px; color: #3e502a;">₹${lineTotal}</td>
          </tr>
        `
      })
      .join('')

    const dueNoticeHtml =
      amountDue > 0
        ? `
          <div style="background-color: #fff4e5; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; border-radius: 4px;">
            <strong style="color: #b45309;">⚠️ Cash on Delivery Collection Required:</strong><br/>
            <span style="font-size: 14px; color: #78350f;">Collect <strong>₹${amountDue.toLocaleString('en-IN')}</strong> from customer upon delivery. (₹${amountPayableNow} advance shipping already received online).</span>
          </div>
        `
        : `
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; margin: 16px 0; border-radius: 4px;">
            <strong style="color: #047857;">✓ Fully Paid Online:</strong><br/>
            <span style="font-size: 14px; color: #065f46;">Full payment of ₹${totalAmount} received and verified via Razorpay. Nothing to collect on delivery.</span>
          </div>
        `

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>New Order ${displayOrderNumber} from ${customerName}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9f7f4; margin: 0; padding: 24px; color: #2d2621;">
        <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #ebdccb;">
          
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #3e502a, #2a371c); color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-serif: 'Playfair Display', Georgia, serif; letter-spacing: 0.5px;">ANJU CLOTHING</h1>
            <p style="margin: 6px 0 0; font-size: 14px; color: #fae5a0; letter-spacing: 1px; text-transform: uppercase;">New Order Received</p>
          </div>

          <!-- Order Summary Card -->
          <div style="padding: 24px;">
            
            <!-- Prominent Customer Details Banner -->
            <div style="background-color: #faf5ee; border-left: 4px solid #769055; padding: 14px 18px; margin-bottom: 20px; border-radius: 6px;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #769055; font-weight: bold;">Customer Information</span>
              <div style="font-size: 18px; font-weight: bold; color: #2d2621; margin: 4px 0 3px;">👤 ${customerName}</div>
              <div style="font-size: 13px; color: #555; line-height: 1.5;">
                📞 <strong style="color: #2d2621;">${customerPhone}</strong> &nbsp;|&nbsp; 
                ✉️ <a href="mailto:${customerEmail}" style="color: #3e502a; text-decoration: none; font-weight: 500;">${customerEmail}</a>
              </div>
            </div>

            <h2 style="margin: 0 0 16px; font-size: 18px; color: #3e502a; border-bottom: 2px solid #fae5a0; padding-bottom: 8px;">
              Order Summary: ${displayOrderNumber}
            </h2>

            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
              <tr>
                <td style="padding: 6px 0; color: #666;">Customer Name:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #2d2621;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;">Order ID:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #3e502a;">${displayOrderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;">Total Amount:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; font-size: 16px; color: #3e502a;">₹${totalAmount}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;">Payment Method:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right;">${paymentMethod}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;">Payment Status:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #059669;">${paymentStatus}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;">Razorpay Payment ID:</td>
                <td style="padding: 6px 0; font-family: monospace; text-align: right; font-size: 12px; color: #555;">${escapeHtml(order.razorpayPaymentId || 'N/A')}</td>
              </tr>
            </table>

            ${dueNoticeHtml}

            <!-- Delivery Address Section -->
            <div style="margin: 20px 0; background-color: #faf8f5; border: 1px solid #f0e8dc; border-radius: 8px; padding: 16px;">
              <h3 style="margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #769055;">Delivery Address</h3>
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #444;">
                ${addressHtml}
              </p>
            </div>

            <!-- Ordered Items Table with Images -->
            <h3 style="margin: 24px 0 12px; font-size: 15px; color: #3e502a; text-transform: uppercase; letter-spacing: 0.5px;">Ordered Items</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
              <thead>
                <tr style="background-color: #faf5ee; color: #555; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
                  <th style="padding: 8px; text-align: left; width: 60px;">Image</th>
                  <th style="padding: 8px; text-align: left;">Item</th>
                  <th style="padding: 8px; text-align: center;">Qty</th>
                  <th style="padding: 8px; text-align: right;">Price</th>
                  <th style="padding: 8px; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRowsHtml}
              </tbody>
            </table>

            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ebdccb; text-align: center; font-size: 12px; color: #888;">
              This is an automated notification from your Anju Clothing store.
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    const mailOptions = {
      from: `"Anju Clothing Orders" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `New Order ${displayOrderNumber} from ${customerName} — ₹${totalAmount}`,
      html,
    }

    await transporter.sendMail(mailOptions)
    console.log(`[orderNotifier] ✓ Admin notification sent for order ${displayOrderNumber} (${customerName}) to ${adminEmail}`)
  } catch (error: any) {
    console.error('[orderNotifier] ⚠️ Failed to send admin order notification:', error?.message || error)
  }
}

/**
 * Sends a clean order confirmation receipt to the customer's email.
 * - Customer's name, simple order number (#01), and product thumbnail photos are included.
 * - Skips quietly if customerEmail is empty.
 * - Fire-and-forget: Catches all errors and never throws.
 */
export async function notifyCustomerOrderConfirmation(order: any): Promise<void> {
  try {
    const customerEmail = String(order.customerEmail || '').trim()
    if (!customerEmail || !customerEmail.includes('@')) {
      return // Skip quietly if no valid email
    }

    const transporter = getTransporter()
    if (!transporter) return

    const displayOrderNumber = escapeHtml(formatDisplayOrderNumber(order.orderNumber, order.id))
    const customerName = escapeHtml(order.customerName || 'Valued Customer')
    const totalAmount = Number(order.totalAmount ?? 0).toLocaleString('en-IN')
    const paymentMethod = escapeHtml(order.paymentMethod || 'PREPAID')
    const amountDue = Number(order.amountDueOnDelivery ?? 0)

    const items = normalizeItems(order.items)
    const itemsRowsHtml = items
      .map((item: any) => {
        const name = escapeHtml(item.name || item.title || 'Outfit')
        const size = escapeHtml(item.size || item.selectedSize || 'Standard')
        const color = item.color || item.selectedColor ? escapeHtml(item.color || item.selectedColor) : null
        const qty = Number(item.quantity || 1)
        const price = Number(item.price || 0).toLocaleString('en-IN')
        const lineTotal = (Number(item.price || 0) * qty).toLocaleString('en-IN')
        const imageCell = renderItemImage(item)

        return `
          <tr style="border-bottom: 1px solid #f0e8dc;">
            <td style="padding: 12px 10px 12px 0; width: 60px; vertical-align: middle;">
              ${imageCell}
            </td>
            <td style="padding: 12px 8px; vertical-align: middle; text-align: left;">
              <strong style="color: #2d2621; font-size: 14px;">${name}</strong><br/>
              <span style="font-size: 12px; color: #777;">Size: <strong>${size}</strong>${color ? ` &bull; Color: ${color}` : ''} &bull; Qty: <strong>${qty}</strong></span>
            </td>
            <td style="padding: 12px 0 12px 8px; vertical-align: middle; text-align: right; font-weight: bold; font-size: 14px; color: #3e502a;">
              ₹${lineTotal}
            </td>
          </tr>
        `
      })
      .join('')

    const dueMessage =
      amountDue > 0
        ? `<p style="background: #fff4e5; padding: 10px; border-radius: 6px; color: #92400e;"><strong>Balance on Delivery:</strong> ₹${amountDue.toLocaleString('en-IN')} will be collected by the courier partner in cash upon doorstep delivery.</p>`
        : `<p style="color: #047857;"><strong>Payment Confirmed:</strong> Your payment has been received and verified in full.</p>`

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #faf8f5; margin: 0; padding: 24px; color: #2d2621;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 28px; border: 1px solid #ebdccb;">
          <h1 style="color: #3e502a; font-size: 22px; margin-top: 0;">Thank You for Your Order, ${customerName}!</h1>
          <p style="font-size: 15px; margin: 0 0 10px;">Hi <strong>${customerName}</strong>,</p>
          <p style="font-size: 14px; margin: 0 0 18px; color: #444; line-height: 1.5;">We have successfully received your order <strong>${displayOrderNumber}</strong>. Our master artisans are now preparing your handcrafted pieces with great care.</p>
          
          <div style="background: #faf5ee; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 6px;"><strong>Order ID:</strong> ${displayOrderNumber}</p>
            <p style="margin: 0 0 6px;"><strong>Customer:</strong> ${customerName}</p>
            <p style="margin: 0 0 6px;"><strong>Total Amount:</strong> ₹${totalAmount}</p>
            <p style="margin: 0 0 6px;"><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p style="margin: 0;"><strong>Estimated Delivery:</strong> 3–5 Business Days</p>
          </div>

          ${dueMessage}

          <h3 style="color: #3e502a; margin-top: 24px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Items in Your Order</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>

          <p style="font-size: 13px; color: #666; margin-top: 28px; border-top: 1px solid #eee; padding-top: 16px;">
            If you have any questions about your order or need alterations assistance, please reply to this email or contact us via WhatsApp support.
          </p>
        </div>
      </body>
      </html>
    `

    const mailOptions = {
      from: `"Anju Clothing" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `Order Confirmation ${displayOrderNumber} — ${customerName} | Anju Clothing`,
      html,
    }

    await transporter.sendMail(mailOptions)
    console.log(`[orderNotifier] ✓ Customer confirmation sent for order ${displayOrderNumber} (${customerName}) to ${customerEmail}`)
  } catch (error: any) {
    console.error('[orderNotifier] ⚠️ Failed to send customer order confirmation:', error?.message || error)
  }
}
