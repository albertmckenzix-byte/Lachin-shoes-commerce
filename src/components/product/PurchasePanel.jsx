import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCart } from '../../contexts/CartContext'
import { useNavigate } from 'react-router-dom'
import { formatPrice } from '../../utils/format'
import SizeSelector from './SizeSelector'
import QuantityStepper from './QuantityStepper'

export default function PurchasePanel({ product }) {
  const { t, i18n } = useTranslation()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState(null)
  const [showSizeError, setShowSizeError] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [stockError, setStockError] = useState('')
  const sizeErrorRef = useRef(null)

  const selectedEntry = Array.isArray(product.sizes)
    ? product.sizes.find((s) => Number(s.us) === Number(selectedSize))
    : null
  const maxQuantity = selectedEntry
    ? Math.max(1, Math.min(10, selectedEntry.stock || 0))
    : 10
  const outOfStock = product.totalStock === 0

  useEffect(() => {
    if (addedToCart) {
      const timer = setTimeout(() => setAddedToCart(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [addedToCart])

  useEffect(() => {
    if (showSizeError && sizeErrorRef.current) {
      sizeErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [showSizeError])

  const handleSizeChange = useCallback((usSize) => {
    setSelectedSize(usSize)
    setStockError('')
    if (showSizeError) setShowSizeError(false)
    const entry = Array.isArray(product.sizes)
      ? product.sizes.find((s) => Number(s.us) === Number(usSize))
      : null
    const max = entry ? Math.max(1, Math.min(10, entry.stock || 0)) : 10
    setQuantity((q) => Math.min(q, max))
  }, [showSizeError, product.sizes])

  const handleAddToCart = useCallback(() => {
    if (!selectedSize) {
      setShowSizeError(true)
      return
    }
    const ok = addItem(product, { sizeUs: selectedSize, quantity })
    if (ok === false) {
      setStockError('موجودی این سایز کافی نیست')
      return
    }
    setStockError('')
    setAddedToCart(true)
  }, [product, selectedSize, quantity, addItem])

  const handleBuyNow = useCallback(() => {
    if (!selectedSize) {
      setShowSizeError(true)
      return
    }
    const ok = addItem(product, { sizeUs: selectedSize, quantity })
    if (ok === false) {
      setStockError('موجودی این سایز کافی نیست')
      return
    }
    navigate('/checkout')
  }, [product, selectedSize, quantity, addItem, navigate])

  const displayPrice = product.price * quantity
  const displayOldPrice = product.oldPrice ? product.oldPrice * quantity : null

  return (
    <>
      <SizeSelector product={product} selectedUsSize={selectedSize} onSizeChange={handleSizeChange} showError={showSizeError} errorRef={sizeErrorRef} />

      <div className="mt-[30px]">
        <h3 className="text-[18px] font-semibold text-black mb-[14px]">
          {t('purchasePanel.quantity')}
        </h3>
        <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={maxQuantity} />
      </div>

      <div className="mt-[30px] flex items-baseline gap-[12px] flex-wrap">
        <span className="text-[28px] font-semibold text-black">
          {formatPrice(displayPrice)}
        </span>
        {displayOldPrice && (
          <>
            <span className="text-[14px] text-gray-500 line-through">
              {formatPrice(displayOldPrice)}
            </span>
            <span className="px-[8px] py-[2px] text-[10px] font-medium uppercase bg-[#FFC83D] text-black rounded-[3px]">
              {t('purchasePanel.saleBadge')}
            </span>
          </>
        )}
      </div>

      <div className="mt-[14px] bg-[#FAFAFA] border border-[#EEEEEE] rounded-[4px] p-[14px_16px]">
        <div className="text-[14px] font-semibold text-black mb-[4px]">
          {t('purchasePanel.freeShippingTitle')}
        </div>
        <div className="text-[11px] text-[#8a8a8a]">
          {t('purchasePanel.freeShippingText')}
        </div>
      </div>

      {outOfStock ? (
        <button
          type="button"
          disabled
          className="mt-[26px] w-full h-[42px] rounded-[4px] bg-gray-300 text-white text-[13px] font-medium"
        >
          ناموجود
        </button>
      ) : (
        <div className="mt-[26px] flex gap-[12px]">
          <button
            type="button"
            onClick={handleBuyNow}
            className="flex-1 h-[42px] rounded-[4px] bg-black text-white text-[13px] font-medium transition-colors hover:bg-[#222] focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            {t('purchasePanel.buyNow')}
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 h-[42px] rounded-[4px] border border-black bg-white text-black text-[13px] font-medium transition-colors hover:bg-[#F5F5F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            {addedToCart ? t('products.added') : t('products.addToCart')}
          </button>
        </div>
      )}
      {stockError && (
        <p className="mt-[8px] text-[12px] text-[#B3261E]" role="alert">
          {stockError}
        </p>
      )}
    </>
  )
}