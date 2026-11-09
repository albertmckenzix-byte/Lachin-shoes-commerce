import { useSearchParams } from 'react-router-dom'
import { ShieldCheck, CreditCard, AlertTriangle, ArrowRight } from 'lucide-react'
import { formatPrice } from '../utils/format'
import { toPersianDigits } from '../utils/toPersianDigits'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function PaymentSimulator() {
  const [searchParams] = useSearchParams()
  const authority = searchParams.get('authority') || ''
  const amount = Number(searchParams.get('amount') || 0)
  const orderNumber = searchParams.get('orderNumber') || ''

  const handlePaySuccess = () => {
    window.location.href = `${API_URL}/api/payment/verify/?Authority=${encodeURIComponent(authority)}&Status=OK`
  }

  const handlePayCancel = () => {
    window.location.href = `${API_URL}/api/payment/verify/?Authority=${encodeURIComponent(authority)}&Status=NOK`
  }

  return (
    <div className="min-h-screen bg-[#F4F4F6] py-12 px-4 flex items-center justify-center font-sans" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-neutral-900 text-white p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-3">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold">شبیه‌ساز درگاه پرداخت اینترنتی</h1>
          <p className="text-xs text-gray-300 mt-1">محیط تست درگاه بانکی شاپرک (سفارش #{toPersianDigits(orderNumber)})</p>
        </div>

        {/* Notice */}
        <div className="bg-amber-50 border-y border-amber-200 p-3 px-6 flex items-center gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>این درگاه شبیه‌ساز توسعه است و نیاز به کارت بانکی واقعی ندارد.</span>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-neutral-50 p-4 rounded-lg border border-gray-200 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>پذیرنده:</span>
              <span className="font-semibold text-gray-900">فروشگاه کفش لاچین (Lachin)</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>شناسه پیگیری (Authority):</span>
              <span className="font-mono text-gray-700 text-[11px]">{authority}</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-bold text-gray-900">
              <span>مبلغ قابل پرداخت:</span>
              <span className="text-emerald-700 text-base">{formatPrice(amount)}</span>
            </div>
          </div>

          {/* Test Card Preview */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
            <div className="text-xs font-semibold text-gray-700">اطلاعات کارت تست:</div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <input
                type="text"
                readOnly
                value="۶۰۳۷ - ۹۹۱۸ - ۱۲۳۴ - ۵۶۷۸"
                className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-center font-mono text-gray-700 text-sm focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  readOnly
                  value="CVV2: ۱۲۳"
                  className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-center font-mono text-gray-700 text-xs focus:outline-none"
                />
                <input
                  type="text"
                  readOnly
                  value="انقضا: ۰۶ / ۲۸"
                  className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-center font-mono text-gray-700 text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handlePaySuccess}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-colors shadow flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              پرداخت موفقیت‌آمیز (تست)
            </button>

            <button
              type="button"
              onClick={handlePayCancel}
              className="w-full h-10 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2"
            >
              انصراف از پرداخت و بازگشت
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-center text-[11px] text-gray-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>امنیت پرداخت تست شده توسط پروتکل SSL و شاپرک</span>
        </div>
      </div>
    </div>
  )
}
