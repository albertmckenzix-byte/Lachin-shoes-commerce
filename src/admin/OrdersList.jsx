import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { formatNumber, formatPrice } from '../utils/format'
import { api } from './api'
import { useAuth } from './AuthContext'

// ─── Style constants ─────────────────────────────────────────────────────────

const inputClass =
  'h-[42px] rounded-md border border-[#D9D9D6] bg-white px-3 text-sm text-[#111] outline-none focus:border-[#111]'

const ORDER_STATUS_STYLES = {
  new: 'bg-[#111] text-white',
  processing: 'bg-[#fcc934] text-[#2b2100]',
  shipped: 'bg-[#e2ecfb] text-[#1d4a99]',
  delivered: 'bg-[#e3f3e6] text-[#1f6b34]',
  cancelled: 'bg-[#fde7e5] text-[#a52a22]',
}

const PAYMENT_STATUS_STYLES = {
  paid: 'text-[#1f6b34]',
  pending: 'text-[#8a5a00]',
  refunded: 'text-[#a52a22]',
}

const TIMELINE_STEPS = [
  { key: 'new', label: 'ثبت سفارش' },
  { key: 'processing', label: 'آماده‌سازی' },
  { key: 'shipped', label: 'ارسال' },
  { key: 'delivered', label: 'تحویل به مشتری' },
]

const STATUS_ORDER = ['new', 'processing', 'shipped', 'delivered']

const TABS = [
  { key: 'all', label: 'همه' },
  { key: 'new', label: 'جدید' },
  { key: 'processing', label: 'در حال پردازش' },
  { key: 'shipped', label: 'ارسال شده' },
  { key: 'delivered', label: 'تحویل شده' },
  { key: 'cancelled', label: 'لغو شده' },
]

const PAGE_SIZE = 20

// ─── Helper components ────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-[3px] text-xs font-medium ${ORDER_STATUS_STYLES[status] || 'bg-[#EEE] text-[#555]'}`}
    >
      {status === 'new' ? 'جدید' : status === 'processing' ? 'در حال پردازش' : status === 'shipped' ? 'ارسال شده' : status === 'delivered' ? 'تحویل شده' : status === 'cancelled' ? 'لغو شده' : status}
    </span>
  )
}

function PaymentText({ status }) {
  const labels = { paid: 'پرداخت شده', pending: 'در انتظار', refunded: 'برگشت خورده' }
  return (
    <span className={`text-sm font-medium ${PAYMENT_STATUS_STYLES[status] || ''}`}>
      {labels[status] || status}
    </span>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="flex-1 rounded-lg border border-[#E6E6E3] bg-white px-5 py-4">
      <div className="text-sm text-[#6B6B6B]">{label}</div>
      <div className="mt-1 text-[26px] font-bold text-[#111]">{value}</div>
    </div>
  )
}

// ─── Order detail panel ───────────────────────────────────────────────────────

function OrderDetailPanel({ order, onStatusChange, onPaymentChange, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-[#E6E6E3] bg-white px-6 py-16 text-center min-[1100px]:sticky min-[1100px]:top-7">
        <svg
          width="48"
          height="48"
          fill="none"
          viewBox="0 0 48 48"
          aria-hidden="true"
          className="mb-3 text-[#D9D9D6]"
        >
          <rect width="48" height="48" rx="10" fill="#F4F4F2" />
          <path
            d="M14 16h20M14 24h14M14 32h8"
            stroke="#C9C9C9"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-sm text-[#6B6B6B]">یک سفارش را انتخاب کنید</p>
      </div>
    )
  }

  const statusIdx = STATUS_ORDER.indexOf(order.status)
  const isCancelled = order.status === 'cancelled'
  const isPaid = order.paymentStatus === 'paid'
  const isPending = order.paymentStatus === 'pending'

  // Get allowed next statuses based on current status
  const getAllowedStatuses = (currentStatus) => {
    const transitions = {
      new: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    }
    return transitions[currentStatus] || []
  }

  const allowedStatuses = getAllowedStatuses(order.status)
  const statusLabels = {
    new: 'جدید',
    processing: 'در حال پردازش',
    shipped: 'ارسال شده',
    delivered: 'تحویل شده',
    cancelled: 'لغو شده',
  }

  const handleStatusChange = async (newStatus) => {
    setLoading(true)
    setError('')
    try {
      await api(`/admin/orders/${order.id}/update/`, {
        method: 'PATCH',
        body: { status: newStatus },
      })
      setToast('ذخیره شد')
      onStatusChange(order.id, newStatus)
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      setError(err.message || 'خطا در ذخیره')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentChange = async (newStatus) => {
    setLoading(true)
    setError('')
    try {
      await api(`/admin/orders/${order.id}/update/`, {
        method: 'PATCH',
        body: { paymentStatus: newStatus },
      })
      setToast('ذخیره شد')
      onPaymentChange(order.id, newStatus)
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      setError(err.message || 'خطا در ذخیره')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('این سفارش لغو شود؟ موجودی کالاها به انبار برمی‌گردد.')) return
    setLoading(true)
    setError('')
    try {
      await api(`/admin/orders/${order.id}/update/`, {
        method: 'PATCH',
        body: { status: 'cancelled' },
      })
      setToast('ذخیره شد')
      onCancel(order.id)
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      setError(err.message || 'خطا در لغو')
    } finally {
      setLoading(false)
    }
  }

  const toPersianDigits = (num) => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    return String(num).replace(/\d/g, (d) => persianDigits[d])
  }

  const formatJalali = (dateStr) => {
    try {
      const date = new Date(dateStr)
      return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[#E6E6E3] bg-white p-5 min-[1100px]:sticky min-[1100px]:top-7">
      {toast && (
        <div className="fixed top-4 end-4 z-50 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium">
          {toast}
        </div>
      )}
      {error && (
        <div className="fixed top-4 end-4 z-50 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-[#6B6B6B]">جزئیات سفارش</div>
          <div className="mt-0.5 text-lg font-bold text-[#111]">#{toPersianDigits(order.number)}</div>
          <div className="mt-1 text-xs text-[#6B6B6B]">{formatJalali(order.createdAt)}</div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <StatusBadge status={order.status} />
          <PaymentText status={order.paymentStatus} />
        </div>
      </div>

      {/* Customer */}
      <div className="rounded-md border border-[#ECECEA] bg-[#FAFAF8] px-4 py-3 text-sm">
        <div className="font-semibold text-[#111]">{order.customerName}</div>
        <div className="mt-0.5 text-[#6B6B6B]">{order.city}</div>
        <div className="mt-0.5 text-[#6B6B6B]">
          <a href={`tel:${order.phone}`} className="hover:underline" dir="ltr">
            {order.phone}
          </a>
        </div>
        {order.email && (
          <div className="mt-0.5 text-[#6B6B6B]" dir="ltr">
            {order.email}
          </div>
        )}
      </div>

      {/* Address */}
      <div className="text-sm">
        <div className="text-xs font-semibold text-[#6B6B6B] mb-1">آدرس</div>
        <div className="text-[#111]">{order.address}</div>
        {order.postal_code && (
          <div className="mt-1 text-[#6B6B6B] text-xs" dir="ltr">
            کد پستی: {order.postal_code}
          </div>
        )}
      </div>

      {/* Delivery method */}
      <div className="text-sm">
        <div className="text-xs font-semibold text-[#6B6B6B] mb-1">روش ارسال</div>
        <div className="text-[#111]">
          {order.delivery_method === 'express' ? 'ارسال سریع' : 'ارسال عادی'}
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="mb-2 text-xs font-semibold text-[#6B6B6B]">اقلام سفارش</div>
        <div className="flex flex-col gap-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <bdi dir="ltr" className="block truncate text-sm font-medium text-[#111]">
                  {item.product_name}
                </bdi>
                <div className="text-xs text-[#6B6B6B]">
                  US {item.size_us} · {formatNumber(item.quantity)} عدد
                </div>
              </div>
              <div className="flex-shrink-0 text-sm text-[#111]">
                {formatPrice(item.line_total)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1 border-t border-[#ECECEA] pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[#6B6B6B]">جمع اقلام</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount_total > 0 && (
            <div className="flex justify-between">
              <span className="text-[#6B6B6B]">تخفیف</span>
              <span className="text-green-600">-{formatPrice(order.discount_total)}</span>
            </div>
          )}
          {order.shipping_fee > 0 && (
            <div className="flex justify-between">
              <span className="text-[#6B6B6B]">هزینه ارسال</span>
              <span>{formatPrice(order.shipping_fee)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t border-[#ECECEA] pt-2">
            <span>جمع کل</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Coupon */}
      {order.coupon_code && (
        <div className="text-sm">
          <div className="text-xs font-semibold text-[#6B6B6B] mb-1">کد تخفیف</div>
          <div className="text-[#111]" dir="ltr">{order.coupon_code}</div>
        </div>
      )}

      {/* Note */}
      {order.note && (
        <div className="text-sm">
          <div className="text-xs font-semibold text-[#6B6B6B] mb-1">یادداشت</div>
          <div className="text-[#111]">{order.note}</div>
        </div>
      )}

      {/* Status change controls */}
      {!isCancelled && allowedStatuses.length > 0 && (
        <div className="border-t border-[#ECECEA] pt-4">
          <div className="text-xs font-semibold text-[#6B6B6B] mb-2">تغییر وضعیت</div>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                handleStatusChange(e.target.value)
                e.target.value = ''
              }
            }}
            disabled={loading}
            className={`${inputClass} w-full`}
          >
            <option value="">انتخاب وضعیت جدید</option>
            {allowedStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Payment controls */}
      {!isCancelled && (
        <div className="border-t border-[#ECECEA] pt-4">
          <div className="text-xs font-semibold text-[#6B6B6B] mb-2">پرداخت</div>
          <div className="flex gap-2">
            {isPending && (
              <button
                type="button"
                onClick={() => handlePaymentChange('paid')}
                disabled={loading}
                className="flex-1 h-10 rounded-md bg-green-600 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                ثبت پرداخت
              </button>
            )}
            {isPaid && (
              <button
                type="button"
                onClick={() => handlePaymentChange('refunded')}
                disabled={loading}
                className="flex-1 h-10 rounded-md bg-orange-600 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                بازپرداخت
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cancel button */}
      {!isCancelled && (
        <div className="border-t border-[#ECECEA] pt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="w-full h-11 rounded-md border-[1.5px] border-[#fde7e5] text-sm font-semibold text-[#a52a22] hover:border-[#a52a22] disabled:opacity-50"
          >
            لغو سفارش
          </button>
          <p className="mt-2 text-xs text-[#6B6B6B] text-center">
            موجودی کالاها به انبار برمی‌گردد.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OrdersList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { token } = useAuth()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [counts, setCounts] = useState({})
  const [dashboard, setDashboard] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // URL state
  const status = searchParams.get('status') || 'all'
  const paymentStatus = searchParams.get('payment_status') || ''
  const search = searchParams.get('search') || ''
  const dateFrom = searchParams.get('date_from') || ''
  const dateTo = searchParams.get('date_to') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  // Debounced search
  const [searchInput, setSearchInput] = useState(search)
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Update URL params
  const updateParams = useCallback((updates) => {
    const newParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value)
      } else {
        newParams.delete(key)
      }
    })
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  // Load orders
  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      if (paymentStatus) params.set('payment_status', paymentStatus)
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      params.set('page', page.toString())
      params.set('page_size', PAGE_SIZE.toString())

      const data = await api(`/admin/orders/?${params.toString()}`)
      setOrders(data.results || [])
      setCounts(data.counts || {})
    } catch (err) {
      setError(err.message || 'خطا در دریافت سفارش‌ها')
    } finally {
      setLoading(false)
    }
  }, [status, paymentStatus, debouncedSearch, dateFrom, dateTo, page])

  // Load dashboard
  const loadDashboard = useCallback(async () => {
    try {
      const data = await api('/admin/dashboard/')
      setDashboard(data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    }
  }, [])

  // Load order detail
  const loadOrderDetail = useCallback(async (id) => {
    setLoadingDetail(true)
    try {
      const data = await api(`/admin/orders/${id}/`)
      setSelectedOrder(data)
    } catch (err) {
      console.error('Failed to load order detail:', err)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    if (selectedId) {
      loadOrderDetail(selectedId)
    } else {
      setSelectedOrder(null)
    }
  }, [selectedId, loadOrderDetail])

  // Handlers
  const handleStatusChange = useCallback((orderId, newStatus) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: newStatus } : o
    ))
    loadOrders()
    loadDashboard()
  }, [loadOrders, loadDashboard])

  const handlePaymentChange = useCallback((orderId, newStatus) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, paymentStatus: newStatus } : o
    ))
    loadOrders()
    loadDashboard()
  }, [loadOrders, loadDashboard])

  const handleCancel = useCallback((orderId) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'cancelled' } : o
    ))
    loadOrders()
    loadDashboard()
  }, [loadOrders, loadDashboard])

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      if (paymentStatus) params.set('payment_status', paymentStatus)
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/orders/export/?${params.toString()}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      })

      if (!response.ok) throw new Error('خطا در دانلود فایل')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.message || 'خطا در دانلود فایل')
    }
  }

  const toPersianDigits = (num) => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    return String(num).replace(/\d/g, (d) => persianDigits[d])
  }

  const formatJalali = (dateStr) => {
    try {
      const date = new Date(dateStr)
      return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
    } catch {
      return dateStr
    }
  }

  const totalPages = Math.ceil((counts.all || 0) / PAGE_SIZE)

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#111]">سفارش‌ها</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            پیگیری سفارش‌ها، وضعیت پرداخت و ارسال هر مشتری
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex h-11 items-center rounded-full border-[1.5px] border-[#D9D9D6] px-5 text-sm font-semibold text-[#111] hover:border-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            خروجی اکسل
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/orders/new')}
            className="flex h-11 items-center rounded-md bg-black px-[18px] text-sm font-semibold text-white hover:bg-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            + ثبت سفارش دستی
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="my-6 flex gap-4 max-[640px]:flex-col">
        <StatCard label="سفارش‌های امروز" value={formatNumber(dashboard?.today?.ordersCount || 0)} />
        <StatCard label="فروش امروز" value={formatPrice(dashboard?.today?.sales || 0)} />
        <StatCard label="در انتظار پرداخت" value={formatNumber(dashboard?.pendingPaymentCount || 0)} />
        <StatCard label="ارسال‌شده این هفته" value={formatNumber(counts.shipped || 0)} />
      </div>

      {/* ── Status tabs ── */}
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="فیلتر وضعیت سفارش">
        {TABS.map((tab) => {
          const isActive = status === tab.key
          const count = tab.key === 'all' ? counts.all : counts[tab.key]
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => updateParams({ status: tab.key === 'all' ? '' : tab.key, page: '' })}
              className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                isActive
                  ? 'bg-[#111] text-white'
                  : 'border border-[#D9D9D6] bg-white text-[#444] hover:border-[#999]'
              }`}
            >
              {tab.label}
              {count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-px text-[11px] font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#ECECEA] text-[#555]'
                  }`}
                >
                  {formatNumber(count || 0)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Filter row ── */}
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="جستجوی شماره سفارش یا نام مشتری…"
          aria-label="جستجوی سفارش"
          className={`${inputClass} min-w-0 flex-[2] min-w-[180px]`}
        />
        <select
          value={paymentStatus}
          onChange={(e) => updateParams({ payment_status: e.target.value, page: '' })}
          aria-label="وضعیت پرداخت"
          className={inputClass}
        >
          <option value="">همه پرداخت‌ها</option>
          <option value="paid">پرداخت‌شده</option>
          <option value="pending">در انتظار پرداخت</option>
          <option value="refunded">برگشت‌خورده</option>
        </select>
        <select
          value={dateFrom ? 'custom' : 'all'}
          onChange={(e) => {
            const val = e.target.value
            if (val === 'all') {
              updateParams({ date_from: '', date_to: '', page: '' })
            } else if (val === 'today') {
              const today = new Date().toISOString().slice(0, 10)
              updateParams({ date_from: today, date_to: today, page: '' })
            } else if (val === '7') {
              const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
              const to = new Date().toISOString().slice(0, 10)
              updateParams({ date_from: from, date_to: to, page: '' })
            } else if (val === '30') {
              const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
              const to = new Date().toISOString().slice(0, 10)
              updateParams({ date_from: from, date_to: to, page: '' })
            }
          }}
          aria-label="بازه زمانی"
          className={inputClass}
        >
          <option value="all">همه زمان‌ها</option>
          <option value="today">امروز</option>
          <option value="7">۷ روز گذشته</option>
          <option value="30">۳۰ روز گذشته</option>
        </select>
      </div>

      {/* ── Two-column layout: table + detail panel ── */}
      <div className="flex gap-5 max-[1100px]:flex-col">
        {/* Orders table */}
        <div className="min-w-0 flex-1">
          <div className="overflow-x-auto rounded-lg border border-[#E6E6E3] bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['شماره', 'مشتری', 'تاریخ', 'مبلغ', 'پرداخت', 'وضعیت', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="bg-[#FAFAF8] px-4 py-3 text-start text-sm font-medium text-[#6B6B6B]"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-[#EEE]">
                      <td className="px-4 py-4">
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse mt-1" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-9 w-16 bg-gray-200 rounded-full animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      <p className="text-sm text-red-600 mb-4">{error}</p>
                      <button
                        type="button"
                        onClick={loadOrders}
                        className="h-9 px-4 rounded-full border-[1.5px] border-black text-sm font-semibold text-black hover:bg-black hover:text-white"
                      >
                        تلاش مجدد
                      </button>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-sm text-[#6B6B6B]">
                      سفارشی پیدا نشد
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const isSelected = order.id === selectedId
                    return (
                      <tr
                        key={order.id}
                        tabIndex={0}
                        onClick={() => setSelectedId(order.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedId(order.id)
                          }
                        }}
                        style={{ minHeight: '72px' }}
                        className={`cursor-pointer border-t border-[#EEE] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black ${
                          isSelected ? 'bg-[#f4f4f2]' : 'hover:bg-[#FAFAF8]'
                        }`}
                        aria-selected={isSelected}
                      >
                        <td className="px-4 py-4">
                          <span className="font-semibold text-[#111]">#{toPersianDigits(order.number)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-[#111]">{order.customerName}</div>
                          <div className="text-xs text-[#6B6B6B]">{order.city}</div>
                        </td>
                        <td className="px-4 py-4 text-[#6B6B6B]">
                          {formatJalali(order.createdAt)}
                        </td>
                        <td className="px-4 py-4 font-medium text-[#111]">
                          {formatPrice(order.total)}
                        </td>
                        <td className="px-4 py-4">
                          <PaymentText status={order.paymentStatus} />
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedId(order.id)
                            }}
                            aria-label={`مشاهده سفارش ${order.number}`}
                            className="flex h-9 min-w-[64px] items-center justify-center rounded-full border-[1.5px] border-black px-3.5 text-[13px] font-semibold text-black hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                          >
                            مشاهده
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {!loading && !error && orders.length > 0 && (
              <div className="flex items-center justify-between border-t border-[#EEE] px-4 py-3">
                <span className="text-sm text-[#6B6B6B]">
                  نمایش {formatNumber((page - 1) * PAGE_SIZE + 1)} تا{' '}
                  {formatNumber(Math.min(page * PAGE_SIZE, counts.all || 0))} از{' '}
                  {formatNumber(counts.all || 0)} سفارش
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => updateParams({ page: (page - 1).toString() })}
                    aria-label="صفحه قبلی"
                    className="flex h-9 items-center rounded-full border-[1.5px] border-[#D9D9D6] px-4 text-sm font-semibold text-[#111] hover:border-black disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    قبلی
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => updateParams({ page: (page + 1).toString() })}
                    aria-label="صفحه بعدی"
                    className="flex h-9 items-center rounded-full border-[1.5px] border-[#D9D9D6] px-4 text-sm font-semibold text-[#111] hover:border-black disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    بعدی
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="w-full min-[1100px]:w-[340px] min-[1100px]:flex-shrink-0">
          {loadingDetail ? (
            <div className="flex items-center justify-center rounded-lg border border-[#E6E6E3] bg-white p-8">
              <div className="text-sm text-[#6B6B6B]">در حال بارگذاری...</div>
            </div>
          ) : (
            <OrderDetailPanel
              order={selectedOrder}
              onStatusChange={handleStatusChange}
              onPaymentChange={handlePaymentChange}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>
    </div>
  )
}
