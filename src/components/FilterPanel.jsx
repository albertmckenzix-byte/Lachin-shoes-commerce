import { useState } from 'react'
import { ChevronDown, Minus, Plus, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { brands } from '../data/brands'
import { formatPrice } from '../utils/format'
import { toPersianDigits } from '../utils/toPersianDigits'

const CATEGORIES = [
  { key: 'all', labelKey: 'allProducts.categories.all' },
  { key: 'best-sellers', labelKey: 'allProducts.categories.bestSellers' },
  { key: 'limited-edition', labelKey: 'allProducts.categories.limitedEdition' },
  { key: 'performance-series', labelKey: 'allProducts.categories.performanceSeries' },
  { key: 'kids', labelKey: 'allProducts.categories.kidsCollection' },
]

const PRICE_STEP = 100000

export default function FilterPanel({
  values = {},
  onChange = () => {},
  brandCounts = {},
  priceBounds = { min: 8500000, max: 21000000 },
  variant = 'sidebar',
}) {
  const { t } = useTranslation()

  // Sidebar accordions: all open by default, toggle independently
  const [sidebarExpanded, setSidebarExpanded] = useState({
    gender: true,
    brand: true,
    price: true,
  })

  // Drawer accordions: independent toggles (opening one does not close others)
  const [drawerExpanded, setDrawerExpanded] = useState({
    browse: true,
    gender: false,
    brand: false,
    price: false,
  })

  const toggleSidebarSection = (key) => {
    setSidebarExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleDrawerGroup = (key) => {
    setDrawerExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const minBound = priceBounds?.min ?? 8500000
  const maxBound = priceBounds?.max ?? 21000000
  const priceMin = typeof values?.priceMin === 'number' ? values.priceMin : minBound
  const priceMax = typeof values?.priceMax === 'number' ? values.priceMax : maxBound

  const range = maxBound - minBound || 1
  const pMin = Math.max(0, Math.min(100, ((priceMin - minBound) / range) * 100))
  const pMax = Math.max(0, Math.min(100, ((priceMax - minBound) / range) * 100))

  const selectedBrands = Array.isArray(values?.brands) ? values.brands : []
  const activeCategory = values?.category || 'all'
  const activeGender = values?.gender || ''

  // =========================================================================
  // DRAWER VARIANT
  // =========================================================================
  if (variant === 'drawer') {
    return (
      <div className="w-full divide-y divide-[#E5E5E5]" dir="rtl">
        {/* Group 1: مرور بر اساس */}
        <div>
          <button
            type="button"
            onClick={() => toggleDrawerGroup('browse')}
            className="h-[52px] px-4 text-[15px] font-medium text-black flex items-center justify-between w-full text-start"
            aria-expanded={drawerExpanded.browse}
          >
            <span>{t('allProducts.browseBy')}</span>
            <ChevronDown
              size={18}
              strokeWidth={2}
              className={`text-black transition-transform duration-200 ${
                drawerExpanded.browse ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
              drawerExpanded.browse ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col px-4 pb-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = activeCategory === cat.key
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => onChange({ ...values, category: cat.key })}
                      className={`h-[44px] text-[14px] flex items-center justify-between w-full text-start cursor-pointer transition-colors ${
                        isSelected
                          ? 'font-semibold text-black'
                          : 'font-normal text-[#333] hover:text-black'
                      }`}
                    >
                      <span>{t(cat.labelKey)}</span>
                      {isSelected && <Check size={16} strokeWidth={2.5} className="text-black" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Group 2: جنسیت */}
        <div>
          <button
            type="button"
            onClick={() => toggleDrawerGroup('gender')}
            className="h-[52px] px-4 text-[15px] font-medium text-black flex items-center justify-between w-full text-start"
            aria-expanded={drawerExpanded.gender}
          >
            <span>{t('filters.gender')}</span>
            <ChevronDown
              size={18}
              strokeWidth={2}
              className={`text-black transition-transform duration-200 ${
                drawerExpanded.gender ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
              drawerExpanded.gender ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col px-4 pb-2">
                {['men', 'women'].map((g) => {
                  const isSelected = activeGender === g
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => onChange({ ...values, gender: isSelected ? '' : g })}
                      className="h-[44px] text-[14px] flex items-center gap-3 w-full text-start cursor-pointer"
                    >
                      <span
                        className={`w-[18px] h-[18px] border border-black rounded-[2px] flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-black' : 'bg-white'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={2.5} className="text-white" />}
                      </span>
                      <span className="text-[14px] text-black font-normal">{t(`filters.${g}`)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Group 3: برند */}
        <div>
          <button
            type="button"
            onClick={() => toggleDrawerGroup('brand')}
            className="h-[52px] px-4 text-[15px] font-medium text-black flex items-center justify-between w-full text-start"
            aria-expanded={drawerExpanded.brand}
          >
            <span>{t('filters.brand')}</span>
            <ChevronDown
              size={18}
              strokeWidth={2}
              className={`text-black transition-transform duration-200 ${
                drawerExpanded.brand ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
              drawerExpanded.brand ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col px-4 pb-2">
                {brands.map((b) => {
                  const isSelected = selectedBrands.includes(b.key)
                  const count = brandCounts?.[b.key] || 0
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => {
                        const nextBrands = isSelected
                          ? selectedBrands.filter((item) => item !== b.key)
                          : [...selectedBrands, b.key]
                        onChange({ ...values, brands: nextBrands })
                      }}
                      className="h-[44px] text-[14px] flex items-center justify-between w-full text-start cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-[18px] h-[18px] border border-black rounded-[2px] flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-black' : 'bg-white'
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={2.5} className="text-white" />}
                        </span>
                        <span
                          className={`text-[14px] ${
                            count === 0 ? 'text-gray-400' : 'text-black font-normal'
                          }`}
                        >
                          {t(`brands.${b.key}`)}
                        </span>
                      </div>
                      <span className={`text-[13px] ${count === 0 ? 'text-gray-400' : 'text-black'}`}>
                        ({toPersianDigits(count)})
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Group 4: قیمت */}
        <div>
          <button
            type="button"
            onClick={() => toggleDrawerGroup('price')}
            className="h-[52px] px-4 text-[15px] font-medium text-black flex items-center justify-between w-full text-start"
            aria-expanded={drawerExpanded.price}
          >
            <span>{t('allProducts.price')}</span>
            <ChevronDown
              size={18}
              strokeWidth={2}
              className={`text-black transition-transform duration-200 ${
                drawerExpanded.price ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
              drawerExpanded.price ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div className="px-4 py-4" dir="rtl">
                <div className="relative w-full h-4">
                  <div
                    className="absolute inset-x-0 h-[1px] bg-[#D1D5DB] pointer-events-none"
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <div
                    className="absolute h-[2px] bg-black pointer-events-none"
                    style={{
                      top: '50%',
                      transform: 'translateY(-50%)',
                      right: `${pMin}%`,
                      left: `${100 - pMax}%`,
                    }}
                  />
                  <div className="absolute inset-0">
                    <input
                      type="range"
                      min={minBound}
                      max={maxBound}
                      step={PRICE_STEP}
                      value={priceMin}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        const nextMin = Math.min(val, priceMax)
                        onChange({ ...values, priceMin: nextMin, priceMax })
                      }}
                      className="price-range-input absolute inset-0 w-full h-full z-20"
                      aria-label={t('filters.minPrice')}
                    />
                    <input
                      type="range"
                      min={minBound}
                      max={maxBound}
                      step={PRICE_STEP}
                      value={priceMax}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        const nextMax = Math.max(val, priceMin)
                        onChange({ ...values, priceMin, priceMax: nextMax })
                      }}
                      className="price-range-input absolute inset-0 w-full h-full z-20"
                      aria-label={t('filters.maxPrice')}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[12px] font-medium text-black whitespace-nowrap">
                  <span>
                    {t('filters.from')} {formatPrice(priceMin)}
                  </span>
                  <span>
                    {t('filters.to')} {formatPrice(priceMax)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // SIDEBAR VARIANT (Desktop look & behavior)
  // =========================================================================
  return (
    <div className="w-full" dir="rtl">
      {/* Browse by */}
      <div className="mb-[45px]">
        <div className="border-b border-[#BDBDBD] pb-[14px]">
          <h2 className="text-[15px] font-medium text-black text-start">{t('allProducts.browseBy')}</h2>
        </div>
        <nav className="mt-[14px] flex flex-col gap-[12px]" aria-label={t('allProducts.categoriesLabel')}>
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onChange({ ...values, category: cat.key })}
                className={`text-[13px] font-medium text-black hover:underline ${
                  isSelected ? 'underline font-semibold' : 'text-[#333]'
                } text-start`}
              >
                {t(cat.labelKey)}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Filter by */}
      <div>
        <div className="border-b border-[#BDBDBD] pb-[14px]">
          <h2 className="text-[15px] font-medium text-black text-start">{t('allProducts.filterBy')}</h2>
        </div>

        {/* Gender section */}
        <div className="mt-[14px]">
          <button
            type="button"
            onClick={() => toggleSidebarSection('gender')}
            className="flex items-center justify-between w-full text-start"
            aria-expanded={sidebarExpanded.gender}
          >
            <span className="text-[13px] font-medium text-black">{t('filters.gender')}</span>
            {sidebarExpanded.gender ? (
              <Minus size={15} strokeWidth={2} className="text-black flex-shrink-0" />
            ) : (
              <Plus size={15} strokeWidth={2} className="text-black flex-shrink-0" />
            )}
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
              sidebarExpanded.gender ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div className="mt-[10px] flex flex-col gap-[8px]">
                {['men', 'women'].map((g) => {
                  const checked = activeGender === g
                  return (
                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={() => onChange({ ...values, gender: checked ? '' : g })}
                      />
                      <span
                        className={`w-[15px] h-[15px] flex items-center justify-center border border-black ${
                          checked ? 'bg-black' : 'bg-white'
                        }`}
                      >
                        {checked && <Check size={11} strokeWidth={2} className="text-white" />}
                      </span>
                      <span className="text-[13.5px] text-black">{t(`filters.${g}`)}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Brand section */}
        <div className="mt-[14px]">
          <button
            type="button"
            onClick={() => toggleSidebarSection('brand')}
            className="flex items-center justify-between w-full text-start"
            aria-expanded={sidebarExpanded.brand}
          >
            <span className="text-[13px] font-medium text-black">{t('filters.brand')}</span>
            {sidebarExpanded.brand ? (
              <Minus size={15} strokeWidth={2} className="text-black flex-shrink-0" />
            ) : (
              <Plus size={15} strokeWidth={2} className="text-black flex-shrink-0" />
            )}
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
              sidebarExpanded.brand ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div className="mt-[10px] flex flex-col gap-[8px]">
                {brands.map((b) => {
                  const checked = selectedBrands.includes(b.key)
                  const count = brandCounts?.[b.key] || 0
                  return (
                    <label key={b.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={() => {
                          const nextBrands = checked
                            ? selectedBrands.filter((k) => k !== b.key)
                            : [...selectedBrands, b.key]
                          onChange({ ...values, brands: nextBrands })
                        }}
                      />
                      <span
                        className={`w-[15px] h-[15px] flex items-center justify-center border border-black ${
                          checked ? 'bg-black' : 'bg-white'
                        }`}
                      >
                        {checked && <Check size={11} strokeWidth={2} className="text-white" />}
                      </span>
                      <span
                        className={`text-[13.5px] ${
                          count === 0 ? 'text-gray-400' : 'text-black'
                        }`}
                      >
                        {t(`brands.${b.key}`)} ({toPersianDigits(count)})
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Price section */}
        <div className="mt-[14px]">
          <button
            type="button"
            onClick={() => toggleSidebarSection('price')}
            className="flex items-center justify-between w-full text-start"
            aria-expanded={sidebarExpanded.price}
          >
            <span className="text-[13px] font-medium text-black">{t('allProducts.price')}</span>
            {sidebarExpanded.price ? (
              <Minus size={15} strokeWidth={2} className="text-black flex-shrink-0" />
            ) : (
              <Plus size={15} strokeWidth={2} className="text-black flex-shrink-0" />
            )}
          </button>

          {sidebarExpanded.price && (
            <div className="mt-4" dir="rtl">
              <div className="relative w-full h-4">
                <div
                  className="absolute inset-x-0 h-[1px] bg-[#D1D5DB] pointer-events-none"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                />
                <div
                  className="absolute h-[2px] bg-black pointer-events-none"
                  style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    right: `${pMin}%`,
                    left: `${100 - pMax}%`,
                  }}
                />
                <div className="absolute inset-0">
                  <input
                    type="range"
                    min={minBound}
                    max={maxBound}
                    step={PRICE_STEP}
                    value={priceMin}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      const nextMin = Math.min(val, priceMax)
                      onChange({ ...values, priceMin: nextMin, priceMax })
                    }}
                    className="price-range-input absolute inset-0 w-full h-full z-20"
                    aria-label={t('filters.minPrice')}
                  />
                  <input
                    type="range"
                    min={minBound}
                    max={maxBound}
                    step={PRICE_STEP}
                    value={priceMax}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      const nextMax = Math.max(val, priceMin)
                      onChange({ ...values, priceMin, priceMax: nextMax })
                    }}
                    className="price-range-input absolute inset-0 w-full h-full z-20"
                    aria-label={t('filters.maxPrice')}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[12px] font-medium text-black whitespace-nowrap">
                <span>
                  {t('filters.from')} {formatPrice(priceMin)}
                </span>
                <span>
                  {t('filters.to')} {formatPrice(priceMax)}
                </span>
              </div>
            </div>
          )}

          <div className="mt-[14px] border-t border-[#BDBDBD]" />
        </div>
      </div>
    </div>
  )
}
