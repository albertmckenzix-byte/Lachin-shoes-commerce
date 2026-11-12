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
      className={`relative z-40 w-full max-w-[390px] md:max-w-none md:w-[440px] h-auto md:h-[225px] flex flex-row gap-3 md:gap-3.5 rounded-lg md:rounded-md p-2 overflow-hidden bg-[#F5F3EE]/95 backdrop-blur-md border border-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.15)] text-[#111] ${className}`}
    >
      <Link
        to={`/product/${slug}`}
        className="relative w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] md:w-[262px] md:h-full flex-none overflow-hidden rounded-[4px] md:rounded-[3px] bg-gradient-to-b from-[#E9E8E3] to-[#F3F2EE] block"
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
            className="absolute top-2 start-2 md:top-3 md:start-3 bg-[#FFC83D] text-[#3A3A3A] text-[9px] md:text-[11px] font-normal uppercase px-1.5 md:px-[10px] py-0.5 md:py-[3px] rounded-none border-none"
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
          className="absolute bottom-1.5 start-1.5 md:bottom-2 md:start-2 z-10 flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full bg-white/90 shadow-xs backdrop-blur-xs transition-transform hover:scale-110 active:scale-95"
        >
          <Heart
            size={14}
            strokeWidth={1.75}
            className={isFav ? 'fill-[#E11D48] text-[#E11D48]' : 'text-[#333] hover:text-black'}
          />
        </button>
      </Link>
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 md:py-1 text-start">
        <div className="text-start">
          <Link
            to={`/product/${slug}`}
            className="block text-[#111]"
            style={{ lineHeight: 1.25, letterSpacing: 0 }}
          >
            <bdi
              dir="ltr"
              className="block text-[11px] sm:text-[12px] font-semibold uppercase text-start text-[#111] line-clamp-2 md:line-clamp-none break-words"
              style={{ lineHeight: 1.25, letterSpacing: 0 }}
            >
              {displayName}
            </bdi>
          </Link>
          <div className="mt-2 flex flex-wrap gap-x-2 items-center">
            <span
              className="text-[13px] font-normal text-[#111] whitespace-nowrap"
              style={{ lineHeight: 1.25, letterSpacing: 0 }}
            >
              {formatPrice(price)}
            </span>
            {oldPrice && (
              <span
                className="text-[12px] font-normal text-[#8A8A8A] line-through whitespace-nowrap"
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
          className="w-fit max-w-full h-7 md:h-8 px-3 md:px-4 inline-flex items-center justify-center whitespace-nowrap rounded-full border border-[#111] bg-transparent text-[10px] md:text-[11px] font-semibold text-[#111] leading-none hover:bg-black hover:text-white transition-colors cursor-pointer mt-1"
          style={{ lineHeight: 1, letterSpacing: 0 }}
        >
          {added ? t('products.added') : (isRTL ? 'افزودن به سبد' : t('products.addToCart'))}
        </button>
      </div>
    </div>
  )
}