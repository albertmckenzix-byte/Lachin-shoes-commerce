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

  if (variant === 'light') {
    return (
      <div
        className={`w-[440px] max-w-[calc(100%-32px)] h-[220px] overflow-hidden rounded-[4px] p-[8px] flex flex-col md:flex-row gap-[12px] bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${isRTL ? 'flex-row-reverse' : ''} ${className}`}
      >
        <div className="w-[277px] flex-none h-full rounded-[2px] relative overflow-hidden bg-gradient-to-b from-[#EDEDEB] to-[#F6F6F4] aspect-[4/3] md:aspect-auto">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="h-full w-full object-contain p-3 mix-blend-multiply"
              style={{ clipPath: 'inset(0 0 3% 0)' }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-[#EDEDEB] to-[#F6F6F4]" />
          )}
          {badgeLabel && (
            <span className="absolute top-[2.5px] start-[2.5px] bg-[#FFC83D] text-black text-[10px] font-medium px-[10px] py-[2px] rounded-none border-none">
              {badgeLabel}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between p-0 py-[6px]">
          <div className="text-start">
            <bdi dir="ltr" className="text-[11px] font-semibold uppercase leading-[1.3] text-black break-words">
              {displayName}
            </bdi>
            <div className="mt-[6px] flex flex-wrap gap-x-2">
              <span className="text-[12px] text-black whitespace-nowrap">{formatPrice(price)}</span>
              {oldPrice && (
                <span className="text-[11px] text-[#8a8a8a] line-through">{formatPrice(oldPrice)}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            className="inline-flex items-center justify-center text-center font-semibold border-[1.5px] border-black rounded-full text-black bg-transparent hover:bg-black hover:text-white transition-colors"
            style={{
              boxSizing: 'border-box',
              overflow: 'hidden',
              width: 'max-content',
              maxWidth: '100%',
              fontSize: '10px',
              padding: '6px 12px',
              lineHeight: '1',
              direction: 'rtl'
            }}
          >
            {added ? t('products.added') : t('products.addToCart')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex w-full min-w-[430px] md:min-w-0 md:w-[430px] h-[230px] items-stretch overflow-hidden rounded-[4px] border border-white/40 bg-white/70 backdrop-blur-md shadow-lg ${className}`}
    >
      <Link to={`/product/${slug}`} className="block relative w-[40%] min-w-[120px] bg-[#E8E8E8]">
        {badgeLabel && (
          <span className="absolute start-2 top-2 bg-[#FFC83D] text-black text-[9px] font-medium px-2 py-0.5 rounded">
            {badgeLabel}
          </span>
        )}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="w-full h-full object-contain p-4 mix-blend-multiply"
          />
        ) : (
          <div className="w-full h-full bg-[#E8E8E8]" />
        )}
      </Link>
      <div className="flex flex-1 flex-col justify-between p-4">
        <Link to={`/product/${slug}`} className="block">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-black">
              {displayName}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-black font-medium">{formatPrice(price)}</span>
              {oldPrice && (
                <span className="text-[12px] text-gray-400 line-through">
                  {formatPrice(oldPrice)}
                </span>
              )}
            </div>
          </div>
        </Link>
        <button className="pill self-start" onClick={handleAddToCart}>
          {added ? t('products.added') : t('products.addToCart')}
        </button>
      </div>
    </div>
  )
}