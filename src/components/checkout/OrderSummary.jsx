import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCart } from '../../contexts/CartContext'
import { formatPrice } from '../../utils/format'
import { checkCoupon } from '../../api/orders'

export default function OrderSummary({ subtotal, selectedDelivery, discount, promoCode, setPromoCode, setDiscount, onCouponApplied, settings }) {
  const { t } = useTranslation()
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)

  const freeShippingThreshold = settings?.freeShippingThreshold || 5000000
  const expressFee = settings?.expressFee || 500000
  const shippingCost = selectedDelivery === 'express' ? expressFee : (subtotal >= freeShippingThreshold ? 0 : settings?.standardFee || 0)
  const shippingText = shippingCost === 0 ? t('checkout.free') : formatPrice(shippingCost)
  const discountAmount = discount || 0
  const total = subtotal + shippingCost - discountAmount

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return

    setPromoLoading(true)
    setPromoError('')

    try {
      const result = await checkCoupon(promoCode.trim(), subtotal)
      if (result.valid) {
        setDiscount(result.discount)
        setPromoError('')
        if (onCouponApplied) {
          onCouponApplied(result.percent, result.discount)
        }
      } else {
        setDiscount(0)
        setPromoError('کد تخفیف معتبر نیست')
      }
    } catch (err) {
      setDiscount(0)
      setPromoError('خطا در بررسی کد تخفیف')
    } finally {
      setPromoLoading(false)
    }
  }

  return (
    <div className="mt-[28px] space-y-4" role="region" aria-label={t('checkout.total')}>
      <div className="border-b border-[#BDBDBD] pb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="promoCode" className="sr-only">{t('checkout.promocode')}</label>
          <input
            id="promoCode"
            type="text"
            placeholder={t('checkout.promocode')}
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value)
              setPromoError('')
            }}
            disabled={promoLoading}
            className="flex-1 h-[40px] bg-transparent border-0 border-b-[1px] border-[#BDBDBD] text-[13px] text-black placeholder-[#8a8a8a] focus:border-black focus:outline-none disabled:opacity-50"
            dir="ltr"
            style={{ textAlign: 'start' }}
            aria-describedby={promoError ? 'promo-error' : undefined}
            aria-invalid={promoError ? 'true' : 'false'}
          />
          <button
            type="button"
            onClick={handleApplyPromo}
            disabled={!promoCode.trim() || promoLoading}
            className="h-[40px] px-4 bg-[#E4E4E4] text-[11px] font-medium text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors rounded-none whitespace-nowrap ms-2"
          >
            {promoLoading ? 'در حال بررسی...' : t('checkout.apply')}
          </button>
        </div>
        {promoError && <p id="promo-error" className="mt-2 text-[11px] text-red-600" role="alert">{promoError}</p>}
      </div>

      <div className="border-b border-[#BDBDBD] pb-4 space-y-3">
        <div className="flex justify-between text-[12px] text-black leading-[1.4]">
          <span>{t('checkout.subtotal')}</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-[12px] text-black leading-[1.4]">
          <span>{t('checkout.shipping')}</span>
          <span>{shippingText}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-[12px] text-black leading-[1.4]">
            <span>{t('checkout.discount')}</span>
            <span className="text-green-600">-{formatPrice(discountAmount)}</span>
          </div>
        )}
      </div>

      <div className="mt-[20px] flex justify-between">
        <span className="text-[28px] font-normal text-black leading-[1.2]">{t('checkout.total')}</span>
        <span className="text-[28px] font-normal text-black leading-[1.2]">{formatPrice(total)}</span>
      </div>
    </div>
  )
}