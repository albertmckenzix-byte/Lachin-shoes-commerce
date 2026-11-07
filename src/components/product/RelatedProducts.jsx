import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getProductImage } from '../../utils/productImages'

export default function RelatedProducts({ product, products }) {
  const { t } = useTranslation()

  const getRelatedProducts = () => {
    const sameCategory = products.filter(
      (p) => p.id !== product.id && p.category === product.category
    )
    const otherProducts = products.filter(
      (p) => p.id !== product.id && p.category !== product.category
    )
    return [...sameCategory, ...otherProducts].slice(0, 4)
  }

  const relatedProducts = getRelatedProducts()

  if (relatedProducts.length === 0) return null

  return (
    <section className="mt-[90px] w-full" aria-label={t('relatedProducts.label')}>
      <h2 className="text-[28px] font-semibold text-black leading-[1.4]" style={{ fontSize: 'clamp(24px, 2.5vw, 28px)' }}>
        {t('relatedProducts.title')}
      </h2>
      <div className="mt-[28px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">
        {relatedProducts.map((p) => (
          <Link key={p.id} to={`/product/${p.slug}`} className="block group no-underline">
            <div className="relative aspect-[0.9/1] bg-[#F7F7F7] overflow-hidden">
              {getProductImage(p) ? (
                <img
                  src={getProductImage(p)}
                  alt={p.name || t(p.nameKey)}
                  className="w-full h-full object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-[#F2F2F2] to-[#FAFAFA]" />
              )}
            </div>
            <h3 className="mt-[14px] text-[18px] font-medium text-black">
              {p.name || t(p.nameKey)}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  )
}