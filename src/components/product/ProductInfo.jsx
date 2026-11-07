import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'

function formatReviewCount(count) {
  if (count >= 1000) {
    const k = count / 1000
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1).replace('.', '.')}K`
  }
  return count.toString()
}

function formatReviewCountPersian(count) {
  if (count >= 1000) {
    const k = count / 1000
    return k % 1 === 0
      ? `${k.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])} هزار`
      : `${k.toFixed(1).replace('.', '٫').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])} هزار`
  }
  return count.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])
}

function getCategoryLink(category) {
  switch (category) {
    case 'running-shoes':
      return '/all-products?category=performance-series'
    case 'kids-shoes':
      return '/all-products?category=kids'
    default:
      return '/all-products'
  }
}

function getCategoryLabel(category, t) {
  switch (category) {
    case 'running-shoes':
      return t('menu.performanceSeries')
    case 'kids-shoes':
      return t('menu.kidsShoes')
    default:
      return ''
  }
}

export default function ProductInfo({ product }) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

  const categoryLink = getCategoryLink(product.category)
  const categoryLabel = getCategoryLabel(product.category, t)

  const rating = product.rating
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5

  const reviewCountFormatted = isRTL
    ? formatReviewCountPersian(product.reviewCount)
    : formatReviewCount(product.reviewCount)

  return (
    <div className="w-full">
      <div className="flex items-center gap-[8px] text-[13px] mb-[14px]">
        <span className="text-gray-500">Lachin</span>
        <span className="text-gray-400">/</span>
        <Link
          to={categoryLink}
          className="hover:underline text-black font-medium"
        >
          {categoryLabel}
        </Link>
      </div>

      <h1 className="text-[36px] font-semibold leading-[1.3] tracking-[0] text-black mb-[14px]" style={{ fontSize: 'clamp(26px, 3vw, 36px)' }}>
        {product.name || t(product.nameKey)}
      </h1>

      <div className="flex items-center gap-[8px] mb-[18px]">
        <div className="flex items-center gap-[2px]">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={16}
              className={
                i < fullStars
                  ? 'fill-[#F5B731] text-[#F5B731]'
                  : i === fullStars && hasHalfStar
                  ? 'fill-[#F5B731] text-[#F5B731]'
                  : 'text-gray-300'
              }
            />
          ))}
        </div>
        <span className="text-[13px] font-medium text-black">
          {reviewCountFormatted} {t('productDetail.reviews')}
        </span>
      </div>

      <div className="flex flex-wrap gap-[8px] mb-[30px]">
        {(product.tags || []).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-[12px] py-[6px] rounded-full border border-[#E8E8E8] bg-[#FAFAFA] text-[12px] text-black"
          >
            {i18n.exists(`tags.${tag}`) ? t(`tags.${tag}`) : tag}
          </span>
        ))}
      </div>

      <h2 className="text-[18px] font-semibold text-black mb-[10px]">
        {t('productDetail.description')}
      </h2>
      <p className="text-[14px] text-[#7A7A7A] leading-[1.9]">
        {isRTL
          ? product.descriptionFa || (product.descriptionKey ? t(product.descriptionKey) : '')
          : product.descriptionEn || (product.descriptionKey ? t(product.descriptionKey) : '')}
      </p>
    </div>
  )
}