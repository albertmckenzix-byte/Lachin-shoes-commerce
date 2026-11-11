import { useState, useEffect } from 'react'
import { Star, CheckCircle2, MessageSquare, Send, AlertCircle, ChevronDown, Check } from 'lucide-react'
import { fetchProductReviews, submitProductReview } from '../../api/reviews'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'
import { formatJalaliDate } from '../../utils/jalali'
import { toPersianDigits } from '../../utils/toPersianDigits'

export default function ProductReviews({ product }) {
  const { customer, token, isAuthenticated, openAuthModal } = useCustomerAuth()
  const [data, setData] = useState({
    totalReviews: product?.reviewCount || 0,
    averageRating: product?.rating || 5.0,
    distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
    results: [],
  })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadReviews = async () => {
    if (!product?.slug) return
    try {
      setLoading(true)
      const res = await fetchProductReviews(product.slug)
      setData(res)
    } catch {
      // Fallback if network issue
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [product?.slug])

  // Pre-fill name if customer is logged in
  useEffect(() => {
    if (isAuthenticated && customer) {
      setName(`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.phone || '')
    }
  }, [isAuthenticated, customer])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSuccessMessage('')

    if (!comment.trim()) {
      setFormError('لطفاً متن دیدگاه خود را وارد کنید.')
      return
    }

    setSubmitting(true)
    try {
      await submitProductReview(
        product.slug,
        {
          name: name.trim() || undefined,
          rating,
          title: title.trim(),
          comment: comment.trim(),
        },
        token
      )

      setSuccessMessage('دیدگاه شما با موفقیت ثبت شد و نمایش داده شد.')
      setTitle('')
      setComment('')
      setShowForm(false)
      // Reload reviews and rating stats
      loadReviews()
    } catch (err) {
      setFormError(err.message || 'خطا در ثبت دیدگاه')
    } finally {
      setSubmitting(false)
    }
  }

  const total = data.totalReviews || 0
  const avg = data.averageRating || 5.0

  return (
    <section className="w-full mt-12 pt-10 border-t border-[#E5E5E5]" dir="rtl">
      {/* Heading & Summary Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-black tracking-tight mb-2">
            دیدگاه‌ها و امتیاز کاربران
          </h2>
          <p className="text-xs text-neutral-500">
            نظرات خریداران واقعی در مورد کفش {product.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm((prev) => !prev)
            setFormError('')
            setSuccessMessage('')
          }}
          className="h-11 px-6 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 active:scale-[0.98] transition-all self-start md:self-auto flex items-center gap-2 shadow-sm"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{showForm ? 'بستن فرم دیدگاه' : 'ثبت دیدگاه جدید'}</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div
          role="status"
          className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Review Submission Form */}
      {showForm && (
        <div className="mb-10 p-6 rounded-3xl bg-[#F9F9F8] border border-[#EBEBEB] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-black">دیدگاه خود را به اشتراک بگذارید</h3>
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => openAuthModal('otp')}
                className="text-xs text-neutral-600 hover:text-black underline"
              >
                برای ثبت دیدگاه با نشان خریدار تایید شده وارد شوید
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Star Rating Picker */}
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                امتیاز شما به این محصول:
              </label>
              <div className="flex items-center gap-1.5" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = hoverRating ? star <= hoverRating : star <= rating
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 text-neutral-300 hover:scale-110 transition-transform focus:outline-none"
                    >
                      <Star
                        size={26}
                        className={
                          filled
                            ? 'fill-[#F5B731] text-[#F5B731]'
                            : 'text-neutral-300'
                        }
                      />
                    </button>
                  )
                })}
                <span className="text-xs font-bold text-black mr-2 font-mono">
                  {toPersianDigits(hoverRating || rating)} از ۵
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  نام و نام خانوادگی
                </label>
                <input
                  type="text"
                  placeholder="مثلاً علی اکبری"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 bg-white border border-neutral-300 rounded-xl px-3 text-xs focus:border-black outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  عنوان دیدگاه (اختیاری)
                </label>
                <input
                  type="text"
                  placeholder="مثلاً فوق‌العاده راحت و باکیفیت"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-11 bg-white border border-neutral-300 rounded-xl px-3 text-xs focus:border-black outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                متن دیدگاه شما <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="تجربه خود از کیفیت، سایز و راحتی این کتونی را بنویسید..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-xs focus:border-black outline-none transition-all leading-relaxed"
              />
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-11 px-8 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-60 transition-all flex items-center gap-2 shadow-sm"
            >
              {submitting ? (
                <span>در حال ثبت...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 rotate-180" />
                  <span>ثبت و انتشار نظر</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Ratings Stats Card & Bars */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10 p-6 rounded-3xl bg-[#FAFAFA] border border-[#EBEBEB]">
        {/* Left/Score side */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-l border-neutral-200">
          <span className="text-5xl font-black text-black tracking-tight mb-2 font-mono">
            {toPersianDigits(avg.toFixed(1))}
          </span>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={18}
                className={
                  s <= Math.round(avg)
                    ? 'fill-[#F5B731] text-[#F5B731]'
                    : 'text-neutral-300'
                }
              />
            ))}
          </div>
          <p className="text-xs text-neutral-500">
            بر اساس {toPersianDigits(total)} دیدگاه تایید شده
          </p>
        </div>

        {/* Right/Distribution bars */}
        <div className="md:col-span-8 flex flex-col justify-center space-y-2.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            const starCount = data.distribution?.[String(stars)] || 0
            const percentage = total > 0 ? Math.round((starCount / total) * 100) : 0
            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <span className="w-12 text-neutral-600 font-semibold font-mono flex items-center gap-1">
                  <span>{toPersianDigits(stars)}</span>
                  <Star size={12} className="fill-[#F5B731] text-[#F5B731]" />
                </span>
                <div className="flex-1 h-2 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className="h-full bg-black rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-10 text-neutral-400 font-mono text-left">
                  %{toPersianDigits(percentage)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {data.results && data.results.length > 0 ? (
          data.results.map((rev) => (
            <div
              key={rev.id}
              className="p-5 rounded-2xl bg-white border border-[#EBEBEB] space-y-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-black">{rev.name}</span>
                  {rev.isVerifiedBuyer && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                      <Check className="w-3 h-3" />
                      <span>خریدار این محصول</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  <div className="flex items-center gap-0.5" dir="ltr">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className={
                          s <= rev.rating
                            ? 'fill-[#F5B731] text-[#F5B731]'
                            : 'text-neutral-300'
                        }
                      />
                    ))}
                  </div>
                  <span className="font-mono">{formatJalaliDate(rev.createdAt)}</span>
                </div>
              </div>

              {rev.title && (
                <h4 className="text-xs font-bold text-black">{rev.title}</h4>
              )}

              <p className="text-xs text-neutral-600 leading-relaxed">{rev.comment}</p>

              {/* Admin Reply */}
              {rev.adminReply && (
                <div className="p-3.5 rounded-xl bg-neutral-50 border-r-2 border-black space-y-1 text-xs">
                  <p className="font-bold text-black">پاسخ پشتیبانی کفش لاچین:</p>
                  <p className="text-neutral-600 leading-relaxed">{rev.adminReply}</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 rounded-3xl bg-neutral-50 border border-dashed border-neutral-200">
            <MessageSquare className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-black mb-1">
              هنوز دیدگاهی برای این محصول ثبت نشده است
            </p>
            <p className="text-xs text-neutral-500 mb-4">
              شما اولین نفری باشید که تجربه خود را با دیگران به اشتراک می‌گذارد.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="h-10 px-6 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-all"
            >
              ثبت اولین دیدگاه
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
