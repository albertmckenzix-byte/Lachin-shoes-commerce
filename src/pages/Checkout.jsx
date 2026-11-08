import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useProducts } from '../context/ProductsContext'
import InformationForm from '../components/checkout/InformationForm'
import DeliveryOptions from '../components/checkout/DeliveryOptions'
import PaymentOptions from '../components/checkout/PaymentOptions'
import ShoppingBag from '../components/checkout/ShoppingBag'
import { formatPrice } from '../utils/format'
import { createOrder } from '../api/orders'
import { getSettings } from '../api/settings'

export default function Checkout() {
  const { t } = useTranslation()
  const { clearCart, items } = useCart()
  const { getBySlug } = useProducts()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    country: 'Iran',
    city: '',
    address: '',
    postalCode: '',
    agreeDataProcessing: false,
  })
  const [errors, setErrors] = useState({})
  const [selectedDelivery, setSelectedDelivery] = useState('standard')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [settings, setSettings] = useState({
    freeShippingThreshold: 5000000,
    standardFee: 0,
    expressFee: 500000,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await getSettings()
      setSettings(data)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  const handleSubmit = async () => {
    // Check for stock issues
    const hasStockIssues = items.some(item => {
      const product = getBySlug(item.slug)
      if (!product) return true
      const sizeEntry = product.sizes?.find(s => Number(s.us) === Number(item.sizeUs))
      if (!sizeEntry || !sizeEntry.is_active) return true
      return item.quantity > sizeEntry.stock
    })

    if (hasStockIssues) {
      setSubmitError('لطفاً مشکل موجودی سبد خرید را حل کنید')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const orderItems = items.map(item => ({
        slug: item.slug,
        sizeUs: item.sizeUs,
        quantity: item.quantity,
      }))

      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        country: formData.country,
        city: formData.city,
        address: formData.address,
        postalCode: formData.postalCode,
        deliveryMethod: selectedDelivery,
        couponCode: promoCode,
        note: '',
        items: orderItems,
      }

      const result = await createOrder(payload)

      if (result.success) {
        clearCart()
        navigate(`/order/${result.data.number}?token=${result.data.token}`)
      } else {
        setSubmitError(result.error.detail)
        if (result.error.fields) {
          setErrors(result.error.fields)
        }
      }
    } catch (err) {
      setSubmitError('خطا در ارتباط با سرور، دوباره تلاش کنید')
    } finally {
      setIsSubmitting(false)
    }
  }

  const { count, subtotal } = useCart()
  const shippingCost = selectedDelivery === 'express' ? settings.expressFee : 0
  const isFreeShipping = subtotal >= settings.freeShippingThreshold
  const finalShippingCost = selectedDelivery === 'standard' && isFreeShipping ? 0 : shippingCost
  const discountAmount = discount || 0
  const total = subtotal + finalShippingCost - discountAmount

  // Check for stock issues
  const hasStockIssues = items.some(item => {
    const product = getBySlug(item.slug)
    if (!product) return true
    const sizeEntry = product.sizes?.find(s => Number(s.us) === Number(item.sizeUs))
    if (!sizeEntry || !sizeEntry.is_active) return true
    return item.quantity > sizeEntry.stock
  })

  const isPayDisabled = items.length === 0 || hasStockIssues

  return (
    <div className="min-h-screen bg-white pb-24" dir="rtl">
      <div className="ps-6 pe-6 pt-[40px]">
        <h1 className="font-extrabold leading-[1.3] tracking-[0] text-black text-start mb-[40px]" style={{ fontSize: 'clamp(40px, 5.5vw, 88px)' }}>
          {t('checkout.title')}
        </h1>

        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[4px]" role="alert">
            <p className="text-[13px] text-red-800">{submitError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-[60px] items-start">
          {/* Form Column - Right side in RTL (order-1 on lg) */}
          <div className="lg:order-1">
            <InformationForm
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              setErrors={setErrors}
            />
            <DeliveryOptions
              selectedMethod={selectedDelivery}
              setSelectedMethod={setSelectedDelivery}
              freeShippingThreshold={settings.freeShippingThreshold}
              standardFee={settings.standardFee}
              expressFee={settings.expressFee}
            />
            <PaymentOptions
              onSubmit={handleSubmit}
              isPayDisabled={isPayDisabled}
              isSubmitting={isSubmitting}
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
              onCouponApplied={(percent, discountAmount) => {
                // Optional: handle coupon applied callback
              }}
              settings={settings}
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
                disabled={isPayDisabled || isSubmitting}
                className="w-full sm:w-auto h-[44px] px-6 bg-black text-white text-[12px] font-semibold hover:bg-[#222] transition-colors rounded-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black whitespace-nowrap"
                onClick={handleSubmit}
              >
                {isSubmitting ? 'در حال ثبت...' : t('checkout.payAndPlaceOrder')}
              </button>
              {isPayDisabled && (
                <p className="text-[11px] text-gray-500 text-center w-full sm:hidden">
                  {items.length === 0 ? t('checkout.bagEmpty') : 'مشکل موجودی سبد خرید'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}