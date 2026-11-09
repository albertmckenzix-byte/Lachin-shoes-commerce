import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatNumber, formatPrice } from '../utils/format'
import {
  CUSTOMERS,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPE_STYLES,
  getCustomerOrders,
  getCustomerStats,
  maskPhone,
  toJalaliShort,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
} from '../data/customers'
import { toJalali } from '../data/orders'
import { api } from './api'

const TABS = [
  { value: 'all', label: 'همه' },
  { value: 'returning', label: 'مشتری تکراری' },
  { value: 'new', label: 'جدید' },
]

const SORT_OPTIONS = [
  { value: 'last', label: 'آخرین سفارش' },
  { value: 'spent', label: 'بیشترین خرید' },
  { value: 'orders', label: 'بیشترین تعداد سفارش' },
]

const CITIES = [
  'همه شهرها',
  'تهران',
  'شیراز',
  'اصفهان',
  'مشهد',
  'تبریز',
  'کرج',
  'قم',
  'رشت',
  'اهواز',
  'ارومیه',
  'کرمانشاه',
  'سمنان',
  'بابل',
  'زاهدان',
  'بوشهر',
  'خرم‌آباد',
  'گرگان',
  'بندرعباس',
]

const inputClass =
  'h-[42px] rounded-md border border-[#D9D9D6] bg-white px-3 text-sm text-[#111] outline-none focus:border-[#111]'

function CustomerTypeBadge({ type }) {
  const style = CUSTOMER_TYPE_STYLES[type] || CUSTOMER_TYPE_STYLES.new
  const label = CUSTOMER_TYPE_LABELS[type] || CUSTOMER_TYPE_LABELS.new
  return (
    <span className={`inline-block rounded-full px-2.5 py-[3px] text-xs font-medium ${style}`}>
      {label}
    </span>
  )
}

function OrderStatusBadge({ status }) {
  const style = ORDER_STATUS_STYLES[status] || ORDER_STATUS_STYLES.new
  const label = ORDER_STATUS_LABELS[status] || ORDER_STATUS_LABELS.new
  return (
    <span className={`inline-block rounded-full px-2.5 py-[3px] text-xs font-medium ${style}`}>
      {label}
    </span>
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-t border-[#EEE]">
          <td className="px-4 py-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-[#ECECEC]" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 w-32 animate-pulse rounded bg-[#ECECEC] mb-1" />
            <div className="h-3 w-24 animate-pulse rounded bg-[#ECECEC]" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 w-16 animate-pulse rounded bg-[#ECECEC]" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 w-16 animate-pulse rounded bg-[#ECECEC]" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 w-20 animate-pulse rounded bg-[#ECECEC]" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 w-20 animate-pulse rounded bg-[#ECECEC]" />
          </td>
          <td className="px-4 py-4">
            <div className="h-6 w-16 animate-pulse rounded-full bg-[#ECECEC]" />
          </td>
          <td className="px-4 py-4">
            <div className="h-9 w-20 animate-pulse rounded-full bg-[#ECECEC]" />
          </td>
        </tr>
      ))}
    </>
  )
}

export default function CustomersList() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [city, setCity] = useState('')
  const [sort, setSort] = useState('last')
  const [selectedId, setSelectedId] = useState(null)
  const [note, setNote] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api('/admin/customers/')
      if (Array.isArray(data) && data.length > 0) {
        setCustomers(data)
      } else {
        setCustomers(CUSTOMERS)
      }
    } catch {
      setCustomers(CUSTOMERS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (selectedId !== null) {
      const c = customers.find((c) => c.id === selectedId)
      if (c) setNote(c.note || '')
    }
  }, [selectedId, customers])

  const filtered = useMemo(() => {
    let result = customers
    if (tab === 'returning') {
      result = result.filter((c) => getCustomerStats(c.name).orderCount >= 2)
    } else if (tab === 'new') {
      result = result.filter((c) => getCustomerStats(c.name).orderCount < 2)
    }
    if (city && city !== 'همه شهرها') {
      result = result.filter((c) => c.city === city)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.phone.includes(q)
      )
    }
    if (sort === 'last') {
      result = [...result].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
    } else if (sort === 'spent') {
      result = [...result].sort(
        (a, b) => getCustomerStats(b.name).totalSpent - getCustomerStats(a.name).totalSpent
      )
    } else if (sort === 'orders') {
      result = [...result].sort(
        (a, b) => getCustomerStats(b.name).orderCount - getCustomerStats(a.name).orderCount
      )
    }
    return result
  }, [customers, tab, city, search, sort])

  const summary = useMemo(() => {
    const total = customers.length
    const thisMonth = customers.filter((c) => {
      const d = new Date(c.createdAt)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const returning = customers.filter((c) => getCustomerStats(c.name).orderCount >= 2).length
    const totalSpent = customers.reduce((sum, c) => sum + getCustomerStats(c.name).totalSpent, 0)
    const avg = total > 0 ? Math.round(totalSpent / total) : 0
    return { total, thisMonth, returning, avg }
  }, [customers])

  const handleSelect = (id) => setSelectedId(id)

  const handleSaveNote = () => {
    if (selectedId === null) return
    setCustomers((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, note } : c))
    )
  }

  const handleExport = () => {
    const headers = ['نام', 'شماره تماس', 'شهر', 'سفارش‌ها', 'مجموع خرید']
    const rows = filtered.map((c) => {
      const stats = getCustomerStats(c.name)
      return [
        c.name,
        c.phone,
        c.city,
        stats.orderCount,
        stats.totalSpent,
      ]
    })
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'customers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedCustomer = customers.find((c) => c.id === selectedId) || null
  const selectedStats = selectedCustomer ? getCustomerStats(selectedCustomer.name) : null
  const selectedOrders = selectedCustomer ? getCustomerOrders(selectedCustomer.name) : []

  const PAGE_SIZE = 6
  const [page, setPage] = useState(1)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [filtered.length])

  if (loading) {
    return (
      <div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-[#111]">مشتریان</h1>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              مشاهده مشتریان، سابقه خرید و اطلاعات تماس
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex h-11 items-center rounded-md border-[1.5px] border-black px-4 text-sm font-semibold text-black hover:bg-[#F2F2EF]"
            >
              خروجی اکسل
            </button>
            <button
              type="button"
              className="flex h-11 items-center rounded-md bg-black px-[18px] text-sm font-semibold text-white"
            >
              + افزودن مشتری
            </button>
          </div>
        </div>
        <div className="my-6 flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-lg border border-[#E6E6E3] bg-white px-5 py-4">
              <div className="h-4 w-24 animate-pulse rounded bg-[#ECECEC]" />
              <div className="mt-1 h-8 w-16 animate-pulse rounded bg-[#ECECEC]" />
            </div>
          ))}
        </div>
        <div className="overflow-x-auto rounded-lg border border-[#E6E6E3] bg-white">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <SkeletonRows />
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#111]">مشتریان</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            مشاهده مشتریان، سابقه خرید و اطلاعات تماس
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex h-11 items-center rounded-md border-[1.5px] border-black px-4 text-sm font-semibold text-black hover:bg-[#F2F2EF]"
          >
            خروجی اکسل
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex h-11 items-center rounded-md bg-black px-[18px] text-sm font-semibold text-white"
          >
            + افزودن مشتری
          </button>
        </div>
      </div>

      <div className="my-6 flex gap-4 max-[640px]:flex-col">
        {[
          { label: 'کل مشتریان', value: `${formatNumber(summary.total)} نفر` },
          { label: 'مشتریان جدید این ماه', value: `${formatNumber(summary.thisMonth)} نفر` },
          { label: 'مشتریان تکراری', value: `${formatNumber(summary.returning)} نفر` },
          { label: 'میانگین خرید هر مشتری', value: formatPrice(summary.avg) },
        ].map((card) => (
          <div
            key={card.label}
            className="flex-1 rounded-lg border border-[#E6E6E3] bg-white px-5 py-4"
          >
            <div className="text-sm text-[#6B6B6B]">{card.label}</div>
            <div className="mt-1 text-[26px] font-bold text-[#111]">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium ${
              tab === t.value
                ? 'bg-black text-white'
                : 'border border-[#D9D9D6] text-[#111] hover:bg-[#F2F2EF]'
            }`}
          >
            {t.label}
            <span className="text-xs opacity-70">
              {t.value === 'all'
                ? filtered.length
                : t.value === 'returning'
                ? filtered.filter((c) => getCustomerStats(c.name).orderCount >= 2).length
                : filtered.filter((c) => getCustomerStats(c.name).orderCount < 2).length}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-3 max-[640px]:flex-col">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی نام یا شماره تماس…"
          aria-label="جستجوی نام یا شماره تماس"
          className={`${inputClass} flex-1`}
        />
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="شهر"
          className={inputClass}
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="مرتب‌سازی"
          className={inputClass}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <div className="overflow-x-auto rounded-lg border border-[#E6E6E3] bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['مشتری', 'شهر', 'سفارش‌ها', 'مجموع خرید', 'آخرین سفارش', 'نوع', ''].map((h) => (
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
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <p className="text-sm text-[#6B6B6B]">مشتری‌ای پیدا نشد</p>
                    </td>
                  </tr>
                ) : (
                  paginated.map((customer) => {
                    const stats = getCustomerStats(customer.name)
                    const isSelected = selectedId === customer.id
                    const type = stats.orderCount >= 2 ? 'returning' : 'new'
                    return (
                      <tr
                        key={customer.id}
                        onClick={() => handleSelect(customer.id)}
                        className={`cursor-pointer border-t border-[#EEE] outline-none hover:bg-[#FAFAF8] ${
                          isSelected ? 'bg-[#F4F4F2]' : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-[#ECECEC] text-sm font-bold text-[#555]">
                              {customer.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-[#111]">{customer.name}</div>
                              <div className="text-xs text-[#999] ltr" dir="ltr">
                                {maskPhone(customer.phone)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-[#111]">{customer.city}</td>
                        <td className="px-4 py-4 text-[#111]">{formatNumber(stats.orderCount)}</td>
                        <td className="px-4 py-4 text-[#111]">{formatPrice(stats.totalSpent)}</td>
                        <td className="px-4 py-4 text-[#111]">
                          {stats.lastOrderDate ? toJalaliShort(stats.lastOrderDate) : '-'}
                        </td>
                        <td className="px-4 py-4">
                          <CustomerTypeBadge type={type} />
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelect(customer.id)
                            }}
                            className="flex h-9 items-center rounded-full border-[1.5px] border-black px-3.5 text-[13px] font-semibold text-black hover:bg-black hover:text-white"
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
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-[#6B6B6B]">
            <span>
              نمایش {formatNumber((page - 1) * PAGE_SIZE + 1)} تا {formatNumber(Math.min(page * PAGE_SIZE, filtered.length))} از {formatNumber(filtered.length)} مشتری
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-full border border-[#D9D9D6] px-3 py-1 disabled:opacity-40 hover:bg-[#F2F2EF]"
              >
                قبلی
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-[#D9D9D6] px-3 py-1 disabled:opacity-40 hover:bg-[#F2F2EF]"
              >
                بعدی
              </button>
            </div>
          </div>
        </div>

        {selectedCustomer && (
          <div className="hidden min-[900px]:block w-[360px] flex-shrink-0">
            <div className="rounded-lg border border-[#E6E6E3] bg-white p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 flex items-center justify-center rounded-full bg-black text-xl font-bold text-white">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-[#111]">{selectedCustomer.name}</div>
                  <div className="text-xs text-[#6B6B6B]">
                    عضو از {toJalali(selectedCustomer.createdAt)}
                  </div>
                </div>
              </div>
              <CustomerTypeBadge type={selectedStats.orderCount >= 2 ? 'returning' : 'new'} />

              <div className="mt-4 flex gap-3">
                <div className="flex-1 rounded-md border border-[#ECECEA] bg-[#FAFAF9] p-3">
                  <div className="text-xs text-[#6B6B6B]">تعداد سفارش</div>
                  <div className="text-[18px] font-bold text-[#111]">
                    {formatNumber(selectedStats.orderCount)}
                  </div>
                </div>
                <div className="flex-1 rounded-md border border-[#ECECEA] bg-[#FAFAF9] p-3">
                  <div className="text-xs text-[#6B6B6B]">مجموع خرید</div>
                  <div className="text-[18px] font-bold text-[#111]">
                    {formatPrice(selectedStats.totalSpent)}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-md border border-[#ECECEA] bg-[#FAFAF9]">
                <div className="text-xs text-[#6B6B6B] mb-1">شماره تماس</div>
                <div className="text-sm font-medium text-[#111] ltr" dir="ltr">
                  {selectedCustomer.phone}
                </div>
                <div className="text-xs text-[#6B6B6B] mt-2 mb-1">شهر</div>
                <div className="text-sm text-[#111]">{selectedCustomer.city}</div>
                <div className="text-xs text-[#6B6B6B] mt-2 mb-1">آدرس</div>
                <div className="text-sm text-[#111]">{selectedCustomer.address}</div>
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-[#111] mb-3">سابقه سفارش‌ها</h3>
                <div className="space-y-2">
                  {selectedOrders.length === 0 ? (
                    <p className="text-xs text-[#6B6B6B]">سفارشی ثبت نشده است</p>
                  ) : (
                    selectedOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-md border border-[#ECECEA] p-2"
                      >
                        <div>
                          <div className="text-xs font-medium text-[#111] ltr" dir="ltr">
                            {order.orderNumber}
                          </div>
                          <div className="text-[10px] text-[#6B6B6B]">
                            {toJalaliShort(order.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[#111]">{formatPrice(order.total)}</div>
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium text-[#111] mb-2">
                  یادداشت داخلی
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-[#D9D9D6] bg-white px-3 py-2 text-sm outline-none focus:border-[#111]"
                />
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="mt-2 text-xs text-[#6B6B6B] hover:text-[#111]"
                >
                  ذخیره یادداشت
                </button>
              </div>

              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => navigate(`/admin/orders/new?customerId=${selectedCustomer.id}`)}
                  className="w-full h-10 rounded-md bg-black text-sm font-semibold text-white"
                >
                  ثبت سفارش دستی برای این مشتری
                </button>
                <div className="flex gap-2">
                  <a
                    href={`tel:${selectedCustomer.phone}`}
                    className="flex-1 h-10 flex items-center justify-center rounded-md border-[1.5px] border-black text-sm font-semibold text-black hover:bg-[#F2F2EF]"
                  >
                    تماس
                  </a>
                  <button
                    type="button"
                    className="flex-1 h-10 rounded-md border-[1.5px] border-black text-sm font-semibold text-black hover:bg-[#F2F2EF]"
                  >
                    ویرایش
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg border border-[#E6E6E3] bg-white p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-[#111] mb-4">افزودن مشتری جدید</h2>
            <div className="space-y-3">
              <label className="block text-sm text-[#111]">نام</label>
              <input className={inputClass} placeholder="نام مشتری" />
              <label className="block text-sm text-[#111]">شماره تماس</label>
              <input className={inputClass} placeholder="۰۹۱۲۳۴۵۶۷۸۹" />
              <label className="block text-sm text-[#111]">شهر</label>
              <select className={inputClass}>
                {CITIES.slice(1).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <label className="block text-sm text-[#111]">آدرس</label>
              <textarea rows={2} className="w-full rounded-md border border-[#D9D9D6] bg-white px-3 py-2 text-sm outline-none focus:border-[#111]" />
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-full border border-[#D9D9D6] px-4 py-2 text-sm text-[#111] hover:bg-[#F2F2EF]"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-full bg-black px-4 py-2 text-sm text-white"
              >
                ذخیره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
