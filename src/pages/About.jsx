import { useTranslation } from 'react-i18next'
import aboutBg from '../assets/images/about.png'
import WhatWeStandFor from '../sections/WhatWeStandFor'
import FAQ from '../sections/FAQ'

export default function About() {
  const { t } = useTranslation('about')

  return (
    <>
      {/* Hero image section */}
      <section
        className="relative w-full overflow-hidden h-auto md:h-[700px]"
        style={{
          background: 'linear-gradient(135deg, #F6EFDD 0%, #D9CDB5 100%)',
        }}
        dir="rtl"
      >
        <img
          src={aboutBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center z-0"
        />
        <h1
          className="absolute end-[20px] top-[55px] z-10 font-bold leading-[1] text-black text-end"
          style={{
            fontSize: 'clamp(44px, 5vw, 80px)',
            letterSpacing: '-0.04em',
          }}
        >
          {t('title')}
        </h1>
        <div className="relative mx-[16px] w-[calc(100%-32px)] mt-[110px] md:absolute md:mx-0 md:mt-0 md:start-[66px] md:bottom-[66px] md:z-20 md:w-[400px] bg-[rgba(60,56,50,0.78)] backdrop-blur-sm rounded-[4px] pt-[16px] ps-[17px] pb-[20px]">
          <p className="text-[10px] font-bold uppercase text-white text-start">{t('cardTitle')}</p>
          <p className="mt-[30px] text-[13px] font-normal text-white text-start" style={{ lineHeight: '20px' }}>
            {t('cardText')}
          </p>
        </div>
      </section>

      <WhatWeStandFor />
      <FAQ />
    </>
  )
}