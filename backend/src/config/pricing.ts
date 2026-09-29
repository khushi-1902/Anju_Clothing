/**
 * Pricing and shipping fee business rules.
 * All monetary amounts in this configuration are represented in whole Indian Rupees (INR).
 */

/**
 * The advance shipping charge paid online through Razorpay for Cash on Delivery (COD) orders.
 * This is an extra charge collected upfront for courier booking confirmation,
 * while the full dress price (subtotal) is collected by the courier on delivery.
 */
export const COD_SHIPPING_FEE = 200
