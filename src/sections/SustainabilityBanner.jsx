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

      <div className="absolute end-6 bottom-11 md:end-[64px] md:bottom-[54px] z-20 w-[min(265px,calc(100%-32px))] md:w-[320px] h-[140px] md:h-[222px] flex flex-col justify-between bg-[rgba(70,48,28,0.82)] backdrop-blur-sm rounded-[4px] p-2.5 md:p-4">
        <div>
          <p className="text-white text-[9px] md:text-[10px] font-bold uppercase leading-[1.25] text-start">
            {t('sustainability.description')}
          </p>
          <p className="mt-1 md:mt-[30px] text-white text-[8px] md:text-[11px] font-normal leading-[1.35] md:leading-[1.55] text-start line-clamp-3 md:line-clamp-none">
            I'm a paragraph. Click here to add your own text and edit me. It's easy. Just click
            "Edit Text" or double click me to add your own content and make changes to the font. I'm a great
            place for you to tell a story and let your users know a little more about you.
          </p>
        </div>
        <a
          href="#"
          className="inline-flex items-center justify-center w-[78px] md:w-[96px] h-[24px] md:h-[30px] rounded-full border border-white bg-transparent text-white text-[8.5px] md:text-[10px] font-bold uppercase hover:bg-white hover:text-black transition-colors"
        >
          {t('promo.readMore')}
        </a>
      </div>
    </section>
  )
}