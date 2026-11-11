import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  MessageSquare,
  Search,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from './AuthContext'
import { fetchAdminReviews, updateAdminReview, deleteAdminReview } from '../api/reviews'
import { formatJalaliDate } from '../utils/jalali'
import { toPersianDigits } from '../utils/toPersianDigits'

export default function ReviewsList() {
  const { token } = useAuth()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [replyTextMap, setReplyTextMap] = useState({})
  const [actionLoadingMap, setActionLoadingMap] = useState({})
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const loadReviews = async () => {
    if (!token) return
    try {
      setLoading(true)
      const data = await fetchAdminReviews(statusFilter, searchTerm, token)
      setReviews(data)
    } catch {
      showToast('خطا در دریافت لیست نظرات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [statusFilter, token])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadReviews()
  }

  const handleStatusChange = async (id, newStatus) => {
    setActionLoadingMap((prev) => ({ ...prev, [id]: true }))
    try {
      await updateAdminReview(id, { status: newStatus }, token)
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      )
      showToast(`وضعیت نظر به «${newStatus === 'approved' ? 'تایید شده' : 'رد شده'}» تغییر کرد.`)
    } catch {
      showToast('خطا در تغییر وضعیت نظر')
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleSaveReply = async (id) => {
    const reply = replyTextMap[id] ?? ''
    setActionLoadingMap((prev) => ({ ...prev, [id]: true }))
    try {
      await updateAdminReview(id, { adminReply: reply }, token)
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, adminReply: reply } : r))
      )
      showToast('پاسخ با موفقیت ذخیره شد.')
    } catch {
      showToast('خطا در ثبت پاسخ')
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف دائمی این نظر اطمینان دارید؟')) return
    setActionLoadingMap((prev) => ({ ...prev, [id]: true }))
    try {
      await deleteAdminReview(id, token)
      setReviews((prev) => prev.filter((r) => r.id !== id))
      showToast('نظر حذف شد.')
    } catch {
      showToast('خطا در حذف نظر')
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [id]: false }))
    }
  }

  const totalReviews = reviews.length
  const pendingCount = reviews.filter((r) => r.status === 'pending').length
  const approvedCount = reviews.filter((r) => r.status === 'approved').length

  return (
    <div className="p-6 md:p-8" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 start-6 z-50 rounded-xl bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FFC83D]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#111] mb-1">
            مدیریت دیدگاه‌ها و امتیازها
          </h1>
          <p className="text-xs text-[#71717A]">
            بررسی و پاسخ به نظرات و رتبه‌بندی‌های ثبت شده کاربران روی محصولات
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <span className="text-xs text-[#71717A]">کل دیدگاه‌ها</span>
          <p className="mt-2 text-2xl font-bold text-black font-mono">
            {toPersianDigits(totalReviews)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <span className="text-xs text-[#71717A]">در انتظار تایید</span>
          <p className="mt-2 text-2xl font-bold text-amber-600 font-mono">
            {toPersianDigits(pendingCount)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <span className="text-xs text-[#71717A]">تایید و منتشر شده</span>
          <p className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
            {toPersianDigits(approvedCount)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1.5 p-1 bg-[#F4F4F5] rounded-full border border-neutral-200">
          {[
            { key: 'all', label: 'همه' },
            { key: 'pending', label: 'در انتظار تایید' },
            { key: 'approved', label: 'تایید شده' },
            { key: 'rejected', label: 'رد شده' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                statusFilter === tab.key
                  ? 'bg-white text-black shadow-sm'
                  : 'text-[#71717A] hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative min-w-[260px]">
          <input
            type="text"
            placeholder="جستجو در نظرات، نام یا محصول..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 rounded-full border border-neutral-300 bg-white px-4 pl-10 text-xs outline-none focus:border-black"
          />
          <button
            type="submit"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-neutral-500">
          در حال بارگذاری نظرات...
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-white border border-dashed border-neutral-200">
          <MessageSquare className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-black mb-1">هیچ نظری یافت نشد</p>
          <p className="text-xs text-neutral-500">
            برای این فیلتر نظری ثبت نشده است.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const isActing = actionLoadingMap[rev.id]
            const currentReply =
              replyTextMap[rev.id] !== undefined
                ? replyTextMap[rev.id]
                : rev.adminReply || ''

            return (
              <div
                key={rev.id}
                className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm space-y-4"
              >
                {/* Top Row: Product + Author + Date + Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/product/${rev.productSlug}`}
                      target="_blank"
                      className="font-bold text-sm text-black hover:underline flex items-center gap-1"
                    >
                      <span>{rev.productName}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                    </Link>
                    {rev.isVerifiedBuyer && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>خریدار تایید شده</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {formatJalaliDate(rev.createdAt)}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        rev.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : rev.status === 'rejected'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {rev.status === 'approved'
                        ? 'تایید شده'
                        : rev.status === 'rejected'
                        ? 'رد شده'
                        : 'در انتظار'}
                    </span>
                  </div>
                </div>

                {/* Rating + Author + Comment */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-neutral-800">
                      {rev.name}
                    </span>
                    <div className="flex items-center gap-0.5" dir="ltr">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={13}
                          className={
                            s <= rev.rating
                              ? 'fill-[#F5B731] text-[#F5B731]'
                              : 'text-neutral-300'
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {rev.title && (
                    <p className="text-xs font-bold text-black mb-1">
                      {rev.title}
                    </p>
                  )}
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {rev.comment}
                  </p>
                </div>

                {/* Admin Reply & Action Section */}
                <div className="pt-2 border-t border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Reply input */}
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="پاسخ ادمین / فروشگاه لاچین..."
                      value={currentReply}
                      onChange={(e) =>
                        setReplyTextMap((prev) => ({
                          ...prev,
                          [rev.id]: e.target.value,
                        }))
                      }
                      className="flex-1 h-9 rounded-lg border border-neutral-200 px-3 text-xs outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleSaveReply(rev.id)}
                      className="h-9 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-black transition-colors"
                    >
                      ثبت پاسخ
                    </button>
                  </div>

                  {/* Status buttons */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {rev.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => handleStatusChange(rev.id, 'approved')}
                        className="h-9 px-3.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تایید نظر</span>
                      </button>
                    )}

                    {rev.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => handleStatusChange(rev.id, 'rejected')}
                        className="h-9 px-3.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 flex items-center gap-1 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>رد نظر</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleDelete(rev.id)}
                      className="h-9 w-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                      title="حذف دائمی"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
