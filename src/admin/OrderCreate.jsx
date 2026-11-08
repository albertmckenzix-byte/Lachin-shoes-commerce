import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { formatNumber, formatPrice } from '../utils/format'
import { useProducts } from '../context/ProductsContext'
import { api } from './api'
import { getSettings } from '../api/settings'

const inputClass =
  'h-[42px] w-full box-border min-w-0 rounded-md border border-[#D9D9D6] bg-white px-3 text-sm text-[#111] outline-none focus:border-[#111]'

const SHIPPING_METHODS = [
  { value: 'standard', label: 'ارسال عادی' },
  { value: 'express', label: 'ارسال سریع' },
]

const PAYMENT_OPTIONS = [
  { value: 'pending', label: 'در انتظار پرداخت' },
  { value: 'paid', label: 'پرداخت شده' },
]

function formatPhone(phone) {
  if (!phone || phone.length < 11) return phone
  const digits = phone.replace(/\D/g, '')
  if (digits.length !== 11) return phone
  const persianDigits = digits.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])
  return `${persianDigits.slice(0, 4)} ${persianDigits.slice(4, 7)} ${persianDigits.slice(7)}`
}

export default function OrderCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const customerId = searchParams.get('customerId')
  const { products } = useProducts()

  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [items, setItems] = useState([])
  const [address, setAddress] = useState('')
  const [shippingMethod, setShippingMethod] = useState('standard')
  const [settings, setSettings] = useState({
    freeShippingThreshold: 5000000,
    standardFee: 0,
    expressFee: 500000,
  })
  const [discount, setDiscount] = useState(0)
  const [orderNote, setOrderNote] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(true)

  // Load customers from API
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoadingCustomers(true)
        const data = await api('/admin/customers/')
        setCustomers(data.results || [])
      } catch (err) {
        console.error('Failed to load customers:', err)
      } finally {
        setLoadingCustomers(false)
      }
    }
    loadCustomers()
  }, [])

  // Load customer from URL param
  useEffect(() => {
    if (customerId && customers.length > 0) {
      const customer = customers.find((c) => c.id === Number(customerId))
      if (customer) {
        setSelectedCustomer(customer)
        setAddress(customer.address || '')
      }
    }
  }, [customerId, customers])

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getSettings()
        setSettings(data)
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }
    loadSettings()
  }, [])

  // Update shipping cost when method changes
  useEffect(() => {
    if (shippingMethod === 'express') {
      setShippingCost(settings.expressFee)
    } else {
      setShippingCost(0)
    }
  }, [shippingMethod, settings])

  // Customer picker filtering
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers
    const q = customerSearch.trim().toLowerCase()
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    )
  }, [customerSearch, customers])

  // Calculate totals
  const goodsTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [items])

  const totalPairs = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }, [items])

  const total = useMemo(() => {
    return Math.max(0, goodsTotal + shippingCost - discount)
  }, [goodsTotal, shippingCost, discount])

  // Validation
  const validate = useCallback(() => {
    const newErrors = {}
    if (!selectedCustomer) newErrors.customer = 'مشتری انتخاب نشده است'
    if (items.length === 0) newErrors.items = 'حداقل یک کالا باید انتخاب شود'
    if (shippingMethod !== 'pickup' && !address.trim()) {
      newErrors.address = 'آدرس الزامی است'
    }
    if (discount > goodsTotal) newErrors.discount = 'تخفیف نمی‌تواند از جمع کالا بیشتر باشد'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [selectedCustomer, items.length, shippingMethod, address, discount, goodsTotal])

  // Add item
  const handleAddItem = (slug, sizeUs) => {
    const product = products.find((p) => p.slug === slug)
    if (!product) return

    const sizeEntry = Array.isArray(product.sizes)
      ? product.sizes.find((s) => Number(s.us) === Number(sizeUs))
      : null
    if (!sizeEntry || !sizeEntry.is_active || sizeEntry.stock <= 0) return

    const existingIdx = items.findIndex(
      (i) => i.slug === slug && i.sizeUs === sizeUs
    )
    if (existingIdx >= 0) {
      setItems((prev) => {
        const updated = [...prev]
        const newQty = Math.min(updated[existingIdx].quantity + 1, sizeEntry.stock)
        updated[existingIdx].quantity = newQty
        return updated
      })
    } else {
      const price = product.oldPrice || product.price
      setItems((prev) => [
        ...prev,
        {
          slug,
          name: product.name,
          sizeUs,
          quantity: 1,
          price,
          maxStock: sizeEntry.stock,
        },
      ])
    }
  }

  // Update item quantity
  const handleUpdateQuantity = (index, delta) => {
    setItems((prev) => {
      const updated = [...prev]
      const item = updated[index]
      const newQty = Math.max(1, Math.min(item.quantity + delta, item.maxStock))
      updated[index].quantity = newQty
      return updated
    })
  }

  // Remove item
  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit
  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)

    // Check stock again before save
    for (const item of items) {
      const product = products.find((p) => p.slug === item.slug)
      if (!product) continue
      const sizeEntry = Array.isArray(product.sizes)
        ? product.sizes.find((s) => Number(s.us) === Number(item.sizeUs))
        : null
      if (!sizeEntry || sizeEntry.stock < item.quantity) {
        setErrors({ items: `موجودی ${item.name} در سایز ${item.sizeUs} کافی نیست` })
        setSaving(false)
        return
      }
    }

    try {
      const payload = {
        firstName: selectedCustomer.firstName || selectedCustomer.name.split(' ')[0],
        lastName: selectedCustomer.lastName || selectedCustomer.name.split(' ').slice(1).join(' '),
        phone: selectedCustomer.phone,
        email: selectedCustomer.email || '',
        country: selectedCustomer.country || 'Iran',
        city: selectedCustomer.city,
        address: address,
        postalCode: '',
        deliveryMethod: shippingMethod,
        couponCode: '',
        note: orderNote,
        paymentStatus: paymentStatus,
        items: items.map(i => ({
          slug: i.slug,
          sizeUs: i.sizeUs,
          quantity: i.quantity,
        })),
      }

      const result = await api('/admin/orders/create/', {
        method: 'POST',
        body: payload,
      })

      navigate('/admin/orders', {
        state: { success: `سفارش ${result.number} ثبت شد` },
      })
    } catch (err) {
      setErrors({ submit: err.message || 'خطا در ثبت سفارش' })
    } finally {
      setSaving(false)
    }
  }

  // Get available sizes for a product
  const getAvailableSizes = (product) => {
    if (!Array.isArray(product.sizes)) return []
    return product.sizes.filter((s) => s.is_active && s.stock > 0)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-1.5 mb-6">
        <Link
          to={customerId ? '/admin/customers' : '/admin/orders'}
          className="text-sm text-[#6B6B6B] hover:text-[#111]"
        >
          → بازگشت به {customerId ? 'مشتریان' : 'سفارش‌ها'}
        </Link>
        <h1 className="text-[28px] font-bold text-[#111]">ثبت سفارش دستی</h1>
        <p className="text-sm text-[#6B6B6B]">
          برای سفارش‌هایی که از راه تلفن، پیام‌رسان یا حضوری گرفته‌اید
        </p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Main form column */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Customer card */}
          <div className="rounded-lg border border-[#E6E6E3] bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-semibold text-[#111]">مشتری</h2>
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={() => setShowCustomerPicker(true)}
                  className="flex h-10 items-center rounded-full border-[1.5px] border-black px-4 text-[13px] font-semibold text-black hover:bg-[#F2F2EF]"
                >
                  تغییر مشتری
                </button>
              )}
            </div>
            {showCustomerPicker || !selectedCustomer ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="جستجوی نام یا شماره تماس…"
                  className={inputClass}
                />
                <div className="max-h-48 overflow-y-auto rounded-md border border-[#ECECEA]">
                  {filteredCustomers.length === 0 ? (
                    <p className="p-4 text-sm text-[#6B6B6B]">مشتری‌ای یافت نشد</p>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c)
                          setAddress(c.address || '')
                          setShowCustomerPicker(false)
                          setCustomerSearch('')
                        }}
                        className="w-full flex items-center gap-3 p-3 text-start hover:bg-[#FAFAF8] border-b border-[#ECECEA] last:border-0"
                      >
                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-[#ECECEA] text-sm font-bold text-[#555]">
                          {c.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[#111]">{c.name}</div>
                          <div className="text-xs text-[#6B6B6B]">{c.city}</div>
                        </div>
                        <div className="text-xs text-[#6B6B6B] ltr" dir="ltr">
                          {c.phone}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-[#ECECEA] bg-[#FAFAF9] p-[14px_16px] flex items-center gap-3">
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-black text-lg font-bold text-white">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#111]">{selectedCustomer.name}</div>
                  <div className="text-sm text-[#6B6B6B]">
                    {selectedCustomer.city} · <span dir="ltr" className="mx-1">{formatPhone(selectedCustomer.phone)}</span>
                  </div>
                </div>
              </div>
            )}
            {errors.customer && (
              <p className="mt-2 text-xs text-[#B3261E]">{errors.customer}</p>
            )}
          </div>

          {/* Items card */}
          <div className="rounded-lg border border-[#E6E6E3] bg-white p-5">
            <h2 className="text-[18px] font-semibold text-[#111] mb-4">اقلام سفارش</h2>
            <div className="flex gap-3 mb-4">
              <select
                value=""
                onChange={(e) => {
                  const [slug, sizeUs] = e.target.value.split(':')
                  if (slug && sizeUs) handleAddItem(slug, sizeUs)
                  e.target.value = ''
                }}
                className={`${inputClass} flex-1`}
                disabled={!selectedCustomer}
              >
                <option value="">افزودن محصول</option>
                {products.map((p) => {
                  const sizes = getAvailableSizes(p)
                  if (sizes.length === 0) return null
                  return (
                    <optgroup key={p.slug} label={p.name}>
                      {sizes.map((s) => (
                        <option key={`${p.slug}:${s.us}`} value={`${p.slug}:${s.us}`}>
                          {p.name} - US {s.us} (موجودی: {s.stock})
                        </option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
              <button
                type="button"
                onClick={() => {
                  const select = document.querySelector('select')
                  if (select.value) {
                    const [slug, sizeUs] = select.value.split(':')
                    if (slug && sizeUs) handleAddItem(slug, sizeUs)
                    select.value = ''
                  }
                }}
                className="h-[42px] rounded-md bg-black px-4 text-sm font-semibold text-white hover:bg-[#222]"
                disabled={!selectedCustomer}
              >
                + افزودن
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-[#6B6B6B] py-4">کالایی انتخاب نشده است</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="bg-[#FAFAF8] px-3 py-2 text-start text-xs font-medium text-[#6B6B6B]">
                        محصول
                      </th>
                      <th className="bg-[#FAFAF8] px-3 py-2 text-start text-xs font-medium text-[#6B6B6B]">
                        سایز
                      </th>
                      <th className="bg-[#FAFAF8] px-3 py-2 text-start text-xs font-medium text-[#6B6B6B]">
                        تعداد
                      </th>
                      <th className="bg-[#FAFAF8] px-3 py-2 text-start text-xs font-medium text-[#6B6B6B]">
                        قیمت واحد
                      </th>
                      <th className="bg-[#FAFAF8] px-3 py-2 text-start text-xs font-medium text-[#6B6B6B]">
                        جمع
                      </th>
                      <th className="bg-[#FAFAF8] px-3 py-2 text-start text-xs font-medium text-[#6B6B6B]" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t border-[#EEE]">
                        <td className="px-3 py-2">
                          <bdi dir="ltr" className="font-medium text-[#111]">
                            {item.name}
                          </bdi>
                        </td>
                        <td className="px-3 py-2 text-[#111]">US {item.sizeUs}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, -1)}
                              disabled={item.quantity <= 1}
                              className="w-8 h-8 rounded border border-[#D9D9D6] text-black disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="w-8 text-center">{formatNumber(item.quantity)}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, 1)}
                              disabled={item.quantity >= item.maxStock}
                              className="w-8 h-8 rounded border border-[#D9D9D6] text-black disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[#111]">{formatPrice(item.price)}</td>
                        <td className="px-3 py-2 text-[#111]">
                          {formatPrice(item.price * item.quantity)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-xs text-[#B3261E] hover:underline"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {errors.items && (
              <p className="mt-2 text-xs text-[#B3261E]">{errors.items}</p>
            )}
          </div>

          {/* Address and shipping */}
          <div className="rounded-lg border border-[#E6E6E3] bg-white p-5">
            <h2 className="text-[18px] font-semibold text-[#111] mb-4">آدرس و ارسال</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#111] mb-1">آدرس تحویل</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-[#D9D9D6] bg-white px-3 py-2 text-sm outline-none focus:border-[#111]"
                />
                {errors.address && (
                  <p className="mt-1 text-xs text-[#B3261E]">{errors.address}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-[14px] max-[640px]:grid-cols-1">
                <div className="min-w-0">
                  <label className="block text-sm text-[#111] mb-1">روش ارسال</label>
                  <select
                    value={shippingMethod}
                    onChange={(e) => setShippingMethod(e.target.value)}
                    className={inputClass}
                  >
                    {SHIPPING_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="block text-sm text-[#111] mb-1">هزینه ارسال</label>
                  <input
                    type="text"
                    value={formatNumber(shippingCost)}
                    readOnly
                    className={`${inputClass} bg-[#FAFAF8]`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#111] mb-1">یادداشت سفارش (اختیاری)</label>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-[#D9D9D6] bg-white px-3 py-2 text-sm outline-none focus:border-[#111]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary column */}
        <div className="w-full lg:w-[360px] flex-shrink-0">
          <div className="rounded-lg border border-[#E6E6E3] bg-white p-5 sticky top-6 align-self-flex-start">
            <h2 className="text-[18px] font-semibold text-[#111] mb-4">خلاصه سفارش</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B6B6B]">جمع کالاها</span>
                <span className="text-[#111]">
                  {formatPrice(goodsTotal)} ({formatNumber(totalPairs)} جفت)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6B6B]">هزینه ارسال</span>
                <span className="text-[#111]">{formatPrice(shippingCost)}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[#6B6B6B]">تخفیف</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  min={0}
                  className="w-[120px] h-11 rounded border border-[#D9D9D6] bg-white px-2 text-sm text-[#111] outline-none focus:border-[#111] ltr"
                />
              </div>
              {errors.discount && (
                <p className="text-xs text-[#B3261E]">{errors.discount}</p>
              )}
              <div className="flex justify-between border-t border-[#ECECEA] pt-3 font-bold text-lg">
                <span>مبلغ نهایی (تومان)</span>
                <span className="text-[#111]">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm text-[#111] mb-1">وضعیت پرداخت</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className={inputClass}
                >
                  {PAYMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#111] mb-1">وضعیت سفارش</label>
                <select
                  value="new"
                  disabled
                  className={`${inputClass} bg-[#FAFAF8]`}
                >
                  <option value="new">جدید</option>
                </select>
              </div>
              <p className="text-xs text-[#6B6B6B]">
                با ثبت سفارش، موجودی هر محصول به‌اندازه تعداد سفارش کم می‌شود.
              </p>
              {errors.submit && (
                <p className="text-xs text-[#B3261E]">{errors.submit}</p>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="w-full h-11 rounded-md bg-black text-sm font-semibold text-white hover:bg-[#222] disabled:opacity-40"
              >
                {saving ? 'در حال ثبت…' : 'ثبت سفارش'}
              </button>
              <button
                type="button"
                onClick={() => navigate(customerId ? '/admin/customers' : '/admin/orders')}
                className="w-full h-11 rounded-full border-[1.5px] border-black text-sm font-semibold text-black hover:bg-[#F2F2EF]"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
