import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'

const GRADIENTS = [
  'linear-gradient(135deg, #E6E0D8 0%, #CFC5B8 100%)',
  'linear-gradient(135deg, #E5D3B3 0%, #D2BE98 100%)',
  'linear-gradient(135deg, #E8CDBB 0%, #D8B5A0 100%)',
]

export default function ValueCard({ value, index }) {
  const { t } = useTranslation()
  const gradient = GRADIENTS[(index - 1) % GRADIENTS.length]
  const title = t(value.titleKey)
  const text = t(value.textKey)

  return (
    <div className="relative w-full overflow-hidden group" dir="rtl">
      {/* Image box */}
      <div className="relative h-[466px] w-full overflow-hidden">
        {value.image ? (
          <img
            src={value.image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0 w-full h-full"
            style={{ background: gradient }}
          />
        )}
      </div>

      {/* Text card - at bottom LEFT (start in RTL) */}
      <div className="absolute start-[20px] bottom-[20px] z-10 w-[225px] sm:w-[225px] bg-[rgba(236,228,218,0.72)] backdrop-blur-sm rounded-[3px] p-[16px] md:hidden lg:block">
        <div className="flex items-center gap-[6px]">
          <span className="text-[10px] font-bold uppercase text-black">{title}</span>
          <Star size={12} strokeWidth={1.5} className="text-black flex-shrink-0" />
        </div>
        <p className="mt-[8px] text-[13px] font-normal text-black text-start" style={{ lineHeight: '20px' }}>
          {text}
        </p>
      </div>

      {/* Mobile text card - at bottom LEFT (start in RTL) */}
      <div className="lg:hidden absolute start-[20px] bottom-[20px] z-10 bg-[rgba(236,228,218,0.72)] backdrop-blur-sm rounded-[3px] p-[16px]" style={{ width: 'calc(100% - 40px)' }}>
        <div className="flex items-center gap-[6px]">
          <span className="text-[10px] font-bold uppercase text-black">{title}</span>
          <Star size={12} strokeWidth={1.5} className="text-black flex-shrink-0" />
        </div>
        <p className="mt-[8px] text-[13px] font-normal text-black text-start" style={{ lineHeight: '20px' }}>
          {text}
        </p>
      </div>
    </div>
  )
}