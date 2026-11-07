import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { formatNumber } from '../../utils/format'

function toEnglishDigits(str) {
  return String(str)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

function StockStepper({ value, onChange, label }) {
  return (
    <div className="inline-flex items-center rounded-md border border-[#D9D9D6] bg-white">
      <button
        type="button"
        aria-label={`کاهش ${label}`}
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-9 w-9 items-center justify-center text-lg text-[#111] hover:bg-[#F2F2EF] disabled:opacity-40"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={formatNumber(value)}
        onChange={(e) => {
          const digits = toEnglishDigits(e.target.value).replace(/\D/g, '')
          onChange(digits === '' ? 0 : Math.min(10000, Number(digits)))
        }}
        className="h-9 w-[52px] border-x border-[#D9D9D6] text-center text-sm text-[#111] outline-none"
      />
      <button
        type="button"
        aria-label={`افزایش ${label}`}
        disabled={value >= 10000}
        onClick={() => onChange(Math.min(10000, value + 1))}
        className="flex h-9 w-9 items-center justify-center text-lg text-[#111] hover:bg-[#F2F2EF] disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}

function sizeStatus(size) {
  if (size.stock === 0) return { text: 'ناموجود', className: 'text-[#B3261E]' }
  if (size.stock <= 2) return { text: 'کم‌موجودی', className: 'text-[#8A5A00]' }
  return { text: 'موجود', className: 'text-[#555]' }
}

export default function SizeStockTable({ sizes, allSizes, onChange }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const usedUs = new Set(sizes.map((s) => Number(s.us)))
  const available = allSizes.filter((t) => !usedUs.has(Number(t.us)))

  const updateSize = (index, patch) => {
    onChange(sizes.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const removeSize = (index) => {
    onChange(sizes.filter((_, i) => i !== index))
  }

  const addSize = (row) => {
    const next = [
      ...sizes,
      {
        us: Number(row.us),
        eu: Number(row.eu),
        cm: Number(row.cm),
        stock: 0,
        is_active: true,
      },
    ].sort((a, b) => a.cm - b.cm)
    onChange(next)
    setDropdownOpen(false)
  }

  const totalStock = sizes
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + (s.stock || 0), 0)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              {['سایز اروپا', 'سایز آمریکا', 'سانتی‌متر', 'موجودی', 'وضعیت', ''].map((h) => (
                <th
                  key={h}
                  className="bg-[#FAFAF8] px-3 py-2.5 text-start text-sm font-medium text-[#6B6B6B]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-[#6B6B6B]">
                  هنوز سایزی اضافه نشده است.
                </td>
              </tr>
            )}
            {sizes.map((size, index) => {
              const status = sizeStatus(size)
              return (
                <tr key={`${size.us}-${index}`} className="border-t border-[#EEE]">
                  <td className="px-3 py-2.5 text-[#111]">{formatNumber(size.eu)}</td>
                  <td className="px-3 py-2.5 text-[#111]">{formatNumber(size.us)}</td>
                  <td className="px-3 py-2.5 text-[#111]">{formatNumber(size.cm)}</td>
                  <td className="px-3 py-2.5">
                    <StockStepper
                      value={size.stock || 0}
                      onChange={(stock) => updateSize(index, { stock })}
                      label={`موجودی سایز ${formatNumber(size.eu)}`}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <label className="flex items-center gap-2 text-sm text-[#111]">
                      <input
                        type="checkbox"
                        checked={!!size.is_active}
                        onChange={(e) =>
                          updateSize(index, { is_active: e.target.checked })
                        }
                        className="h-4 w-4 accent-black"
                      />
                      فعال
                    </label>
                    <span className={`mr-2 text-xs ${status.className}`}>
                      {status.text}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      aria-label={`حذف سایز ${formatNumber(size.us)}`}
                      onClick={() => removeSize(index)}
                      className="rounded p-1.5 text-[#B3261E] hover:bg-[#FBE9E7]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-black px-4 text-sm font-semibold text-black hover:bg-black hover:text-white"
          >
            <Plus size={15} />
            افزودن سایز
          </button>
          {dropdownOpen && (
            <div className="absolute bottom-full left-0 z-20 mb-2 max-h-56 w-56 overflow-y-auto rounded-md border border-[#E6E6E3] bg-white py-1 shadow-lg">
              {available.length === 0 && (
                <p className="px-3 py-2 text-xs text-[#6B6B6B]">
                  همه سایزها اضافه شده‌اند.
                </p>
              )}
              {available.map((row) => (
                <button
                  key={row.us}
                  type="button"
                  onClick={() => addSize(row)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm text-[#111] hover:bg-[#F6F6F4]"
                >
                  <span>US {formatNumber(row.us)}</span>
                  <span className="text-xs text-[#6B6B6B]">
                    EU {formatNumber(row.eu)} · {formatNumber(row.cm)} cm
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-sm text-[#111]">
          مجموع موجودی: <b>{formatNumber(totalStock)} جفت</b>
        </p>
      </div>
    </div>
  )
}
