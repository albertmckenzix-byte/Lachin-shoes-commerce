import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCart } from '../contexts/CartContext'
import InformationForm from '../components/checkout/InformationForm'
import DeliveryOptions from '../components/checkout/DeliveryOptions'
import PaymentOptions from '../components/checkout/PaymentOptions'
import ShoppingBag from '../components/checkout/ShoppingBag'
import { formatPrice } from '../utils/format'

export default function Checkout() {
  const { t } = useTranslation()
  const { clearCart } = useCart()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    country: '',
    city: '',
    address: '',
    zipCode: '',
    agreeDataProcessing: false,
    cardNumber: '',
    cardholderName: '',
    expiry: '',
    cvv: '',
    agreeDataProcessingPayment: false,
  })
  const [errors, setErrors] = useState({})
  const [selectedDelivery, setSelectedDelivery] = useState('standard')
  const [selectedPayment, setSelectedPayment] = useState('card')
  const [submitted, setSubmitted] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)

  const handleSubmit = () => {
    clearCart()
    setSubmitted(true)
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      country: '',
      city: '',
      address: '',
      zipCode: '',
      agreeDataProcessing: false,
      cardNumber: '',
      cardholderName: '',
      expiry: '',
      cvv: '',
      agreeDataProcessingPayment: false,
    })
    setPromoCode('')
    setDiscount(0)
  }

  const { items, count, subtotal } = useCart()
  const shippingCost = selectedDelivery === 'express' ? 50 : 0
  const discountAmount = discount || 0
  const total = subtotal + shippingCost - discountAmount
  const isPayDisabled = items.length === 0

  if (submitted) {
    return (
      <div className="min-h-screen bg-white pb-24" dir="rtl">
        <div className="ps-6 pe-6 pt-[40px]">
          <h1 className="font-extrabold leading-[1.3] tracking-[0] text-black text-start mb-[40px]" style={{ fontSize: 'clamp(40px, 5.5vw, 88px)' }}>
            {t('checkout.title')}
          </h1>
          <div className="text-center py-20">
            <p className="text-[24px] font-normal text-black leading-[1.3]">{t('checkout.successMessage')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-24" dir="rtl">
      <div className="ps-6 pe-6 pt-[40px]">
        <h1 className="font-extrabold leading-[1.3] tracking-[0] text-black text-start mb-[40px]" style={{ fontSize: 'clamp(40px, 5.5vw, 88px)' }}>
          {t('checkout.title')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-[60px] items-start">
          {/* Form Column - Right side in RTL (order-1 on lg) */}
          <div className="lg:order-1">
            <InformationForm
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              setErrors={setErrors}
              setSubmitted={setSubmitted}
            />
            <DeliveryOptions
              selectedMethod={selectedDelivery}
              setSelectedMethod={setSelectedDelivery}
            />
            <PaymentOptions
              selectedMethod={selectedPayment}
              setSelectedMethod={setSelectedPayment}
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              setErrors={setErrors}
              onSubmit={handleSubmit}
              isPayDisabled={isPayDisabled}
              total={total}
              itemsCount={count}
            />
          </div>

          {/* Shopping Bag Column - Left side in RTL (order-2 on lg) */}
          <div className="hidden lg:block lg:order-2">
            <ShoppingBag
              promoCode={promoCode}
              setPromoCode={setPromoCode}
              discount={discount}
              setDiscount={setDiscount}
              selectedDelivery={selectedDelivery}
              total={total}
              isPayDisabled={isPayDisabled}
            />
          </div>
        </div>

        {/* Mobile sticky pay bar */}
        <div className="lg:hidden fixed bottom-0 start-0 end-0 z-50 bg-white border-t border-[#E5E5E5] safe-area-inset-bottom">
          <div className="ps-6 pe-6 py-3 flex items-center justify-between gap-4">
            <div className="flex-1 text-start">
              <p className="text-[13px] font-normal text-black">{t('checkout.total')}</p>
              <p className="text-[20px] font-extrabold text-black whitespace-nowrap">{t('checkout.payAndPlaceOrder')} · {formatPrice(total)}</p>
            </div>
            <div className="w-full sm:w-auto flex flex-col items-end gap-2">
              <button
                disabled={isPayDisabled}
                className="w-full sm:w-auto h-[44px] px-6 bg-black text-white text-[12px] font-semibold hover:bg-[#222] transition-colors rounded-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black whitespace-nowrap"
                onClick={handleSubmit}
              >
                {t('checkout.payAndPlaceOrder')}
              </button>
              {isPayDisabled && (
                <p className="text-[11px] text-gray-500 text-center w-full sm:hidden">{t('checkout.bagEmpty')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}