import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { formatPrice, formatNumber } from '../utils/format'
import { getOrder } from '../api/orders'

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const number = searchParams.get('number')
  const token = searchParams.get('token')

  useEffect(() => {
    if (!number || !token) {
      setError('سفارش یافت نشد')
      setLoading(false)
      return
    }

    loadOrder()
  }, [number, token])

  const loadOrder = async () => {
    try {
      const result = await getOrder(number, token)
      if (result.success) {
        setOrder(result.data)
      } else {
        setError(result.error || 'سفارش یافت نشد')
      }
    } catch (err) {
      setError('خطا در دریافت اطلاعات سفارش')
    } finally {
      setLoading(false)
    }
  }

  const toPersianDigits = (num) => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    return String(num).replace(/\d/g, (d) => persianDigits[d])
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'refunded':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'new':
        return 'جدید'
      case 'processing':
        return 'در حال پردازش'
      case 'shipped':
        return 'ارسال شده'
      case 'delivered':
        return 'تحویل داده شده'
      case 'cancelled':
        return 'لغو شده'
      default:
        return status
    }
  }

  const getPaymentStatusLabel = (status) => {
    switch (status) {
      case 'paid':
        return 'پرداخت شده'
      case 'pending':
        return 'در انتظار پرداخت'
      case 'refunded':
        return 'بازپرداخت شده'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <p className="text-[16px] text-gray-500">در حال بارگذاری...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-[24px] text-black mb-6">{error || 'سفارش یافت نشد'}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center h-[44px] px-6 bg-black text-white text-[12px] font-semibold hover:bg-[#222] transition-colors rounded-none"
          >
            بازگشت به فروشگاه
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-12" dir="rtl">
      <div className="max-w-2xl mx-auto px-6">
        {/* Success icon and message */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-[28px] font-normal text-black leading-[1.3] mb-4">سفارش شما ثبت شد</h1>
          <p className="text-[16px] text-gray-600">شماره سفارش: {toPersianDigits(order.number)}</p>
        </div>

        {/* Status badges */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={`px-3 py-1 rounded-full text-[12px] font-medium ${getStatusColor(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
          <span className={`px-3 py-1 rounded-full text-[12px] font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
            {getPaymentStatusLabel(order.paymentStatus)}
          </span>
        </div>

        {/* Order items */}
        <div className="border border-[#E5E5E5] rounded-[4px] p-6 mb-6">
          <h2 className="text-[18px] font-medium text-black mb-4">اقلام سفارش</h2>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-black">{item.product_name}</p>
                  <p className="text-[12px] text-gray-500 mt-1">
                    سایز: {item.size_us} · تعداد: {formatNumber(item.quantity)}
                  </p>
                </div>
                <p className="text-[14px] font-medium text-black">{formatPrice(item.line_total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center py-4 border-t border-[#E5E5E5] mb-6">
          <span className="text-[20px] font-medium text-black">مجموع:</span>
          <span className="text-[24px] font-bold text-black">{formatPrice(order.total)}</span>
        </div>

        {/* Note */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-[4px] p-4 mb-8">
          <p className="text-[14px] text-yellow-800">تا ۳۰ دقیقه برای تکمیل پرداخت فرصت دارید.</p>
        </div>

        {/* Back to store button */}
        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center h-[44px] px-8 bg-black text-white text-[12px] font-semibold hover:bg-[#222] transition-colors rounded-none"
          >
            بازگشت به فروشگاه
          </button>
        </div>
      </div>
    </div>
  )
}
