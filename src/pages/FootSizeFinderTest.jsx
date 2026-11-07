import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import FootSizeFinder from '../components/product/FootSizeFinder'

export default function FootSizeFinderTest() {
  const { t } = useTranslation()
  const [selectedSize, setSelectedSize] = useState(null)

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <main className="max-w-[1200px] mx-auto px-[24px] pt-[32px] pb-[80px]">
        <div className="text-center mb-[24px]">
          <h1 className="text-[32px] font-semibold text-black mb-[8px]">
            {t('footSizeFinder.pageTitle', { defaultValue: 'Foot Size Finder Test' })}
          </h1>
          <p className="text-[16px] text-[#666666]">
            {t('footSizeFinder.pageDescription', { defaultValue: 'Test the foot size finder component' })}
          </p>
        </div>
        
        <FootSizeFinder />
        
        {selectedSize !== null && (
          <div className="mt-[24px] p-[16px] bg-[#F5F5F5] rounded-[6px] text-center">
            <p className="text-[14px] text-[#666666] mb-[4px]">
              {t('footSizeFinder.selectedSize', { defaultValue: 'Selected Size' })}
            </p>
            <p className="text-[20px] font-bold text-black">
              US: {selectedSize} | EU: {32 + (selectedSize - 1.5) * 2} | CM: {22 + (selectedSize - 1) * 2.5}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}