import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Printer, AlertCircle, CreditCard, XCircle, Loader2 } from 'lucide-react'
import { fetchOrderDetailPublic, requestPayment } from '../api/orders'
import { formatPrice } from '../utils/format'
import { toPersianDigits } from '../utils/toPersianDigits'
import { toJalali } from '../data/orders'

const STATUS_LABELS = {
  new: 'ثبت شده',
  processing: 'در حال آماده‌سازی',
  shipped: 'ارسال شده',
  delivered: 'تحویل شده',
  cancelled: 'لغو شده',
}

const STATUS_COLORS = {
  new: 'bg-black text-white',
  processing: 'bg-amber-100 text-amber-900 border border-amber-300',
  shipped: 'bg-blue-100 text-blue-900 border border-blue-300',
  delivered: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
  cancelled: 'bg-red-100 text-red-900 border border-red-300',
}

const PAYMENT_STATUS_LABELS = {
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت شده',
  refunded: 'مسترد شده',
}

export default function OrderSuccess() {
  const { number } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const paymentResult = searchParams.get('payment') // 'success' | 'failed'
  const refId = searchParams.get('ref_id')

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!number || !token) {
        setError('اطلاعات سفارش یا توکن دسترسی معتبر نیست.')
        setLoading(false)
        return
      }
      try {
        const data = await fetchOrderDetailPublic(number, token)
        if (!active) return
        if (!data) {
          setError('سفارش مورد نظر یافت نشد یا توکن امنیتی تطابق ندارد.')
        } else {
          setOrder(data)
        }
      } catch (err) {
        if (!active) return
        setError(err.message || 'خطا در بارگذاری اطلاعات سفارش.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [number, token, paymentResult])

  const handlePayNow = async () => {
    if (!order || !token) return
    setPaying(true)
    setPayError('')
    try {
      const res = await requestPayment({ orderNumber: order.number, token })
      if (res && res.payment_url) {
        window.location.href = res.payment_url
      }
    } catch (err) {
      setPayError(err.message || 'خطا در اتصال به درگاه پرداخت.')
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-white" dir="rtl">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-gray-600">در حال دریافت اطلاعات فاکتور سفارش...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-white px-6 py-12" dir="rtl">
        <div className="max-w-md w-full text-center border border-gray-200 p-8 rounded-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">خطا در نمایش سفارش</h1>
          <p className="text-sm text-gray-600 mb-6">{error || 'سفارش یافت نشد.'}</p>
          <Link
            to="/all-products"
            className="inline-flex items-center justify-center h-10 px-6 bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
          >
            مشاهده محصولات فروشگاه
          </Link>
        </div>
      </div>
    )
  }

  const items = Array.isArray(order.items) ? order.items : []
  const subtotal = order.subtotal ?? items.reduce((s, i) => s + (i.line_total || 0), 0)
  const shippingFee = order.shippingFee ?? 0
  const discountTotal = order.discountTotal ?? 0
  const total = order.total ?? subtotal + shippingFee - discountTotal
  const isPaid = order.paymentStatus === 'paid' || paymentResult === 'success'
  const displayRefId = refId || order.transactionId

  return (
    <div className="min-h-screen bg-white pb-24" dir="rtl">
      <div className="max-w-4xl mx-auto px-6 pt-10">
        {/* Payment Result Notification Banners */}
        {paymentResult === 'success' && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold">پرداخت شما با موفقیت انجام شد ✓</p>
              {displayRefId && (
                <p className="text-xs text-emerald-800 mt-0.5">
                  شماره پیگیری تراکنش بانکی: <span className="font-mono font-semibold">{displayRefId}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {paymentResult === 'failed' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-900 rounded-lg flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-bold">پرداخت ناموفق بود یا لغو گردید.</p>
                <p className="text-xs text-red-700 mt-0.5">
                  در صورتی که مبلغی از حساب شما کسر شده است، ظرف ۷۲ ساعت توسط بانک عودت داده خواهد شد.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePayNow}
              disabled={paying}
              className="h-9 px-4 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
            >
              {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
              تلاش مجدد
            </button>
          </div>
        )}

        {payError && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
            {payError}
          </div>
        )}

        {/* Header Confirmation */}
        <div className="text-center pb-8 border-b border-gray-200">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-black'
          }`}>
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-black mb-2">
            {isPaid ? 'سفارش و پرداخت شما با موفقیت ثبت شد' : 'سفارش شما با موفقیت ثبت شد'}
          </h1>
          <p className="text-base text-gray-600">
            شماره سفارش شما:{' '}
            <span className="font-bold text-black font-mono">
              #{toPersianDigits(order.number)}
            </span>
          </p>
        </div>

        {/* Order Meta Bar */}
        <div className="py-6 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div>
            <span className="text-gray-500 block text-xs">تاریخ ثبت سفارش</span>
            <span className="font-medium text-black">
              {order.createdAt ? toJalali(order.createdAt) : 'امروز'}
            </span>
          </div>

          <div>
            <span className="text-gray-500 block text-xs">وضعیت سفارش</span>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-0.5 ${
                STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>

          <div>
            <span className="text-gray-500 block text-xs">وضعیت پرداخت</span>
            <span
              className={`font-medium px-2.5 py-0.5 rounded text-xs border inline-block mt-0.5 ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isPaid ? 'پرداخت شده ✓' : (PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus)}
            </span>
          </div>

          <div>
            <span className="text-gray-500 block text-xs">روش ارسال</span>
            <span className="font-medium text-black">
              {order.deliveryMethod === 'express' ? 'ارسال اکسپرس (پیشتاز)' : 'ارسال استاندارد'}
            </span>
          </div>
        </div>

        {/* Tracking & Ref Details if paid */}
        {displayRefId && (
          <div className="py-4 border-b border-gray-200 text-xs text-gray-600 flex items-center justify-between">
            <span>شناسه پیگیری پرداخت بانکی:</span>
            <span className="font-mono font-bold text-gray-900 text-sm">{displayRefId}</span>
          </div>
        )}

        {/* Items List */}
        <div className="py-8">
          <h2 className="text-lg font-bold text-black mb-4">اقلام سفارش</h2>
          <div className="border border-gray-200 divide-y divide-gray-100">
            {items.map((item, idx) => (
              <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-black">{item.product_name}</h3>
                  <div className="text-xs text-gray-500 flex items-center gap-3 mt-1">
                    <span>سایز: EU {toPersianDigits(item.size_eu)} (US {toPersianDigits(item.size_us)})</span>
                    <span>•</span>
                    <span>تعداد: {toPersianDigits(item.quantity)} جفت</span>
                  </div>
                </div>
                <div className="text-start sm:text-end">
                  <span className="text-sm font-bold text-black">
                    {formatPrice(item.line_total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="bg-neutral-50 p-6 border border-gray-200 space-y-3 mb-8">
          <div className="flex justify-between text-sm text-gray-600">
            <span>مجموع اقلام</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>هزینه ارسال</span>
            <span>{shippingFee === 0 ? 'رایگان' : formatPrice(shippingFee)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between text-sm text-emerald-600 font-medium">
              <span>تخفیف</span>
              <span>-{formatPrice(discountTotal)}</span>
            </div>
          )}
          <div className="pt-3 border-t border-gray-300 flex justify-between text-base sm:text-lg font-bold text-black">
            <span>مبلغ {isPaid ? 'پرداخت شده' : 'قابل پرداخت'}</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        {/* Pay Now Call-to-action if pending */}
        {!isPaid && (
          <div className="mb-8 p-5 bg-amber-50 border border-amber-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-sm text-amber-900">سفارش در انتظار پرداخت است</p>
              <p className="text-xs text-amber-800 mt-1">
                اقلام شما به مدت ۳۰ دقیقه در انبار رزرو شده است. جهت تکمیل خرید و ارسال سفارش، روی دکمه پرداخت کلیک کنید.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePayNow}
              disabled={paying}
              className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow"
            >
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              پرداخت آنلاین سفارش ({formatPrice(total)})
            </button>
          </div>
        )}

        {/* Notice Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-xs sm:text-sm text-blue-900 mb-8 space-y-1">
          <p className="font-medium">📌 اطلاعات رهگیری:</p>
          <p className="text-blue-800">
            می‌توانید با ذخیره کردن نشانی این صفحه در مراجعات بعدی، وضعیت آماده‌سازی و ارسال بسته پستی خود را مشاهده نمایید.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/all-products"
            className="inline-flex items-center gap-2 h-11 px-6 bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            ادامه خرید از فروشگاه
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 h-11 px-5 border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            چاپ پیش‌فاکتور
          </button>
        </div>
      </div>
    </div>
  )
}
