import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  Copy,
  Check,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  Sparkles,
  Ticket,
} from 'lucide-react'
import { api } from './api'
import { formatNumber } from '../utils/format'
import { toPersianDigits } from '../utils/toPersianDigits'
import {
  toEnglishDigits,
  validateJalaliDate,
  parseJalaliDateToISO,
  formatJalaliDate,
} from '../utils/jalali'

const STATUS_STYLES = {
  active: 'bg-[#e3f3e6] text-[#1f6b34]',
  inactive: 'bg-[#ececea] text-[#444]',
  expired: 'bg-[#fde7e5] text-[#a52a22]',
  exhausted: 'bg-[#fcc934] text-[#2b2100]',
}

const STATUS_LABELS = {
  active: 'فعال',
  inactive: 'غیرفعال',
  expired: 'منقضی شد',
  exhausted: 'سقف پُر شد',
}

const QUICK_PERCENT_CHIPS = [5, 10, 15, 20, 30]

function generateRandomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function Switch({ checked, onChange, disabled, ariaLabel, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      dir="ltr"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-[#111]' : 'bg-[#D9D9D6]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-t border-[#EEE] h-[76px]">
          <td className="px-4 py-3">
            <div className="h-6 w-24 animate-pulse rounded bg-[#ECECEC]" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-10 animate-pulse rounded bg-[#ECECEC]" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-20 animate-pulse rounded bg-[#ECECEC] mb-1.5" />
            <div className="h-1.5 w-24 animate-pulse rounded-full bg-[#ECECEC]" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-20 animate-pulse rounded bg-[#ECECEC]" />
          </td>
          <td className="px-4 py-3">
            <div className="h-6 w-16 animate-pulse rounded-full bg-[#ECECEC]" />
          </td>
          <td className="px-4 py-3">
            <div className="h-6 w-11 animate-pulse rounded-full bg-[#ECECEC]" />
          </td>
          <td className="px-4 py-3">
            <div className="h-7 w-14 animate-pulse rounded-full bg-[#ECECEC]" />
          </td>
        </tr>
      ))}
    </>
  )
}

export default function CouponsList() {
  const [searchParams, setSearchParams] = useSearchParams()

  const statusFilter = searchParams.get('status') || 'all'
  const searchQuery = searchParams.get('search') || ''
  const currentPage = parseInt(searchParams.get('page') || '1', 10)

  const [searchInput, setSearchInput] = useState(searchQuery)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [coupons, setCoupons] = useState([])
  const [counts, setCounts] = useState({ all: 0, active: 0, inactive: 0, expired: 0 })
  const [summary, setSummary] = useState({ total: 0, active: 0, totalUses: 0, expiredOrFull: 0 })
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 })

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState(null)
  const copyTimerRef = useRef(null)

  // Toggle in table optimistic state / loading
  const [togglingId, setTogglingId] = useState(null)

  // Toast
  const [toast, setToast] = useState(null) // { type: 'success' | 'error', message: string }
  const toastTimerRef = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ message, type })
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
    }, 3000)
  }, [])

  // Form panel state
  const formRef = useRef(null)
  const codeInputRef = useRef(null)
  const [editingCoupon, setEditingCoupon] = useState(null) // null = create mode, object = edit mode
  const [formCode, setFormCode] = useState('')
  const [formPercent, setFormPercent] = useState('10')
  const [formNoExpiry, setFormNoExpiry] = useState(true)
  const [formExpiresAtInput, setFormExpiresAtInput] = useState('')
  const [formUnlimited, setFormUnlimited] = useState(true)
  const [formUsageLimit, setFormUsageLimit] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formErrors, setFormErrors] = useState({})
  const [formGeneralError, setFormGeneralError] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Sync search input if URL changed externally
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery)
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery)
    setSearchInput(searchQuery)
  }

  // Debounce search query update into URL params
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          if (searchInput.trim()) {
            next.set('search', searchInput.trim())
          } else {
            next.delete('search')
          }
          next.delete('page')
          return next
        }, { replace: true })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, searchQuery, setSearchParams])

  // Fetch coupons from backend
  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (searchQuery) {
        params.set('search', searchQuery)
      }
      if (currentPage > 1) {
        params.set('page', String(currentPage))
      }
      const q = params.toString() ? `?${params.toString()}` : ''
      const data = await api(`/admin/coupons/${q}`)
      setCoupons(data.results || [])
      if (data.counts) setCounts(data.counts)
      if (data.summary) setSummary(data.summary)
      setPagination({
        page: data.page || 1,
        pageSize: data.pageSize || 10,
        total: data.total || 0,
        totalPages: data.totalPages || 1,
      })
    } catch (err) {
      setFetchError(err.message || 'خطا در بارگذاری کدهای تخفیف')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery, currentPage])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  // Tab change
  const handleTabChange = (newStatus) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (newStatus === 'all') {
        next.delete('status')
      } else {
        next.set('status', newStatus)
      }
      next.delete('page')
      return next
    })
  }

  // Pagination change
  const handlePageChange = (newPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (newPage <= 1) {
        next.delete('page')
      } else {
        next.set('page', String(newPage))
      }
      return next
    })
  }

  // Copy code to clipboard
  const handleCopyCode = (id, code) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code)
    }
    setCopiedId(id)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => {
      setCopiedId(null)
    }, 1500)
  }

  // Quick switch active/inactive in table
  const handleToggleActive = async (coupon) => {
    if (togglingId) return
    const newIsActive = !coupon.isActive
    setTogglingId(coupon.id)

    // Optimistic update
    setCoupons((prev) =>
      prev.map((c) =>
        c.id === coupon.id
          ? {
              ...c,
              isActive: newIsActive,
              status: !newIsActive
                ? 'inactive'
                : c.expiresAt && new Date(c.expiresAt) < new Date()
                ? 'expired'
                : c.usageLimit !== null && c.usedCount >= c.usageLimit
                ? 'exhausted'
                : 'active',
            }
          : c
      )
    )

    try {
      await api(`/admin/coupons/${coupon.id}/`, {
        method: 'PATCH',
        body: { isActive: newIsActive },
      })
      showToast(newIsActive ? 'کد تخفیف فعال شد' : 'کد تخفیف غیرفعال شد', 'success')
      // Refresh counts quietly
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (currentPage > 1) params.set('page', String(currentPage))
      const q = params.toString() ? `?${params.toString()}` : ''
      const data = await api(`/admin/coupons/${q}`)
      if (data.counts) setCounts(data.counts)
      if (data.summary) setSummary(data.summary)
    } catch (err) {
      // Revert optimistic update
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: coupon.isActive, status: coupon.status } : c))
      )
      showToast(err.message || 'خطا در تغییر وضعیت کد تخفیف', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  // Reset form to create mode
  const resetForm = () => {
    setEditingCoupon(null)
    setFormCode('')
    setFormPercent('10')
    setFormNoExpiry(true)
    setFormExpiresAtInput('')
    setFormUnlimited(true)
    setFormUsageLimit('')
    setFormIsActive(true)
    setFormErrors({})
    setFormGeneralError('')
  }

  // Start edit mode
  const handleStartEdit = (coupon) => {
    setEditingCoupon(coupon)
    setFormCode(coupon.code || '')
    setFormPercent(String(coupon.percent || ''))
    if (coupon.expiresAt) {
      setFormNoExpiry(false)
      setFormExpiresAtInput(formatJalaliDate(coupon.expiresAt))
    } else {
      setFormNoExpiry(true)
      setFormExpiresAtInput('')
    }
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
      setFormUnlimited(false)
      setFormUsageLimit(String(coupon.usageLimit))
    } else {
      setFormUnlimited(true)
      setFormUsageLimit('')
    }
    setFormIsActive(Boolean(coupon.isActive))
    setFormErrors({})
    setFormGeneralError('')

    // Smooth scroll to form on mobile
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Handle "+ کد تخفیف جدید" button in header
  const handleNewCouponClick = () => {
    resetForm()
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setTimeout(() => {
      codeInputRef.current?.focus()
    }, 100)
  }

  // Auto-generate code
  const handleGenerateCode = () => {
    const code = generateRandomCode()
    setFormCode(code)
    if (formErrors.code) {
      setFormErrors((prev) => ({ ...prev, code: '' }))
    }
  }

  // Submit form (create or edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormGeneralError('')
    const errors = {}

    // 1. Validate Code
    const cleanCode = toEnglishDigits(formCode.trim()).toUpperCase()
    if (!cleanCode) {
      errors.code = 'کد تخفیف الزامی است.'
    } else if (cleanCode.length < 3 || cleanCode.length > 32) {
      errors.code = 'کد باید بین ۳ تا ۳۲ کاراکتر باشد.'
    } else if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
      errors.code = 'فقط حروف انگلیسی، اعداد، خط فاصله (-) و زیرخط (_) مجاز است.'
    }

    // 2. Validate Percent
    const cleanPercent = toEnglishDigits(String(formPercent)).replace(/\D/g, '')
    const percentNum = parseInt(cleanPercent, 10)
    if (!cleanPercent || isNaN(percentNum)) {
      errors.percent = 'درصد تخفیف الزامی است.'
    } else if (percentNum < 1 || percentNum > 100) {
      errors.percent = 'درصد تخفیف باید بین ۱ تا ۱۰۰ باشد.'
    }

    // 3. Validate Expiration
    let parsedExpiresAt = null
    if (!formNoExpiry) {
      const dateStr = formExpiresAtInput.trim()
      if (!dateStr) {
        errors.expiresAt = 'تاریخ انقضا را وارد کنید یا گزینه «بدون تاریخ انقضا» را علامت بزنید.'
      } else if (!validateJalaliDate(dateStr)) {
        errors.expiresAt = 'فرمت تاریخ معتبر نیست (مثال: ۱۴۰۵/۱۰/۱۵).'
      } else {
        parsedExpiresAt = parseJalaliDateToISO(dateStr)
        if (!parsedExpiresAt) {
          errors.expiresAt = 'فرمت تاریخ معتبر نیست.'
        } else if (!editingCoupon && new Date(parsedExpiresAt) < new Date()) {
          errors.expiresAt = 'تاریخ انقضا نمی‌تواند در گذشته باشد.'
        }
      }
    }

    // 4. Validate Usage Limit
    let parsedUsageLimit = null
    if (!formUnlimited) {
      const cleanLimit = toEnglishDigits(String(formUsageLimit)).replace(/\D/g, '')
      const limitNum = parseInt(cleanLimit, 10)
      if (!cleanLimit || isNaN(limitNum) || limitNum < 1) {
        errors.usageLimit = 'سقف استفاده باید حداقل ۱ باشد.'
      } else if (
        editingCoupon &&
        editingCoupon.usedCount > 0 &&
        limitNum < editingCoupon.usedCount
      ) {
        errors.usageLimit = `سقف استفاده نمی‌تواند کمتر از تعداد استفاده شده (${toPersianDigits(
          editingCoupon.usedCount
        )}) باشد.`
      } else {
        parsedUsageLimit = limitNum
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    setFormSubmitting(true)

    const payload = {
      code: cleanCode,
      percent: percentNum,
      isActive: formIsActive,
      expiresAt: parsedExpiresAt,
      usageLimit: parsedUsageLimit,
    }

    try {
      if (editingCoupon) {
        await api(`/admin/coupons/${editingCoupon.id}/`, {
          method: 'PATCH',
          body: payload,
        })
        showToast('تغییرات کد تخفیف با موفقیت ذخیره شد', 'success')
      } else {
        await api('/admin/coupons/', {
          method: 'POST',
          body: payload,
        })
        showToast('کد تخفیف جدید با موفقیت ساخته شد', 'success')
      }

      resetForm()
      await fetchCoupons()
    } catch (err) {
      setFormGeneralError(err.message || 'خطا در ذخیره کد تخفیف')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Live preview calculation for 10,000,000 Toman basket
  const liveDiscountAmount = useMemo(() => {
    const p = parseInt(toEnglishDigits(String(formPercent)).replace(/\D/g, ''), 10)
    if (isNaN(p) || p <= 0) return 0
    return Math.floor((10000000 * Math.min(100, p)) / 100)
  }, [formPercent])

  // Calculate start and end index for footer
  const startItem = pagination.total > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.total)

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      {/* Toast */}
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

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111] sm:text-2xl">کدهای تخفیف</h1>
          <p className="mt-1 text-xs text-[#6B6B6B] sm:text-sm">
            ساخت، فعال و غیرفعال کردن کوپن‌های درصدی
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewCouponClick}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#111] px-4 text-sm font-medium text-white transition-colors hover:bg-black"
        >
          <Plus className="h-4 w-4" />
          <span>کد تخفیف جدید</span>
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Card 1: Total */}
        <div className="flex flex-col justify-between rounded-[10px] border border-[#E4E4E2] bg-white p-4 sm:p-5">
          <span className="text-xs font-medium text-[#6B6B6B]">کل کدها</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#111]">
              {toPersianDigits(formatNumber(summary.total))}
            </span>
            <span className="text-xs text-[#6B6B6B]">کد</span>
          </div>
        </div>

        {/* Card 2: Active */}
        <div className="flex flex-col justify-between rounded-[10px] border border-[#E4E4E2] bg-white p-4 sm:p-5">
          <span className="text-xs font-medium text-[#6B6B6B]">کدهای فعال</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#1f6b34]">
              {toPersianDigits(formatNumber(summary.active))}
            </span>
            <span className="text-xs text-[#6B6B6B]">کد</span>
          </div>
        </div>

        {/* Card 3: Total Uses */}
        <div className="flex flex-col justify-between rounded-[10px] border border-[#E4E4E2] bg-white p-4 sm:p-5">
          <span className="text-xs font-medium text-[#6B6B6B]">مجموع استفاده‌ها</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#111]">
              {toPersianDigits(formatNumber(summary.totalUses))}
            </span>
            <span className="text-xs text-[#6B6B6B]">بار</span>
          </div>
        </div>

        {/* Card 4: Expired or Full */}
        <div className="flex flex-col justify-between rounded-[10px] border border-[#E4E4E2] bg-white p-4 sm:p-5">
          <span className="text-xs font-medium text-[#6B6B6B]">منقضی یا پُر شده</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#a52a22]">
              {toPersianDigits(formatNumber(summary.expiredOrFull))}
            </span>
            <span className="text-xs text-[#6B6B6B]">کد</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Pill Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#111] text-white font-semibold'
                : 'border border-[#E4E4E2] bg-white text-[#555] hover:bg-[#FAFAF8]'
            }`}
          >
            <span>همه</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-[#F0F0EE] text-[#555]'
              }`}
            >
              {toPersianDigits(counts.all)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('active')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'active'
                ? 'bg-[#111] text-white font-semibold'
                : 'border border-[#E4E4E2] bg-white text-[#555] hover:bg-[#FAFAF8]'
            }`}
          >
            <span>فعال</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                statusFilter === 'active' ? 'bg-white/20 text-white' : 'bg-[#F0F0EE] text-[#555]'
              }`}
            >
              {toPersianDigits(counts.active)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('inactive')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'inactive'
                ? 'bg-[#111] text-white font-semibold'
                : 'border border-[#E4E4E2] bg-white text-[#555] hover:bg-[#FAFAF8]'
            }`}
          >
            <span>غیرفعال</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                statusFilter === 'inactive' ? 'bg-white/20 text-white' : 'bg-[#F0F0EE] text-[#555]'
              }`}
            >
              {toPersianDigits(counts.inactive)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('expired')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'expired'
                ? 'bg-[#111] text-white font-semibold'
                : 'border border-[#E4E4E2] bg-white text-[#555] hover:bg-[#FAFAF8]'
            }`}
          >
            <span>منقضی یا پُر</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                statusFilter === 'expired' ? 'bg-white/20 text-white' : 'bg-[#F0F0EE] text-[#555]'
              }`}
            >
              {toPersianDigits(counts.expired)}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            dir="rtl"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="جستجوی کد تخفیف..."
            className="h-10 w-full rounded-md border border-[#D9D9D6] bg-white pr-9 pl-3 text-xs text-[#111] outline-none transition-colors focus:border-[#111] placeholder:text-[#999]"
          />
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888]" />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#888] hover:text-[#111]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Content */}
      <div className="flex flex-col items-start gap-6 lg:flex-row">
        {/* Wide Column: Coupons Table */}
        <div className="w-full min-w-0 flex-1">
          <div className="rounded-[10px] border border-[#E4E4E2] bg-white shadow-xs overflow-hidden">
            {/* Table or States */}
            {fetchError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="h-8 w-8 text-[#B3261E] mb-2" />
                <p className="text-sm font-medium text-[#111]">{fetchError}</p>
                <button
                  type="button"
                  onClick={fetchCoupons}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#111] px-4 py-2 text-xs font-medium text-white hover:bg-black"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  تلاش مجدد
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E2] bg-[#FAFAF8] text-[#6B6B6B]">
                      <th className="px-4 py-3.5 font-medium">کد</th>
                      <th className="px-4 py-3.5 font-medium">تخفیف</th>
                      <th className="px-4 py-3.5 font-medium">استفاده</th>
                      <th className="px-4 py-3.5 font-medium">انقضا</th>
                      <th className="px-4 py-3.5 font-medium">وضعیت</th>
                      <th className="px-4 py-3.5 font-medium text-center">فعال</th>
                      <th className="px-4 py-3.5 font-medium text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeletonRows />
                    ) : coupons.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-[#6B6B6B]">
                            <Ticket className="h-8 w-8 text-[#BBB]" />
                            <p className="text-sm font-medium text-[#111]">هیچ کد تخفیفی یافت نشد</p>
                            <p className="text-xs">
                              {searchQuery
                                ? 'با عبارت دیگری جستجو کنید یا فیلتر را تغییر دهید.'
                                : 'اولین کد تخفیف خود را از فرم روبرو اضافه کنید.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      coupons.map((coupon) => {
                        const statusStyle = STATUS_STYLES[coupon.status] || STATUS_STYLES.inactive
                        const statusLabel = STATUS_LABELS[coupon.status] || STATUS_LABELS.inactive
                        const isExpired = coupon.status === 'expired'
                        const isUnlimited =
                          coupon.usageLimit === null || coupon.usageLimit === undefined
                        const usageRatio =
                          !isUnlimited && coupon.usageLimit > 0
                            ? Math.min(100, Math.round((coupon.usedCount / coupon.usageLimit) * 100))
                            : 0

                        return (
                          <tr
                            key={coupon.id}
                            className={`border-t border-[#EEE] h-[76px] transition-colors hover:bg-[#FAFAF8]/80 ${
                              editingCoupon?.id === coupon.id ? 'bg-[#FAFAF8]' : ''
                            }`}
                          >
                            {/* 1. Code */}
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleCopyCode(coupon.id, coupon.code)}
                                className="inline-flex items-center gap-1.5 rounded border border-dashed border-[#BBB] bg-[#FAFAF8] px-2.5 py-1 text-xs font-mono font-bold text-[#111] hover:border-[#111] hover:bg-[#F2F2F0] transition-colors"
                                title="کلیک برای کپی"
                              >
                                <span dir="ltr">{coupon.code}</span>
                                {copiedId === coupon.id ? (
                                  <span className="text-[10px] text-[#1f6b34] font-sans font-medium flex items-center gap-0.5">
                                    <Check className="h-3 w-3" />
                                    کپی شد
                                  </span>
                                ) : (
                                  <Copy className="h-3 w-3 text-[#888]" />
                                )}
                              </button>
                            </td>

                            {/* 2. Percent */}
                            <td className="px-4 py-3">
                              <span className="text-sm font-bold text-[#111]">
                                {toPersianDigits(coupon.percent)}٪
                              </span>
                            </td>

                            {/* 3. Usage */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="text-xs text-[#333]">
                                  {isUnlimited ? (
                                    <>
                                      {toPersianDigits(coupon.usedCount)}{' '}
                                      <span className="text-[#888]">بار · نامحدود</span>
                                    </>
                                  ) : (
                                    <>
                                      {toPersianDigits(coupon.usedCount)}{' '}
                                      <span className="text-[#888]">
                                        از {toPersianDigits(coupon.usageLimit)}
                                      </span>
                                    </>
                                  )}
                                </span>
                                <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-[#E4E4E2]">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      coupon.status === 'exhausted' ? 'bg-[#fcc934]' : 'bg-[#111]'
                                    }`}
                                    style={{ width: `${usageRatio}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* 4. Expiry */}
                            <td className="px-4 py-3">
                              {coupon.expiresAt ? (
                                <span
                                  className={`text-xs ${
                                    isExpired ? 'font-medium text-[#a52a22]' : 'text-[#444]'
                                  }`}
                                >
                                  {formatJalaliDate(coupon.expiresAt)}
                                </span>
                              ) : (
                                <span className="text-xs text-[#888]">بدون انقضا</span>
                              )}
                            </td>

                            {/* 5. Status */}
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-full px-2.5 py-[3px] text-xs font-medium ${statusStyle}`}
                              >
                                {statusLabel}
                              </span>
                            </td>

                            {/* 6. Active Switch */}
                            <td className="px-4 py-3 text-center">
                              <Switch
                                checked={coupon.isActive}
                                disabled={togglingId === coupon.id}
                                onChange={() => handleToggleActive(coupon)}
                                ariaLabel={`تغییر وضعیت فعال بودن کد ${coupon.code}`}
                              />
                            </td>

                            {/* 7. Edit Button */}
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(coupon)}
                                className="rounded-full border border-[#D9D9D6] px-3 py-1 text-xs font-medium text-[#111] hover:border-[#111] hover:bg-[#FAFAF8] transition-colors"
                              >
                                ویرایش
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer Pagination */}
            {!loading && coupons.length > 0 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E4E4E2] bg-[#FAFAF8] px-4 py-3 sm:flex-row text-xs text-[#6B6B6B]">
                <span>
                  نمایش {toPersianDigits(startItem)} تا {toPersianDigits(endItem)} از{' '}
                  {toPersianDigits(pagination.total)} کد
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                    className="rounded border border-[#D9D9D6] bg-white px-3 py-1.5 text-xs text-[#111] transition-colors hover:border-[#111] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    قبلی
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                    className="rounded border border-[#D9D9D6] bg-white px-3 py-1.5 text-xs text-[#111] transition-colors hover:border-[#111] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    بعدی
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Narrow Column: Form Panel (Create / Edit) */}
        <div
          ref={formRef}
          className="w-full shrink-0 rounded-[10px] border border-[#E4E4E2] bg-white p-5 shadow-xs lg:w-[340px]"
        >
          <div className="border-b border-[#E4E4E2] pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111]">
                {editingCoupon ? 'ویرایش کد' : 'کد تخفیف جدید'}
              </h2>
              {editingCoupon && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-[#6B6B6B] hover:text-[#111] underline"
                >
                  حالت ایجاد
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-[#6B6B6B]">
              مشتری این کد را هنگام پرداخت وارد می‌کند.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="mt-4 flex flex-col gap-4 text-xs">
            {formGeneralError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md bg-[#FDE7E5] p-3 text-xs text-[#A52A22]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formGeneralError}</span>
              </div>
            )}

            {/* 1. Code */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="coupon-code" className="font-medium text-[#111]">
                  کد تخفیف
                </label>
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={Boolean(editingCoupon && editingCoupon.usedCount > 0)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#111] hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-3 w-3" />
                  تولید خودکار
                </button>
              </div>
              <input
                id="coupon-code"
                ref={codeInputRef}
                type="text"
                dir="ltr"
                value={formCode}
                onChange={(e) => {
                  setFormCode(e.target.value.toUpperCase())
                  if (formErrors.code) setFormErrors((prev) => ({ ...prev, code: '' }))
                }}
                disabled={Boolean(editingCoupon && editingCoupon.usedCount > 0)}
                placeholder="مثلاً LACHIN20"
                className={`h-10 rounded-md border px-3 font-mono text-sm tracking-wider uppercase outline-none transition-colors ${
                  editingCoupon && editingCoupon.usedCount > 0
                    ? 'border-[#D9D9D6] bg-[#FAFAF8] text-[#888] cursor-not-allowed'
                    : formErrors.code
                    ? 'border-[#B3261E] bg-white text-[#111] focus:border-[#B3261E]'
                    : 'border-[#D9D9D6] bg-white text-[#111] focus:border-[#111]'
                }`}
              />
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                {editingCoupon && editingCoupon.usedCount > 0
                  ? 'این کد قبلاً استفاده شده و به دلیل حفظ سوابق سفارش‌ها قابل تغییر نیست.'
                  : 'حروف انگلیسی و عدد؛ حروف بزرگ و کوچک فرقی ندارد.'}
              </p>
              {formErrors.code && (
                <p className="text-[11px] font-medium text-[#B3261E]" role="alert">
                  {formErrors.code}
                </p>
              )}
            </div>

            {/* 2. Percent */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="coupon-percent" className="font-medium text-[#111]">
                درصد تخفیف
              </label>
              <div className="flex items-stretch h-10">
                <input
                  id="coupon-percent"
                  type="text"
                  inputMode="numeric"
                  dir="rtl"
                  value={formPercent}
                  onChange={(e) => {
                    const clean = toEnglishDigits(e.target.value).replace(/\D/g, '')
                    setFormPercent(clean)
                    if (formErrors.percent) setFormErrors((prev) => ({ ...prev, percent: '' }))
                  }}
                  className={`flex-1 rounded-r-md border px-3 text-sm text-[#111] outline-none text-right transition-colors ${
                    formErrors.percent
                      ? 'border-[#B3261E] focus:border-[#B3261E]'
                      : 'border-[#D9D9D6] bg-white focus:border-[#111]'
                  }`}
                />
                <span className="flex items-center justify-center rounded-l-md border border-r-0 border-[#D9D9D6] bg-[#FAFAF8] px-3.5 text-xs text-[#6B6B6B] select-none min-w-[50px]">
                  درصد
                </span>
              </div>

              {/* Quick Percent Chips */}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {QUICK_PERCENT_CHIPS.map((chip) => {
                  const isSelected = parseInt(formPercent, 10) === chip
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setFormPercent(String(chip))
                        if (formErrors.percent) setFormErrors((prev) => ({ ...prev, percent: '' }))
                      }}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        isSelected
                          ? 'bg-[#111] text-white'
                          : 'border border-[#E4E4E2] bg-[#FAFAF8] text-[#555] hover:border-[#111]'
                      }`}
                    >
                      {toPersianDigits(chip)}٪
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">عددی بین ۱ تا ۱۰۰.</p>
              {formErrors.percent && (
                <p className="text-[11px] font-medium text-[#B3261E]" role="alert">
                  {formErrors.percent}
                </p>
              )}
            </div>

            {/* 3. Expiration Date */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="coupon-expires-at" className="font-medium text-[#111]">
                تاریخ انقضا
              </label>
              <input
                id="coupon-expires-at"
                type="text"
                dir="rtl"
                placeholder="مثلاً ۱۴۰۵/۱۰/۱۵"
                value={formExpiresAtInput}
                disabled={formNoExpiry}
                onChange={(e) => {
                  setFormExpiresAtInput(e.target.value)
                  if (formErrors.expiresAt) setFormErrors((prev) => ({ ...prev, expiresAt: '' }))
                }}
                className={`h-10 rounded-md border px-3 text-sm outline-none transition-colors ${
                  formNoExpiry
                    ? 'border-[#D9D9D6] bg-[#FAFAF8] text-[#888] cursor-not-allowed'
                    : formErrors.expiresAt
                    ? 'border-[#B3261E] bg-white text-[#111] focus:border-[#B3261E]'
                    : 'border-[#D9D9D6] bg-white text-[#111] focus:border-[#111]'
                }`}
              />
              <label className="mt-1 flex items-center gap-2 cursor-pointer text-[#444]">
                <input
                  type="checkbox"
                  checked={formNoExpiry}
                  onChange={(e) => {
                    setFormNoExpiry(e.target.checked)
                    if (e.target.checked) {
                      setFormExpiresAtInput('')
                      setFormErrors((prev) => ({ ...prev, expiresAt: '' }))
                    }
                  }}
                  className="h-4 w-4 accent-black"
                />
                <span className="text-xs">بدون تاریخ انقضا</span>
              </label>
              {formErrors.expiresAt && (
                <p className="text-[11px] font-medium text-[#B3261E]" role="alert">
                  {formErrors.expiresAt}
                </p>
              )}
            </div>

            {/* 4. Usage Limit */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="coupon-usage-limit" className="font-medium text-[#111]">
                سقف تعداد استفاده
              </label>
              <div className="flex items-stretch h-10">
                <input
                  id="coupon-usage-limit"
                  type="text"
                  inputMode="numeric"
                  dir="rtl"
                  disabled={formUnlimited}
                  placeholder="مثلاً ۱۰۰"
                  value={formUsageLimit}
                  onChange={(e) => {
                    const clean = toEnglishDigits(e.target.value).replace(/\D/g, '')
                    setFormUsageLimit(clean)
                    if (formErrors.usageLimit) setFormErrors((prev) => ({ ...prev, usageLimit: '' }))
                  }}
                  className={`flex-1 rounded-r-md border px-3 text-sm outline-none text-right transition-colors ${
                    formUnlimited
                      ? 'border-[#D9D9D6] bg-[#FAFAF8] text-[#888] cursor-not-allowed'
                      : formErrors.usageLimit
                      ? 'border-[#B3261E] bg-white text-[#111] focus:border-[#B3261E]'
                      : 'border-[#D9D9D6] bg-white text-[#111] focus:border-[#111]'
                  }`}
                />
                <span className="flex items-center justify-center rounded-l-md border border-r-0 border-[#D9D9D6] bg-[#FAFAF8] px-3.5 text-xs text-[#6B6B6B] select-none min-w-[50px]">
                  بار
                </span>
              </div>
              <label className="mt-1 flex items-center gap-2 cursor-pointer text-[#444]">
                <input
                  type="checkbox"
                  checked={formUnlimited}
                  onChange={(e) => {
                    setFormUnlimited(e.target.checked)
                    if (e.target.checked) {
                      setFormUsageLimit('')
                      setFormErrors((prev) => ({ ...prev, usageLimit: '' }))
                    }
                  }}
                  className="h-4 w-4 accent-black"
                />
                <span className="text-xs">نامحدود</span>
              </label>
              {formErrors.usageLimit && (
                <p className="text-[11px] font-medium text-[#B3261E]" role="alert">
                  {formErrors.usageLimit}
                </p>
              )}
            </div>

            {/* 5. Switch: Active after save */}
            <div className="flex items-center justify-between rounded-md border border-[#E4E4E2] bg-[#FAFAF8] p-3">
              <span className="font-medium text-[#111]">بعد از ذخیره فعال باشد</span>
              <Switch
                checked={formIsActive}
                onChange={setFormIsActive}
                ariaLabel="بعد از ذخیره فعال باشد"
              />
            </div>

            {/* 6. Live example box */}
            <div className="rounded-md border border-[#E4E4E2] bg-[#FAFAF8] p-3 text-xs leading-relaxed text-[#555]">
              <p className="font-medium text-[#111] mb-1">محاسبه آنلاین نمونه:</p>
              <p>
                سبد خرید ۱۰٬۰۰۰٬۰۰۰ تومان ← تخفیف{' '}
                <span className="font-bold text-[#1f6b34]">
                  {toPersianDigits(formatNumber(liveDiscountAmount))} تومان
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-[#888]">
                مبلغ پرداختی نهایی:{' '}
                {toPersianDigits(formatNumber(Math.max(0, 10000000 - liveDiscountAmount)))} تومان
              </p>
            </div>

            {/* 7. Action Buttons */}
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={formSubmitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#111] text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {formSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>در حال ذخیره...</span>
                  </>
                ) : (
                  <span>ذخیره کد تخفیف</span>
                )}
              </button>

              <button
                type="button"
                disabled={formSubmitting}
                onClick={resetForm}
                className="flex h-11 w-full items-center justify-center rounded-md border border-[#D9D9D6] bg-white text-sm font-medium text-[#111] transition-colors hover:border-[#111] hover:bg-[#FAFAF8]"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
