import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useProducts } from '../context/ProductsContext'
import InformationForm from '../components/checkout/InformationForm'
import DeliveryOptions from '../components/checkout/DeliveryOptions'
import PaymentOptions from '../components/checkout/PaymentOptions'
import ShoppingBag from '../components/checkout/ShoppingBag'
import { formatPrice } from '../utils/format'
import { EXPRESS_SHIPPING_FEE } from '../config'
import { createOrder, requestPayment } from '../api/orders'

export default function Checkout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { items, count, subtotal, clearCart } = useCart()
  const { products } = useProducts()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    country: 'Iran',
    province: '',
    city: '',
    address: '',
    zipCode: '',
    agreeDataProcessing: false,
    agreeDataProcessingPayment: false,
  })
  const [errors, setErrors] = useState({})
  const [selectedDelivery, setSelectedDelivery] = useState('standard')
  const [selectedPayment, setSelectedPayment] = useState('shetab')
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const shippingCost = selectedDelivery === 'express' ? EXPRESS_SHIPPING_FEE : 0
  const discountAmount = discount || 0
  const total = Math.max(0, subtotal + shippingCost - discountAmount)
  const isPayDisabled = items.length === 0 || isSubmitting

  const validateInformation = () => {
    const newErrors = {}
    if (!formData.firstName.trim()) newErrors.firstName = t('checkout.requiredField')
    if (!formData.lastName.trim()) newErrors.lastName = t('checkout.requiredField')
    if (!formData.province?.trim()) newErrors.province = 'انتخاب استان الزامی است'
    if (!formData.city.trim()) newErrors.city = t('checkout.requiredField')
    if (!formData.address.trim()) newErrors.address = t('checkout.requiredField')
    if (!formData.agreeDataProcessing) newErrors.agreeDataProcessing = t('checkout.requiredField')
    if (!formData.agreeDataProcessingPayment) newErrors.agreeDataProcessingPayment = t('checkout.requiredField')

    const cleanPhone = formData.phone.trim().replace(/[\s\-]/g, '')
    if (!cleanPhone) {
      newErrors.phone = t('checkout.requiredField')
    } else if (!/^(\+98|0098|98|0)?9\d{9}$/.test(cleanPhone)) {
      newErrors.phone = 'شماره موبایل باید معتبر باشد (مثال: ۰۹۱۲۱۲۳۴۵۶۷)'
    }

    setErrors((prev) => ({ ...prev, ...newErrors }))
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    setServerError('')
    if (!validateInformation()) {
      window.scrollTo({ top: 120, behavior: 'smooth' })
      return
    }

    if (items.length === 0) {
      setServerError('سبد خرید شما خالی است.')
      return
    }

    // Format items for the backend
    const orderItems = []
    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId)
      if (!prod) {
        setServerError('اطلاعات برخی از محصولات سبد خرید یافت نشد. لطفاً صفحه را بارگذاری مجدد کنید.')
        return
      }
      orderItems.push({
        slug: prod.slug,
        size_us: parseFloat(item.size),
        quantity: item.quantity,
      })
    }

    const payload = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      country: formData.country.trim() || 'Iran',
      province: formData.province.trim(),
      city: formData.city.trim(),
      address: formData.address.trim(),
      postal_code: formData.zipCode.trim(),
      delivery_method: selectedDelivery,
      payment_method: selectedPayment,
      coupon_code: promoCode.trim(),
      items: orderItems,
    }

    setIsSubmitting(true)
    try {
      const res = await createOrder(payload)
      clearCart()

      // Redirect to payment gateway / simulator
      try {
        const payRes = await requestPayment({ orderNumber: res.number, token: res.token })
        if (payRes && payRes.payment_url) {
          window.location.href = payRes.payment_url
          return
        }
      } catch (payErr) {
        console.warn('Payment initiation skipped/failed, proceeding to invoice:', payErr)
      }

      navigate(`/order-success/${res.number}?token=${encodeURIComponent(res.token)}`)
    } catch (err) {
      setServerError(err.message || 'خطا در ثبت سفارش. لطفاً دوباره تلاش نمایید.')
      window.scrollTo({ top: 140, behavior: 'smooth' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pb-24" dir="rtl">
      <div className="ps-6 pe-6 pt-[40px] max-w-[1400px] mx-auto">
        <h1
          className="font-extrabold leading-[1.3] tracking-[0] text-black text-start mb-[40px]"
          style={{ fontSize: 'clamp(40px, 5.5vw, 88px)' }}
        >
          {t('checkout.title')}
        </h1>

        {serverError && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-800 rounded flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{serverError}</span>
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
              setSubmitted={() => {}}
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
              <p className="text-[20px] font-extrabold text-black whitespace-nowrap">
                {t('checkout.payAndPlaceOrder')} · {formatPrice(total)}
              </p>
            </div>
            <div className="w-full sm:w-auto flex flex-col items-end gap-2">
              <button
                disabled={isPayDisabled}
                className="w-full sm:w-auto h-[44px] px-6 bg-black text-white text-[12px] font-semibold hover:bg-[#222] transition-colors rounded-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black whitespace-nowrap inline-flex items-center justify-center gap-2"
                onClick={handleSubmit}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('checkout.payAndPlaceOrder')}
              </button>
              {items.length === 0 && (
                <p className="text-[11px] text-gray-500 text-center w-full sm:hidden">
                  {t('checkout.bagEmpty')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
