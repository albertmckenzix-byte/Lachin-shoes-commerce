import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from './api'
import { formatNumber } from '../utils/format'
import { brands } from '../data/brands'

const STATUS_STYLES = {
  active: 'bg-[#E5F3E8] text-[#1F6B35]',
  low: 'bg-[#FFC83D] text-black',
  out: 'bg-[#FBE9E7] text-[#B3261E]',
  inactive: 'bg-[#EEE] text-[#555]',
}

const STATUS_LABELS = {
  active: 'فعال',
  low: 'کم‌موجودی',
  out: 'ناموجود',
  inactive: 'غیرفعال',
}

const STATUS_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'active', label: 'فعال' },
  { value: 'low', label: 'کم‌موجودی' },
  { value: 'out', label: 'ناموجود' },
  { value: 'inactive', label: 'غیرفعال' },
]

const inputClass =
  'h-[42px] rounded-md border border-[#D9D9D6] bg-white px-3 text-sm text-[#111] outline-none focus:border-[#111]'

function StatusPill({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-[3px] text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.inactive}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function ProductThumb({ product }) {
  const url = product.images && product.images.length > 0
    ? product.images[0].url
    : null
  if (!url) {
    return <div className="h-12 w-12 rounded bg-[#ECECEC]" />
  }
  return (
    <img
      src={url}
      alt={product.name}
      className="h-12 w-12 rounded object-cover"
    />
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-t border-[#EEE]">
          <td className="px-4 py-3.5"><div className="h-12 w-12 animate-pulse rounded bg-[#ECECEC]" /></td>
          <td className="px-4 py-3.5"><div className="h-4 w-40 animate-pulse rounded bg-[#ECECEC]" /></td>
          <td className="px-4 py-3.5"><div className="h-4 w-24 animate-pulse rounded bg-[#ECECEC]" /></td>
          <td className="px-4 py-3.5"><div className="h-4 w-16 animate-pulse rounded bg-[#ECECEC]" /></td>
          <td className="px-4 py-3.5"><div className="h-4 w-16 animate-pulse rounded bg-[#ECECEC]" /></td>
          <td className="px-4 py-3.5"><div className="h-4 w-20 animate-pulse rounded bg-[#ECECEC]" /></td>
          <td className="px-4 py-3.5"><div className="h-6 w-16 animate-pulse rounded-full bg-[#ECECEC]" /></td>
          <td className="px-4 py-3.5"><div className="h-4 w-20 animate-pulse rounded bg-[#ECECEC]" /></td>
        </tr>
      ))}
    </>
  )
}

export default function ProductsList() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [brand, setBrand] = useState('')
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api('/admin/products/')
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'خطا در دریافت محصولات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200)
    return () => clearTimeout(timer)
  }, [search])

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.slug.includes(q)) {
        return false
      }
      if (brand && p.maker_brand !== brand) return false
      if (status && p.status !== status) return false
      return true
    })
  }, [products, debouncedSearch, brand, status])

  const summary = useMemo(() => {
    const totalStock = products.reduce((sum, p) => sum + (p.total_stock || 0), 0)
    const lowCount = products.filter(
      (p) => p.status === 'low' || p.status === 'out'
    ).length
    return { count: products.length, totalStock, lowCount }
  }, [products])

  const clearFilters = () => {
    setSearch('')
    setBrand('')
    setStatus('')
  }

  const handleDelete = async (product) => {
    if (!window.confirm('این محصول حذف شود؟ این کار قابل بازگشت نیست.')) return
    try {
      await api(`/admin/products/${product.id}/`, { method: 'DELETE' })
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
    } catch (err) {
      window.alert(err.message || 'خطا در حذف محصول')
    }
  }

  const hasFilters = search || brand || status

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#111]">محصولات</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            مدیریت تصاویر، سایزها، قیمت و موجودی هر سایز
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="flex h-11 items-center rounded-md bg-black px-[18px] text-sm font-semibold text-white"
        >
          + افزودن محصول
        </Link>
      </div>

      <div className="my-6 flex gap-4 max-[640px]:flex-col">
        {[
          { label: 'تعداد محصولات', value: formatNumber(summary.count) },
          { label: 'کل موجودی', value: `${formatNumber(summary.totalStock)} جفت` },
          { label: 'کم‌موجودی (زیر ۲۵ جفت)', value: `${formatNumber(summary.lowCount)} محصول` },
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

      <div className="mb-4 flex gap-3 max-[640px]:flex-col">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی نام محصول…"
          aria-label="جستجوی نام محصول"
          className={`${inputClass} flex-1`}
        />
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          aria-label="برند"
          className={inputClass}
        >
          <option value="">همه برندها</option>
          {brands.map((b) => (
            <option key={b.key} value={b.key}>{b.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="وضعیت"
          className={inputClass}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-lg border border-[#E6E6E3] bg-white p-10 text-center">
          <p className="text-sm text-[#B3261E]">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 rounded-full border-[1.5px] border-black px-5 py-2 text-sm font-semibold text-black hover:bg-black hover:text-white"
          >
            تلاش مجدد
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E6E6E3] bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['تصویر', 'نام محصول', 'قیمت (تومان)', 'سایزها', 'موجودی کل', 'وضعیت', ''].map((h) => (
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-sm text-[#6B6B6B]">محصولی پیدا نشد</p>
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-3 rounded-full border-[1.5px] border-black px-4 py-1.5 text-[13px] font-semibold text-black hover:bg-black hover:text-white"
                      >
                        پاک کردن فیلترها
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr
                    key={product.id}
                    tabIndex={0}
                    onClick={() => navigate(`/admin/products/${product.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        navigate(`/admin/products/${product.id}`)
                      }
                    }}
                    className="cursor-pointer border-t border-[#EEE] outline-none hover:bg-[#FAFAF8] focus:bg-[#FAFAF8]"
                  >
                    <td className="px-4 py-3.5">
                      <ProductThumb product={product} />
                    </td>
                    <td className="px-4 py-3.5">
                      <bdi dir="ltr" className="block font-medium text-[#111]">
                        {product.name}
                      </bdi>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[#111]">{formatNumber(product.price)}</span>
                      {product.old_price && (
                        <span className="mr-2 text-xs text-[#999] line-through">
                          {formatNumber(product.old_price)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[#111]">
                      {formatNumber(product.size_count)} سایز
                    </td>
                    <td className="px-4 py-3.5 text-[#111]">
                      {formatNumber(product.total_stock)} جفت
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusPill status={product.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/admin/products/${product.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex h-[34px] items-center rounded-full border-[1.5px] border-black px-3.5 text-[13px] font-semibold text-black hover:bg-black hover:text-white"
                        >
                          ویرایش
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(product)
                          }}
                          className="text-[13px] text-[#B3261E] hover:underline"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
