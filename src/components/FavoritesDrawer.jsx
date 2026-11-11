import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, X, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react'
import { useWishlist } from '../contexts/WishlistContext'
import { useCart } from '../contexts/CartContext'
import { formatPrice } from '../utils/format'
import { toPersianDigits } from '../utils/toPersianDigits'
import { getProductImage } from '../utils/productImages'

export default function FavoritesDrawer() {
  const {
    favorites,
    isFavoritesOpen,
    closeFavorites,
    removeFavorite,
    clearFavorites,
    toast,
  } = useWishlist()

  const { addItem } = useCart()
  const navigate = useNavigate()
  const drawerRef = useRef(null)
  const [addedItemSlug, setAddedItemSlug] = useState(null)

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isFavoritesOpen) return
      if (e.key === 'Escape') {
        closeFavorites()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFavoritesOpen, closeFavorites])

  const handleAddToCart = (e, product) => {
    e.stopPropagation()
    addItem(product)
    setAddedItemSlug(product.slug || product.id)
    setTimeout(() => {
      setAddedItemSlug(null)
    }, 1500)
  }

  const handleViewProduct = (slug) => {
    closeFavorites()
    navigate(`/product/${slug}`)
  }

  const handleGoToShopping = () => {
    closeFavorites()
    navigate('/all-products')
  }

  const handleGoToCart = () => {
    closeFavorites()
    navigate('/checkout')
  }

  return (
    <>
      {/* Toast Notification for Wishlist Actions */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-6 z-150 flex items-center gap-2 rounded-lg bg-[#111] px-4 py-3 text-xs font-medium text-white shadow-xl transition-all"
        >
          <Heart className="h-4 w-4 shrink-0 fill-[#E11D48] text-[#E11D48]" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-110 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
          isFavoritesOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeFavorites}
        aria-hidden={!isFavoritesOpen}
      />

      {/* Drawer Panel */}
      <aside
        ref={drawerRef}
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="علاقه‌مندی‌ها"
        aria-hidden={!isFavoritesOpen}
        className={`fixed inset-y-0 right-0 z-120 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isFavoritesOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-[#E4E4E2] px-5">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-[#E11D48] text-[#E11D48]" />
            <h2 className="text-base font-bold text-[#111]">علاقه‌مندی‌ها</h2>
            <span className="rounded-full border border-[#E4E4E2] bg-[#FAFAF8] px-2 py-0.5 text-xs font-medium text-[#6B6B6B]">
              {toPersianDigits(favorites.length)} کالا
            </span>
          </div>
          <button
            type="button"
            onClick={closeFavorites}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#6B6B6B] transition-colors hover:bg-[#FAFAF8] hover:text-[#111]"
            aria-label="بستن"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {favorites.length === 0 ? (
            /* Empty State */
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FAFAF8] border border-[#E4E4E2] mb-4">
                <Heart className="h-10 w-10 text-[#BBB] stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-[#111] mb-1">
                لیست علاقه‌مندی‌های شما خالی است
              </h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed max-w-xs mb-6">
                با کلیک روی آیکون قلب روی هر کفش، می‌توانید مدل‌های منتخب خود را در این لیست ذخیره کرده و بعداً بررسی کنید.
              </p>
              <button
                type="button"
                onClick={handleGoToShopping}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#111] px-6 text-xs font-medium text-white transition-colors hover:bg-black"
              >
                مشاهده همه محصولات
              </button>
            </div>
          ) : (
            /* Items List */
            <div className="flex flex-col divide-y divide-[#E4E4E2]">
              {favorites.map((product) => {
                const imageUrl = getProductImage(product)
                const isAdded = addedItemSlug === (product.slug || product.id)

                return (
                  <div
                    key={product.slug || product.id}
                    className="flex items-center gap-3.5 py-4 first:pt-0 last:pb-0"
                  >
                    {/* Thumbnail */}
                    <div
                      onClick={() => handleViewProduct(product.slug)}
                      className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-md border border-[#E4E4E2] bg-gradient-to-b from-[#E9E9E9] to-[#F4F4F2] p-1.5"
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="h-full w-full object-contain mix-blend-multiply transition-transform hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-[#ECECEC]" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 min-w-0 flex-col gap-1">
                      <h4
                        onClick={() => handleViewProduct(product.slug)}
                        className="cursor-pointer text-xs font-bold text-[#111] truncate hover:underline"
                        title={product.name}
                      >
                        {product.name}
                      </h4>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#111]">
                          {formatPrice(product.price)}
                        </span>
                        {product.oldPrice && (
                          <span className="text-[11px] text-[#888] line-through">
                            {formatPrice(product.oldPrice)}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(e, product)}
                          className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition-colors ${
                            isAdded
                              ? 'bg-[#1f6b34] text-white'
                              : 'bg-[#111] text-white hover:bg-black'
                          }`}
                        >
                          <ShoppingBag className="h-3 w-3" />
                          <span>{isAdded ? 'اضافه شد' : 'افزودن به سبد'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFavorite(product.slug || product.id, product.name)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#888] transition-colors hover:bg-[#FAFAF8] hover:text-[#B3261E]"
                          title="حذف از علاقه‌مندی‌ها"
                          aria-label="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer (only when items exist) */}
        {favorites.length > 0 && (
          <div className="border-t border-[#E4E4E2] bg-[#FAFAF8] p-4 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleGoToCart}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#111] text-xs font-semibold text-white transition-colors hover:bg-black"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>مشاهده و تسویه سبد خرید</span>
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={clearFavorites}
                className="inline-flex items-center gap-1 text-[11px] text-[#888] hover:text-[#B3261E] transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>پاک کردن همه</span>
              </button>

              <button
                type="button"
                onClick={handleGoToShopping}
                className="inline-flex items-center gap-1 text-[11px] text-[#6B6B6B] hover:text-[#111] transition-colors"
              >
                <span>ادامه مشاهده کفش‌ها</span>
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
