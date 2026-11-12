import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { formatPrice } from '../utils/format'
import { useWishlist } from '../contexts/WishlistContext'
import { getProductImage } from '../utils/productImages'

export function getBadgeLabel(badge, t) {
  if (!badge) return null
  if (badge === 'SALE') return t('badges.sale')
  if (badge === 'BEST SELLER') return t('badges.bestSeller')
  return null
}

export default function ProductCard({ product, variant = 'default' }) {
  const { t } = useTranslation()
  const { isFavorite, toggleFavorite } = useWishlist()
  const { nameKey, price, oldPrice, badge, slug } = product
  const isFav = isFavorite(slug || product.id)
  const isListing = variant === 'listing'
  const imageUrl = getProductImage(product)
  const displayName = product.name || t(nameKey)
  const badgeLabel = getBadgeLabel(badge, t)

  return (
    <div className="group block w-full min-w-0">
      <Link to={`/product/${slug}`} className="block w-full min-w-0">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[6px] bg-gradient-to-b from-[#E9E9E9] to-[#F4F4F2]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full h-full object-contain p-2 sm:p-4 mix-blend-multiply transition-transform duration-500 ease group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-[#E9E9E9] to-[#F4F4F2]" />
          )}
          {badgeLabel && (
            <span className={`absolute top-[12px] end-[12px] text-[10px] font-medium px-[10px] py-[2px] ${isListing ? 'rounded-none bg-[#FFC83D] text-black' : 'rounded-[3px] bg-white text-gray-700'}`}>
              {badgeLabel}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleFavorite(product)
            }}
            aria-label={isFav ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
            className="absolute top-[10px] start-[10px] z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-xs backdrop-blur-xs transition-transform hover:scale-110 active:scale-95"
          >
            <Heart
              size={16}
              strokeWidth={1.75}
              className={isFav ? 'fill-[#E11D48] text-[#E11D48]' : 'text-[#333] hover:text-black'}
            />
          </button>
        </div>
        <h3
          dir="ltr"
          className="mt-[14px] text-[13px] sm:text-[14px] font-semibold uppercase tracking-[0.01em] text-black truncate text-center"
        >
          {displayName}
        </h3>
        <div className="mt-[6px] flex items-center justify-center gap-2">
          <span className="text-[14px] sm:text-[15px] font-medium text-black">{formatPrice(price)}</span>
          {oldPrice && (
            <span className="text-[#8a8a8a] line-through text-[13px] sm:text-[14px]">
              {formatPrice(oldPrice)}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}