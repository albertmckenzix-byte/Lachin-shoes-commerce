import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Star, Trash2, ImagePlus } from 'lucide-react'
import { api } from '../api'

const ACCEPTED = 'image/jpeg,image/png,image/webp'
const MAX_IMAGES = 6

export default function ImageManager({ productId, images, onImagesChange }) {
  const fileInputRef = useRef(null)
  const [pending, setPending] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const sorted = [...images].sort((a, b) => a.position - b.position)

  const uploadFiles = async (fileList) => {
    if (!productId) return
    const files = Array.from(fileList).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )
    const remaining = MAX_IMAGES - sorted.length - pending
    const toUpload = files.slice(0, Math.max(0, remaining))
    for (const file of toUpload) {
      setPending((n) => n + 1)
      setError('')
      try {
        const formData = new FormData()
        formData.append('image', file)
        const created = await api(`/admin/products/${productId}/images/`, {
          method: 'POST',
          body: formData,
        })
        onImagesChange((prev) =>
          [...prev, created].sort((a, b) => a.position - b.position)
        )
      } catch (err) {
        setError(err.message || 'خطا در آپلود تصویر')
      } finally {
        setPending((n) => n - 1)
      }
    }
  }

  const handleDelete = async (image) => {
    setBusyId(image.id)
    setError('')
    try {
      await api(`/admin/products/${productId}/images/${image.id}/`, {
        method: 'DELETE',
      })
      onImagesChange((prev) => prev.filter((i) => i.id !== image.id))
    } catch (err) {
      setError(err.message || 'خطا در حذف تصویر')
    } finally {
      setBusyId(null)
    }
  }

  const applyOrder = async (orderedIds) => {
    setBusyId('reorder')
    setError('')
    try {
      const result = await api(
        `/admin/products/${productId}/images/reorder/`,
        { method: 'POST', body: { order: orderedIds } }
      )
      onImagesChange(result)
    } catch (err) {
      setError(err.message || 'خطا در تغییر ترتیب تصاویر')
    } finally {
      setBusyId(null)
    }
  }

  const move = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= sorted.length) return
    const ids = sorted.map((i) => i.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    applyOrder(ids)
  }

  const makeMain = (index) => {
    if (index === 0) return
    const ids = sorted.map((i) => i.id)
    const [first] = ids.splice(index, 1)
    ids.unshift(first)
    applyOrder(ids)
  }

  return (
    <div>
      <div className="flex flex-wrap items-start gap-3">
        {sorted.map((image, index) => (
          <div
            key={image.id}
            className="relative h-[130px] w-[130px] overflow-hidden rounded-md bg-[#ECECEA]"
          >
            <img
              src={image.url}
              alt={`تصویر ${index + 1}`}
              className="h-full w-full object-contain"
            />
            {index === 0 && (
              <span className="absolute top-1 start-1 rounded-sm bg-[#FFC83D] px-1.5 py-0.5 text-[10px] font-semibold text-black">
                تصویر اصلی
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/50 py-1">
              <button
                type="button"
                aria-label="انتقال به ابتدا"
                title="تصویر اصلی"
                disabled={busyId !== null}
                onClick={() => makeMain(index)}
                className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-40"
              >
                <Star size={13} fill={index === 0 ? '#FFC83D' : 'none'} />
              </button>
              <button
                type="button"
                aria-label="انتقال به راست"
                disabled={busyId !== null || index === 0}
                onClick={() => move(index, -1)}
                className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-40"
              >
                <ArrowRight size={13} />
              </button>
              <button
                type="button"
                aria-label="انتقال به چپ"
                disabled={busyId !== null || index === sorted.length - 1}
                onClick={() => move(index, 1)}
                className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-40"
              >
                <ArrowLeft size={13} />
              </button>
              <button
                type="button"
                aria-label="حذف"
                disabled={busyId !== null}
                onClick={() => handleDelete(image)}
                className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-40"
              >
                <Trash2 size={13} />
              </button>
            </div>
            {busyId === image.id && (
              <div className="absolute inset-0 bg-white/60" />
            )}
          </div>
        ))}
        {Array.from({ length: pending }).map((_, i) => (
          <div
            key={`pending-${i}`}
            className="h-[130px] w-[130px] animate-pulse rounded-md bg-[#ECECEA]"
          />
        ))}
        {productId ? (
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              uploadFiles(e.dataTransfer.files)
            }}
            className={`flex h-[130px] w-[130px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed text-sm ${
              dragOver
                ? 'border-[#111] bg-[#F0F0EC] text-[#111]'
                : 'border-[#999] text-[#6B6B6B] hover:border-[#111] hover:text-[#111]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              multiple
              className="hidden"
              onChange={(e) => {
                uploadFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <ImagePlus size={22} />
            افزودن تصویر
          </label>
        ) : (
          <div className="flex h-[130px] w-[130px] flex-col items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed border-[#999] text-sm text-[#6B6B6B]">
            <ImagePlus size={22} />
            ابتدا محصول را ذخیره کنید
          </div>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-[#B3261E]">{error}</p>}
      <p className="mt-3 text-[13px] text-[#6B6B6B]">
        فرمت‌های JPG، PNG و WebP، حداکثر ۵ مگابایت، نسبت پیشنهادی ۳:۴.
      </p>
    </div>
  )
}
