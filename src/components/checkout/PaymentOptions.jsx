import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { ShieldCheck, CreditCard, Sparkles, ShoppingBag } from 'lucide-react'

export const PAYMENT_METHODS = {
  SHETAB: 'shetab',
  SNAPPPAY: 'snapppay',
  TOROBPAY: 'torobpay',
}

export default function PaymentOptions({
  selectedMethod,
  setSelectedMethod,
  formData,
  setFormData,
  errors,
  setErrors,
  onSubmit,
  isPayDisabled,
}) {
  const { t } = useTranslation()
  const [touched, setTouched] = useState(false)

  const paymentMethods = [
    {
      id: PAYMENT_METHODS.SHETAB,
      title: t('checkout.shetabPayment', 'پرداخت اینترنتی (کلیه کارت‌های عضو شتاب)'),
      subtitle: t('checkout.shetabSubtitle', 'اتصال مستقیم به درگاه امن شاپرک با کلیه کارت‌های بانکی کشور'),
      badge: t('checkout.shetabBadge', 'شتاب / شاپرک'),
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CreditCard,
      notice: t(
        'checkout.shetabNotice',
        'پس از ثبت سفارش، جهت پرداخت به درگاه امن بانکی شاپرک منتقل می‌شوید. نیازی به ورود اطلاعات کارت در وبسایت نیست.'
      ),
    },
    {
      id: PAYMENT_METHODS.SNAPPPAY,
      title: t('checkout.snappPay', 'اسنپ‌پی (پرداخت قسطی در ۴ ماه)'),
      subtitle: t('checkout.snappPaySubtitle', 'خرید اقساطی در ۴ قسط مساوی، بدون سود، کارمزد و بدون نیاز به ضامن'),
      badge: t('checkout.snappPayBadge', '۴ قسط ماهانه'),
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: Sparkles,
      notice: t(
        'checkout.snappPayNotice',
        'مبلغ سفارش به ۴ قسط مساوی تقسیم می‌شود. قسط اول در لحظه خرید و مابقی طی ۳ ماه آینده تسویه خواهد شد.'
      ),
    },
    {
      id: PAYMENT_METHODS.TOROBPAY,
      title: t('checkout.torobPay', 'ترپ‌پی / ترب‌پی (پرداخت اعتباری)'),
      subtitle: t('checkout.torobPaySubtitle', 'پرداخت سریع با حساب کاربری ترب و ضمانت بازگشت وجه خرید امن'),
      badge: t('checkout.torobPayBadge', 'خرید امن ترب'),
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: ShieldCheck,
      notice: t(
        'checkout.torobPayNotice',
        'پرداخت سریع با کیف پول یا درگاه امن ترب همراه با تضمین بازگشت وجه و پشتیبانی اختصاصی ترب.'
      ),
    },
  ]

  const handleChange = (checked) => {
    setFormData((prev) => ({ ...prev, agreeDataProcessingPayment: checked }))
    if (errors.agreeDataProcessingPayment) {
      setErrors((prev) => ({ ...prev, agreeDataProcessingPayment: '' }))
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (!formData.agreeDataProcessingPayment) {
      setErrors((prev) => ({
        ...prev,
        agreeDataProcessingPayment: t('checkout.requiredField', 'این فیلد الزامی است'),
      }))
      return
    }
    onSubmit()
  }

  return (
    <form onSubmit={handleFormSubmit} className="mt-14" noValidate>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[24px] font-normal text-black leading-[1.3]">{t('checkout.payment')}</h2>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          پرداخت ایمن و رمزنگاری‌شده
        </span>
      </div>

      {/* Payment methods list */}
      <div role="radiogroup" aria-label={t('checkout.payment')} className="space-y-3">
        {paymentMethods.map((method) => {
          const isSelected = selectedMethod === method.id
          const IconComponent = method.icon

          return (
            <div
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={`border transition-all rounded-sm cursor-pointer ${
                isSelected
                  ? 'border-black bg-neutral-50/50 shadow-sm'
                  : 'border-[#E5E5E5] hover:border-gray-400 bg-white'
              }`}
            >
              <label className="flex items-center justify-between p-4 cursor-pointer gap-3">
                {/* Radio Circle */}
                <input
                  type="radio"
                  name="payment"
                  value={method.id}
                  checked={isSelected}
                  onChange={() => setSelectedMethod(method.id)}
                  className="w-4 h-4 border-[#BDBDBD] text-black focus:ring-0 focus:border-black appearance-none rounded-full border-[2px] checked:border-black checked:bg-black checked:bg-[radial-gradient(circle_at_center,_white_4px,_transparent_5px)] flex-shrink-0"
                />

                {/* Info */}
                <div className="flex-1 text-start min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-black leading-[1.3]">
                      {method.title}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${method.badgeClass}`}
                    >
                      {method.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
                    {method.subtitle}
                  </p>
                </div>

                {/* Icon */}
                <div className="flex-shrink-0 text-gray-400 ms-2">
                  <IconComponent className="w-5 h-5" />
                </div>
              </label>

              {/* Informational notice when method is active */}
              {isSelected && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100/80 text-[11px] text-gray-600 leading-relaxed bg-white/60">
                  <p className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {method.notice}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Consent Checkbox */}
      <div className="mt-6 pt-4 border-t border-[#E5E5E5]">
        <div className="flex items-start gap-2.5 relative">
          <input
            type="checkbox"
            id="agreeDataProcessingPayment"
            name="agreeDataProcessingPayment"
            checked={!!formData.agreeDataProcessingPayment}
            onChange={(e) => handleChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 border-[#BDBDBD] text-black focus:ring-0 focus:border-black rounded-[2px] flex-shrink-0 cursor-pointer"
            aria-invalid={touched && errors.agreeDataProcessingPayment ? 'true' : 'false'}
            aria-describedby={
              touched && errors.agreeDataProcessingPayment ? 'agreeDataProcessingPayment-error' : undefined
            }
          />
          <label
            htmlFor="agreeDataProcessingPayment"
            className="text-[12px] text-gray-700 cursor-pointer select-none leading-relaxed"
          >
            <Trans
              i18nKey="checkout.agreeToDataProcessing"
              components={{
                1: <a href="#" className="underline text-black hover:text-black font-medium" />,
              }}
            >
              {t('checkout.agreeToDataProcessing')}
            </Trans>
          </label>
        </div>
        {touched && errors.agreeDataProcessingPayment && (
          <p id="agreeDataProcessingPayment-error" className="mt-1 text-[11px] text-red-600" role="alert">
            {errors.agreeDataProcessingPayment}
          </p>
        )}
      </div>

      {/* Desktop Submit Button */}
      <div className="mt-8 hidden lg:block">
        <button
          type="submit"
          disabled={isPayDisabled}
          className="w-full h-[52px] bg-black text-white text-[13px] font-semibold hover:bg-[#222] transition-colors rounded-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black"
        >
          {t('checkout.payAndPlaceOrder')}
        </button>
        {isPayDisabled && (
          <p className="mt-2 text-[11px] text-gray-500 text-center">{t('checkout.bagEmpty')}</p>
        )}
      </div>
    </form>
  )
}
