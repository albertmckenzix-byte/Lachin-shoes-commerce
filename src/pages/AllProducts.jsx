import { useState, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useProducts } from '../context/ProductsContext'
import { brands } from '../data/brands'
import ProductCard from '../components/ProductCard'
import FilterPanel from '../components/FilterPanel'
import FilterDrawer from '../components/FilterDrawer'
import { formatNumber } from '../utils/format'
import { searchProducts } from '../utils/search'
import { useTranslation } from 'react-i18next'
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

function getCategoryLabelKey(key) {
  const cat = CATEGORIES.find(c => c.key === key)
  return cat ? cat.labelKey : 'allProducts.categories.all'
}

export default function AllProducts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const filterButtonRef = useRef(null)
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
  const selectedBrands = useMemo(() => (brandParam ? brandParam.split(',') : []), [brandParam])
  const priceMin = searchParams.get('priceMin')
  const priceMax = searchParams.get('priceMax')
  const priceRange = useMemo(() => [
    priceMin ? Math.max(MIN_PRICE, parseInt(priceMin, 10)) : MIN_PRICE,
    priceMax ? Math.min(MAX_PRICE, parseInt(priceMax, 10)) : MAX_PRICE,
  ], [priceMin, priceMax, MIN_PRICE, MAX_PRICE])

  const currentFilterValues = useMemo(() => ({
    category,
    gender,
    brands: selectedBrands,
    priceMin: priceRange[0],
    priceMax: priceRange[1],
  }), [category, gender, selectedBrands, priceRange])

  const activeFiltersCount =
    (gender ? 1 : 0) +
    selectedBrands.length +
    (category !== 'all' ? 1 : 0) +
    (priceRange[0] > MIN_PRICE || priceRange[1] < MAX_PRICE ? 1 : 0)

  const handleFilterChange = (nextValues) => {
    const params = new URLSearchParams(searchParams)

    if (nextValues.category && nextValues.category !== 'all') {
      params.set('category', nextValues.category)
    } else {
      params.delete('category')
    }

    if (nextValues.gender) {
      params.set('gender', nextValues.gender)
    } else {
      params.delete('gender')
    }

    if (Array.isArray(nextValues.brands) && nextValues.brands.length > 0) {
      params.set('brand', nextValues.brands.join(','))
    } else {
      params.delete('brand')
    }

    const nextMin = typeof nextValues.priceMin === 'number' ? nextValues.priceMin : MIN_PRICE
    const nextMax = typeof nextValues.priceMax === 'number' ? nextValues.priceMax : MAX_PRICE
    if (nextMin > MIN_PRICE) {
      params.set('priceMin', nextMin.toString())
    } else {
      params.delete('priceMin')
    }
    if (nextMax < MAX_PRICE) {
      params.set('priceMax', nextMax.toString())
    } else {
      params.delete('priceMax')
    }

    setSearchParams(params, { replace: true })
  }

  const computeDraftCount = (draft) => {
    const cat = draft?.category || 'all'
    const gen = draft?.gender || ''
    const brs = draft?.brands || []
    const pMin = typeof draft?.priceMin === 'number' ? draft.priceMin : MIN_PRICE
    const pMax = typeof draft?.priceMax === 'number' ? draft.priceMax : MAX_PRICE

    let result = products.filter((p) => {
      if (cat !== 'all' && !p.categories.includes(cat)) return false
      if (p.price < pMin || p.price > pMax) return false
      if (gen && !p.genders.includes(gen)) return false
      if (brs.length > 0 && !brs.includes(p.makerBrand)) return false
      return true
    })

    if (searchQuery) {
      result = searchProducts(result, searchQuery, t)
    }
    return result.length
  }

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
  }, [category, priceRange, gender, selectedBrands, searchQuery, t, products])

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
  }, [gender, category, priceRange, products])

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
        <nav className="flex items-center gap-[16px] text-[13px] text-black" aria-label={t('allProducts.breadcrumb')}>
          <Link to="/" className="hover:underline">{t('allProducts.breadcrumbHome')}</Link>
          <ChevronRight size={14} strokeWidth={2} className="text-black flex-shrink-0 rtl:rotate-180" />
          <span className="text-black">{showCategoryInTitle ? t(categoryLabelKey) : t('allProducts.title')}</span>
        </nav>
        <h1 className="mt-[22px] text-[22px] font-medium text-black">
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

      <div className="grid px-[16px] mt-[55px] gap-y-8 max-w-[1600px] mx-auto lg:grid-cols-[220px_1fr] lg:gap-x-16">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block lg:w-[220px] shrink-0 lg:sticky lg:top-6 lg:self-start ps-1">
          <FilterPanel
            variant="sidebar"
            values={currentFilterValues}
            onChange={handleFilterChange}
            brandCounts={brandCounts}
            priceBounds={{ min: MIN_PRICE, max: MAX_PRICE }}
          />
        </aside>

        {/* Product Area */}
        <div className="flex-1 min-w-0">
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

          {/* Product area top bar - Filter button on mobile, product count on start side, sort dropdown on end side */}
          <div className="flex items-center justify-between gap-3 mt-4 lg:mt-0 mb-[18px]">
            <div className="flex items-center gap-3">
              <button
                ref={filterButtonRef}
                type="button"
                onClick={() => setIsFilterDrawerOpen(true)}
                className="lg:hidden h-[40px] px-4 rounded-full border-[1.5px] border-black text-[13px] font-semibold text-black flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer"
                aria-haspopup="dialog"
                aria-expanded={isFilterDrawerOpen}
              >
                <SlidersHorizontal size={14} strokeWidth={2} className="text-black" />
                <span>{t('allProducts.filter', 'فیلتر')}</span>
                {activeFiltersCount > 0 && (
                  <span className="w-[18px] h-[18px] rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center">
                    {toPersianDigits(activeFiltersCount)}
                  </span>
                )}
              </button>
              <span className="text-[13.5px] font-medium text-black">
                {t('allProducts.productCount', { count: formatNumber(sortedProducts.length) })}
              </span>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1.5 text-[14px] font-normal text-black hover:underline"
                aria-haspopup="listbox"
                aria-expanded={showSortDropdown}
              >
                {t('allProducts.sortBy', { option: t(SORT_OPTIONS.find(o => o.value === sortBy)?.labelKey) })}
                <ChevronDown size={14} strokeWidth={2} className="text-black" />
              </button>
              {showSortDropdown && (
                <ul
                  className="absolute start-0 top-full mt-1 min-w-[190px] bg-white border border-[#E5E5E5] shadow-lg z-20 rounded-[4px] overflow-hidden"
                  role="listbox"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <li key={opt.value} role="option" aria-selected={sortBy === opt.value}>
                      <button
                        type="button"
                        onClick={() => handleSortChange(opt.value)}
                        className={`w-full ps-3.5 pe-3.5 py-2.5 text-start text-[13.5px] font-normal text-black hover:bg-gray-50 ${sortBy === opt.value ? 'font-semibold' : ''}`}
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

      {/* Mobile Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        appliedValues={currentFilterValues}
        onApply={handleFilterChange}
        brandCounts={brandCounts}
        priceBounds={{ min: MIN_PRICE, max: MAX_PRICE }}
        resultCount={computeDraftCount}
      />
    </div>
  )
}