import { useCallback, useEffect, useState } from 'react'
import { Check, AlertCircle, RefreshCw, Info, Clock, Truck } from 'lucide-react'
import { api } from './api'
import { toPersianDigits } from '../utils/toPersianDigits'
import { toEnglishDigits } from '../utils/jalali'

function parseNumberInput(raw) {
  if (raw === null || raw === undefined) return 0
  const clean = toEnglishDigits(String(raw)).replace(/[,،٬\s]/g, '')
  if (!clean) return 0
  const n = parseInt(clean, 10)
  return isNaN(n) ? 0 : n
}

function formatWithCommas(value) {
  if (value === null || value === undefined || value === '') return ''
  const clean = toEnglishDigits(String(value)).replace(/[,،٬\s]/g, '')
  if (!clean) return ''
  const parts = clean.split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '٬')
  return toPersianDigits(intPart)
}

function NumberInput({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  unit,
  disabled,
}) {
  const [localRaw, setLocalRaw] = useState(null)
  const [prevValue, setPrevValue] = useState(value)

  if (value !== prevValue) {
    setPrevValue(value)
    setLocalRaw(null)
  }

  const displayValue = localRaw !== null ? localRaw : formatWithCommas(value)

  const handleInputChange = (e) => {
    const raw = e.target.value
    // Convert to English digits and strip commas to check validity
    const cleanDigits = toEnglishDigits(raw).replace(/[,،٬\s]/g, '')
    if (cleanDigits !== '' && !/^\d+$/.test(cleanDigits)) {
      return
    }
    const num = cleanDigits === '' ? 0 : parseInt(cleanDigits, 10)
    setLocalRaw(cleanDigits === '' ? '' : formatWithCommas(cleanDigits))
    onChange(num)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[#111]">
        {label}
      </label>
      <div className="flex items-stretch h-11">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          dir="rtl"
          value={displayValue}
          onChange={handleInputChange}
          disabled={disabled}
          className={`flex-1 rounded-r-md border px-3 text-sm text-[#111] outline-none text-right transition-colors ${
            error
              ? 'border-[#B3261E] focus:border-[#B3261E]'
              : 'border-[#D9D9D6] bg-white focus:border-[#111]'
          }`}
        />
        <span className="flex items-center justify-center rounded-l-md border border-r-0 border-[#D9D9D6] bg-[#FAFAF8] px-3.5 text-xs text-[#6B6B6B] select-none min-w-[56px]">
          {unit}
        </span>
      </div>
      {hint && !error && (
        <p className="text-[11px] text-[#6B6B6B] leading-relaxed">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] text-[#B3261E] font-medium leading-relaxed" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default function StoreSettings() {
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  // Original saved values from server
  const [initialData, setInitialData] = useState({
    freeShippingThreshold: 5000000,
    standardFee: 0,
    expressFee: 500000,
    pendingOrderMinutes: 30,
  })

  // Form working values
  const [formData, setFormData] = useState({
    freeShippingThreshold: 5000000,
    standardFee: 0,
    expressFee: 500000,
    pendingOrderMinutes: 30,
  })

  const [fieldErrors, setFieldErrors] = useState({})

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const data = await api('/admin/settings/')
      const cleanData = {
        freeShippingThreshold: parseNumberInput(data.freeShippingThreshold),
        standardFee: parseNumberInput(data.standardFee),
        expressFee: parseNumberInput(data.expressFee),
        pendingOrderMinutes: parseNumberInput(data.pendingOrderMinutes),
      }
      setInitialData(cleanData)
      setFormData(cleanData)
      setFieldErrors({})
    } catch (err) {
      setFetchError(err.message || 'خطا در دریافت تنظیمات فروشگاه')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Check if form is dirty
  const isDirty =
    formData.freeShippingThreshold !== initialData.freeShippingThreshold ||
    formData.standardFee !== initialData.standardFee ||
    formData.expressFee !== initialData.expressFee ||
    formData.pendingOrderMinutes !== initialData.pendingOrderMinutes

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleReset = () => {
    setFormData(initialData)
    setFieldErrors({})
  }

  const validateClient = () => {
    const errors = {}
    if (formData.freeShippingThreshold < 0) {
      errors.freeShippingThreshold = 'حداقل خرید برای ارسال رایگان نمی‌تواند منفی باشد.'
    }
    if (formData.standardFee < 0) {
      errors.standardFee = 'هزینه ارسال عادی نمی‌تواند منفی باشد.'
    }
    if (formData.expressFee < 0) {
      errors.expressFee = 'هزینه ارسال اکسپرس نمی‌تواند منفی باشد.'
    }
    if (formData.pendingOrderMinutes < 5 || formData.pendingOrderMinutes > 1440) {
      errors.pendingOrderMinutes = 'مهلت پرداخت سفارش باید عددی بین ۵ تا ۱۴۴۰ دقیقه باشد.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!isDirty || saving) return
    if (!validateClient()) return

    setSaving(true)
    setFieldErrors({})
    try {
      const payload = {
        freeShippingThreshold: formData.freeShippingThreshold,
        standardFee: formData.standardFee,
        expressFee: formData.expressFee,
        pendingOrderMinutes: formData.pendingOrderMinutes,
      }
      const updated = await api('/admin/settings/', {
        method: 'PATCH',
        body: payload,
      })
      const cleanUpdated = {
        freeShippingThreshold: parseNumberInput(updated.freeShippingThreshold),
        standardFee: parseNumberInput(updated.standardFee),
        expressFee: parseNumberInput(updated.expressFee),
        pendingOrderMinutes: parseNumberInput(updated.pendingOrderMinutes),
      }
      setInitialData(cleanUpdated)
      setFormData(cleanUpdated)
      setToast('ذخیره شد')
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      setFieldErrors({ server: err.message || 'خطا در ذخیره تغییرات' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-[#ECECEC]" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[#ECECEC]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="rounded-[10px] border border-[#E4E4E2] bg-white p-6 space-y-6">
            <div className="h-6 w-32 animate-pulse rounded bg-[#ECECEC]" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-16 animate-pulse rounded bg-[#ECECEC]" />
              <div className="h-16 animate-pulse rounded bg-[#ECECEC]" />
              <div className="h-16 animate-pulse rounded bg-[#ECECEC]" />
            </div>
            <div className="h-6 w-32 animate-pulse rounded bg-[#ECECEC] pt-4" />
            <div className="h-16 w-72 animate-pulse rounded bg-[#ECECEC]" />
          </div>
          <div className="space-y-6">
            <div className="h-48 animate-pulse rounded-[10px] bg-white border border-[#E4E4E2]" />
            <div className="h-32 animate-pulse rounded-[10px] bg-white border border-[#E4E4E2]" />
          </div>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-bold text-[#111]">تنظیمات فروشگاه</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            هزینه ارسال و مهلت پرداخت را خودتان و بدون برنامه‌نویس تغییر دهید
          </p>
        </div>
        <div className="rounded-[10px] border border-[#E4E4E2] bg-white p-10 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-[#B3261E] mb-2" />
          <p className="text-sm text-[#B3261E]">{fetchError}</p>
          <button
            type="button"
            onClick={loadSettings}
            className="mt-4 rounded-full border-[1.5px] border-black px-5 py-2 text-sm font-semibold text-black hover:bg-black hover:text-white inline-flex items-center gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            تلاش مجدد
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed top-6 start-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-[#1F6B34] px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in"
        >
          <Check className="h-4 w-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold text-[#111]">تنظیمات فروشگاه</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          هزینه ارسال و مهلت پرداخت را خودتان و بدون برنامه‌نویس تغییر دهید
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Main Column: Form Card */}
        <form
          onSubmit={handleSave}
          className="rounded-[10px] border border-[#E4E4E2] bg-white overflow-hidden shadow-sm"
        >
          {fieldErrors.server && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-[#B3261E] text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{fieldErrors.server}</span>
            </div>
          )}

          <div className="divide-y divide-[#E4E4E2]">
            {/* Section 1: ارسال */}
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#111]">ارسال</h2>
                <p className="mt-0.5 text-xs text-[#6B6B6B]">
                  این مقادیر در سبد خرید و صفحه پرداخت به مشتری نشان داده می‌شود.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="md:col-span-2">
                  <NumberInput
                    id="freeShippingThreshold"
                    label="حداقل خرید برای ارسال رایگان"
                    value={formData.freeShippingThreshold}
                    onChange={(val) => handleFieldChange('freeShippingThreshold', val)}
                    hint="ارسال عادی برای سفارش‌های بالاتر از این مبلغ رایگان می‌شود."
                    unit="تومان"
                    error={fieldErrors.freeShippingThreshold}
                  />
                </div>
                <div>
                  <NumberInput
                    id="standardFee"
                    label="هزینه ارسال عادی"
                    value={formData.standardFee}
                    onChange={(val) => handleFieldChange('standardFee', val)}
                    hint="عدد ۰ یعنی ارسال عادی همیشه رایگان است."
                    unit="تومان"
                    error={fieldErrors.standardFee}
                  />
                </div>
                <div>
                  <NumberInput
                    id="expressFee"
                    label="هزینه ارسال اکسپرس"
                    value={formData.expressFee}
                    onChange={(val) => handleFieldChange('expressFee', val)}
                    hint="اکسپرس حتی بالاتر از مبلغ ارسال رایگان هم دریافت می‌شود."
                    unit="تومان"
                    error={fieldErrors.expressFee}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: پرداخت */}
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#111]">پرداخت</h2>
                <p className="mt-0.5 text-xs text-[#6B6B6B]">
                  تنظیم مهلت اعتبار تراکنش و نگهداری سفارش پیش از پرداخت.
                </p>
              </div>

              <div className="max-w-[360px] pt-1">
                <NumberInput
                  id="pendingOrderMinutes"
                  label="مهلت پرداخت سفارش"
                  value={formData.pendingOrderMinutes}
                  onChange={(val) => handleFieldChange('pendingOrderMinutes', val)}
                  hint="بعد از این مدت، سفارش پرداخت‌نشده خودکار لغو و موجودی آزاد می‌شود."
                  unit="دقیقه"
                  error={fieldErrors.pendingOrderMinutes}
                />
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="bg-[#FAFAF9] border-t border-[#E4E4E2] px-6 py-4 flex items-center justify-between flex-wrap gap-4">
            {/* Right: Status text */}
            <div className="flex items-center gap-1.5 text-xs">
              {!isDirty ? (
                <span className="flex items-center gap-1.5 text-[#1F6B34] font-medium">
                  <Check className="h-4 w-4" />
                  همه تغییرات ذخیره شده است
                </span>
              ) : (
                <span className="text-[#A52A22] font-medium">
                  تغییرات ذخیره‌نشده
                </span>
              )}
            </div>

            {/* Left: Action buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleReset}
                disabled={!isDirty || saving}
                className="h-11 rounded-md border-[1.5px] border-[#D9D9D6] px-4 text-sm font-semibold text-[#111] hover:bg-[#F2F2EF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                بازگردانی
              </button>
              <button
                type="submit"
                disabled={!isDirty || saving}
                className="h-11 rounded-md bg-[#111] px-5 text-sm font-semibold text-white hover:bg-[#222] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                <span>{saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Side Column: Live Customer Preview & Tips */}
        <div className="space-y-6">
          {/* Live Customer Preview Card */}
          <div className="rounded-[10px] border border-[#E4E4E2] bg-white p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#E4E4E2] pb-3">
              <Truck className="h-4 w-4 text-[#111]" />
              <h3 className="text-sm font-bold text-[#111]">پیش‌نمایش برای مشتری</h3>
            </div>

            <div className="space-y-3 text-xs">
              {/* Normal Shipping Row */}
              <div className="rounded-lg border border-[#E6E6E3] bg-[#FAFAF8] p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#111]">ارسال عادی</p>
                  <p className="mt-0.5 text-[11px] text-[#1F6B34] font-medium">
                    رایگان برای خرید بالای {toPersianDigits(formatWithCommas(formData.freeShippingThreshold))} تومان
                  </p>
                </div>
                <div className="font-bold text-[#111] whitespace-nowrap">
                  {formData.standardFee === 0 ? (
                    <span className="text-[#1F6B34]">رایگان</span>
                  ) : (
                    <span>{toPersianDigits(formatWithCommas(formData.standardFee))} تومان</span>
                  )}
                </div>
              </div>

              {/* Express Shipping Row */}
              <div className="rounded-lg border border-[#E6E6E3] bg-[#FAFAF8] p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#111]">ارسال اکسپرس</p>
                  <p className="mt-0.5 text-[11px] text-[#6B6B6B]">تحویل سریع ظرف ۱ تا ۲ روز کاری</p>
                </div>
                <div className="font-bold text-[#111] whitespace-nowrap">
                  {formData.expressFee === 0 ? (
                    <span className="text-[#1F6B34]">رایگان</span>
                  ) : (
                    <span>{toPersianDigits(formatWithCommas(formData.expressFee))} تومان</span>
                  )}
                </div>
              </div>

              {/* Order Expiration Yellow Box */}
              <div className="rounded-lg border border-[#F8E7A2] bg-[#FEF9E7] p-3 text-[#634A00] flex items-center gap-2 leading-relaxed">
                <Clock className="h-4 w-4 flex-shrink-0 text-[#B88700]" />
                <span>
                  تا {toPersianDigits(formData.pendingOrderMinutes)} دقیقه برای تکمیل پرداخت فرصت دارید.
                </span>
              </div>
            </div>
          </div>

          {/* Tips Card: خوب است بدانید */}
          <div className="rounded-[10px] border border-[#E4E4E2] bg-white p-5 space-y-3 shadow-sm text-xs">
            <div className="flex items-center gap-2 border-b border-[#E4E4E2] pb-3">
              <Info className="h-4 w-4 text-[#111]" />
              <h3 className="text-sm font-bold text-[#111]">خوب است بدانید</h3>
            </div>
            <ul className="space-y-2.5 text-[#555] leading-relaxed list-disc pr-4">
              <li>تغییرات تنها روی سفارش‌های جدید اعمال می‌شوند و سفارش‌های قبلی دست‌نخورده باقی می‌مانند.</li>
              <li>مبالغ به تومان و بدون رقم اعشار هستند.</li>
              <li>مقادیر منفی یا خالی پذیرفته نمی‌شوند.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
