import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { AdminOrder, markOrderWhatsAppConfirmed, markOrderWhatsAppShipped } from '../adminApi'
import {
  normalizeIndianPhone,
  formatDisplayPhone,
  formatWhatsAppTimestamp,
  buildWhatsAppLink,
  buildConfirmedMessage,
  buildShippedMessage,
  openWhatsAppLink,
} from '../../lib/whatsapp'

interface WhatsAppUpdatesSectionProps {
  order: AdminOrder
  onOrderUpdated: (updatedOrder: AdminOrder) => void
}

const COURIER_OPTIONS = ['Delhivery', 'Blue Dart', 'DTDC', 'India Post', 'Other']

export function WhatsAppUpdatesSection({ order, onOrderUpdated }: WhatsAppUpdatesSectionProps) {
  const { getToken } = useAuth()

  // Shipping Form State
  const [courier, setCourier] = useState<string>(() => {
    const existing = order.courierName || ''
    if (COURIER_OPTIONS.includes(existing)) return existing
    if (existing) return 'Other'
    return 'Delhivery'
  })
  const [customCourier, setCustomCourier] = useState<string>(() => {
    const existing = order.courierName || ''
    return COURIER_OPTIONS.includes(existing) ? '' : existing
  })
  const [trackingId, setTrackingId] = useState<string>(order.trackingId || order.trackingNumber || '')
  const [trackingUrl, setTrackingUrl] = useState<string>(() => {
    if (order.trackingUrl) return order.trackingUrl
    const initialId = order.trackingId || order.trackingNumber || ''
    return initialId ? `https://www.delhivery.com/track/package/${initialId}` : ''
  })
  const [userEditedUrl, setUserEditedUrl] = useState(false)

  // Editable Messages State
  const [confirmedMessage, setConfirmedMessage] = useState<string>(() => {
    return buildConfirmedMessage({
      customerName: order.customerName,
      orderNumber: order.orderNumber,
    })
  })
  const [shippedMessage, setShippedMessage] = useState<string>('')
  const [isShippedCustomized, setIsShippedCustomized] = useState(false)

  // Copy feedback state
  const [copiedConfirmed, setCopiedConfirmed] = useState(false)
  const [copiedShipped, setCopiedShipped] = useState(false)

  // Loading & Feedback State
  const [loadingConfirmed, setLoadingConfirmed] = useState(false)
  const [loadingShipped, setLoadingShipped] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Sync with order props changes
  useEffect(() => {
    const currentCourier = order.courierName || ''
    if (COURIER_OPTIONS.includes(currentCourier)) {
      setCourier(currentCourier)
      setCustomCourier('')
    } else if (currentCourier) {
      setCourier('Other')
      setCustomCourier(currentCourier)
    } else {
      setCourier('Delhivery')
    }

    const currentTrackingId = order.trackingId || order.trackingNumber || ''
    setTrackingId(currentTrackingId)

    if (order.trackingUrl) {
      setTrackingUrl(order.trackingUrl)
      setUserEditedUrl(true)
    } else if (currentTrackingId) {
      setTrackingUrl(`https://www.delhivery.com/track/package/${currentTrackingId}`)
      setUserEditedUrl(false)
    } else {
      setTrackingUrl('')
      setUserEditedUrl(false)
    }

    // Refresh default confirmed message on order change
    setConfirmedMessage(
      buildConfirmedMessage({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
      })
    )
  }, [order])

  const effectiveCourierName = useMemo(() => {
    if (courier === 'Other') {
      return customCourier.trim() || 'Courier Partner'
    }
    return courier
  }, [courier, customCourier])

  // Automatically update shippedMessage when shipping fields change IF admin hasn't customized it manually
  useEffect(() => {
    if (!isShippedCustomized) {
      setShippedMessage(
        buildShippedMessage(
          {
            customerName: order.customerName,
            orderNumber: order.orderNumber,
            items: order.items,
          },
          {
            courier: effectiveCourierName,
            trackingId: trackingId.trim() || '[Tracking ID]',
            trackingUrl: trackingUrl.trim() || '[Tracking URL]',
          }
        )
      )
    }
  }, [order.customerName, order.orderNumber, order.items, effectiveCourierName, trackingId, trackingUrl, isShippedCustomized])

  // Auto-fill Delhivery tracking URL when courier is Delhivery & trackingId updates
  const handleCourierChange = (newCourier: string) => {
    setCourier(newCourier)
    if (newCourier === 'Delhivery') {
      if (trackingId.trim()) {
        setTrackingUrl(`https://www.delhivery.com/track/package/${trackingId.trim()}`)
      }
    }
  }

  const handleTrackingIdChange = (newId: string) => {
    setTrackingId(newId)
    if (courier === 'Delhivery' && !userEditedUrl) {
      setTrackingUrl(newId.trim() ? `https://www.delhivery.com/track/package/${newId.trim()}` : '')
    }
  }

  // Phone Validation
  const normalizedPhone = useMemo(() => normalizeIndianPhone(order.customerPhone), [order.customerPhone])
  const isValidPhone = Boolean(normalizedPhone)

  // Shipped Form Validation
  const isTrackingUrlValid = useMemo(() => {
    const trimmed = trackingUrl.trim()
    return Boolean(trimmed && /^https?:\/\//i.test(trimmed))
  }, [trackingUrl])

  const isShippedFormValid = useMemo(() => {
    const hasCourier = courier === 'Other' ? Boolean(customCourier.trim()) : Boolean(courier.trim())
    const hasTrackingId = Boolean(trackingId.trim())
    return isValidPhone && hasCourier && hasTrackingId && isTrackingUrlValid
  }, [isValidPhone, courier, customCourier, trackingId, isTrackingUrlValid])

  // Handlers for Resetting Messages
  const handleResetConfirmedMessage = () => {
    setConfirmedMessage(
      buildConfirmedMessage({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
      })
    )
  }

  const handleResetShippedMessage = () => {
    setIsShippedCustomized(false)
    setShippedMessage(
      buildShippedMessage(
        {
          customerName: order.customerName,
          orderNumber: order.orderNumber,
          items: order.items,
        },
        {
          courier: effectiveCourierName,
          trackingId: trackingId.trim() || '[Tracking ID]',
          trackingUrl: trackingUrl.trim() || '[Tracking URL]',
        }
      )
    )
  }

  // Copy Handlers
  const handleCopyConfirmed = () => {
    navigator.clipboard.writeText(confirmedMessage)
    setCopiedConfirmed(true)
    setTimeout(() => setCopiedConfirmed(false), 2000)
  }

  const handleCopyShipped = () => {
    navigator.clipboard.writeText(shippedMessage)
    setCopiedShipped(true)
    setTimeout(() => setCopiedShipped(false), 2000)
  }

  // 1. Handle Send Confirmation
  const handleSendConfirmation = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!isValidPhone || !normalizedPhone) {
      setErrorMsg('Invalid customer phone number. Must be a valid Indian mobile number.')
      return
    }

    if (!confirmedMessage.trim()) {
      setErrorMsg('Confirmation message cannot be empty.')
      return
    }

    try {
      setLoadingConfirmed(true)
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication token unavailable. Please re-login.')
      }

      // Step 1: Call PATCH endpoint to record timestamp
      const updatedOrder = await markOrderWhatsAppConfirmed(token, order.orderNumber)
      onOrderUpdated(updatedOrder)

      // Step 2: Build wa.me link with admin-edited message & open
      const link = buildWhatsAppLink(normalizedPhone, confirmedMessage.trim())
      openWhatsAppLink(link)

      setSuccessMsg('WhatsApp confirmation link opened successfully!')
    } catch (err: any) {
      console.error('Failed to send WhatsApp confirmation:', err)
      setErrorMsg(err.message || 'Failed to record WhatsApp confirmation. WhatsApp was not opened.')
    } finally {
      setLoadingConfirmed(false)
    }
  }

  // 2. Handle Send Shipping Update
  const handleSendShippingUpdate = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!isValidPhone || !normalizedPhone) {
      setErrorMsg('Invalid customer phone number. Must be a valid Indian mobile number.')
      return
    }

    if (!isShippedFormValid) {
      if (!trackingId.trim()) {
        setErrorMsg('Please provide a valid Tracking ID.')
        return
      }
      if (!isTrackingUrlValid) {
        setErrorMsg('Tracking URL is required and must start with http:// or https://')
        return
      }
      setErrorMsg('Please fill all required courier and tracking details.')
      return
    }

    if (!shippedMessage.trim()) {
      setErrorMsg('Tracking message cannot be empty.')
      return
    }

    try {
      setLoadingShipped(true)
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication token unavailable. Please re-login.')
      }

      // Step 1: Call PATCH endpoint to save courier info
      const updatedOrder = await markOrderWhatsAppShipped(token, order.orderNumber, {
        courierName: effectiveCourierName,
        trackingId: trackingId.trim(),
        trackingUrl: trackingUrl.trim(),
      })
      onOrderUpdated(updatedOrder)

      // Step 2: Build wa.me link with admin-edited tracking message & open
      const link = buildWhatsAppLink(normalizedPhone, shippedMessage.trim())
      openWhatsAppLink(link)

      setSuccessMsg('WhatsApp shipping update opened successfully!')
    } catch (err: any) {
      console.error('Failed to send WhatsApp shipping update:', err)
      setErrorMsg(err.message || 'Failed to update shipping information. WhatsApp was not opened.')
    } finally {
      setLoadingShipped(false)
    }
  }

  return (
    <div className="bg-white border border-[#E3E9DD] rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#EBEFE6] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#25D366]/10 text-[#25D366] flex items-center justify-center font-bold text-base shrink-0">
            💬
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1B2513] uppercase tracking-wider">
              WhatsApp Customer Updates
            </h3>
            <p className="text-[11px] text-[#5D6F4E]">
              Editable customer messages with 1-click WhatsApp dispatch
            </p>
          </div>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-[#FAF8F5] border border-[#EBE4D8] rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <span className="text-[10px] text-[#7A8E6A] font-bold uppercase tracking-wider block">
            Customer Recipient
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-bold text-xs text-[#1B2513]">{order.customerName}</span>
            <span className="text-[#C9973A] text-[11px]">•</span>
            <span className="font-mono text-xs font-semibold text-[#3E522B]">
              {formatDisplayPhone(order.customerPhone)}
            </span>
          </div>
        </div>

        {!isValidPhone && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] font-semibold">
            <span>⚠️</span>
            <span>Invalid customer phone number</span>
          </div>
        )}
      </div>

      {/* Inline Feedback Alerts */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-rose-700 font-bold text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[#F0F5EB] border border-[#D5DFC9] text-[#3E522B] text-xs font-semibold rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#769055] shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-[#7A8E6A] hover:text-[#3E522B] font-bold text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. ORDER CONFIRMED SECTION (FULLY EDITABLE) */}
      <div className="p-3.5 sm:p-4 bg-[#F7F9F5] border border-[#D5DFC9] rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <h4 className="text-xs font-bold text-[#1B2513] uppercase tracking-wider flex items-center gap-1.5">
              <span>❤️</span> 1. Order Confirmation Message
            </h4>
            <p className="text-[11px] text-[#5D6F4E] mt-0.5">
              Editable message for order #{order.orderNumber.replace(/^#+/, '')}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {order.whatsappConfirmedAt && (
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3E522B] bg-[#E3E9DD] px-2.5 py-1 rounded-lg shrink-0">
                <span>✅</span>
                <span>Sent {formatWhatsAppTimestamp(order.whatsappConfirmedAt)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleCopyConfirmed}
              className="text-[11px] font-semibold text-[#4A6333] hover:text-[#232B1E] bg-white border border-[#D5DFC9] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {copiedConfirmed ? '✓ Copied' : '📋 Copy'}
            </button>
            <button
              type="button"
              onClick={handleResetConfirmedMessage}
              className="text-[11px] font-semibold text-[#7A8E6A] hover:text-[#3E522B] bg-white border border-[#D5DFC9] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Reset message to default template"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Editable Textarea for Confirmation */}
        <div>
          <label className="block text-[11px] font-bold text-[#3E522B] uppercase tracking-wider mb-1">
            Edit Confirmation Message
          </label>
          <textarea
            rows={4}
            value={confirmedMessage}
            onChange={(e) => setConfirmedMessage(e.target.value)}
            placeholder="Type confirmation message here..."
            className="w-full bg-white border border-[#D5DFC9] rounded-xl p-3 text-xs text-[#232B1E] font-sans leading-relaxed focus:outline-none focus:border-[#769055] transition-all resize-y shadow-2xs"
          />
          <div className="flex justify-between items-center text-[10px] text-[#7A8E6A] mt-1">
            <span>You can customize the text freely before dispatching.</span>
            <span>{confirmedMessage.length} characters</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSendConfirmation}
          disabled={loadingConfirmed || !isValidPhone || !confirmedMessage.trim()}
          className="w-full sm:w-auto px-4 py-2.5 bg-[#769055] hover:bg-[#5e7343] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
        >
          {loadingConfirmed ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span className="text-sm">💬</span>
              <span>
                {order.whatsappConfirmedAt ? 'Send Confirmation Again' : 'Send Confirmation on WhatsApp'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* 2. ORDER SHIPPED SECTION (FULLY EDITABLE) */}
      <div className="p-3.5 sm:p-4 bg-[#F7F9F5] border border-[#D5DFC9] rounded-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <h4 className="text-xs font-bold text-[#1B2513] uppercase tracking-wider flex items-center gap-1.5">
              <span>🚚</span> 2. Order Shipped & Tracking Message
            </h4>
            <p className="text-[11px] text-[#5D6F4E] mt-0.5">
              Courier details, live tracking URL, and editable dispatch template.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {order.whatsappShippedAt && (
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3E522B] bg-[#E3E9DD] px-2.5 py-1 rounded-lg shrink-0">
                <span>✅</span>
                <span>Sent {formatWhatsAppTimestamp(order.whatsappShippedAt)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleCopyShipped}
              className="text-[11px] font-semibold text-[#4A6333] hover:text-[#232B1E] bg-white border border-[#D5DFC9] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {copiedShipped ? '✓ Copied' : '📋 Copy'}
            </button>
            <button
              type="button"
              onClick={handleResetShippedMessage}
              className="text-[11px] font-semibold text-[#7A8E6A] hover:text-[#3E522B] bg-white border border-[#D5DFC9] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Reset message from courier & tracking fields"
            >
              🔄 Reset to Template
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Courier Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#3E522B] uppercase tracking-wider mb-1">
              Courier Partner *
            </label>
            <select
              value={courier}
              onChange={(e) => handleCourierChange(e.target.value)}
              className="w-full bg-white border border-[#D5DFC9] rounded-xl px-3 py-2 text-xs font-semibold text-[#232B1E] focus:outline-none focus:border-[#769055]"
            >
              {COURIER_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Courier Input (if 'Other' selected) */}
          {courier === 'Other' ? (
            <div>
              <label className="block text-[11px] font-bold text-[#3E522B] uppercase tracking-wider mb-1">
                Custom Courier Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Shadowfax, Professional"
                value={customCourier}
                onChange={(e) => setCustomCourier(e.target.value)}
                className="w-full bg-white border border-[#D5DFC9] rounded-xl px-3 py-2 text-xs text-[#232B1E] focus:outline-none focus:border-[#769055]"
              />
            </div>
          ) : (
            /* Tracking ID */
            <div>
              <label className="block text-[11px] font-bold text-[#3E522B] uppercase tracking-wider mb-1">
                Tracking ID / AWB *
              </label>
              <input
                type="text"
                placeholder="e.g. 140381029482"
                value={trackingId}
                onChange={(e) => handleTrackingIdChange(e.target.value)}
                className="w-full bg-white border border-[#D5DFC9] rounded-xl px-3 py-2 text-xs font-mono text-[#232B1E] focus:outline-none focus:border-[#769055]"
              />
            </div>
          )}

          {/* If 'Other' was selected, put Tracking ID on full row or next column */}
          {courier === 'Other' && (
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#3E522B] uppercase tracking-wider mb-1">
                Tracking ID / AWB *
              </label>
              <input
                type="text"
                placeholder="e.g. 140381029482"
                value={trackingId}
                onChange={(e) => handleTrackingIdChange(e.target.value)}
                className="w-full bg-white border border-[#D5DFC9] rounded-xl px-3 py-2 text-xs font-mono text-[#232B1E] focus:outline-none focus:border-[#769055]"
              />
            </div>
          )}

          {/* Tracking URL */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-[#3E522B] uppercase tracking-wider">
                Tracking URL * (Must start with http:// or https://)
              </label>
              {courier === 'Delhivery' && trackingId.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setTrackingUrl(`https://www.delhivery.com/track/package/${trackingId.trim()}`)
                    setUserEditedUrl(false)
                  }}
                  className="text-[10px] font-semibold text-[#769055] hover:underline cursor-pointer"
                >
                  Reset to Delhivery URL
                </button>
              )}
            </div>
            <input
              type="url"
              placeholder="https://www.delhivery.com/track/package/..."
              value={trackingUrl}
              onChange={(e) => {
                setTrackingUrl(e.target.value)
                setUserEditedUrl(true)
              }}
              className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-mono text-[#232B1E] focus:outline-none ${
                trackingUrl && !isTrackingUrlValid
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-[#D5DFC9] focus:border-[#769055]'
              }`}
            />
            {trackingUrl && !isTrackingUrlValid && (
              <p className="text-[10px] text-rose-600 mt-1 font-semibold">
                URL must start with http:// or https://
              </p>
            )}
          </div>
        </div>

        {/* Editable Tracking Message Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-[#3E522B] uppercase tracking-wider">
              Edit Tracking & Dispatch Message
            </label>
            {isShippedCustomized && (
              <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Customized by Admin
              </span>
            )}
          </div>
          <textarea
            rows={7}
            value={shippedMessage}
            onChange={(e) => {
              setShippedMessage(e.target.value)
              setIsShippedCustomized(true)
            }}
            placeholder="Type tracking message here..."
            className="w-full bg-white border border-[#D5DFC9] rounded-xl p-3 text-xs text-[#232B1E] font-sans leading-relaxed focus:outline-none focus:border-[#769055] transition-all resize-y shadow-2xs whitespace-pre-wrap"
          />
          <div className="flex justify-between items-center text-[10px] text-[#7A8E6A] mt-1">
            <span>You can edit the courier info, greetings, or instructions freely before dispatching.</span>
            <span>{shippedMessage.length} characters</span>
          </div>
        </div>

        {/* Send Shipped Button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleSendShippingUpdate}
            disabled={loadingShipped || !isShippedFormValid || !shippedMessage.trim()}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#769055] hover:bg-[#5e7343] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
          >
            {loadingShipped ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving & Opening...</span>
              </>
            ) : (
              <>
                <span className="text-sm">🚚</span>
                <span>
                  {order.whatsappShippedAt ? 'Send Shipping Update Again' : 'Send Shipping Update on WhatsApp'}
                </span>
              </>
            )}
          </button>

          {!isShippedFormValid && (
            <p className="text-[11px] text-[#7A8E6A] italic">
              {!isValidPhone
                ? 'Requires valid phone number'
                : !trackingId.trim()
                ? 'Enter Tracking ID to enable send'
                : !isTrackingUrlValid
                ? 'Enter valid http/https tracking URL'
                : 'Fill all required fields'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
