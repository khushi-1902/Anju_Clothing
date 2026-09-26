import { Link } from 'react-router-dom'
import { STORE_INFO } from '../data/products'

const WHATSAPP_URL = `https://wa.me/${STORE_INFO.phoneRaw}?text=${encodeURIComponent(
  'Hi! I would like to enquire about your collection.'
)}`

function PhoneLink() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with us on WhatsApp at ${STORE_INFO.phone}`}
      className="font-bold underline underline-offset-2 hover:text-[#e8c06a] transition-colors cursor-pointer"
    >
      {STORE_INFO.phone}
    </a>
  )
}

function AnnouncementText() {
  const { announcement, phone } = STORE_INFO

  // If the announcement text contains the number, link just the number
  if (announcement.includes(phone)) {
    const [before, ...rest] = announcement.split(phone)
    return (
      <>
        {before}
        <PhoneLink />
        {rest.join(phone)}
      </>
    )
  }

  // If the number was removed from the text, append it as a link
  return (
    <>
      {announcement} <PhoneLink />
    </>
  )
}

export function AnnouncementBar() {
  return (
    <div className="bg-olive text-white text-[11px] sm:text-xs py-2 px-4 font-medium tracking-wider uppercase transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="hidden sm:block text-white/70 text-[10px] tracking-widest font-bold">
          ✦ Handcrafted Luxury Indian Wear
        </div>
        <div className="mx-auto sm:mx-0 flex items-center gap-1.5 text-center">
          <span>✨ <AnnouncementText /> ✨</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold tracking-widest">
          <Link
            to="/track-order"
            className="hover:text-[#e8c06a] transition-colors flex items-center gap-1 text-white"
          >
            <span>📦</span> Track Order
          </Link>
        </div>
      </div>
    </div>
  )
}