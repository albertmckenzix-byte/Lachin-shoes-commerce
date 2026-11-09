import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatNumber } from '../utils/format'
import { ORDERS, STATUS_LABELS } from '../data/orders'
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

/** Filter orders by date range (returns new array) */
function filterByRange(orders, range) {
  const now = new Date()
  if (range === 'today') {
    const todayStr = localDateStr(now)
    return orders.filter((o) => localDateStr(new Date(o.createdAt)) === todayStr)
  }
  const days = range === '7' ? 7 : 30
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - days)
  cutoff.setHours(0, 0, 0, 0)
  return orders.filter((o) => new Date(o.createdAt) >= cutoff)
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

/** 7-day bar chart – pure div-based, no extra dependency */
function WeeklyBarChart({ daySales }) {
  // daySales: array of { dateStr, label, sales } oldest→newest (newest = today, displayed RTL = leftmost)
  const maxSales = Math.max(...daySales.map((d) => d.sales), 1)
  const todayStr = localDateStr(getNow())

  return (
    <div
      className="flex h-full items-end gap-2 pt-6"
      dir="rtl"
      aria-label="نمودار فروش هفت روز گذشته"
    >
      {daySales.map((day) => {
        const isToday = day.dateStr === todayStr
        const pct = maxSales > 0 ? (day.sales / maxSales) * 100 : 0
        const minH = day.sales > 0 ? 8 : 4
        const barH = Math.max(minH, Math.round((pct / 100) * 140))
        const salesM = (day.sales / 1_000_000).toFixed(1)
        return (
          <div
            key={day.dateStr}
            className="flex flex-1 flex-col items-center gap-1"
          >
            {/* value label */}
            <div className="text-[11px] font-semibold text-[#111]">
              {day.sales > 0 ? formatNumber(Number(salesM)) : ''}
            </div>
            {/* bar */}
            <div
              style={{ height: `${barH}px` }}
              className={`w-full max-w-[36px] rounded-t-sm transition-all ${
                isToday ? 'bg-[#fcc934]' : 'bg-[#111]'
              }`}
              role="presentation"
            />
            {/* weekday label */}
            <div className={`text-[11px] text-center ${isToday ? 'font-bold text-[#111]' : 'text-[#6B6B6B]'}`}>
              {day.label}
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

/** Low-stock progress bar for each product (stock / 25) */
function StockBar({ stock }) {
  const pct = Math.min(100, Math.round((stock / 25) * 100))
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
  // Products loaded from real API (same as ProductsList)
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)

  // Dashboard stats loaded from real API
  const [dashData, setDashData] = useState(null)
  const [dashLoading, setDashLoading] = useState(true)

  // Date range selector
  const [range, setRange] = useState('7')

  const loadData = useCallback(async () => {
    setProductsLoading(true)
    setDashLoading(true)
    try {
      const [prodsRes, dashRes] = await Promise.allSettled([
        api('/admin/products/'),
        api('/admin/dashboard/'),
      ])
      if (prodsRes.status === 'fulfilled' && Array.isArray(prodsRes.value)) {
        setProducts(prodsRes.value)
      }
      if (dashRes.status === 'fulfilled' && dashRes.value) {
        setDashData(dashRes.value)
      }
    } catch {
      // Fallback to static
    } finally {
      setProductsLoading(false)
      setDashLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Derived data ────────────────────────────────────────────────────────────

  // Today's orders (always fixed to today regardless of range)
  const todayOrders = useMemo(() => {
    const todayStr = localDateStr(getNow())
    const source = (dashData && Array.isArray(dashData.recentOrders) && dashData.recentOrders.length > 0)
      ? dashData.recentOrders
      : ORDERS
    return source.filter((o) => localDateStr(new Date(o.createdAt)) === todayStr)
  }, [dashData])

  // KPI: today's sales
  const todaySales = useMemo(() => {
    if (dashData && Array.isArray(dashData.salesByDay) && dashData.salesByDay.length > 0) {
      const todayStr = localDateStr(getNow())
      const found = dashData.salesByDay.find((d) => d.date === todayStr)
      if (found) return found.revenue
    }
    return todayOrders.reduce((s, o) => s + (o.total || 0), 0)
  }, [dashData, todayOrders])

  // KPI: last-7-days orders (always 7, independent of range select)
  const last7Orders = useMemo(() => {
    if (dashData && Array.isArray(dashData.recentOrders)) {
      return filterByRange(dashData.recentOrders, '7')
    }
    return filterByRange(ORDERS, '7')
  }, [dashData])

  const last7Sales = useMemo(() => {
    if (dashData && Array.isArray(dashData.salesByDay)) {
      return dashData.salesByDay.reduce((s, d) => s + (d.revenue || 0), 0)
    }
    return last7Orders.reduce((s, o) => s + (o.total || 0), 0)
  }, [dashData, last7Orders])

  // KPI: pending (new + processing) – from all orders
  const pendingCount = useMemo(() => {
    if (dashData && dashData.ordersByStatus) {
      return (dashData.ordersByStatus.new || 0) + (dashData.ordersByStatus.processing || 0)
    }
    return ORDERS.filter((o) => o.status === 'new' || o.status === 'processing').length
  }, [dashData])

  // KPI: low-stock products from API
  const lowStockProducts = useMemo(
    () => products.filter((p) => p.total_stock > 0 && p.total_stock < 25),
    [products]
  )
  const totalStock = useMemo(
    () => products.reduce((s, p) => s + (p.total_stock || 0), 0),
    [products]
  )

  // 7-day chart data
  const daySales = useMemo(() => {
    const days = lastNDays(7)
    const todayStr = localDateStr(getNow())
    if (dashData && Array.isArray(dashData.salesByDay) && dashData.salesByDay.length > 0) {
      return days.map((dateStr) => {
        const found = dashData.salesByDay.find((d) => d.date === dateStr)
        return {
          dateStr,
          label: weekdayLabel(dateStr, dateStr === todayStr),
          sales: found ? found.revenue : 0,
        }
      })
    }
    return days.map((dateStr) => {
      const sales = ORDERS.filter(
        (o) => localDateStr(new Date(o.createdAt)) === dateStr
      ).reduce((s, o) => s + o.total, 0)
      return {
        dateStr,
        label: weekdayLabel(dateStr, dateStr === todayStr),
        sales,
      }
    })
  }, [dashData])

  // Status breakdown (all orders)
  const statusCounts = useMemo(() => {
    if (dashData && dashData.ordersByStatus) {
      return dashData.ordersByStatus
    }
    const counts = {}
    for (const o of ORDERS) {
      counts[o.status] = (counts[o.status] || 0) + 1
    }
    return counts
  }, [dashData])

  const totalOrdersCount = useMemo(() => {
    if (dashData && typeof dashData.totalOrders === 'number') {
      return dashData.totalOrders
    }
    return ORDERS.length
  }, [dashData])

  // 5 most recent orders
  const recentOrders = useMemo(() => {
    if (dashData && Array.isArray(dashData.recentOrders) && dashData.recentOrders.length > 0) {
      return dashData.recentOrders.slice(0, 5)
    }
    return [...ORDERS]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
  }, [dashData])

  const todayLabel = todayJalali()

  // ── Render ──────────────────────────────────────────────────────────────────

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
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="h-[42px] rounded-md border border-[#D9D9D6] bg-white px-3 text-sm text-[#111] outline-none focus:border-[#111]"
            >
              <option value="today">امروز</option>
              <option value="7">۷ روز گذشته</option>
              <option value="30">۳۰ روز گذشته</option>
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
          value={formatNumber(todaySales)}
          note={`از ${formatNumber(todayOrders.length)} سفارش`}
        />
        <StatCard
          label="سفارش‌های ۷ روز گذشته"
          value={`${formatNumber(last7Orders.length)} سفارش`}
          note={`${formatNumber(last7Sales)} تومان`}
        />
        <StatCard
          label="در انتظار پردازش"
          value={`${formatNumber(pendingCount)} سفارش`}
          note="بررسی سفارش‌های جدید"
          noteIsLink
          noteTo="/admin/orders"
        />
        <StatCard
          label={`کم‌موجودی (زیر ۲۵ جفت)`}
          value={
            productsLoading
              ? '…'
              : `${formatNumber(lowStockProducts.length)} محصول`
          }
          note={
            productsLoading
              ? ''
              : `از ${formatNumber(totalStock)} جفت موجودی کل`
          }
        />
      </div>

      {/* ── Mid row: Chart + Status breakdown ── */}
      <div className="flex flex-wrap gap-4">
        {/* Weekly sales bar chart */}
        <div className="min-w-0 flex-[2] rounded-lg border border-[#E6E6E3] bg-white p-5" style={{ minWidth: '280px' }}>
          <div className="mb-1 text-[15px] font-semibold text-[#111]">
            فروش هفت روز گذشته
          </div>
          <div className="text-xs text-[#6B6B6B]">میلیون تومان</div>
          <div className="mt-4" style={{ height: '180px' }}>
            <WeeklyBarChart daySales={daySales} />
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

          {totalOrdersCount === 0 ? (
            <p className="text-sm text-[#6B6B6B]">هنوز سفارشی ثبت نشده است</p>
          ) : (
            <>
              <StatusBar statusCounts={statusCounts} total={totalOrdersCount} />

              <ul className="mt-4 flex flex-col gap-2.5">
                {Object.entries(STATUS_COLORS).map(([key, color]) => {
                  const count = statusCounts[key] || 0
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
                  {formatNumber(totalOrdersCount)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom row: Recent orders table + Low-stock list ── */}
      <div className="flex flex-wrap gap-4">
        {/* Recent orders */}
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

          {recentOrders.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#6B6B6B]">
              هنوز سفارشی ثبت نشده است
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {['شماره', 'مشتری', 'مبلغ (تومان)', 'وضعیت'].map((h) => (
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
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-[#EEE]"
                    >
                      <td className="px-4 py-3.5">
                        <bdi dir="ltr" className="font-semibold text-[#111]">
                          {order.orderNumber}
                        </bdi>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-[#111]">
                          {order.customer.name}
                        </div>
                        <div className="text-xs text-[#6B6B6B]">
                          {order.customer.city}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[#111]">
                        {formatNumber(order.total)}
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
            {productsLoading ? (
              <div className="px-5 py-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="mb-4 flex items-center gap-3">
                    <div className="h-11 w-11 animate-pulse rounded-md bg-[#ECECEC]" />
                    <div className="flex-1">
                      <div className="h-3.5 w-3/4 animate-pulse rounded bg-[#ECECEC]" />
                      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[#ECECEC]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[#6B6B6B]">
                همه محصولات موجودی کافی دارند 🎉
              </div>
            ) : (
              lowStockProducts.map((p) => {
                const imgUrl =
                  p.images && p.images.length > 0 ? p.images[0].url : null
                return (
                  <div key={p.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {/* thumbnail */}
                      {imgUrl ? (
                        <img
                          src={imgUrl}
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
                        <bdi
                          dir="ltr"
                          className="block truncate text-sm font-medium text-[#111]"
                        >
                          {p.name}
                        </bdi>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-xs text-[#6B6B6B]">
                            {formatNumber(p.total_stock)} جفت باقی‌مانده
                          </span>
                          <span className="inline-block rounded-full bg-[#fcc934] px-2 py-px text-[10px] font-semibold text-[#2b2100]">
                            کم‌موجودی
                          </span>
                        </div>
                        <StockBar stock={p.total_stock} />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {!productsLoading && lowStockProducts.length > 0 && (
            <div className="border-t border-[#ECECEA] px-5 py-3 text-xs text-[#6B6B6B]">
              نوار پُر یعنی ۲۵ جفت (حد کم‌موجودی)
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
