import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { formatNumber, formatPrice } from '../utils/format'
import { api } from './api'
import { useAuth } from './AuthContext'

const TABS = [
  { value: 'all', label: 'همه' },
  { value: 'returning', label: 'مشتری تکراری' },
  { value: 'new', label: 'جدید' },
]

const SORT_OPTIONS = [
  { value: 'last_order', label: 'آخرین سفارش' },
  { value: 'total_spent', label: 'بیشترین خرید' },
  { value: 'orders_count', label: 'بیشترین تعداد سفارش' },
]

const inputClass =
  'h-[42px] rounded-md border border-[#D9D9D6] bg-white px-3 text-sm text-[#111] outline-none focus:border-[#111]'

function CustomerTypeBadge({ type }) {
  const styles = {
    new: 'bg-blue-100 text-blue-800',
    returning: 'bg-green-100 text-green-800',
  }
  const labels = {
    new: 'جدید',
    returning: 'تکراری',
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-[3px] text-xs font-medium ${styles[type] || styles.new}`}>
      {labels[type] || labels.new}
    </span>
  )
}

function OrderStatusBadge({ status }) {
  const styles = {
    new: 'bg-[#111] text-white',
    processing: 'bg-[#fcc934] text-[#2b2100]',
    shipped: 'bg-[#e2ecfb] text-[#1d4a99]',
    delivered: 'bg-[#e3f3e6] text-[#1f6b34]',
    cancelled: 'bg-[#fde7e5] text-[#a52a22]',
  }
  const labels = {
    new: 'جدید',
    processing: 'در حال پردازش',
    shipped: 'ارسال شده',
    delivered: 'تحویل شده',
    cancelled: 'لغو شده',
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-[3px] text-xs font-medium ${styles[status] || styles.new}`}>
      {labels[status] || status}
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
  const [searchParams, setSearchParams] = useSearchParams()
  const { token } = useAuth()

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [counts, setCounts] = useState({})
  const [cities, setCities] = useState([])
  const [summary, setSummary] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [note, setNote] = useState('')

  // URL state
  const search = searchParams.get('search') || ''
  const city = searchParams.get('city') || ''
  const type = searchParams.get('type') || 'all'
  const sort = searchParams.get('sort') || 'last_order'
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

  // Load customers
  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (city) params.set('city', city)
      if (type !== 'all') params.set('type', type)
      params.set('ordering', sort)
      params.set('page', page.toString())
      params.set('page_size', '20')

      const data = await api(`/admin/customers/?${params.toString()}`)
      setCustomers(data.results || [])
      setCounts(data.counts || {})
      setCities(data.cities || [])
      setSummary(data.summary || {})
    } catch (err) {
      setError(err.message || 'خطا در دریافت مشتریان')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, city, type, sort, page])

  // Load customer detail
  const loadCustomerDetail = useCallback(async (id) => {
    setLoadingDetail(true)
    try {
      const data = await api(`/admin/customers/${id}/`)
      setSelectedCustomer(data)
      setNote(data.note || '')
    } catch (err) {
      console.error('Failed to load customer detail:', err)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    if (selectedId) {
      loadCustomerDetail(selectedId)
    } else {
      setSelectedCustomer(null)
    }
  }, [selectedId, loadCustomerDetail])

  const handleSelect = (id) => setSelectedId(id)

  const handleSaveNote = async () => {
    if (selectedId === null) return
    try {
      await api(`/admin/customers/${selectedId}/update/`, {
        method: 'PATCH',
        body: { note },
      })
      // Refresh detail
      loadCustomerDetail(selectedId)
    } catch (err) {
      alert(err.message || 'خطا در ذخیره یادداشت')
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (city) params.set('city', city)
      if (type !== 'all') params.set('type', type)
      params.set('ordering', sort)

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/customers/export/?${params.toString()}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      })

      if (!response.ok) throw new Error('خطا در دانلود فایل')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.xlsx`
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
        month: '2-digit',
        day: '2-digit',
      }).format(date)
    } catch {
      return dateStr
    }
  }

  const maskPhone = (phone) => {
    if (!phone || phone.length < 7) return phone
    return phone.slice(0, 4) + '***' + phone.slice(-4)
  }

  const PAGE_SIZE = 20
  const totalPages = Math.ceil((counts.all || 0) / PAGE_SIZE)

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

      {/* Summary cards */}
      <div className="my-6 flex gap-4 max-[640px]:flex-col">
        {[
          { label: 'کل مشتریان', value: `${formatNumber(summary.totalCustomers || 0)} نفر` },
          { label: 'مشتریان جدید این ماه', value: `${formatNumber(summary.newThisMonth || 0)} نفر` },
          { label: 'مشتریان تکراری', value: `${formatNumber(summary.returningCount || 0)} نفر` },
          { label: 'میانگین خرید هر مشتری', value: formatPrice(summary.averageSpend || 0) },
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

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => updateParams({ type: t.value === 'all' ? '' : t.value, page: '' })}
            className={`flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium ${
              type === t.value
                ? 'bg-black text-white'
                : 'border border-[#D9D9D6] text-[#111] hover:bg-[#F2F2EF]'
            }`}
          >
            {t.label}
            <span className="text-xs opacity-70">
              {formatNumber(t.value === 'all' ? counts.all : counts[t.value] || 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3 max-[640px]:flex-col">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="جستجوی نام یا شماره تماس…"
          aria-label="جستجوی نام یا شماره تماس"
          className={`${inputClass} flex-1`}
        />
        <select
          value={city}
          onChange={(e) => updateParams({ city: e.target.value, page: '' })}
          aria-label="شهر"
          className={inputClass}
        >
          <option value="">همه شهرها</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value, page: '' })}
          aria-label="مرتب‌سازی"
          className={inputClass}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Main content */}
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
                {loading ? (
                  <SkeletonRows />
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      <p className="text-sm text-red-600 mb-4">{error}</p>
                      <button
                        type="button"
                        onClick={loadCustomers}
                        className="h-9 px-4 rounded-full border-[1.5px] border-black text-sm font-semibold text-black hover:bg-black hover:text-white"
                      >
                        تلاش مجدد
                      </button>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <p className="text-sm text-[#6B6B6B]">مشتری‌ای پیدا نشد</p>
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => {
                    const isSelected = selectedId === customer.id
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
                        <td className="px-4 py-4 text-[#111]">{formatNumber(customer.ordersCount)}</td>
                        <td className="px-4 py-4 text-[#111]">{formatPrice(customer.totalSpent)}</td>
                        <td className="px-4 py-4 text-[#111]">
                          {customer.lastOrderAt ? formatJalali(customer.lastOrderAt) : '-'}
                        </td>
                        <td className="px-4 py-4">
                          <CustomerTypeBadge type={customer.type} />
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

          {/* Pagination */}
          {!loading && !error && customers.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[#6B6B6B]">
              <span>
                نمایش {formatNumber((page - 1) * PAGE_SIZE + 1)} تا {formatNumber(Math.min(page * PAGE_SIZE, counts.all || 0))} از {formatNumber(counts.all || 0)} مشتری
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => updateParams({ page: (page - 1).toString() })}
                  className="rounded-full border border-[#D9D9D6] px-3 py-1 disabled:opacity-40 hover:bg-[#F2F2EF]"
                >
                  قبلی
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => updateParams({ page: (page + 1).toString() })}
                  className="rounded-full border border-[#D9D9D6] px-3 py-1 disabled:opacity-40 hover:bg-[#F2F2EF]"
                >
                  بعدی
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedId && (
          <div className="hidden min-[900px]:block w-[360px] flex-shrink-0">
            {loadingDetail ? (
              <div className="rounded-lg border border-[#E6E6E3] bg-white p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-[#ECECEC]" />
                <div className="mt-4 h-32 animate-pulse rounded bg-[#ECECEC]" />
              </div>
            ) : selectedCustomer ? (
              <div className="rounded-lg border border-[#E6E6E3] bg-white p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-14 w-14 flex items-center justify-center rounded-full bg-black text-xl font-bold text-white">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-[#111]">{selectedCustomer.name}</div>
                    <div className="text-xs text-[#6B6B6B]">
                      عضو از {formatJalali(selectedCustomer.createdAt)}
                    </div>
                  </div>
                </div>
                <CustomerTypeBadge type={selectedCustomer.type} />

                <div className="mt-4 flex gap-3">
                  <div className="flex-1 rounded-md border border-[#ECECEA] bg-[#FAFAF9] p-3">
                    <div className="text-xs text-[#6B6B6B]">تعداد سفارش</div>
                    <div className="text-[18px] font-bold text-[#111]">
                      {formatNumber(selectedCustomer.ordersCount)}
                    </div>
                  </div>
                  <div className="flex-1 rounded-md border border-[#ECECEA] bg-[#FAFAF9] p-3">
                    <div className="text-xs text-[#6B6B6B]">مجموع خرید</div>
                    <div className="text-[18px] font-bold text-[#111]">
                      {formatPrice(selectedCustomer.totalSpent)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-md border border-[#ECECEA] bg-[#FAFAF9]">
                  <div className="text-xs text-[#6B6B6B] mb-1">شماره تماس</div>
                  <div className="text-sm font-medium text-[#111] ltr" dir="ltr">
                    {selectedCustomer.phone}
                  </div>
                  {selectedCustomer.email && (
                    <>
                      <div className="text-xs text-[#6B6B6B] mt-2 mb-1">ایمیل</div>
                      <div className="text-sm text-[#111] ltr" dir="ltr">
                        {selectedCustomer.email}
                      </div>
                    </>
                  )}
                  <div className="text-xs text-[#6B6B6B] mt-2 mb-1">شهر</div>
                  <div className="text-sm text-[#111]">{selectedCustomer.city}</div>
                </div>

                {/* Edit form */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs text-[#6B6B6B] mb-1">نام</label>
                    <input
                      type="text"
                      defaultValue={selectedCustomer.name}
                      className="w-full h-9 rounded border border-[#D9D9D6] px-2 text-sm"
                      onBlur={(e) => {
                        if (e.target.value !== selectedCustomer.name) {
                          api(`/admin/customers/${selectedCustomer.id}/update/`, {
                            method: 'PATCH',
                            body: { name: e.target.value },
                          }).then(() => loadCustomerDetail(selectedCustomer.id))
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6B6B6B] mb-1">ایمیل</label>
                    <input
                      type="email"
                      defaultValue={selectedCustomer.email || ''}
                      className="w-full h-9 rounded border border-[#D9D9D6] px-2 text-sm"
                      onBlur={(e) => {
                        if (e.target.value !== selectedCustomer.email) {
                          api(`/admin/customers/${selectedCustomer.id}/update/`, {
                            method: 'PATCH',
                            body: { email: e.target.value },
                          }).then(() => loadCustomerDetail(selectedCustomer.id))
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6B6B6B] mb-1">شهر</label>
                    <input
                      type="text"
                      defaultValue={selectedCustomer.city}
                      className="w-full h-9 rounded border border-[#D9D9D6] px-2 text-sm"
                      onBlur={(e) => {
                        if (e.target.value !== selectedCustomer.city) {
                          api(`/admin/customers/${selectedCustomer.id}/update/`, {
                            method: 'PATCH',
                            body: { city: e.target.value },
                          }).then(() => loadCustomerDetail(selectedCustomer.id))
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-[#111] mb-3">سابقه سفارش‌ها</h3>
                  <div className="space-y-2">
                    {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                      selectedCustomer.orders.map((order) => (
                        <Link
                          key={order.id}
                          to={`/admin/orders?search=${order.number}`}
                          className="flex items-center justify-between rounded-md border border-[#ECECEA] p-2 hover:bg-[#FAFAF8]"
                        >
                          <div>
                            <div className="text-xs font-medium text-[#111] ltr" dir="ltr">
                              #{order.number}
                            </div>
                            <div className="text-xs text-[#6B6B6B]">
                              {formatJalali(order.createdAt)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium text-[#111]">
                              {formatPrice(order.total)}
                            </div>
                            <OrderStatusBadge status={order.status} />
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-xs text-[#6B6B6B]">سفارشی ثبت نشده است</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/orders/new')}
                    className="flex-1 h-10 rounded-md bg-black text-sm font-semibold text-white hover:bg-[#222]"
                  >
                    + سفارش جدید
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Add customer modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-lg font-bold text-[#111] mb-4">افزودن مشتری</h2>
            <AddCustomerForm
              onClose={() => setShowAddModal(false)}
              onSuccess={() => {
                setShowAddModal(false)
                loadCustomers()
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function AddCustomerForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})

    try {
      await api('/admin/customers/', {
        method: 'POST',
        body: formData,
      })
      onSuccess()
    } catch (err) {
      setErrors({ submit: err.message || 'خطا در ایجاد مشتری' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-[#111] mb-1">نام</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full h-10 rounded border border-[#D9D9D6] px-3 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-[#111] mb-1">نام خانوادگی</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full h-10 rounded border border-[#D9D9D6] px-3 text-sm"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-[#111] mb-1">شماره تماس</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full h-10 rounded border border-[#D9D9D6] px-3 text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-[#111] mb-1">ایمیل (اختیاری)</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full h-10 rounded border border-[#D9D9D6] px-3 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-[#111] mb-1">شهر</label>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          className="w-full h-10 rounded border border-[#D9D9D6] px-3 text-sm"
          required
        />
      </div>

      {errors.submit && (
        <p className="text-sm text-red-600">{errors.submit}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-10 rounded-md border-[1.5px] border-black text-sm font-semibold text-black hover:bg-[#F2F2EF]"
        >
          انصراف
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 h-10 rounded-md bg-black text-sm font-semibold text-white hover:bg-[#222] disabled:opacity-50"
        >
          {saving ? 'در حال ذخیره...' : 'ذخیره'}
        </button>
      </div>
    </form>
  )
}
