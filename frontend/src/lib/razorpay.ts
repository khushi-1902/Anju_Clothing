/**
 * Helper to dynamically load the official Razorpay Checkout.js script.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout.js script.')
      resolve(false)
    }

    document.body.appendChild(script)
  })
}
