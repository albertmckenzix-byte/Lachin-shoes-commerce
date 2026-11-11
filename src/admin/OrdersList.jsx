import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, ChevronDown, Check, AlertCircle, Truck, Send, Loader2 } from 'lucide-react'
import { formatNumber } from '../utils/format'
import { exportOrders } from '../utils/exportOrders'
import {
  ORDERS,
  NEXT_STATUS,
  STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  toJalali,
} from '../data/orders'
import { api } from './api'
import { printOrderInvoice } from '../utils/printInvoice'

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

const PAGE_SIZE = 6

// ─── Helper components ────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-[3px] text-xs font-medium ${ORDER_STATUS_STYLES[status] || 'bg-[#EEE] text-[#555]'}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function PaymentText({ status }) {
  return (
    <span className={`text-sm font-medium ${PAYMENT_STATUS_STYLES[status] || ''}`}>
      {PAYMENT_STATUS_LABELS[status] || status}
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

function OrderDetailPanel({ order, onStatusAdvance, onCancel, onPrint }) {
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
  const canAdvance = NEXT_STATUS[order.status] !== undefined && NEXT_STATUS[order.status] !== null
  const isCancelled = order.status === 'cancelled'

  const nextActionLabel = {
    new: 'شروع آماده‌سازی',
    processing: 'ثبت ارسال',
    shipped: 'تأیید تحویل',
    delivered: 'تحویل شده',
  }[order.status] || 'ادامه'

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[#E6E6E3] bg-white p-5 min-[1100px]:sticky min-[1100px]:top-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-[#6B6B6B]">جزئیات سفارش</div>
          <div className="mt-0.5 text-lg font-bold text-[#111]">{order.orderNumber}</div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Customer */}
      <div className="rounded-md border border-[#ECECEA] bg-[#FAFAF8] px-4 py-3 text-sm">
        <div className="font-semibold text-[#111]">{order.customer.name}</div>
        <div className="mt-0.5 text-[#6B6B6B]">{order.customer.city}</div>
        <div className="mt-0.5 text-[#6B6B6B]" dir="ltr">
          {order.customer.phone}
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="mb-2 text-xs font-semibold text-[#6B6B6B]">اقلام سفارش</div>
        <div className="flex flex-col gap-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              {/* Thumbnail placeholder */}
              <div className="h-12 w-12 flex-shrink-0 rounded bg-[#ECECEC]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <bdi dir="ltr" className="block truncate text-sm font-medium text-[#111]">
                  {item.name}
                </bdi>
                <div className="text-xs text-[#6B6B6B]">
                  {item.size} · {formatNumber(item.qty)} عدد
                </div>
              </div>
              <div className="flex-shrink-0 text-sm text-[#111]">
                {formatNumber(item.price)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-[#ECECEA] pt-3 text-sm font-semibold">
          <span>جمع کل (تومان)</span>
          <span>{formatNumber(order.total)}</span>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <div className="mb-3 text-xs font-semibold text-[#6B6B6B]">روند سفارش</div>
        <ol className="flex flex-col gap-0">
          {TIMELINE_STEPS.map((step, i) => {
            const done = statusIdx > i || (statusIdx === i && order.status !== 'new' && i === 0)
            const isCurrent = STATUS_ORDER[i] === order.status || (order.status === 'new' && i === 0)

            // For "new" orders, step 0 (ثبت سفارش) is current
            const isFirstDone = i === 0 && statusIdx >= 0

            const dotClass = isFirstDone
              ? 'h-3 w-3 rounded-full bg-[#111]'
              : isCurrent
                ? 'h-3 w-3 rounded-full border-[2.5px] border-[#fcc934] bg-white'
                : done
                  ? 'h-3 w-3 rounded-full bg-[#111]'
                  : 'h-3 w-3 rounded-full border-2 border-[#D9D9D6] bg-white'

            const textClass = isCurrent
              ? 'text-sm font-bold text-[#111]'
              : done || isFirstDone
                ? 'text-sm text-[#111]'
                : 'text-sm text-[#ADADAD]'

            const isLast = i === TIMELINE_STEPS.length - 1

            return (
              <li key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={dotClass} />
                  {!isLast && <div className="my-0.5 h-6 w-px bg-[#E6E6E3]" />}
                </div>
                <div className={`${textClass} pb-1`}>{step.label}</div>
              </li>
            )
          })}
          {/* Cancelled step */}
          {isCancelled && (
            <li className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 rounded-full border-2 border-[#a52a22] bg-[#fde7e5]" />
              </div>
              <div className="text-sm font-bold text-[#a52a22]">لغو شده</div>
            </li>
          )}
        </ol>
      </div>

      {/* Postal Tracking Code & SMS Notification */}
      <div className="rounded-md border border-[#ECECEA] bg-[#FAFAF8] p-3 text-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#111]">
            <Truck className="w-3.5 h-3.5 text-black" />
            <span>کد رهگیری پستی (پیامک خودکار)</span>
          </div>
          {(order.shippingTrackingCode || order.shipping_tracking_code) ? (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
              پیامک فعال
            </span>
          ) : (
            <span className="text-[10px] text-gray-500">ثبت نشده</span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            dir="ltr"
            placeholder="مثال: 123456789012345678901234"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            className="flex-1 h-9 px-2.5 bg-white border border-[#D9D9D6] rounded text-xs text-black font-mono focus:outline-none focus:border-black"
          />
          <button
            type="button"
            onClick={handleSaveTracking}
            disabled={savingTracking}
            className="h-9 px-3 bg-black text-white rounded text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center gap-1 flex-shrink-0"
          >
            {savingTracking ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            <span>ثبت و پیامک</span>
          </button>
        </div>

        {trackingFeedback && (
          <p className="mt-2 text-[11px] text-emerald-700 font-medium">
            {trackingFeedback}
          </p>
        )}
      </div>

      {/* Actions */}
      {!isCancelled && (
        <div className="flex flex-col gap-2">
          {canAdvance && (
            <button
              type="button"
              onClick={handleAdvanceWithTracking}
              className="flex h-11 w-full items-center justify-center rounded-md bg-black text-sm font-semibold text-white hover:bg-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              {nextActionLabel}
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (onPrint ? onPrint(order) : printOrderInvoice(order))}
              className="flex h-11 flex-1 items-center justify-center rounded-full border-[1.5px] border-[#D9D9D6] text-sm font-semibold text-[#111] hover:border-black active:bg-gray-100 transition-colors"
            >
              چاپ فاکتور
            </button>
            <button
              type="button"
              onClick={() => onCancel(order.id)}
              className="flex h-11 flex-1 items-center justify-center rounded-full border-[1.5px] border-[#fde7e5] text-sm font-semibold text-[#a52a22] hover:border-[#a52a22]"
            >
              لغو سفارش
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

// Stable reference used for date comparisons (re-evaluated on each module load, not per render)
function getNow() {
  return new Date()
}

export default function OrdersList() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState(ORDERS)
  const [loadingOrders, setLoadingOrders] = useState(true)

  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)

  const loadOrders = useCallback(async () => {
    try {
      const data = await api('/admin/orders/')
      if (Array.isArray(data) && data.length > 0) {
        setOrders(data)
      } else {
        setOrders(ORDERS)
      }
    } catch {
      setOrders(ORDERS)
    } finally {
      setLoadingOrders(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Debounce search
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(window.__ordersSearchTimer)
    window.__ordersSearchTimer = setTimeout(() => setDebouncedSearch(val), 220)
  }, [])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = getNow()
    const todayStr = today.toISOString().slice(0, 10)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const todayOrders = orders.filter(
      (o) => new Date(o.createdAt).toISOString().slice(0, 10) === todayStr
    )
    const pendingOrders = orders.filter(
      (o) => o.status === 'new' || o.status === 'processing'
    )
    const shippedThisWeek = orders.filter(
      (o) => o.status === 'shipped' && new Date(o.createdAt) >= weekAgo
    )
    const todaySales = todayOrders.reduce((s, o) => s + (o.total || 0), 0)

    return {
      todayCount: todayOrders.length,
      pendingCount: pendingOrders.length,
      shippedWeekCount: shippedThisWeek.length,
      todaySales,
    }
  }, [orders])

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    const now = getNow()

    return orders.filter((o) => {
      if (activeTab !== 'all' && o.status !== activeTab) return false
      if (paymentFilter && o.paymentStatus !== paymentFilter) return false
      if (q) {
        const orderNum = (o.orderNumber || String(o.number || o.id)).toLowerCase()
        const custName = (o.customer?.name || '').toLowerCase()
        const custPhone = (o.customer?.phone || '').toLowerCase()
        if (!orderNum.includes(q) && !custName.includes(q) && !custPhone.includes(q)) return false
      }
      if (dateFilter !== 'all') {
        const created = new Date(o.createdAt)
        const diffMs = now - created
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        if (dateFilter === 'today' && diffDays > 1) return false
        if (dateFilter === '7' && diffDays > 7) return false
        if (dateFilter === '30' && diffDays > 30) return false
      }
      return true
    })
  }, [orders, activeTab, debouncedSearch, paymentFilter, dateFilter])

  // Reset page when filters change (called inline in handlers below)

  const setTabAndReset = (key) => { setActiveTab(key); setPage(1) }
  const setPaymentAndReset = (val) => { setPaymentFilter(val); setPage(1) }
  const setDateAndReset = (val) => { setDateFilter(val); setPage(1) }

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const counts = { all: orders.length }
    for (const o of orders) {
      counts[o.status] = (counts[o.status] || 0) + 1
    }
    return counts
  }, [orders])

  // ── Selected order ─────────────────────────────────────────────────────────
  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedId || o.number === selectedId) || null,
    [orders, selectedId]
  )

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleStatusAdvance = useCallback(async (id, optionalTrackingCode) => {
    const target = orders.find((o) => o.id === id || o.number === id)
    if (!target) return
    const next = NEXT_STATUS[target.status]
    if (!next) return

    const num = target.number || target.id
    const payload = { status: next }
    if (optionalTrackingCode) {
      payload.shipping_tracking_code = optionalTrackingCode
    }
    try {
      const updated = await api(`/admin/orders/${num}/`, {
        method: 'PATCH',
        body: payload,
      })
      setOrders((prev) =>
        prev.map((o) => (o.id === id || o.number === id ? { ...o, ...updated } : o))
      )
    } catch {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id && o.number !== id) return o
          return { ...o, status: next, shippingTrackingCode: optionalTrackingCode || o.shippingTrackingCode }
        })
      )
    }
  }, [orders])

  const handleUpdateTracking = useCallback(async (id, trackingCode) => {
    const target = orders.find((o) => o.id === id || o.number === id)
    if (!target) return
    const num = target.number || target.id
    const updated = await api(`/admin/orders/${num}/`, {
      method: 'PATCH',
      body: { shipping_tracking_code: trackingCode },
    })
    setOrders((prev) =>
      prev.map((o) => (o.id === id || o.number === id ? { ...o, ...updated } : o))
    )
    return updated
  }, [orders])

  const handleCancel = useCallback(async (id) => {
    if (!window.confirm('این سفارش لغو شود؟')) return
    const target = orders.find((o) => o.id === id || o.number === id)
    if (!target) return

    const num = target.number || target.id
    try {
      const updated = await api(`/admin/orders/${num}/`, {
        method: 'PATCH',
        body: { status: 'cancelled' },
      })
      setOrders((prev) =>
        prev.map((o) => (o.id === id || o.number === id ? { ...o, ...updated } : o))
      )
    } catch {
      setOrders((prev) =>
        prev.map((o) =>
          (o.id === id || o.number === id)
            ? { ...o, status: 'cancelled', paymentStatus: o.paymentStatus === 'paid' ? 'refunded' : o.paymentStatus }
            : o
        )
      )
    }
  }, [orders])

  // ── Excel / CSV Export ─────────────────────────────────────────────────────
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportMenuRef = useRef(null)

  // Toast feedback
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ message, type })
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
    }, 3500)
  }, [])

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false)
      }
    }
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [exportMenuOpen])

  const handleExport = useCallback(
    (format = 'excel') => {
      if (!filtered || filtered.length === 0) {
        showToast('هیچ سفارشی با فیلترهای انتخابی برای خروجی گرفتن وجود ندارد.', 'error')
        return
      }

      try {
        setExporting(true)
        const tabSuffix = activeTab !== 'all' ? `-${activeTab}` : ''
        const baseName = `lachin-orders${tabSuffix}`
        const result = exportOrders(filtered, format, baseName)
        const countFa = formatNumber(result.count)
        const formatLabel = format === 'csv' ? 'CSV پستی' : 'اکسل'
        showToast(`فایل ${formatLabel} با موفقیت ذخیره شد (${countFa} سفارش)`, 'success')
      } catch (err) {
        showToast(err.message || 'خطا در ایجاد فایل خروجی', 'error')
      } finally {
        setExporting(false)
        setExportMenuOpen(false)
      }
    },
    [filtered, activeTab, showToast]
  )

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-white shadow-lg transition-all ${
            toast.type === 'error' ? 'bg-[#B3261E]' : 'bg-[#1f6b34]'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <Check className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#111]">سفارش‌ها</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            پیگیری سفارش‌ها، وضعیت پرداخت و ارسال هر مشتری
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Button with Format Dropdown */}
          <div className="relative inline-flex items-stretch" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => handleExport('excel')}
              disabled={exporting}
              className="flex h-11 items-center gap-2 rounded-r-full border-[1.5px] border-l-0 border-[#D9D9D6] bg-white pr-4 pl-3 text-sm font-semibold text-[#111] transition-colors hover:border-black hover:bg-[#FAFAF8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50"
              title="دانلود فایل اکسل مناسب برای انبار و پست"
            >
              <Download className="h-4 w-4 text-[#555]" />
              <span>خروجی اکسل</span>
            </button>
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              disabled={exporting}
              aria-label="انتخاب فرمت خروجی"
              className="flex h-11 items-center justify-center rounded-l-full border-[1.5px] border-[#D9D9D6] bg-white px-2.5 text-[#555] transition-colors hover:border-black hover:bg-[#FAFAF8] hover:text-[#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronDown className="h-4 w-4" />
            </button>

            {/* Dropdown Menu */}
            {exportMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-56 rounded-lg border border-[#E4E4E2] bg-white py-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => handleExport('excel')}
                  className="flex w-full items-center justify-between px-3.5 py-2.5 text-right text-xs text-[#111] hover:bg-[#FAFAF8] transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">فایل اکسل (.xls)</span>
                    <span className="text-[10px] text-[#6B6B6B]">جدول راست‌چین و استایل‌دار</span>
                  </div>
                  <span className="rounded bg-[#FAFAF8] px-1.5 py-0.5 text-[10px] font-mono text-[#666] border border-[#E4E4E2]">
                    XLS
                  </span>
                </button>
                <div className="my-1 border-t border-[#EEE]" />
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  className="flex w-full items-center justify-between px-3.5 py-2.5 text-right text-xs text-[#111] hover:bg-[#FAFAF8] transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">فایل داده پستی (.csv)</span>
                    <span className="text-[10px] text-[#6B6B6B]">سازگار با سامانه‌های پستی</span>
                  </div>
                  <span className="rounded bg-[#FAFAF8] px-1.5 py-0.5 text-[10px] font-mono text-[#666] border border-[#E4E4E2]">
                    CSV
                  </span>
                </button>
              </div>
            )}
          </div>
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
        <StatCard label="سفارش‌های امروز" value={formatNumber(stats.todayCount)} />
        <StatCard label="در انتظار پردازش" value={formatNumber(stats.pendingCount)} />
        <StatCard label="ارسال‌شده این هفته" value={formatNumber(stats.shippedWeekCount)} />
        <StatCard label="فروش امروز (تومان)" value={formatNumber(stats.todaySales)} />
      </div>

      {/* ── Status tabs ── */}
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="فیلتر وضعیت سفارش">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTabAndReset(tab.key)}
              className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                isActive
                  ? 'bg-[#111] text-white'
                  : 'border border-[#D9D9D6] bg-white text-[#444] hover:border-[#999]'
              }`}
            >
              {tab.label}
              {tabCounts[tab.key] !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-px text-[11px] font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#ECECEA] text-[#555]'
                  }`}
                >
                  {formatNumber(tabCounts[tab.key] || 0)}
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
          value={search}
          onChange={handleSearchChange}
          placeholder="جستجوی شماره سفارش یا نام مشتری…"
          aria-label="جستجوی سفارش"
          className={`${inputClass} min-w-0 flex-[2] min-w-[180px]`}
        />
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentAndReset(e.target.value)}
          aria-label="وضعیت پرداخت"
          className={inputClass}
        >
          <option value="">همه پرداخت‌ها</option>
          <option value="paid">پرداخت‌شده</option>
          <option value="pending">در انتظار پرداخت</option>
          <option value="refunded">برگشت‌خورده</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateAndReset(e.target.value)}
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
                  {['شماره', 'مشتری', 'تاریخ', 'مبلغ (تومان)', 'پرداخت', 'وضعیت', ''].map(
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
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-sm text-[#6B6B6B]">
                      سفارشی پیدا نشد
                    </td>
                  </tr>
                ) : (
                  pageItems.map((order) => {
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
                          <span className="font-semibold text-[#111]">{order.orderNumber}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-[#111]">{order.customer.name}</div>
                          <div className="text-xs text-[#6B6B6B]">{order.customer.city}</div>
                        </td>
                        <td className="px-4 py-4 text-[#6B6B6B]">
                          {toJalali(order.createdAt)}
                        </td>
                        <td className="px-4 py-4 font-medium text-[#111]">
                          {formatNumber(order.total)}
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
                            aria-label={`مشاهده سفارش ${order.orderNumber}`}
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
            {filtered.length > 0 && (
              <div className="flex items-center justify-between border-t border-[#EEE] px-4 py-3">
                <span className="text-sm text-[#6B6B6B]">
                  نمایش {formatNumber((safePage - 1) * PAGE_SIZE + 1)} تا{' '}
                  {formatNumber(Math.min(safePage * PAGE_SIZE, filtered.length))} از{' '}
                  {formatNumber(filtered.length)} سفارش
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="صفحه قبلی"
                    className="flex h-9 items-center rounded-full border-[1.5px] border-[#D9D9D6] px-4 text-sm font-semibold text-[#111] hover:border-black disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    قبلی
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
          <OrderDetailPanel
            order={selectedOrder}
            onStatusAdvance={handleStatusAdvance}
            onCancel={handleCancel}
            onPrint={printOrderInvoice}
            onUpdateTracking={handleUpdateTracking}
          />
        </div>
      </div>
    </div>
  )
}
