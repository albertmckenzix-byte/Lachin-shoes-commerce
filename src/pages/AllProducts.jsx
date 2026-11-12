import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Minus, ChevronDown, Check, Plus } from 'lucide-react'
import { useProducts } from '../context/ProductsContext'
import { brands } from '../data/brands'
import ProductCard from '../components/ProductCard'
import { formatNumber } from '../utils/format'
import { searchProducts } from '../utils/search'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '../utils/format'
import { toPersianDigits } from '../utils/toPersianDigits'

const CATEGORIES = [
  { key: 'all', labelKey: 'allProducts.categories.all' },
  { key: 'best-sellers', labelKey: 'allProducts.categories.bestSellers' },
  { key: 'limited-edition', labelKey: 'allProducts.categories.limitedEdition' },
  { key: 'performance-series', labelKey: 'allProducts.categories.performanceSeries' },
  { key: 'kids', labelKey: 'allProducts.categories.kidsCollection' },
]

const SORT_OPTIONS = [
  { value: 'recommended', labelKey: 'allProducts.sortOptions.recommended' },
  { value: 'price-asc', labelKey: 'allProducts.sortOptions.priceAsc' },
  { value: 'price-desc', labelKey: 'allProducts.sortOptions.priceDesc' },
  { value: 'name-asc', labelKey: 'allProducts.sortOptions.nameAsc' },
]

const FALLBACK_MIN_PRICE = 8500000
const FALLBACK_MAX_PRICE = 21000000
const PRICE_STEP = 100000

function getCategoryLabelKey(key) {
  const cat = CATEGORIES.find(c => c.key === key)
  return cat ? cat.labelKey : 'allProducts.categories.all'
}

export default function AllProducts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [priceExpanded, setPriceExpanded] = useState(true)
  const [genderExpanded, setGenderExpanded] = useState(true)
  const [brandExpanded, setBrandExpanded] = useState(true)
  const { t } = useTranslation()
  const { products, loading } = useProducts()

  const { MIN_PRICE, MAX_PRICE } = useMemo(() => {
    if (!products.length) {
      return { MIN_PRICE: FALLBACK_MIN_PRICE, MAX_PRICE: FALLBACK_MAX_PRICE }
    }
    const prices = products.map((p) => p.price)
    return {
      MIN_PRICE: Math.min(...prices),
      MAX_PRICE: Math.max(...prices),
    }
  }, [products])

  const category = searchParams.get('category') || 'all'
  const sortBy = searchParams.get('sort') || 'recommended'
  const searchQuery = searchParams.get('search') || ''
  const gender = searchParams.get('gender') || ''
  const brandParam = searchParams.get('brand') || ''
  const selectedBrands = brandParam ? brandParam.split(',') : []
  const priceMin = searchParams.get('priceMin')
  const priceMax = searchParams.get('priceMax')
  const initialPriceRange = useMemo(() => [
    priceMin ? Math.max(MIN_PRICE, parseInt(priceMin, 10)) : MIN_PRICE,
    priceMax ? Math.min(MAX_PRICE, parseInt(priceMax, 10)) : MAX_PRICE,
  ], [priceMin, priceMax])

  const [priceRange, setPriceRange] = useState(initialPriceRange)

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    let changed = false
    if (priceRange[0] > MIN_PRICE) {
      params.set('priceMin', priceRange[0].toString())
      changed = true
    } else {
      params.delete('priceMin')
      changed = true
    }
    if (priceRange[1] < MAX_PRICE) {
      params.set('priceMax', priceRange[1].toString())
      changed = true
    } else {
      params.delete('priceMax')
      changed = true
    }
    if (changed) {
      setSearchParams(params, { replace: true })
    }
  }, [priceRange, searchParams, setSearchParams])

  const handleSortChange = (value) => {
    const params = new URLSearchParams(searchParams)
    if (value === 'recommended') {
      params.delete('sort')
    } else {
      params.set('sort', value)
    }
    setSearchParams(params)
    setShowSortDropdown(false)
  }

  const handlePriceChange = (min, max) => {
    setPriceRange([min, max])
  }

  const handleGenderToggle = (value) => {
    const params = new URLSearchParams(searchParams)
    if (gender === value) {
      params.delete('gender')
    } else {
      params.set('gender', value)
    }
    setSearchParams(params)
  }

  const handleBrandToggle = (brandKey) => {
    const params = new URLSearchParams(searchParams)
    const currentBrands = params.get('brand') ? params.get('brand').split(',') : []
    if (currentBrands.includes(brandKey)) {
      const newBrands = currentBrands.filter(b => b !== brandKey)
      if (newBrands.length > 0) {
        params.set('brand', newBrands.join(','))
      } else {
        params.delete('brand')
      }
    } else {
      params.set('brand', [...currentBrands, brandKey].join(','))
    }
    setSearchParams(params)
  }

  const handleClearFilters = () => {
    const params = new URLSearchParams()
    if (sortBy !== 'recommended') {
      params.set('sort', sortBy)
    }
    setSearchParams(params)
    setPriceRange([MIN_PRICE, MAX_PRICE])
  }

  const handleClearSearch = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('search')
    setSearchParams(params)
  }

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      if (category !== 'all' && !p.categories.includes(category)) return false
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false
      if (gender && !p.genders.includes(gender)) return false
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.makerBrand)) return false
      return true
    })

    if (searchQuery) {
      result = searchProducts(result, searchQuery, t)
    }
    return result
  }, [category, priceRange, gender, selectedBrands, searchQuery, t])

  const brandCounts = useMemo(() => {
    const counts = {}
    brands.forEach(b => { counts[b.key] = 0 })
    products.forEach(p => {
      if (gender && !p.genders.includes(gender)) return
      if (category !== 'all' && !p.categories.includes(category)) return
      if (p.price < priceRange[0] || p.price > priceRange[1]) return
      if (p.makerBrand && counts[p.makerBrand] !== undefined) {
        counts[p.makerBrand]++
      }
    })
    return counts
  }, [gender, category, priceRange])

  const showBrandEmptyMessage =
    selectedBrands.length > 0 &&
    !gender &&
    category === 'all' &&
    !searchQuery &&
    priceRange[0] === MIN_PRICE &&
    priceRange[1] === MAX_PRICE &&
    selectedBrands.every(b => (brandCounts[b] || 0) === 0)

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        case 'name-asc':
          return (a.name || a.nameKey || '').localeCompare(b.name || b.nameKey || '')
        default:
          return 0
      }
    })
  }, [filteredProducts, sortBy])

  const categoryLabelKey = getCategoryLabelKey(category)
  const showCategoryInTitle = category !== 'all'

  return (
    <div className="min-h-screen bg-white pb-20" dir="rtl">
      {/* Breadcrumb & Title */}
      <div className="px-[16px] pt-[40px]">
        <nav className="flex items-center gap-[16px] text-[12px] text-black" aria-label={t('allProducts.breadcrumb')}>
          <Link to="/" className="hover:underline">{t('allProducts.breadcrumbHome')}</Link>
          <ChevronRight size={14} strokeWidth={2} className="text-black flex-shrink-0 rtl:rotate-180" />
          <span className="text-black">{showCategoryInTitle ? t(categoryLabelKey) : t('allProducts.title')}</span>
        </nav>
        <h1 className="mt-[22px] text-[18px] font-normal text-black">
          {showCategoryInTitle ? t(categoryLabelKey) : t('allProducts.title')}
        </h1>
      </div>

      {searchQuery && (
        <div className="px-[16px] mt-[16px] mb-[12px] flex items-center justify-between">
          <span className="text-[13px] text-black">
            {t('allProducts.searchResults', { term: searchQuery })}
          </span>
          <button
            type="button"
            onClick={handleClearSearch}
            className="text-[13px] text-black underline hover:text-[#333]"
          >
            {t('allProducts.clearSearch')}
          </button>
        </div>
      )}

      <div className="grid px-[16px] mt-[55px] gap-y-8 max-w-[1600px] mx-auto lg:grid-cols-[200px_1fr] lg:gap-x-16">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block lg:w-[200px] shrink-0 lg:sticky lg:top-6 lg:self-start ps-1">
          {/* Browse by */}
          <div className="mb-[45px]">
            <div className="border-b border-[#BDBDBD] pb-[14px]">
              <h2 className="text-[14px] font-normal text-black text-start">{t('allProducts.browseBy')}</h2>
            </div>
            <nav className="mt-[14px] flex flex-col gap-[12px]" aria-label={t('allProducts.categoriesLabel')}>
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.key}
                  to={cat.key === 'all' ? '/all-products' : `/all-products?category=${cat.key}`}
                  className={`text-[11px] font-semibold text-black hover:underline ${
                    category === cat.key ? 'underline' : 'text-[#333]'
                  } text-start`}
                >
                  {t(cat.labelKey)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Filter by */}
          <div>
            <div className="border-b border-[#BDBDBD] pb-[14px]">
              <h2 className="text-[14px] font-normal text-black text-start">{t('allProducts.filterBy')}</h2>
            </div>

            {/* Gender section */}
            <div className="mt-[14px]">
              <button
                type="button"
                onClick={() => setGenderExpanded(!genderExpanded)}
                className="flex items-center justify-between w-full text-start"
                aria-expanded={genderExpanded}
              >
                <span className="text-[11px] font-semibold text-black">{t('filters.gender')}</span>
                {genderExpanded
                  ? <Minus size={14} strokeWidth={2} className="text-black flex-shrink-0" />
                  : <Plus size={14} strokeWidth={2} className="text-black flex-shrink-0" />}
              </button>
              <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${genderExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="mt-[10px] flex flex-col gap-[6px]">
                    {['men', 'women'].map((g) => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={gender === g}
                          onChange={() => handleGenderToggle(g)}
                        />
                        <span className={`w-[14px] h-[14px] flex items-center justify-center border border-black ${gender === g ? 'bg-black' : 'bg-white'}`}>
                          {gender === g && <Check size={10} strokeWidth={2} className="text-white" />}
                        </span>
                        <span className="text-[13px] text-black">{t(`filters.${g}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Brand section */}
            <div className="mt-[14px]">
              <button
                type="button"
                onClick={() => setBrandExpanded(!brandExpanded)}
                className="flex items-center justify-between w-full text-start"
                aria-expanded={brandExpanded}
              >
                <span className="text-[11px] font-semibold text-black">{t('filters.brand')}</span>
                {brandExpanded
                  ? <Minus size={14} strokeWidth={2} className="text-black flex-shrink-0" />
                  : <Plus size={14} strokeWidth={2} className="text-black flex-shrink-0" />}
              </button>
              <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${brandExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="mt-[10px] flex flex-col gap-[6px]">
                    {brands.map((b) => {
                      const checked = selectedBrands.includes(b.key)
                      const count = brandCounts[b.key] || 0
                      return (
                        <label key={b.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={checked}
                            onChange={() => handleBrandToggle(b.key)}
                          />
                          <span className={`w-[14px] h-[14px] flex items-center justify-center border border-black ${checked ? 'bg-black' : 'bg-white'}`}>
                            {checked && <Check size={10} strokeWidth={2} className="text-white" />}
                          </span>
                          <span className={`text-[13px] ${count === 0 ? 'text-gray-400' : 'text-black'}`}>{t(`brands.${b.key}`)} ({toPersianDigits(count)})</span>
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
                onClick={() => setPriceExpanded(!priceExpanded)}
                className="flex items-center justify-between w-full text-start"
                aria-expanded={priceExpanded}
              >
                <span className="text-[11px] font-semibold text-black">{t('allProducts.price')}</span>
                <Minus size={14} strokeWidth={2} className="text-black flex-shrink-0" />
              </button>

              {priceExpanded && (
                <div className="mt-4" dir="rtl">
                  {/* Dual-handle range slider */}
                  <div className="relative w-full h-4">
                    <div
                      className="absolute inset-0 h-[1px] bg-black pointer-events-none"
                      style={{ top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <div
                      className="absolute w-[14px] h-[14px] rounded-full bg-black border-2 border-white shadow-sm pointer-events-none"
                      style={{
                        right: `calc(${(priceRange[0] - MIN_PRICE) / (MAX_PRICE - MIN_PRICE) * 100}%)`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 20,
                      }}
                    />
                    <div
                      className="absolute w-[14px] h-[14px] rounded-full bg-black border-2 border-white shadow-sm pointer-events-none"
                      style={{
                        right: `calc(${(priceRange[1] - MIN_PRICE) / (MAX_PRICE - MIN_PRICE) * 100}%)`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 20,
                      }}
                    />
                    <div className="absolute inset-0 pointer-events-auto">
                      <input
                        type="range"
                        min={MIN_PRICE}
                        max={MAX_PRICE}
                        step={PRICE_STEP}
                        value={priceRange[0]}
                        onChange={(e) => handlePriceChange(Number(e.target.value), priceRange[1])}
                        className="absolute w-full h-full cursor-pointer z-20"
                        style={{
                          appearance: 'none',
                          background: 'transparent',
                          WebkitAppearance: 'none',
                        }}
                        aria-label={t('filters.minPrice')}
                      />
                      <input
                        type="range"
                        min={MIN_PRICE}
                        max={MAX_PRICE}
                        step={PRICE_STEP}
                        value={priceRange[1]}
                        onChange={(e) => handlePriceChange(priceRange[0], Number(e.target.value))}
                        className="absolute w-full h-full cursor-pointer z-20"
                        style={{
                          appearance: 'none',
                          background: 'transparent',
                          WebkitAppearance: 'none',
                        }}
                        aria-label={t('filters.maxPrice')}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-1 text-[11px] font-semibold text-black whitespace-nowrap text-start">
                    <span>{t('filters.from')} {formatPrice(priceRange[0])}</span>
                    <span>{t('filters.to')} {formatPrice(priceRange[1])}</span>
                  </div>
                </div>
               )}
              
               <div className="mt-[14px] border-t border-[#BDBDBD]" />
            </div>
          </div>
        </aside>

        {/* Product Area */}
        <div className="flex-1 min-w-0">
          {/* Mobile sidebar toggle */}
          <button
            className="lg:hidden w-full flex items-center justify-between py-3 border-b border-[#BDBDBD] text-start"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            aria-expanded={showMobileSidebar}
          >
            <span className="text-[14px] font-normal text-black">{t('allProducts.filterAndBrowse')}</span>
            <ChevronDown size={16} strokeWidth={2} className="text-black" />
          </button>

          {/* Mobile sidebar */}
          <div className={`lg:hidden transition-all duration-300 overflow-hidden ${showMobileSidebar ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="pb-4 border-b border-[#BDBDBD]">
               <h2 className="text-[14px] font-normal text-black pb-[14px] border-b border-[#BDBDBD] mb-4 text-start">{t('allProducts.browseBy')}</h2>
               <nav className="flex flex-col gap-[12px]" aria-label={t('allProducts.categoriesLabel')}>
                 {CATEGORIES.map((cat) => (
                   <Link
                     key={cat.key}
                     to={cat.key === 'all' ? '/all-products' : `/all-products?category=${cat.key}`}
                     className={`text-[11px] font-semibold text-black hover:underline ${
                       category === cat.key ? 'underline' : 'text-[#333]'
                     } text-start`}
                     onClick={() => setShowMobileSidebar(false)}
                   >
                     {t(cat.labelKey)}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="mt-4 pb-4 border-b border-[#BDBDBD]">
               <h2 className="text-[14px] font-normal text-black pb-[14px] border-b border-[#BDBDBD] mb-4 text-start">{t('allProducts.filterBy')}</h2>

              {/* Gender section */}
              <div className="mt-[14px]">
                <button
                  type="button"
                  onClick={() => setGenderExpanded(!genderExpanded)}
                  className="flex items-center justify-between w-full text-start mb-4"
                  aria-expanded={genderExpanded}
                >
                  <span className="text-[11px] font-semibold text-black">{t('filters.gender')}</span>
                  {genderExpanded
                    ? <Minus size={14} strokeWidth={2} className="text-black flex-shrink-0" />
                    : <Plus size={14} strokeWidth={2} className="text-black flex-shrink-0" />}
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${genderExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="mt-[10px] flex flex-col gap-[6px]">
                      {['men', 'women'].map((g) => (
                        <label key={g} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={gender === g}
                            onChange={() => handleGenderToggle(g)}
                          />
                          <span className={`w-[14px] h-[14px] flex items-center justify-center border border-black ${gender === g ? 'bg-black' : 'bg-white'}`}>
                            {gender === g && <Check size={10} strokeWidth={2} className="text-white" />}
                          </span>
                          <span className="text-[13px] text-black">{t(`filters.${g}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand section */}
              <div className="mt-[14px]">
                <button
                  type="button"
                  onClick={() => setBrandExpanded(!brandExpanded)}
                  className="flex items-center justify-between w-full text-start mb-4"
                  aria-expanded={brandExpanded}
                >
                  <span className="text-[11px] font-semibold text-black">{t('filters.brand')}</span>
                  {brandExpanded
                    ? <Minus size={14} strokeWidth={2} className="text-black flex-shrink-0" />
                    : <Plus size={14} strokeWidth={2} className="text-black flex-shrink-0" />}
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${brandExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="mt-[10px] flex flex-col gap-[6px]">
                      {brands.map((b) => {
                        const checked = selectedBrands.includes(b.key)
                        const count = brandCounts[b.key] || 0
                        return (
                          <label key={b.key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={checked}
                              onChange={() => handleBrandToggle(b.key)}
                            />
                            <span className={`w-[14px] h-[14px] flex items-center justify-center border border-black ${checked ? 'bg-black' : 'bg-white'}`}>
                              {checked && <Check size={10} strokeWidth={2} className="text-white" />}
                            </span>
                          <span className={`text-[13px] ${count === 0 ? 'text-gray-400' : 'text-black'}`}>{t(`brands.${b.key}`)} ({toPersianDigits(count)})</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

               <button
                type="button"
                onClick={() => setPriceExpanded(!priceExpanded)}
                className="flex items-center justify-between w-full text-start mb-4"
                aria-expanded={priceExpanded}
              >
                <span className="text-[11px] font-semibold text-black">{t('allProducts.price')}</span>
                <Minus size={14} strokeWidth={2} className="text-black flex-shrink-0" />
              </button>
              {priceExpanded && (
                <div dir="rtl">
                  <div className="relative w-full h-4">
                    <div className="absolute inset-0 h-[1px] bg-black pointer-events-none" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                    <div
                      className="absolute w-[14px] h-[14px] rounded-full bg-black border-2 border-white shadow-sm pointer-events-none"
                      style={{
                        right: `calc(${(priceRange[0] - MIN_PRICE) / (MAX_PRICE - MIN_PRICE) * 100}%)`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 20,
                      }}
                    />
                    <div
                      className="absolute w-[14px] h-[14px] rounded-full bg-black border-2 border-white shadow-sm pointer-events-none"
                      style={{
                        right: `calc(${(priceRange[1] - MIN_PRICE) / (MAX_PRICE - MIN_PRICE) * 100}%)`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 20,
                      }}
                    />
                    <div className="absolute inset-0 pointer-events-auto">
                      <input
                        type="range"
                        min={MIN_PRICE}
                        max={MAX_PRICE}
                        step={PRICE_STEP}
                        value={priceRange[0]}
                        onChange={(e) => handlePriceChange(Number(e.target.value), priceRange[1])}
                        className="absolute w-full h-full cursor-pointer z-20"
                        style={{ appearance: 'none', background: 'transparent', WebkitAppearance: 'none' }}
                        aria-label={t('filters.minPrice')}
                      />
                      <input
                        type="range"
                        min={MIN_PRICE}
                        max={MAX_PRICE}
                        step={PRICE_STEP}
                        value={priceRange[1]}
                        onChange={(e) => handlePriceChange(priceRange[0], Number(e.target.value))}
                        className="absolute w-full h-full cursor-pointer z-20"
                        style={{ appearance: 'none', background: 'transparent', WebkitAppearance: 'none' }}
                        aria-label={t('filters.maxPrice')}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-1 text-[11px] font-semibold text-black whitespace-nowrap text-start">
                    <span>{t('filters.from')} {formatPrice(priceRange[0])}</span>
                    <span>{t('filters.to')} {formatPrice(priceRange[1])}</span>
                  </div>
                </div>
               )}
              </div>
            </div>

          {/* Active filter chips */}
          {(gender || selectedBrands.length > 0) && (
            <div className="mb-[12px] flex flex-wrap items-center gap-[8px] text-[11px]">
              {gender && (
                <span className="inline-flex items-center gap-1 px-[10px] py-[4px] border border-black rounded-full text-black">
                  {t(`filters.${gender}`)}
                  <button
                    type="button"
                    onClick={() => handleGenderToggle(gender)}
                    className="text-black hover:text-gray-500"
                    aria-label={t('filters.removeGender')}
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedBrands.map((b) => {
                const brandName = t(`brands.${b}`)
                return (
                  <span key={b} className="inline-flex items-center gap-1 px-[10px] py-[4px] border border-black rounded-full text-black">
                    {brandName}
                    <button
                      type="button"
                      onClick={() => handleBrandToggle(b)}
                      className="text-black hover:text-gray-500"
                      aria-label={t('filters.removeBrand', { brand: brandName })}
                    >
                      ×
                    </button>
                  </span>
                )
              })}
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-black underline hover:text-gray-500"
              >
                {t('filters.clearAll')}
              </button>
            </div>
          )}

          {/* Product area top bar - product count on start side, sort dropdown on end side */}
          <div className="flex items-center justify-between mt-4 lg:mt-0 mb-[18px]">
            <span className="text-[11px] font-semibold text-black">
              {t('allProducts.productCount', { count: formatNumber(sortedProducts.length) })}
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1 text-[12px] font-normal text-black hover:underline"
                aria-haspopup="listbox"
                aria-expanded={showSortDropdown}
              >
                {t('allProducts.sortBy', { option: t(SORT_OPTIONS.find(o => o.value === sortBy)?.labelKey) })}
                <ChevronDown size={12} strokeWidth={2} className="text-black" />
              </button>
              {showSortDropdown && (
                <ul
                  className="absolute start-0 top-full mt-1 min-w-[180px] bg-white border border-[#E5E5E5] shadow-lg z-20 rounded-[4px] overflow-hidden"
                  role="listbox"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <li key={opt.value} role="option" aria-selected={sortBy === opt.value}>
                      <button
                        type="button"
                        onClick={() => handleSortChange(opt.value)}
                        className={`w-full ps-3 pe-3 py-2 text-start text-[12px] font-normal text-black hover:bg-gray-50 ${sortBy === opt.value ? 'font-semibold' : ''}`}
                      >
                        {t(opt.labelKey)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 gap-y-6">
              {loading && products.length === 0
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[3/4] rounded-[6px] bg-[#ECECEC]" />
                      <div className="mt-[14px] h-4 w-3/4 rounded bg-[#ECECEC]" />
                      <div className="mt-2 h-4 w-1/2 rounded bg-[#ECECEC]" />
                    </div>
                  ))
                : sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} variant="listing" />
              ))}
              {!loading && sortedProducts.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-black text-[14px] font-normal mb-4">
                    {showBrandEmptyMessage ? t('filters.noBrandProducts') : t('allProducts.noProducts')}
                  </p>
                  <button
                    onClick={handleClearFilters}
                    className="inline-flex items-center justify-center w-[104px] h-[38px] rounded-full border-[1.5px] border-black text-[11px] font-bold uppercase hover:bg-black hover:text-white transition-colors"
                  >
                    {t('allProducts.clearFilters')}
                  </button>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}