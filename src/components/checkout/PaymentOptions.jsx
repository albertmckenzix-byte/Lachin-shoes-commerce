import { useTranslation } from 'react-i18next'

export default function PaymentOptions({ onSubmit, isPayDisabled, isSubmitting }) {
  const { t } = useTranslation()

  const handleFormSubmit = (e) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleFormSubmit} className="mt-14" noValidate>
      <h2 className="text-[24px] font-normal text-black leading-[1.3] mb-5">{t('checkout.payment')}</h2>

      <div className="border-b-[1px] border-[#BDBDBD] py-4">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-[#BDBDBD] text-black focus:ring-0 focus:border-black appearance-none rounded-full border-[2px] checked:border-black checked:bg-black checked:bg-[radial-gradient(circle_at_center,_white_4px,_transparent_5px)] flex-shrink-0 ms-4" />
          <div className="flex-1">
            <span className="text-[13px] font-medium text-black leading-[1.3]">پرداخت آنلاین</span>
            <p className="mt-1 text-[11px] text-gray-500 leading-[1.4]">
              پس از ثبت سفارش، به صفحه امن پرداخت منتقل می‌شوید.
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPayDisabled || isSubmitting}
        className="w-full h-11 bg-black text-white text-[12px] font-semibold hover:bg-[#222] transition-colors rounded-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black"
      >
        {isSubmitting ? 'در حال ثبت...' : t('checkout.payAndPlaceOrder')}
      </button>
      {isPayDisabled && (
        <p className="mt-2 text-[11px] text-gray-500 text-center">
          {t('checkout.bagEmpty')}
        </p>
      )}
    </form>
  )
}