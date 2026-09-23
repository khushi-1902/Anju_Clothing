import { useShop } from '../context/ShopContext'
import heroBannerImage from '../assets/banner_image.jpg'

export function Hero() {
  const { navigateTo } = useShop()

  return (
    <section
      onClick={() => navigateTo('all-products')}
      className="relative w-full overflow-hidden bg-[#FAF7F2] cursor-pointer"
      aria-label="Main Hero Banner"
    >
      <img
        src={heroBannerImage}
        alt="Anju Clothings Festive Collection Hero Banner"
        className="w-full h-auto object-cover block"
      />
    </section>
  )
}
