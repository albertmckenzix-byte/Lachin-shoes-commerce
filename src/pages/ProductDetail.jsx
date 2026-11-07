import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import { useProducts } from '../context/ProductsContext'
import Gallery from '../components/product/Gallery'
import ProductInfo from '../components/product/ProductInfo'
import PurchasePanel from '../components/product/PurchasePanel'
import ProductAccordion from '../components/product/ProductAccordion'
import RelatedProducts from '../components/product/RelatedProducts'
import { formatPrice } from '../utils/format'

export default function ProductDetail() {
  const { t, i18n } = useTranslation()
  const { slug } = useParams()
  const { products, loading, getBySlug } = useProducts()
  const product = getBySlug(slug)
  const isRTL = i18n.language === 'fa'

  useEffect(() => {
    if (product) {
      document.title = `${product.name || t(product.nameKey)} | Lachin`
    }
    return () => {
      document.title = 'Lachin'
    }
  }, [product, t, i18n.language])

  if (loading && !product) {
    return (
      <div className="min-h-screen bg-white py-20 px-6" dir="rtl">
        <div className="max-w-[1600px] mx-auto grid gap-14 lg:grid-cols-[1fr_1fr]">
          <div className="aspect-square max-h-[460px] animate-pulse rounded-[6px] bg-[#ECECEC]" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-[#ECECEC]" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-[#ECECEC]" />
            <div className="h-24 w-full animate-pulse rounded bg-[#ECECEC]" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white py-20 px-6" dir="rtl">
        <div className="max-w-[800px] mx-auto text-center">
          <h1 className="text-[24px] font-normal text-black mb-6">محصول پیدا نشد</h1>
          <p className="text-black mb-8">The product you're looking for doesn't exist.</p>
          <Link
            to="/all-products"
            className="inline-flex items-center justify-center w-[104px] h-[38px] rounded-full border-[1.5px] border-black text-[11px] font-bold uppercase hover:bg-black hover:text-white transition-colors"
          >
            {t('allProducts.browseProducts')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <main className="max-w-[1600px] mx-auto px-[24px] pt-[32px] pb-[80px]">
        <div className="grid gap-14 lg:grid-cols-[1fr_1fr]">
          <div className="lg:self-start lg:max-w-[460px] w-full lg:mx-auto">
            <Gallery product={product} />
          </div>
          <div className="flex flex-col gap-[30px] lg:self-start">
            <ProductInfo product={product} />
            <PurchasePanel product={product} />
            <ProductAccordion product={product} />
          </div>
        </div>

        <RelatedProducts product={product} products={products} />
      </main>

      <MobileStickyBar product={product} />
    </div>
  )
}

function MobileStickyBar({ product }) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

  return (
    <div className="lg:hidden fixed bottom-0 start-0 end-0 z-50 bg-white border-t border-[#E5E5E5] px-[16px] py-[12px] pb-safe">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-[12px]">
        <div className="flex items-center justify-between text-[14px]">
          <span className="font-semibold text-black">{t('purchasePanel.total')}</span>
          <span className="text-[24px] font-semibold text-black">{formatPrice(product.price)}</span>
        </div>
        {product.totalStock === 0 ? (
          <button
            type="button"
            disabled
            className="flex-1 h-[48px] rounded-[4px] bg-gray-300 text-white text-[13px] font-medium"
          >
            ناموجود
          </button>
        ) : (
          <>
            <button
              type="button"
              className="flex-1 h-[48px] rounded-[4px] border border-black bg-white text-black text-[13px] font-medium transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              {t('products.addToCart')}
            </button>
            <button
              type="button"
              className="flex-1 h-[48px] rounded-[4px] bg-black text-white text-[13px] font-medium transition-colors hover:bg-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              {t('purchasePanel.buyNow')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}