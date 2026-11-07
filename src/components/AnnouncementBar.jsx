import { useTranslation } from 'react-i18next'

export default function AnnouncementBar() {
  const { t } = useTranslation()

  return (
    <div className="marquee-container h-[22px] bg-black flex items-center overflow-hidden">
      <div className="marquee-track flex items-center whitespace-nowrap h-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="text-[#F5B731] font-bold uppercase text-[11px] ms-[40px] whitespace-nowrap"
          >
            {t('announcement.freeShipping')}
          </span>
        ))}
      </div>
    </div>
  )
}