import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { useMenu } from '../contexts/MenuContext'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { formatPrice } from '../utils/format'
import { useProducts } from '../context/ProductsContext'
import { searchProducts } from '../utils/search'
import { getProductImage } from '../utils/productImages'
import { getBadgeLabel } from './ProductCard'

const TRENDING_SLUGS = ['jordan-4-retro-oxidized-green', 'new-balance-740-v2-trainers', 'nike-sportswear-older-kids-air-force-1-lv8', 'reebok-dmx-1200-grey-blue', 'air-jordan-1-mid-linen']

export default function SearchOverlay() {
  const { t, i18n } = useTranslation()
  const { isSearchOpen, closeSearch } = useMenu()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inputRef = useRef(null)
  const overlayRef = useRef(null)
  const [isRtl, setIsRtl] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const { products } = useProducts()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 150)
    return () => clearTimeout(timer)
  }, [query])

  const results = debouncedQuery ? searchProducts(products, debouncedQuery, t) : []

  const trendingProducts = TRENDING_SLUGS
    .map((slug) => products.find((p) => p.slug === slug))
    .filter(Boolean)

  const displayProducts = debouncedQuery ? results.slice(0, 8) : trendingProducts
  const showResults = !!debouncedQuery
  const hasResults = debouncedQuery && results.length > 0

  useEffect(() => {
    const dir = document.documentElement.dir
    setIsRtl(dir === 'rtl')
  }, [])

  useEffect(() => {
    const dir = document.documentElement.dir
    setIsRtl(dir === 'rtl')
  }, [i18n.language])

  useEffect(() => {
    if (isSearchOpen) {
      document.body.style.overflow = 'hidden'
      inputRef.current?.focus()
    } else {
      document.body.style.overflow = ''
      setQuery('')
      setDebouncedQuery('')
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isSearchOpen])

  const handleSearchAll = useCallback(() => {
    const path = query ? `/all-products?search=${encodeURIComponent(query)}` : '/all-products'
    navigate(path)
    closeSearch()
  }, [query, navigate, closeSearch])

  const handleKeyDownInput = (e) => {
    if (e.key === 'Enter') {
      handleSearchAll()
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isSearchOpen) return
      if (e.key === 'Escape') {
        closeSearch()
        return
      }
      if (e.key === 'Tab') {
        const focusableElements = overlayRef.current?.querySelectorAll(
          'a[href], button, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusableElements?.length) return
        const first = focusableElements[0]
        const last = focusableElements[focusableElements.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSearchOpen, closeSearch])

  const handleLinkClick = () => {
    closeSearch()
  }

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const transitionDuration = prefersReducedMotion ? '1ms' : '350ms'

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 120,
    background: 'white',
    overflowY: 'auto',
    opacity: isSearchOpen ? 1 : 0,
    transform: isSearchOpen ? 'translateY(0)' : 'translateY(-16px)',
    visibility: isSearchOpen ? 'visible' : 'hidden',
    pointerEvents: isSearchOpen ? 'auto' : 'none',
    transition: `opacity ${transitionDuration} ease-out, transform ${transitionDuration} ease-out, visibility 0s linear ${isSearchOpen ? '0s' : transitionDuration}`,
  }

  return (
    <div
      ref={overlayRef}
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label={t('search.dialogLabel')}
      aria-hidden={!isSearchOpen}
      inert={isSearchOpen ? false : true}
    >
      <div className="mx-auto w-[min(1040px,92%)] pt-[26px] pb-[80px]">
        <div className="flex items-center gap-[20px]">
          <div className="flex-1 h-[38px] border border-black relative flex items-center">
            <input
              ref={inputRef}
              type="search"
              placeholder={t('search.placeholder')}
              className="flex-1 h-full ps-10 pe-3 outline-none bg-transparent text-[14px]"
              autoComplete="off"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDownInput}
            />
            <Search size={16} className="absolute start-3" />
          </div>
          <button
            onClick={closeSearch}
            className="text-[14px] text-black border-0 bg-transparent hover:underline cursor-pointer"
            style={{ lineHeight: 1 }}
          >
            {t('search.close')}
          </button>
        </div>

        {showResults ? (
          <>
            <h2 className="mt-[62px] text-[13px] font-bold text-black tracking-[0] text-start">
              {t('search.searchResultsHeading', { query })}
              <span className="font-normal ml-2">
                {t('search.resultsCount', { count: results.length })}
              </span>
            </h2>
            {hasResults ? (
              <div className="mt-[26px] grid grid-cols-2 md:grid-cols-4 gap-4">
                {displayProducts.map((product) => (
                  <Link
                    key={product.slug}
                    to={`/product/${product.slug}`}
                    onClick={handleLinkClick}
                    className="flex flex-col"
                  >
                    <div className="aspect-square relative overflow-hidden bg-gradient-to-b from-[#E9E9E9] to-[#F5F5F5]">
                      {getProductImage(product) ? (
                        <img
                          src={getProductImage(product)}
                          alt=""
                          className="w-full h-full object-contain p-4 mix-blend-multiply"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-[#E9E9E9] to-[#F5F5F5]" />
                      )}
                      {getBadgeLabel(product.badge, t) && (
                        <div className="absolute start-[10px] top-[10px] bg-[#FFC83D] text-black text-[11px] font-medium px-[10px] py-[3px]">
                          {getBadgeLabel(product.badge, t)}
                        </div>
                      )}
                    </div>
                    <div className="mt-[14px] text-[13px] font-normal text-black tracking-[0] text-start">
                      {product.name || t(product.nameKey)}
                    </div>
                    <div className="mt-[4px] text-[13px] flex items-center gap-[6px] text-start">
                      {product.oldPrice && (
                        <span className="line-through">{formatPrice(product.oldPrice)}</span>
                      )}
                      <span>{formatPrice(product.price)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-[26px] text-center">
                <p className="text-[14px] text-black">{t('search.noResults', { query })}</p>
                <p className="mt-[8px] text-[14px] text-[#666]">
                  {t('search.tryDifferentSearch')}
                  <Link
                    to="/all-products"
                    onClick={handleLinkClick}
                    className="ml-[6px] underline hover:text-black"
                  >
                    {' '}{t('allProducts.browseProducts')}{' '}
                  </Link>
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="mt-[62px] text-[13px] font-bold text-black tracking-[0] text-start">
              {t('search.trendingProducts')}
            </h2>

            <div className="mt-[26px] grid grid-cols-2 md:grid-cols-4 gap-4">
              {displayProducts.map((product) => (
                <Link
                  key={product.slug}
                  to={`/product/${product.slug}`}
                  onClick={handleLinkClick}
                  className="flex flex-col"
                >
                  <div className="aspect-square relative overflow-hidden bg-gradient-to-b from-[#E9E9E9] to-[#F5F5F5]">
                    {getProductImage(product) ? (
                      <img
                        src={getProductImage(product)}
                        alt=""
                        className="w-full h-full object-contain p-4 mix-blend-multiply"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-b from-[#E9E9E9] to-[#F5F5F5]" />
                    )}
                    {getBadgeLabel(product.badge, t) && (
                      <div className="absolute start-[10px] top-[10px] bg-[#FFC83D] text-black text-[11px] font-medium px-[10px] py-[3px]">
                        {getBadgeLabel(product.badge, t)}
                      </div>
                    )}
                  </div>
                  <div className="mt-[14px] text-[13px] font-normal text-black tracking-[0] text-start">
                    {product.name || t(product.nameKey)}
                  </div>
                  <div className="mt-[4px] text-[13px] flex items-center gap-[6px] text-start">
                    {product.oldPrice && (
                      <span className="line-through">{formatPrice(product.oldPrice)}</span>
                    )}
                    <span>{formatPrice(product.price)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="mt-[48px]">
          <Link
            to="/all-products"
            onClick={handleSearchAll}
            className="inline-flex items-center justify-center h-[44px] px-[22px] bg-black text-white text-[13px] font-medium hover:bg-[#222] transition-colors"
          >
            {t('search.showAllResults')}
          </Link>
        </div>
      </div>
    </div>
  )
}