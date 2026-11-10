import { useTranslation } from 'react-i18next'
import sustainabilityBg from '../assets/sustainability.png'

export default function SustainabilityBanner() {
  const { t } = useTranslation()

  return (
    <section
      className="relative z-10 w-full h-[685px] overflow-hidden bg-[#D9A868]"
      style={{ clipPath: 'inset(0)' }}
    >
      <img
        src={sustainabilityBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center z-0 md:fixed md:h-screen md:w-full"
      />

      <div className="absolute start-5 md:start-[64px] top-[55px] z-10">
        <h1
          className="font-bold tracking-[-0.03em] leading-[1.25] text-white text-start"
          style={{ fontSize: 'clamp(36px, 4vw, 64px)' }}
        >
          {t('sustainability.subhead')}
        </h1>
      </div>

      <div className="hidden md:block absolute end-[64px] bottom-[54px] z-20 w-[320px] h-[222px] bg-[rgba(70,48,28,0.82)] backdrop-blur-sm rounded-[4px] p-4">
        <p className="text-white text-[10px] font-bold uppercase leading-[1.3]">
          {t('sustainability.description')}
        </p>
        <p className="mt-[30px] text-white text-[11px] font-normal leading-[1.55]">
          I'm a paragraph. Click here to add your own text and edit me. It's easy. Just click
          "Edit Text" or double click me to add your own content and make changes to the font. I'm a great
          place for you to tell a story and let your users know a little more about you.
        </p>
        <a
          href="#"
          className="inline-flex items-center justify-center w-[96px] h-[30px] rounded-full border border-white bg-transparent text-white text-[10px] font-bold uppercase mt-5 hover:bg-white hover:text-black transition-colors"
        >
          {t('promo.readMore')}
        </a>
      </div>

      <div className="md:hidden px-4 mt-[140px]">
        <div className="bg-[rgba(70,48,28,0.82)] backdrop-blur-sm rounded-[4px] p-4">
          <p className="text-white text-[10px] font-bold uppercase leading-[1.3]">
            {t('sustainability.description')}
          </p>
          <p className="mt-[30px] text-white text-[11px] font-normal leading-[1.55]">
            I'm a paragraph. Click here to add your own text and edit me. It's easy. Just click
            "Edit Text" or double click me to add your own content and make changes to the font. I'm a great
            place for you to tell a story and let your users know a little more about you.
          </p>
          <a
            href="#"
            className="inline-flex items-center justify-center w-[96px] h-[30px] rounded-full border border-white bg-transparent text-white text-[10px] font-bold uppercase mt-5 hover:bg-white hover:text-black transition-colors"
          >
            {t('promo.readMore')}
          </a>
        </div>
      </div>
    </section>
  )
}