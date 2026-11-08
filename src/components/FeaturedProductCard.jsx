import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { featuredProduct } from '../data/products'
import { useCart } from '../contexts/CartContext'
import { formatPrice } from '../utils/format'
import { getProductImage } from '../utils/productImages'
import { getBadgeLabel } from './ProductCard'

export default function FeaturedProductCard({ product, variant = 'default', className = '' }) {
  const { t, i18n } = useTranslation()
  const { addItem } = useCart()
  const data = product || featuredProduct
  const { nameKey, price, oldPrice, badge, slug } = data
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
      className={`relative z-40 static md:relative w-full md:w-[440px] h-auto md:h-[225px] max-w-[calc(100%-32px)] flex flex-col md:flex-row gap-3.5 rounded-md p-2 overflow-hidden bg-[#F5F3EE]/95 backdrop-blur-md border border-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.15)] text-[#111] ${className}`}
    >
      <Link
        to={`/product/${slug}`}
        className="relative w-full md:w-[262px] flex-none h-auto md:h-full aspect-[4/3] md:aspect-auto overflow-hidden rounded-[3px] bg-gradient-to-b from-[#E9E8E3] to-[#F3F2EE] block"
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
            className="absolute top-3 start-3 bg-[#FFC83D] text-[#3A3A3A] text-[11px] font-normal uppercase px-[10px] py-[3px] rounded-none border-none"
            style={{ lineHeight: 1.25, letterSpacing: 0 }}
          >
            {badgeLabel}
          </span>
        )}
      </Link>
      <div className="w-full md:w-auto flex-1 min-w-0 flex flex-col justify-between py-1 text-start">
        <div className="text-start">
          <Link
            to={`/product/${slug}`}
            className="block text-[#111]"
            style={{ lineHeight: 1.25, letterSpacing: 0 }}
          >
            <bdi
              dir="ltr"
              className="block text-[12px] font-semibold uppercase text-start text-[#111] break-words"
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
          className="w-fit max-w-full h-8 px-4 inline-flex items-center justify-center whitespace-nowrap rounded-full border border-[#111] bg-transparent text-[11px] font-semibold text-[#111] leading-none hover:bg-black hover:text-white transition-colors cursor-pointer"
          style={{ lineHeight: 1, letterSpacing: 0 }}
        >
          {added ? t('products.added') : (isRTL ? 'افزودن به سبد' : t('products.addToCart'))}
        </button>
      </div>
    </div>
  )
}