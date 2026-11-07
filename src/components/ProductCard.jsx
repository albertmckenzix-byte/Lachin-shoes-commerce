import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { formatPrice } from '../utils/format'
import { useCart } from '../contexts/CartContext'
import { getProductImage } from '../utils/productImages'

export function getBadgeLabel(badge, t) {
  if (!badge) return null
  if (badge === 'SALE') return t('badges.sale')
  if (badge === 'BEST SELLER') return t('badges.bestSeller')
  return null
}

export default function ProductCard({ product, variant = 'default' }) {
  const { t } = useTranslation()
  const { addItem } = useCart()
  const { nameKey, price, oldPrice, badge, slug } = product
  const isListing = variant === 'listing'
  const imageUrl = getProductImage(product)
  const displayName = product.name || t(nameKey)
  const badgeLabel = getBadgeLabel(badge, t)

  const [added, setAdded] = useState(false)

  const handleAddToCart = (e) => {
    e.stopPropagation()
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const listingClasses = 'text-[10px] py-[4px]'
  const defaultClasses = 'text-[11px] py-[6px]'

  return (
    <div className="group block">
      <Link to={`/product/${slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[6px] bg-gradient-to-b from-[#E9E9E9] to-[#F4F4F2]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full h-full object-contain p-4 mix-blend-multiply transition-transform duration-500 ease group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-[#E9E9E9] to-[#F4F4F2]" />
          )}
          {badgeLabel && (
            <span className={`absolute top-[12px] end-[12px] text-[10px] font-medium px-[10px] py-[2px] ${isListing ? 'rounded-none bg-[#FFC83D] text-black' : 'rounded-[3px] bg-white text-gray-700'}`}>
              {badgeLabel}
            </span>
          )}
        </div>
        <h3 className={isListing ? 'mt-[14px] text-[11px] font-semibold uppercase tracking-[0.01em] text-black' : 'mt-[14px] text-[12px] font-semibold uppercase tracking-[0.01em] text-black'}>
          {displayName}
        </h3>
      </Link>
      <div className="mt-[6px] flex items-center gap-2">
        <span className={isListing ? 'text-[12px] text-black' : 'text-[14px] text-black'}>{formatPrice(price)}</span>
        {oldPrice && (
          <span className={isListing ? 'text-[#8a8a8a] line-through text-[12px]' : 'text-[#8a8a8a] line-through text-[14px]'}>
            {formatPrice(oldPrice)}
          </span>
        )}
      </div>
      <button
        className={`mt-[8px] pill ${isListing ? listingClasses : defaultClasses}`}
        onClick={handleAddToCart}
      >
        {added ? t('products.added') : t('products.addToCart')}
      </button>
    </div>
  )
}