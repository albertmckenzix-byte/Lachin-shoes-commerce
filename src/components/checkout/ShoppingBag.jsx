import { useTranslation } from 'react-i18next'
import { useCart } from '../../contexts/CartContext'
import { useProducts } from '../../context/ProductsContext'
import { formatPrice, formatNumber } from '../../utils/format'
import { Link } from 'react-router-dom'
import OrderSummary from './OrderSummary'
import { getProductImage } from '../../utils/productImages'

export default function ShoppingBag({ promoCode, setPromoCode, discount, setDiscount, selectedDelivery, total, isPayDisabled, hideTitle = false, idPrefix }) {
  const { t } = useTranslation()
  const { items, count, subtotal, removeItem, updateQuantity } = useCart()
  const { products } = useProducts()

  if (items.length === 0) {
    return (
      <div className="lg:sticky lg:top-24">
        <div className="bg-gray-50 p-6 rounded-[4px] text-center py-12">
          <p className="text-[24px] font-normal text-black leading-[1.3] mb-6">{t('checkout.bagEmpty')}</p>
          <Link to="/all-products" className="inline-flex items-center justify-center w-full sm:w-auto h-[44px] px-6 rounded-full border border-black text-[11px] font-semibold hover:bg-black hover:text-white transition-colors">
            {t('checkout.browseProducts')}
          </Link>
        </div>
      </div>
    )
  }

  const getProduct = (id) => products.find((p) => p.id === id)

  return (
    <div className="lg:sticky lg:top-24">
      <div className="bg-white">
        {!hideTitle && (
          <h2 className="text-[24px] font-normal text-black leading-[1.3] mb-6">
          {t('checkout.shoppingBag')} ({formatNumber(count)})
        </h2>
        )}

        <div className="space-y-0">
          {items.map((item, index) => {
            const product = getProduct(item.productId)
            if (!product) return null

            const sizeEntry = Array.isArray(product.sizes)
              ? product.sizes.find((s) => Number(s.us) === Number(item.size))
              : null
            const exceedsStock = sizeEntry
              ? item.quantity > sizeEntry.stock
              : false

            return (
              <div key={`${item.productId}-${item.size}-${item.color}`} className="border-b border-[#BDBDBD] py-[16px]">
                <div className="flex gap-4">
                  <div className="w-[52px] h-[62px] bg-[#E9E9E9] flex-shrink-0 overflow-hidden relative" aria-hidden="true">
                    {getProductImage(product) ? (
                      <img
                        src={getProductImage(product)}
                        alt=""
                        className="w-full h-full object-contain p-2 mix-blend-multiply"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#E9E9E9]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-black leading-[1.3] truncate">{product.name || t(product.nameKey)}</p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] leading-[1.4]">
                      <span className="w-[56px] flex-shrink-0 text-[#8a8a8a]">{t('checkout.size')}: </span>
                      <span className="text-black">{item.size || 'M'}</span>
                      <span className="w-[56px] flex-shrink-0 text-[#8a8a8a]">{t('checkout.color')}: </span>
                      <span className="text-black">{item.color || 'Black'}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="w-[56px] flex-shrink-0 text-[#8a8a8a]">{t('checkout.quantity')}: </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-[22px] h-[22px] border border-[#BDBDBD] text-black text-[12px] flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
                          aria-label={t('checkout.quantity') + ' ' + t('checkout.remove')}
                        >
                          −
                        </button>
                        <span className="w-[24px] text-center text-black">{formatNumber(item.quantity)}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity + 1)}
                          className="w-[22px] h-[22px] border border-[#BDBDBD] text-black text-[12px] flex items-center justify-center hover:bg-gray-100 rounded-none"
                          aria-label={t('checkout.quantity') + ' ' + t('checkout.add')}
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[13px] font-medium text-black ms-auto">{formatPrice(product.price * item.quantity)}</span>
                    </div>
                    {exceedsStock && (
                      <p className="mt-1 text-[11px] text-[#B3261E]">
                        موجودی این سایز کافی نیست
                      </p>
                    )}
                    <button
                      onClick={() => removeItem(item.productId, item.size, item.color)}
                      className="mt-2 text-[11px] text-gray-500 underline hover:text-black"
                    >
                      {t('checkout.remove')}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <OrderSummary
          subtotal={subtotal}
          selectedDelivery={selectedDelivery}
          discount={discount}
          promoCode={promoCode}
          setPromoCode={setPromoCode}
          setDiscount={setDiscount}
          idPrefix={idPrefix || (hideTitle ? 'mobile' : 'desktop')}
        />
      </div>
    </div>
  )
}