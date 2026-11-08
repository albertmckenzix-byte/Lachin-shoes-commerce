import { useTranslation } from 'react-i18next'
import { formatPrice } from '../../utils/format'

export default function DeliveryOptions({ selectedMethod, setSelectedMethod, freeShippingThreshold, standardFee, expressFee }) {
  const { t } = useTranslation()

  return (
    <div className="mt-14 space-y-4">
      <h2 className="text-[24px] font-normal text-black leading-[1.3] mb-5">{t('checkout.delivery')}</h2>
      <div role="radiogroup" aria-label={t('checkout.delivery')} className="space-y-4">
        <label className="flex items-center justify-between py-4 border-b-[1px] border-[#BDBDBD] cursor-pointer gap-4">
          <input
            type="radio"
            name="delivery"
            value="standard"
            checked={selectedMethod === 'standard'}
            onChange={() => setSelectedMethod('standard')}
            className="w-4 h-4 border-[#BDBDBD] text-black focus:ring-0 focus:border-black appearance-none rounded-full border-[2px] checked:border-black checked:bg-black checked:bg-[radial-gradient(circle_at_center,_white_4px,_transparent_5px)] flex-shrink-0 ms-4"
          />
          <div className="flex-1 text-start min-w-0">
            <p className="text-[13px] font-medium text-black leading-[1.3]">{t('checkout.standardDelivery')}</p>
            <p className="text-[11px] text-gray-500 leading-[1.3] mt-0.5">{t('checkout.standardDeliverySubtitle')}</p>
          </div>
          <span className="text-[13px] font-medium text-black whitespace-nowrap ms-4">{standardFee === 0 ? t('checkout.free') : formatPrice(standardFee)}</span>
        </label>
        <label className="flex items-center justify-between py-4 border-b-[1px] border-[#BDBDBD] cursor-pointer gap-4">
          <input
            type="radio"
            name="delivery"
            value="express"
            checked={selectedMethod === 'express'}
            onChange={() => setSelectedMethod('express')}
            className="w-4 h-4 border-[#BDBDBD] text-black focus:ring-0 focus:border-black appearance-none rounded-full border-[2px] checked:border-black checked:bg-black checked:bg-[radial-gradient(circle_at_center,_white_4px,_transparent_5px)] flex-shrink-0 ms-4"
          />
          <div className="flex-1 text-start min-w-0">
            <p className="text-[13px] font-medium text-black leading-[1.3]">{t('checkout.expressDelivery')}</p>
            <p className="text-[11px] text-gray-500 leading-[1.3] mt-0.5">{t('checkout.expressDeliverySubtitle')}</p>
          </div>
          <span className="text-[13px] font-medium text-black whitespace-nowrap ms-4">{formatPrice(expressFee)}</span>
        </label>
      </div>
    </div>
  )
}