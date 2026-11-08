import { useTranslation } from 'react-i18next'
import promoBg from '../assets/promo.png'
import { useCart } from '../contexts/CartContext'
import FeaturedProductCard from '../components/FeaturedProductCard'
import Marquee from '../components/Marquee'
import { useProducts } from '../context/ProductsContext'

export default function PromoBanner() {
  const { t } = useTranslation()
  const { increment } = useCart()
  const { products } = useProducts()
  const classicComfort =
    products.find((p) => p.slug === 'jordan-4-retro-oxidized-green') || null

  const headline = t('promo.headline')
  const parts = headline.split('تخفیف ')
  const line1 = parts[0] + 'تخفیف'
  const line2 = parts[1] || ''

  return (
    <>
      <section
        className="relative z-10 w-full overflow-hidden h-[560px] md:h-[clamp(620px,85vh,900px)] bg-[#E9CBA6]"
        style={{ clipPath: 'inset(0)' }}
      >
        <img
          src={promoBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center z-0 md:fixed md:h-screen md:w-full"
        />

        <div className="absolute start-5 top-10 z-10 flex flex-col items-start text-start pointer-events-none">
          <h1
            className="font-extrabold leading-[1.35] tracking-[0] text-black"
            style={{ fontSize: 'clamp(36px, 4.4vw, 72px)' }}
          >
            <span>{line1}</span>
            <br />
            <span>{line2}</span>
          </h1>
          <p className="mt-[40px] text-[16px] font-normal text-black">
            {t('promo.subhead')}
          </p>
          <button className="pill-solid w-fit whitespace-nowrap px-[16px] py-[6px] mt-[14px]">{t('hero.shopNow')}</button>
        </div>

        {/* Desktop: absolute bottom-left card */}
        <div className="hidden md:block absolute end-[110px] bottom-[56px] z-40">
          <FeaturedProductCard product={classicComfort} variant="light" />
        </div>

        {/* Mobile: static full-width card below content */}
        <div className="md:hidden ps-5 pe-5 mt-[300px] pb-[20px] relative z-40">
          <FeaturedProductCard product={classicComfort} variant="light" />
        </div>
      </section>

      <Marquee text={t('sustainability.headline')} />
    </>
  )
}