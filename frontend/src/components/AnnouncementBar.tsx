import { STORE_INFO } from '../data/products'
import { useShop } from '../context/ShopContext'

export function AnnouncementBar() {
  const { shippingSettings } = useShop()

  const phone = shippingSettings?.supportPhone || STORE_INFO.phone || '9625923308'
  const phoneDigits = phone.replace(/[^0-9]/g, '') || '919625923308'
  const displayPhone = phone.startsWith('+91') ? phone.replace('+91', '').trim() : phone
  const whatsappNumber = phoneDigits.length === 10 ? '91' + phoneDigits : phoneDigits

  const items = [
    {
      id: 'whatsapp',
      icon: (
        <svg className="w-3.5 h-3.5 inline-block text-[#25D366] fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      ),
      content: (
        <span>
          For International Order Inquiries, WhatsApp Us:{' '}
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
              'Hi! I would like to inquire about international orders.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp for international order inquiries"
            className="font-bold underline underline-offset-2 hover:text-gold-light transition-colors cursor-pointer inline-flex items-center ml-1"
          >
            {displayPhone || '9625923308'}
          </a>
        </span>
      ),
    },
    {
      id: 'shipping',
      icon: <span className="text-gold-light shrink-0">✨</span>,
      content: <span>Free &amp; Fast Shipping on All Prepaid Orders</span>,
    },
    {
      id: 'cod',
      icon: <span className="text-gold-light shrink-0">✦</span>,
      content: <span>Cash on Delivery Available all india</span>,
    },
  ]

  // Render a sequence of items with separator
  const renderItemSet = (prefix: string) => (
    <div key={prefix} className="flex items-center shrink-0">
      {items.map((item, idx) => (
        <div key={`${prefix}-${item.id}-${idx}`} className="flex items-center">
          <div className="flex items-center gap-1.5 px-6 sm:px-10 whitespace-nowrap">
            {item.icon}
            {item.content}
          </div>
          <span className="text-gold-light/60 text-[10px] select-none">✦</span>
        </div>
      ))}
    </div>
  )

  return (
    <div
      role="region"
      aria-label="Announcement Bar"
      className="bg-olive text-white text-[11px] sm:text-xs py-2 font-medium tracking-wider uppercase transition-colors relative z-40 overflow-hidden select-none border-b border-olive-dark/20 shadow-xs"
    >
      <div className="w-full overflow-hidden flex items-center">
        <div className="animate-marquee">
          {renderItemSet('set-1')}
          {renderItemSet('set-2')}
          {renderItemSet('set-3')}
          {renderItemSet('set-4')}
        </div>
      </div>
    </div>
  )
}