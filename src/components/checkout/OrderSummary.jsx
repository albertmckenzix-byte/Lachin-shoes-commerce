import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCart } from '../../contexts/CartContext'
import { formatPrice } from '../../utils/format'
import { EXPRESS_SHIPPING_FEE } from '../../config'
import { checkCoupon } from '../../api/orders'

export default function OrderSummary({ subtotal, selectedDelivery, discount, promoCode, setPromoCode, setDiscount, idPrefix = 'desktop' }) {
  const { t } = useTranslation()
  const [promoError, setPromoError] = useState(false)
  const [checkingPromo, setCheckingPromo] = useState(false)

  const shippingCost = selectedDelivery === 'express' ? EXPRESS_SHIPPING_FEE : 0
  const shippingText = selectedDelivery === 'express' ? formatPrice(EXPRESS_SHIPPING_FEE) : t('checkout.free')
  const discountAmount = discount || 0
  const total = subtotal + shippingCost - discountAmount
  const promoInputId = `${idPrefix}-promoCode`
  const promoErrorId = `${idPrefix}-promo-error`

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase()
    if (!code) return
    setCheckingPromo(true)
    setPromoError(false)
    try {
      const res = await checkCoupon({ code, subtotal })
      if (res && res.valid) {
        setDiscount(res.discount)
        setPromoError(false)
      } else {
        setDiscount(0)
        setPromoError(true)
      }
    } catch {
      // Fallback in case of network issue
      if (code === 'LACHIN10' || code === 'RYST10') {
        setDiscount(Math.round(subtotal * 0.1))
        setPromoError(false)
      } else {
        setDiscount(0)
        setPromoError(true)
      }
    } finally {
      setCheckingPromo(false)
    }
  }

  return (
    <div className="mt-[28px] space-y-4" role="region" aria-label={t('checkout.total')}>
      <div className="border-b border-[#BDBDBD] pb-4">
        <div className="flex items-center gap-2">
          <label htmlFor={promoInputId} className="sr-only">{t('checkout.promocode')}</label>
          <input
            id={promoInputId}
            type="text"
            placeholder={t('checkout.promocode')}
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value)
              setPromoError(false)
            }}
            className="flex-1 h-[40px] bg-transparent border-0 border-b-[1px] border-[#BDBDBD] text-[13px] text-black placeholder-[#8a8a8a] focus:border-black focus:outline-none"
            dir="ltr"
            style={{ textAlign: 'start' }}
            aria-describedby={promoError ? promoErrorId : undefined}
            aria-invalid={promoError ? 'true' : 'false'}
          />
          <button
            type="button"
            onClick={handleApplyPromo}
            disabled={!promoCode.trim() || checkingPromo}
            className="h-[40px] px-4 bg-[#E4E4E4] text-[11px] font-medium text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors rounded-none whitespace-nowrap ms-2"
          >
            {checkingPromo ? '...' : t('checkout.apply')}
          </button>
        </div>
        {promoError && <p id={promoErrorId} className="mt-2 text-[11px] text-red-600" role="alert">{t('checkout.invalidPromocode')}</p>}
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