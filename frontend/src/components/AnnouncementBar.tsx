import { Link } from 'react-router-dom'
import { STORE_INFO } from '../data/products'
import { useShop } from '../context/ShopContext'

function PhoneLink({ phone }: { phone: string }) {
  const phoneDigits = phone.replace(/[^0-9]/g, '')
  const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
    'Hi! I would like to enquire about your collection.'
  )}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with us on WhatsApp at ${phone}`}
      className="font-bold underline underline-offset-2 hover:text-[#e8c06a] transition-colors cursor-pointer"
    >
      {phone}
    </a>
  )
}

function AnnouncementText() {
  const { shippingSettings } = useShop()
  const announcement = shippingSettings.announcementText || STORE_INFO.announcement
  const phone = shippingSettings.supportPhone || STORE_INFO.phone

  if (announcement.includes(phone)) {
    const [before, ...rest] = announcement.split(phone)
    return (
      <>
        {before}
        <PhoneLink phone={phone} />
        {rest.join(phone)}
      </>
    )
  }

  return (
    <>
      {announcement} <PhoneLink phone={phone} />
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