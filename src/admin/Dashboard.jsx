import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatNumber, formatPrice } from '../utils/format'
import { api } from './api'

// Stable "now" for date memos — computed once per module load, not per render
function getNow() {
  return new Date()
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDER_STATUS_STYLES = {
  new: 'bg-[#111] text-white',
  processing: 'bg-[#fcc934] text-[#2b2100]',
  shipped: 'bg-[#e2ecfb] text-[#1d4a99]',
  delivered: 'bg-[#e3f3e6] text-[#1f6b34]',
  cancelled: 'bg-[#fde7e5] text-[#a52a22]',
}

// Status chart/breakdown colors
const STATUS_COLORS = {
  new: '#111111',
  processing: '#fcc934',
  shipped: '#6d9be0',
  delivered: '#5fb374',
  cancelled: '#e07b73',
}

const STATUS_LABELS = {
  new: 'جدید',
  processing: 'در حال پردازش',
  shipped: 'ارسال شده',
  delivered: 'تحویل شده',
  cancelled: 'لغو شده',
}

// Persian weekday names (Sat = index 0 of Jalali week → Shambe)
const WEEKDAY_FA = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه']

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Today's date string yyyy-mm-dd (local) */
function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Returns array of last N date strings (oldest first, today last), local time */
function lastNDays(n) {
  const days = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days.push(localDateStr(d))
  }
  return days
}

/** Persian weekday label for a local date string yyyy-mm-dd */
function weekdayLabel(dateStr, isToday) {
  if (isToday) return 'امروز'
  const d = new Date(dateStr + 'T12:00:00')
  // JS getDay(): 0=Sun … 6=Sat; Jalali week: Sat=0 … Fri=6
  const jsDay = d.getDay() // 0=Sun … 6=Sat
  const jalaliIdx = jsDay === 6 ? 0 : jsDay + 1 // Sat→0, Sun→1, …, Fri→6
  return WEEKDAY_FA[jalaliIdx]
}

/** Full Jalali date with weekday for today's subtitle */
function todayJalali() {
  try {
    const now = new Date()
    const weekday = new Intl.DateTimeFormat('fa-IR', {
      weekday: 'long',
      calendar: 'persian',
    }).format(now)
    const date = new Intl.DateTimeFormat('fa-IR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      calendar: 'persian',
    }).format(now)
    return `${weekday} ${date}`
  } catch {
    return ''
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-[3px] text-xs font-medium ${
        ORDER_STATUS_STYLES[status] || 'bg-[#EEE] text-[#555]'
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}

/** KPI stat card – same visual as Products page */
function StatCard({ label, value, note, noteIsLink, noteTo }) {
  return (
    <div className="flex-1 min-w-[180px] rounded-lg border border-[#E6E6E3] bg-white px-5 py-4">
      <div className="text-sm text-[#6B6B6B]">{label}</div>
      <div className="mt-1 text-[26px] font-bold leading-tight text-[#111]">{value}</div>
      {note && (
        <div className="mt-1 text-xs text-[#6B6B6B]">
          {noteIsLink && noteTo ? (
            <Link to={noteTo} className="underline hover:text-[#111]">
              {note}
            </Link>
          ) : (
            note
          )}
        </div>
      )}
    </div>
  )
}

/** Bar chart for daily sales */
function DailySalesChart({ dailySales, days }) {
  const maxSales = Math.max(...dailySales.map((d) => d.sales), 1)
  const todayStr = localDateStr(getNow())
  const isCompact = days > 7

  // For 30/90 days, show fewer labels
  const labelInterval = days === 30 ? 5 : days === 90 ? 15 : 1

  return (
    <div
      className="flex h-full items-end gap-1 pt-6"
      dir="rtl"
      aria-label="نمودار فروش روزانه"
    >
      {dailySales.map((day, index) => {
        const isToday = day.date === todayStr
        const pct = maxSales > 0 ? (day.sales / maxSales) * 100 : 0
        const minH = day.sales > 0 ? 8 : 4
        const barH = Math.max(minH, Math.round((pct / 100) * 140))
        const salesM = (day.sales / 1_000_000).toFixed(1)
        const showLabel = days === 7 || index % labelInterval === 0 || index === dailySales.length - 1
        const label = showLabel ? weekdayLabel(day.date, isToday) : ''

        return (
          <div
            key={day.date}
            className="flex flex-1 flex-col items-center gap-1"
          >
            {/* value label */}
            {days === 7 && (
              <div className="text-[11px] font-semibold text-[#111]">
                {day.sales > 0 ? formatNumber(Number(salesM)) : ''}
              </div>
            )}
            {/* bar */}
            <div
              style={{ height: `${barH}px` }}
              className={`w-full max-w-[36px] rounded-t-sm transition-all ${
                isToday ? 'bg-[#FFC83D]' : 'bg-[#111]'
              }`}
              role="presentation"
            />
            {/* weekday label */}
            <div className={`text-[11px] text-center ${isToday ? 'font-bold text-[#111]' : 'text-[#6B6B6B]'}`}>
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Horizontal status distribution bar */
function StatusBar({ statusCounts, total }) {
  const statuses = Object.keys(STATUS_COLORS)
  if (total === 0) {
    return <div className="h-3 w-full rounded-full bg-[#ECECEA]" />
  }
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full" aria-hidden="true">
      {statuses.map((s) => {
        const count = statusCounts[s] || 0
        if (count === 0) return null
        const pct = (count / total) * 100
        return (
          <div
            key={s}
            style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[s] }}
          />
        )
      })}
    </div>
  )
}

/** Low-stock progress bar for each product (stock / threshold) */
function StockBar({ stock, threshold }) {
  const pct = Math.min(100, Math.round((stock / threshold) * 100))
  return (
    <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#ECECEA]">
      <div
        className="h-full rounded-full bg-[#111] transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(7)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api(`/admin/dashboard/?days=${days}`)
      setDashboard(data)
    } catch (err) {
      setError(err.message || 'خطا در دریافت داشبورد')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const todayLabel = todayJalali()

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-[#111]">داشبورد</h1>
            <p className="mt-1 text-sm text-[#6B6B6B]">خلاصه وضعیت فروشگاه</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 min-w-[180px] rounded-lg border border-[#E6E6E3] bg-white px-5 py-4">
              <div className="h-4 w-24 animate-pulse rounded bg-[#ECECEC]" />
              <div className="mt-1 h-8 w-16 animate-pulse rounded bg-[#ECECEC]" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-0 flex-[2] rounded-lg border border-[#E6E6E3] bg-white p-5" style={{ minWidth: '280px' }}>
            <div className="h-4 w-32 animate-pulse rounded bg-[#ECECEC]" />
            <div className="mt-4 h-40 animate-pulse rounded bg-[#ECECEC]" />
          </div>
          <div className="flex flex-col rounded-lg border border-[#E6E6E3] bg-white p-5" style={{ minWidth: '220px', flex: '1' }}>
            <div className="h-4 w-24 animate-pulse rounded bg-[#ECECEC]" />
            <div className="mt-4 h-3 w-full animate-pulse rounded bg-[#ECECEC]" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-[#111]">داشبورد</h1>
            <p className="mt-1 text-sm text-[#6B6B6B]">خلاصه وضعیت فروشگاه</p>
          </div>
        </div>
        <div className="rounded-lg border border-[#E6E6E3] bg-white p-8 text-center">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="h-9 px-4 rounded-full border-[1.5px] border-black text-sm font-semibold text-black hover:bg-black hover:text-white"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    )
  }

  if (!dashboard) return null

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#111]">داشبورد</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            خلاصه وضعیت فروشگاه
            {todayLabel && (
              <> · <span>{todayLabel}</span></>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dash-range" className="text-sm text-[#6B6B6B]">
              بازه:
            </label>
            <select
              id="dash-range"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-[42px] rounded-md border border-[#D9D9D6] bg-white px-3 text-sm text-[#111] outline-none focus:border-[#111]"
            >
              <option value={7}>۷ روز گذشته</option>
              <option value={30}>۳۰ روز گذشته</option>
              <option value={90}>۹۰ روز گذشته</option>
            </select>
          </div>
          <Link
            to="/admin/orders"
            className="flex h-11 items-center rounded-md bg-black px-[18px] text-sm font-semibold text-white hover:bg-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            مشاهده سفارش‌ها
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="flex flex-wrap gap-4">
        <StatCard
          label="فروش امروز (تومان)"
          value={formatPrice(dashboard.today.sales)}
          note={`از ${formatNumber(dashboard.today.ordersCount)} سفارش`}
        />
        <StatCard
          label={`سفارش‌های ${days} روز گذشته`}
          value={`${formatNumber(dashboard.range.ordersCount)} سفارش`}
          note={`${formatPrice(dashboard.range.sales)}`}
        />
        <StatCard
          label="در انتظار پرداخت"
          value={`${formatNumber(dashboard.pendingPaymentCount)} سفارش`}
          note="بررسی سفارش‌های جدید"
          noteIsLink
          noteTo="/admin/orders?status=new"
        />
        <StatCard
          label="کم‌موجودی"
          value={`${formatNumber(dashboard.lowStock.products.length)} محصول`}
          note={`از ${formatNumber(dashboard.lowStock.totalStock)} جفت موجودی کل`}
        />
      </div>

      {/* ── Mid row: Chart + Status breakdown ── */}
      <div className="flex flex-wrap gap-4">
        {/* Daily sales bar chart */}
        <div className="min-w-0 flex-[2] rounded-lg border border-[#E6E6E3] bg-white p-5" style={{ minWidth: '280px' }}>
          <div className="mb-1 text-[15px] font-semibold text-[#111]">
            فروش {days} روز گذشته
          </div>
          <div className="text-xs text-[#6B6B6B]">میلیون تومان</div>
          <div className="mt-4" style={{ height: '180px' }}>
            <DailySalesChart dailySales={dashboard.dailySales} days={days} />
          </div>
        </div>

        {/* Order status breakdown */}
        <div
          className="flex flex-col rounded-lg border border-[#E6E6E3] bg-white p-5"
          style={{ minWidth: '220px', flex: '1' }}
        >
          <div className="mb-4 text-[15px] font-semibold text-[#111]">
            وضعیت سفارش‌ها
          </div>

          {dashboard.statusCounts.total === 0 ? (
            <p className="text-sm text-[#6B6B6B]">هنوز سفارشی ثبت نشده است</p>
          ) : (
            <>
              <StatusBar statusCounts={dashboard.statusCounts} total={dashboard.statusCounts.total} />

              <ul className="mt-4 flex flex-col gap-2.5">
                {Object.entries(STATUS_COLORS).map(([key, color]) => {
                  const count = dashboard.statusCounts[key] || 0
                  return (
                    <li key={key} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        <span className="text-sm text-[#444]">
                          {STATUS_LABELS[key]}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-[#111]">
                        {formatNumber(count)}
                      </span>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-auto border-t border-[#ECECEA] pt-3 flex items-center justify-between">
                <span className="text-sm text-[#6B6B6B]">مجموع سفارش‌ها</span>
                <span className="text-sm font-bold text-[#111]">
                  {formatNumber(dashboard.statusCounts.total)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom row: Latest orders table + Low-stock list ── */}
      <div className="flex flex-wrap gap-4">
        {/* Latest orders */}
        <div className="min-w-0 flex-[2] rounded-lg border border-[#E6E6E3] bg-white" style={{ minWidth: '280px' }}>
          <div className="flex items-center justify-between border-b border-[#ECECEA] px-5 py-4">
            <div className="text-[15px] font-semibold text-[#111]">
              آخرین سفارش‌ها
            </div>
            <Link
              to="/admin/orders"
              className="flex h-9 items-center rounded-full border-[1.5px] border-black px-4 text-[13px] font-semibold text-black hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              همه سفارش‌ها
            </Link>
          </div>

          {dashboard.latestOrders.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#6B6B6B]">
              هنوز سفارشی ثبت نشده است
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {['شماره', 'مشتری', 'شهر', 'مبلغ', 'وضعیت'].map((h) => (
                      <th
                        key={h}
                        className="bg-[#FAFAF8] px-4 py-3 text-start text-sm font-medium text-[#6B6B6B]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.latestOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-[#EEE]"
                    >
                      <td className="px-4 py-3.5">
                        <bdi dir="ltr" className="font-semibold text-[#111]">
                          #{order.number}
                        </bdi>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-[#111]">
                          {order.customerName}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#6B6B6B]">
                        {order.city}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[#111]">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low-stock products */}
        <div
          className="flex flex-col rounded-lg border border-[#E6E6E3] bg-white"
          style={{ minWidth: '220px', flex: '1' }}
        >
          <div className="flex items-center justify-between border-b border-[#ECECEA] px-5 py-4">
            <div className="text-[15px] font-semibold text-[#111]">
              کم‌موجودی
            </div>
            <Link
              to="/admin/products"
              className="flex h-9 items-center rounded-full border-[1.5px] border-black px-4 text-[13px] font-semibold text-black hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              محصولات
            </Link>
          </div>

          <div className="flex flex-col divide-y divide-[#ECECEA]">
            {dashboard.lowStock.products.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[#6B6B6B]">
                همه محصولات موجودی کافی دارند 🎉
              </div>
            ) : (
              dashboard.lowStock.products.map((p) => (
                <div key={p.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {/* thumbnail */}
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-11 w-11 flex-shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div
                        className="h-11 w-11 flex-shrink-0 rounded-md bg-[#ECECEC]"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[#111]">
                        {p.name}
                      </div>
                      <div className="mt-0.5 text-xs text-[#6B6B6B]">
                        موجودی: {formatNumber(p.totalStock)} جفت
                      </div>
                      <StockBar stock={p.totalStock} threshold={dashboard.lowStock.threshold} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-auto border-t border-[#ECECEA] px-5 py-3">
            <p className="text-xs text-[#6B6B6B]">
              آستانه کم‌موجودی: {formatNumber(dashboard.lowStock.threshold)} جفت
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
