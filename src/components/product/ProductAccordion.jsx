import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Star } from 'lucide-react'

export default function ProductAccordion({ product }) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const [openIndex, setOpenIndex] = useState(null)

  const items = [
    {
      id: 'reviews',
      title: t('productAccordion.reviews'),
      content: (
        <div className="space-y-0">
          {(product.reviews || []).map((review, idx) => (
            <div key={idx} className="py-[14px] border-b border-[#D9D9D9] last:border-0">
              <div className="flex items-center justify-between gap-4 mb-[8px]">
                <div className="flex items-center gap-[8px]">
                  <span className="text-[13px] font-semibold text-black">{review.name}</span>
                  <div className="flex items-center gap-[2px]">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < review.rating
                            ? 'fill-[#F5B731] text-[#F5B731]'
                            : 'text-gray-300'
                        }
                      />
                    ))}
                  </div>
                </div>
                <span className="text-[11px] text-gray-500 whitespace-nowrap">{review.date}</span>
              </div>
              <p className="text-[13px] text-gray-600 leading-[1.8]">
                {t(review.textKey)}
              </p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'shipping',
      title: t('productAccordion.shipping'),
      content: (
        <div className="py-[14px] space-y-[8px]">
          <p className="text-[13px] text-gray-700">{t('productAccordion.standardShipping')}</p>
          <p className="text-[13px] text-gray-700">{t('productAccordion.expressShipping')}</p>
        </div>
      ),
    },
  ]

  const toggleItem = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index))
  }

  return (
    <div className="mt-[44px] border-b border-[#D9D9D9]">
      {items.map((item, index) => (
        <div key={item.id} className="border-b border-[#D9D9D9]">
          <button
            type="button"
            onClick={() => toggleItem(index)}
            className="w-full flex items-center justify-between py-[14px] px-0 text-start"
            aria-expanded={openIndex === index}
            aria-controls={`accordion-content-${item.id}`}
          >
            <span className="text-[24px] font-medium text-black" style={{ fontSize: 'clamp(20px, 2vw, 24px)' }}>
              {item.title}
            </span>
            <ChevronDown
              size={20}
              strokeWidth={1.5}
              className={`text-black transition-transform duration-250 ${
                openIndex === index ? 'rotate-180' : ''
              } ${isRTL ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          <div
            id={`accordion-content-${item.id}`}
            role="region"
            aria-labelledby={`accordion-header-${item.id}`}
            className="overflow-hidden transition-all duration-250 ease-out"
            style={{
              maxHeight: openIndex === index ? '500px' : '0',
              opacity: openIndex === index ? 1 : 0,
            }}
          >
            {item.content}
          </div>
        </div>
      ))}
    </div>
  )
}