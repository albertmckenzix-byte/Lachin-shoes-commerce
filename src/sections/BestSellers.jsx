import { useTranslation } from 'react-i18next'
import ProductCard from '../components/ProductCard'
import { useProducts } from '../context/ProductsContext'
import { Link } from 'react-router-dom'

export default function BestSellers() {
  const { t } = useTranslation()
  const { products, loading } = useProducts()
  const bestSellers = products.filter((p) => p.bestSeller).slice(0, 4)

  if (loading && products.length === 0) {
    return (
      <section className="relative z-10 bg-white pt-12 pb-[60px] px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] rounded-[6px] bg-[#ECECEC]" />
              <div className="mt-[14px] h-4 w-3/4 rounded bg-[#ECECEC]" />
              <div className="mt-2 h-4 w-1/2 rounded bg-[#ECECEC]" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="relative z-10 bg-white pt-12 pb-[60px] px-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[20px] uppercase font-normal tracking-[0.01em] text-black">
          {t('bestSellers.title')}
        </h2>
        <Link
          to="/all-products"
          className="inline-flex items-center justify-center w-[104px] h-[38px] rounded-full border-[1.5px] border-black text-[11px] font-bold uppercase hover:bg-black hover:text-white transition-colors"
        >
          {t('bestSellers.viewAll')}
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {bestSellers.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}