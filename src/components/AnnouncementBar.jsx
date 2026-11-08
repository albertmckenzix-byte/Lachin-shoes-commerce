import { useTranslation } from 'react-i18next'
import { formatPrice } from '../utils/format'
import { getSettings } from '../api/settings'
import { useEffect, useState } from 'react'

export default function AnnouncementBar() {
  const { t } = useTranslation()
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(5000000)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await getSettings()
      setFreeShippingThreshold(data.freeShippingThreshold)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  return (
    <div className="marquee-container h-[22px] bg-black flex items-center overflow-hidden">
      <div className="marquee-track flex items-center whitespace-nowrap h-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="text-[#F5B731] font-bold uppercase text-[11px] ms-[40px] whitespace-nowrap"
          >
            ارسال رایگان برای خرید بالای {formatPrice(freeShippingThreshold)}
          </span>
        ))}
      </div>
    </div>
  )
}