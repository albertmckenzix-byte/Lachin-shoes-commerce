import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import FilterPanel from './FilterPanel'
import { toPersianDigits } from '../utils/toPersianDigits'

export default function FilterDrawer({
  isOpen,
  onClose,
  appliedValues = {},
  onApply = () => {},
  brandCounts = {},
  priceBounds = { min: 8500000, max: 21000000 },
  resultCount,
}) {
  const { t } = useTranslation()
  const drawerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previousActiveElementRef = useRef(null)

  // Local draft of filter values
  const [draft, setDraft] = useState(() => ({
    category: appliedValues.category || 'all',
    gender: appliedValues.gender || '',
    brands: Array.isArray(appliedValues.brands) ? [...appliedValues.brands] : [],
    priceMin: appliedValues.priceMin ?? priceBounds.min,
    priceMax: appliedValues.priceMax ?? priceBounds.max,
  }))

  const prevIsOpenRef = useRef(isOpen)

  // Synchronize draft every time the drawer opens
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setDraft({
        category: appliedValues.category || 'all',
        gender: appliedValues.gender || '',
        brands: Array.isArray(appliedValues.brands) ? [...appliedValues.brands] : [],
        priceMin: appliedValues.priceMin ?? priceBounds.min,
        priceMax: appliedValues.priceMax ?? priceBounds.max,
      })
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen, appliedValues, priceBounds.min, priceBounds.max])

  // prefers-reduced-motion detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e) => setPrefersReducedMotion(e.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // Close when window resized to desktop (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isOpen) {
        onClose()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isOpen, onClose])

  // Focus management: move to close button on open, restore on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
      previousActiveElementRef.current.focus()
      previousActiveElementRef.current = null
    }
  }, [isOpen])

  // Keyboard navigation: Escape to close, Tab focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleConfirm = () => {
    onApply(draft)
    onClose()
  }

  const handleResetDraft = () => {
    setDraft({
      category: 'all',
      gender: '',
      brands: [],
      priceMin: priceBounds.min,
      priceMax: priceBounds.max,
    })
  }

  const matchCount =
    typeof resultCount === 'function'
      ? resultCount(draft)
      : typeof resultCount === 'number'
      ? resultCount
      : 0

  return (
    <>
      {/* Dark overlay backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0"
        style={{
          zIndex: 125,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: prefersReducedMotion ? 'opacity 1ms' : 'opacity 300ms ease',
        }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('allProducts.filterDrawerTitle', 'فیلتر محصولات')}
        aria-hidden={!isOpen}
        inert={!isOpen ? '' : undefined}
        dir="rtl"
        className="fixed top-0 bottom-0 bg-white flex flex-col"
        style={{
          right: 0,
          zIndex: 130,
          width: 'min(88%, 400px)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: prefersReducedMotion
            ? 'transform 1ms, visibility 1ms'
            : 'transform 400ms cubic-bezier(0.22, 1, 0.36, 1), visibility 400ms',
          visibility: isOpen ? 'visible' : 'hidden',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Sticky top bar */}
        <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('menu.close', 'بستن')}
            className="w-[40px] h-[40px] border border-[#E5E5E5] rounded-[8px] flex items-center justify-center text-black hover:bg-gray-50 transition-colors"
          >
            <X size={20} strokeWidth={2} className="text-black" />
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="h-[40px] px-[22px] rounded-[8px] bg-black text-white text-[14px] font-semibold flex items-center justify-center hover:bg-gray-900 transition-colors"
          >
            {`مشاهده (${toPersianDigits(matchCount)} محصول)`}
          </button>
        </div>

        {/* Accordion filter groups */}
        <div className="flex-1">
          <FilterPanel
            variant="drawer"
            values={draft}
            onChange={setDraft}
            brandCounts={brandCounts}
            priceBounds={priceBounds}
          />

          {/* Reset all button at bottom of scroll area */}
          <div className="p-6 flex justify-center">
            <button
              type="button"
              onClick={handleResetDraft}
              className="text-[13px] text-black underline hover:text-gray-600 transition-colors cursor-pointer"
            >
              {t('filters.clearAll', 'پاک کردن همه فیلترها')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
