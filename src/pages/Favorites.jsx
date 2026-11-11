import { Link } from 'react-router-dom'
import { Heart, Trash2, ShoppingBag } from 'lucide-react'
import { useWishlist } from '../contexts/WishlistContext'
import { useCart } from '../contexts/CartContext'
import { formatPrice } from '../utils/format'
import { toPersianDigits } from '../utils/toPersianDigits'
import { getProductImage } from '../utils/productImages'
import { useState } from 'react'

export default function Favorites() {
  const { favorites, removeFavorite, clearFavorites } = useWishlist()
  const { addItem } = useCart()
  const [addedItemSlug, setAddedItemSlug] = useState(null)

  const handleAddToCart = (e, product) => {
    e.stopPropagation()
    addItem(product)
    setAddedItemSlug(product.slug || product.id)
    setTimeout(() => {
      setAddedItemSlug(null)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Header Breadcrumbs / Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E4E4E2] pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#888] mb-2">
              <Link to="/" className="hover:text-black">
                خانه
              </Link>
              <span>/</span>
              <span className="text-black font-medium">علاقه‌مندی‌ها</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#111]">
                محصولات منتخب
              </h1>
              <span className="rounded-full border border-[#E4E4E2] bg-[#FAFAF8] px-3 py-1 text-xs font-medium text-[#6B6B6B]">
                {toPersianDigits(favorites.length)} کالا
              </span>
            </div>
          </div>

          {favorites.length > 0 && (
            <button
              type="button"
              onClick={clearFavorites}
              className="inline-flex items-center gap-1.5 text-xs text-[#888] transition-colors hover:text-[#B3261E] self-start sm:self-auto"
            >
              <Trash2 className="h-4 w-4" />
              <span>پاک کردن همه علاقه‌مندی‌ها</span>
            </button>
          )}
        </div>

        {/* Content */}
        {favorites.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#FAFAF8] border border-[#E4E4E2] mb-5">
              <Heart className="h-12 w-12 text-[#BBB] stroke-[1.25]" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#111] mb-2">
              لیست علاقه‌مندی‌های شما خالی است
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6B6B] max-w-md leading-relaxed mb-8">
              محصولات مورد علاقه خود را با کلیک روی علامت قلب ذخیره کنید تا در هر زمان به راحتی به آن‌ها دسترسی داشته باشید.
            </p>
            <Link
              to="/all-products"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#111] px-8 text-sm font-semibold text-white transition-colors hover:bg-black"
            >
              مشاهده و خرید محصولات
            </Link>
          </div>
        ) : (
          /* Grid of Favorited Products */
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
            {favorites.map((product) => {
              const imageUrl = getProductImage(product)
              const isAdded = addedItemSlug === (product.slug || product.id)

              return (
                <div
                  key={product.slug || product.id}
                  className="group relative flex flex-col justify-between rounded-lg border border-[#E4E4E2] bg-white p-3 transition-shadow hover:shadow-md"
                >
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFavorite(product.slug || product.id, product.name)}
                    className="absolute top-4 start-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-xs backdrop-blur-xs text-[#888] transition-colors hover:bg-white hover:text-[#B3261E]"
                    title="حذف از علاقه‌مندی‌ها"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <Link to={`/product/${product.slug}`} className="block">
                    {/* Image */}
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-md bg-gradient-to-b from-[#E9E9E9] to-[#F4F4F2] p-3">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-[#ECECEC]" />
                      )}
                    </div>

                    {/* Title & Brand */}
                    <div className="mt-3">
                      {product.brand && (
                        <span className="text-[10px] uppercase tracking-wider text-[#888]">
                          {product.brand}
                        </span>
                      )}
                      <h3 className="text-xs sm:text-sm font-bold text-[#111] line-clamp-2 mt-0.5">
                        {product.name}
                      </h3>
                    </div>
                  </Link>

                  {/* Price & Add to Cart */}
                  <div className="mt-4 pt-3 border-t border-[#F0F0EE] flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-[#111]">
                        {formatPrice(product.price)}
                      </span>
                      {product.oldPrice && (
                        <span className="text-[11px] text-[#888] line-through">
                          {formatPrice(product.oldPrice)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(e, product)}
                      className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors ${
                        isAdded
                          ? 'bg-[#1f6b34] text-white'
                          : 'bg-[#111] text-white hover:bg-black'
                      }`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>{isAdded ? 'به سبد خرید اضافه شد' : 'افزودن به سبد خرید'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
