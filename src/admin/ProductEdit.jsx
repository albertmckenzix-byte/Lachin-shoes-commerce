import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from './api'
import { formatNumber } from '../utils/format'
import { brands } from '../data/brands'
import ImageManager from './components/ImageManager'
import SizeStockTable from './components/SizeStockTable'

const GENDER_OPTIONS = [
  { value: 'men', label: 'مردانه' },
  { value: 'women', label: 'زنانه' },
]

const CATEGORY_OPTIONS = [
  { value: 'best-sellers', label: 'پرفروش‌ترین‌ها' },
  { value: 'limited-edition', label: 'نسخه محدود' },
  { value: 'performance-series', label: 'سری پرفورمنس' },
  { value: 'kids', label: 'کفش بچگانه' },
]

const BADGE_OPTIONS = [
  { value: '', label: 'بدون برچسب' },
  { value: 'SALE', label: 'حراج' },
  { value: 'BEST_SELLER', label: 'پرفروش' },
]

const inputClass =
  'h-[42px] w-full rounded-md border border-[#D9D9D6] bg-white px-3 text-sm text-[#111] outline-none focus:border-[#111]'

const emptyForm = {
  name: '',
  slug: '',
  maker_brand: 'nike',
  genders: [],
  categories: [],
  price: '',
  old_price: '',
  badge: '',
  is_active: true,
  description_fa: '',
  description_en: '',
}

function toEnglishDigits(str) {
  return String(str)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

function slugifyClient(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function snapshot(form, sizes) {
  return JSON.stringify({ form, sizes })
}

function NumberField({ label, value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-[#111]">
      {label}
      <input
        type="text"
        inputMode="numeric"
        value={value === '' || value == null ? '' : formatNumber(Number(value))}
        onChange={(e) =>
          onChange(toEnglishDigits(e.target.value).replace(/\D/g, ''))
        }
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  )
}

function CheckGroup({ label, options, values, onToggle }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-[#111]">{label}</div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2 text-sm text-[#111]"
          >
            <input
              type="checkbox"
              checked={values.includes(opt.value)}
              onChange={() => onToggle(opt.value)}
              className="h-4 w-4 accent-black"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <section className="rounded-lg border border-[#E6E6E3] bg-white px-6 py-[22px]">
      <h2 className="mb-5 text-lg font-semibold text-[#111]">{title}</h2>
      {children}
    </section>
  )
}

export default function ProductEdit() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [sizes, setSizes] = useState([])
  const [images, setImages] = useState([])
  const [allSizes, setAllSizes] = useState([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const initialRef = useRef('')

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const toggleInArray = (field, value) =>
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }))

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [product, sizeTable] = await Promise.all([
        id ? api(`/admin/products/${id}/`) : Promise.resolve(null),
        api('/admin/sizes/'),
      ])
      setAllSizes(Array.isArray(sizeTable) ? sizeTable : [])
      if (product) {
        setForm({
          name: product.name || '',
          slug: product.slug || '',
          maker_brand: product.maker_brand || 'nike',
          genders: product.genders || [],
          categories: product.categories || [],
          price: product.price != null ? String(product.price) : '',
          old_price: product.old_price != null ? String(product.old_price) : '',
          badge: product.badge || '',
          is_active: !!product.is_active,
          description_fa: product.description_fa || '',
          description_en: product.description_en || '',
        })
        setSizes(
          (product.sizes || []).map((s) => ({
            us: Number(s.us),
            eu: Number(s.eu),
            cm: Number(s.cm),
            stock: s.stock || 0,
            is_active: !!s.is_active,
          }))
        )
        setImages(product.images || [])
        initialRef.current = snapshot(
          {
            name: product.name || '',
            slug: product.slug || '',
            maker_brand: product.maker_brand || 'nike',
            genders: product.genders || [],
            categories: product.categories || [],
            price: product.price != null ? String(product.price) : '',
            old_price:
              product.old_price != null ? String(product.old_price) : '',
            badge: product.badge || '',
            is_active: !!product.is_active,
            description_fa: product.description_fa || '',
            description_en: product.description_en || '',
          },
          (product.sizes || []).map((s) => ({
            us: Number(s.us),
            eu: Number(s.eu),
            cm: Number(s.cm),
            stock: s.stock || 0,
            is_active: !!s.is_active,
          }))
        )
      } else {
        setForm(emptyForm)
        setSizes([])
        setImages([])
        initialRef.current = snapshot(emptyForm, [])
      }
    } catch (err) {
      setLoadError(err.message || 'خطا در دریافت اطلاعات محصول')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (location.state && location.state.saved) {
      setToast({ type: 'success', text: 'تغییرات ذخیره شد' })
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const dirty = useMemo(
    () => snapshot(form, sizes) !== initialRef.current,
    [form, sizes]
  )

  useEffect(() => {
    if (!dirty) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const handleCancel = () => {
    if (dirty && !window.confirm('تغییرات ذخیره نشده‌اند. بدون ذخیره خارج می‌شوید؟')) {
      return
    }
    navigate('/admin/products')
  }

  const handleSave = async () => {
    const price = Number(form.price)
    const oldPrice = form.old_price === '' ? null : Number(form.old_price)
    if (!form.price || price <= 0) {
      setToast({ type: 'error', text: 'قیمت باید بزرگتر از صفر باشد.' })
      return
    }
    if (oldPrice !== null && oldPrice <= price) {
      setToast({
        type: 'error',
        text: 'قیمت قبل از تخفیف باید بزرگتر از قیمت باشد.',
      })
      return
    }

    const payload = {
      name: form.name,
      slug: form.slug,
      maker_brand: form.maker_brand,
      genders: form.genders,
      categories: form.categories,
      tags: [],
      price,
      old_price: oldPrice,
      badge: form.badge,
      is_active: form.is_active,
      description_fa: form.description_fa,
      description_en: form.description_en,
      sizes: sizes.map((s) => ({
        us: s.us,
        eu: s.eu,
        cm: s.cm,
        stock: s.stock || 0,
        is_active: !!s.is_active,
      })),
    }

    setSaving(true)
    setToast(null)
    try {
      if (isNew) {
        const created = await api('/admin/products/', {
          method: 'POST',
          body: payload,
        })
        navigate(`/admin/products/${created.id}`, {
          replace: true,
          state: { saved: true },
        })
      } else {
        const updated = await api(`/admin/products/${id}/`, {
          method: 'PATCH',
          body: payload,
        })
        setForm({
          name: updated.name || '',
          slug: updated.slug || '',
          maker_brand: updated.maker_brand || 'nike',
          genders: updated.genders || [],
          categories: updated.categories || [],
          price: updated.price != null ? String(updated.price) : '',
          old_price:
            updated.old_price != null ? String(updated.old_price) : '',
          badge: updated.badge || '',
          is_active: !!updated.is_active,
          description_fa: updated.description_fa || '',
          description_en: updated.description_en || '',
        })
        const nextSizes = (updated.sizes || []).map((s) => ({
          us: Number(s.us),
          eu: Number(s.eu),
          cm: Number(s.cm),
          stock: s.stock || 0,
          is_active: !!s.is_active,
        }))
        setSizes(nextSizes)
        setImages(updated.images || [])
        initialRef.current = snapshot(
          {
            name: updated.name || '',
            slug: updated.slug || '',
            maker_brand: updated.maker_brand || 'nike',
            genders: updated.genders || [],
            categories: updated.categories || [],
            price: updated.price != null ? String(updated.price) : '',
            old_price:
              updated.old_price != null ? String(updated.old_price) : '',
            badge: updated.badge || '',
            is_active: !!updated.is_active,
            description_fa: updated.description_fa || '',
            description_en: updated.description_en || '',
          },
          nextSizes
        )
        setToast({ type: 'success', text: 'تغییرات ذخیره شد' })
      }
    } catch (err) {
      setToast({ type: 'error', text: err.message || 'خطا در ذخیره محصول' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('این محصول حذف شود؟ این کار قابل بازگشت نیست.')) return
    try {
      await api(`/admin/products/${id}/`, { method: 'DELETE' })
      navigate('/admin/products')
    } catch (err) {
      setToast({ type: 'error', text: err.message || 'خطا در حذف محصول' })
    }
  }

  const priceInvalid =
    form.old_price !== '' &&
    form.price !== '' &&
    Number(form.old_price) <= Number(form.price)

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-[#6B6B6B]">
        در حال بارگذاری…
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-[#E6E6E3] bg-white p-10 text-center">
        <p className="text-sm text-[#B3261E]">{loadError}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 rounded-full border-[1.5px] border-black px-5 py-2 text-sm font-semibold text-black hover:bg-black hover:text-white"
        >
          تلاش مجدد
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[#6B6B6B]">
          <Link to="/admin/products" className="hover:text-[#111] hover:underline">
            محصولات
          </Link>
          {' / '}
          {isNew ? 'محصول جدید' : 'ویرایش محصول'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-11 items-center rounded-md border-[1.5px] border-black px-4 text-sm font-semibold text-black hover:bg-[#F2F2EF]"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="flex h-11 items-center rounded-md bg-black px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <h1 className="mb-5 text-[26px] font-bold text-[#111]">
        <bdi dir="ltr">{form.name || (isNew ? 'محصول جدید' : '…')}</bdi>
      </h1>

      <div className="flex flex-col gap-4">
        <Card title="اطلاعات اصلی">
          <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-3">
            <div>
              <label className="mb-1.5 flex flex-col gap-1.5 text-sm text-[#111]">
                نام محصول
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setField('name', e.target.value)
                    if (isNew && !form.slug) {
                      setField('slug', slugifyClient(e.target.value))
                    }
                  }}
                  className={inputClass}
                />
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setField('slug', e.target.value)}
                placeholder="slug"
                dir="ltr"
                className="mt-1.5 h-8 w-full rounded border border-[#E6E6E3] px-2 text-left text-xs text-[#6B6B6B] outline-none focus:border-[#111]"
              />
            </div>
            <label className="flex flex-col gap-1.5 text-sm text-[#111]">
              برند
              <select
                value={form.maker_brand}
                onChange={(e) => setField('maker_brand', e.target.value)}
                className={inputClass}
              >
                {brands.map((b) => (
                  <option key={b.key} value={b.key}>{b.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-[#111]">
              وضعیت انتشار
              <select
                value={form.is_active ? 'active' : 'inactive'}
                onChange={(e) => setField('is_active', e.target.value === 'active')}
                className={inputClass}
              >
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
              </select>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
            <CheckGroup
              label="جنسیت"
              options={GENDER_OPTIONS}
              values={form.genders}
              onToggle={(v) => toggleInArray('genders', v)}
            />
            <CheckGroup
              label="دسته‌بندی"
              options={CATEGORY_OPTIONS}
              values={form.categories}
              onToggle={(v) => toggleInArray('categories', v)}
            />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 min-[640px]:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm text-[#111]">
              توضیحات فارسی
              <textarea
                value={form.description_fa}
                onChange={(e) => setField('description_fa', e.target.value)}
                rows={4}
                className="w-full rounded-md border border-[#D9D9D6] bg-white px-3 py-2 text-sm outline-none focus:border-[#111]"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-[#111]">
              توضیحات انگلیسی
              <textarea
                value={form.description_en}
                onChange={(e) => setField('description_en', e.target.value)}
                rows={4}
                dir="ltr"
                className="w-full rounded-md border border-[#D9D9D6] bg-white px-3 py-2 text-left text-sm outline-none focus:border-[#111]"
              />
            </label>
          </div>
        </Card>

        <Card title="تصاویر محصول">
          <ImageManager
            productId={isNew ? null : Number(id)}
            images={images}
            onImagesChange={setImages}
          />
        </Card>

        <Card title="قیمت">
          <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-3">
            <NumberField
              label="قیمت (تومان)"
              value={form.price}
              onChange={(v) => setField('price', v)}
            />
            <NumberField
              label="قیمت قبل از تخفیف (اختیاری)"
              value={form.old_price}
              onChange={(v) => setField('old_price', v)}
            />
            <label className="flex flex-col gap-1.5 text-sm text-[#111]">
              برچسب
              <select
                value={form.badge}
                onChange={(e) => setField('badge', e.target.value)}
                className={inputClass}
              >
                {BADGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>
          {priceInvalid && (
            <p className="mt-3 text-sm text-[#B3261E]">
              قیمت قبل از تخفیف باید بزرگتر از قیمت باشد.
            </p>
          )}
        </Card>

        <Card title="سایز و موجودی">
          <SizeStockTable
            sizes={sizes}
            allSizes={allSizes}
            onChange={setSizes}
          />
        </Card>
      </div>

      {!isNew && (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleDelete}
            className="text-sm text-[#B3261E] hover:underline"
          >
            حذف محصول
          </button>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center">
          <div
            className={`rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
              toast.type === 'success' ? 'bg-[#1F6B35]' : 'bg-[#B3261E]'
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}
    </div>
  )
}
