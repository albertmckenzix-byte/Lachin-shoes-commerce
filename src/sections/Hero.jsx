import { useTranslation } from 'react-i18next'
import heroBg from '../assets/hero.png'
import FeaturedProductCard from '../components/FeaturedProductCard'
import { Link } from 'react-router-dom'

export default function Hero() {
  const { t } = useTranslation()

  return (
    <section
      className="relative h-[calc(100vh-22px)] min-h-[600px] max-h-[900px] w-full overflow-hidden"
      style={{ clipPath: 'inset(0)' }}
    >
      <img
        src={heroBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-[53%_48%] z-0 md:fixed md:w-full md:h-screen"
      />
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/50 via-black/10 to-transparent rtl:bg-gradient-to-l pointer-events-none" />

      <div className="absolute inset-x-0 top-0 bottom-[130px] md:bottom-0 md:inset-y-0 start-0 z-10 flex flex-col justify-center items-start text-start ps-5 pe-5 md:pe-0">
        <div className="flex flex-col items-start gap-[14px] text-white w-full">
          <h1
            className="font-extrabold leading-[1.3]"
            style={{
              fontSize: 'clamp(40px, 4.6vw, 76px)',
              letterSpacing: '0',
            }}
          >
            {t('hero.headline')}
          </h1>
          <p
            className="mt-[24px]"
            style={{ fontSize: 'clamp(16px, 2vw, 20px)' }}
          >
            {t('hero.subhead')}
          </p>
          <Link to="/all-products" className="pill-solid w-fit whitespace-nowrap px-[16px] py-[6px] mt-2" style={{ fontSize: '14px' }}>
            {t('hero.shopNow')}
          </Link>
        </div>
      </div>

      {/* Floating Featured Product Card */}
      <div className="absolute start-4 end-4 bottom-4 md:start-auto md:end-[110px] md:bottom-[66px] z-40 flex justify-center md:block">
        <FeaturedProductCard variant="light" />
      </div>
    </section>
  )
}