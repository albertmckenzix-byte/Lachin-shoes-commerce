import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { featuredProduct } from '../data/products'
import { useCart } from '../contexts/CartContext'
import { useWishlist } from '../contexts/WishlistContext'
import { formatPrice } from '../utils/format'
import { getProductImage } from '../utils/productImages'
import { getBadgeLabel } from './ProductCard'

export default function FeaturedProductCard({ product, variant = 'default', className = '' }) {
  const { t, i18n } = useTranslation()
  const { addItem } = useCart()
  const { isFavorite, toggleFavorite } = useWishlist()
  const data = product || featuredProduct
  const { nameKey, price, oldPrice, badge, slug } = data
  const isFav = isFavorite(slug || data.id)
  const imageUrl = getProductImage(data)
  const displayName = data.name || t(nameKey)
  const isRTL = i18n.language === 'fa'
  const badgeLabel = getBadgeLabel(badge, t)

  const [added, setAdded] = useState(false)

  const handleAddToCart = (e) => {
    e.stopPropagation()
    addItem(data)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div
      className={`relative z-40 max-md:absolute max-md:bottom-20 max-md:end-9 max-md:start-auto w-[440px] max-md:w-[min(300px,calc(100%-32px))] h-[225px] max-md:h-[150px] flex flex-row gap-3.5 max-md:gap-2 rounded-md max-md:rounded p-2 max-md:p-1.5 overflow-hidden bg-[#F5F3EE]/95 backdrop-blur-md border border-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.15)] text-[#111] ${className}`}
    >
      <Link
        to={`/product/${slug}`}
        className="relative w-[262px] max-md:w-[160px] h-full flex-none overflow-hidden rounded-[3px] bg-gradient-to-b from-[#E9E8E3] to-[#F3F2EE] block"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="h-full w-full object-contain p-1 mix-blend-multiply"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#E9E8E3] to-[#F3F2EE]" />
        )}
        {badgeLabel && (
          <span
            className="absolute top-3 start-3 max-md:top-1.5 max-md:start-1.5 bg-[#FFC83D] text-[#3A3A3A] text-[11px] max-md:text-[9px] font-normal uppercase px-[10px] max-md:px-2 py-[3px] max-md:py-0.5 rounded-none border-none"
            style={{ lineHeight: 1.25, letterSpacing: 0 }}
          >
            {badgeLabel}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleFavorite(data)
          }}
          aria-label={isFav ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
          className="absolute bottom-2 start-2 max-md:bottom-1.5 max-md:start-1.5 z-10 flex h-7 w-7 max-md:h-6 max-md:w-6 items-center justify-center rounded-full bg-white/90 shadow-xs backdrop-blur-xs transition-transform hover:scale-110 active:scale-95"
        >
          <Heart
            size={14}
            strokeWidth={1.75}
            className={isFav ? 'fill-[#E11D48] text-[#E11D48]' : 'text-[#333] hover:text-black'}
          />
        </button>
      </Link>
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1 max-md:py-0.5 text-start">
        <div className="text-start">
          <Link
            to={`/product/${slug}`}
            className="block text-[#111]"
            style={{ lineHeight: 1.25, letterSpacing: 0 }}
          >
            <bdi
              dir="ltr"
              className="block text-[12px] max-md:text-[9px] font-semibold uppercase text-start text-[#111] break-words"
              style={{ lineHeight: 1.25, letterSpacing: 0 }}
            >
              {displayName}
            </bdi>
          </Link>
          <div className="mt-2 max-md:mt-1 flex flex-wrap gap-x-2 items-center">
            <span
              className="text-[13px] max-md:text-[10px] font-normal text-[#111] whitespace-nowrap"
              style={{ lineHeight: 1.25, letterSpacing: 0 }}
            >
              {formatPrice(price)}
            </span>
            {oldPrice && (
              <span
                className="text-[12px] max-md:text-[9px] font-normal text-[#8A8A8A] line-through whitespace-nowrap"
                style={{ lineHeight: 1.25, letterSpacing: 0 }}
              >
                {formatPrice(oldPrice)}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full md:w-fit max-w-full h-8 max-md:h-7 px-4 max-md:px-2 inline-flex items-center justify-center whitespace-nowrap rounded-full border border-[#111] bg-transparent text-[11px] max-md:text-[10px] font-semibold text-[#111] leading-none hover:bg-black hover:text-white transition-colors cursor-pointer mt-1 max-md:mt-1.5"
          style={{ lineHeight: 1, letterSpacing: 0 }}
        >
          {added ? t('products.added') : (isRTL ? 'افزودن به سبد' : t('products.addToCart'))}
        </button>
      </div>
    </div>
  )
}