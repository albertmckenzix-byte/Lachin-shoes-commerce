import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { fetchFavorites, toggleFavoriteApi, syncFavoritesApi } from '../api/favorites'
import { useCustomerAuth } from './CustomerAuthContext'

const WishlistContext = createContext(null)

const STORAGE_KEY = 'lachin_favorites'

function loadFavorites() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    }
  } catch {
    // fallback if corrupted
  }
  return []
}

function saveFavorites(items) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore storage quota errors
  }
}

export function WishlistProvider({ children }) {
  let auth = null
  try {
    auth = useCustomerAuth()
  } catch {
    // Graceful fallback if rendered outside CustomerAuthProvider (e.g. unit tests)
  }
  const token = auth?.token

  const [favorites, setFavorites] = useState(loadFavorites)
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  // Sync with server when user logs in
  useEffect(() => {
    if (!token) return
    const localSlugs = favorites.map((f) => f.slug).filter(Boolean)
    if (localSlugs.length > 0) {
      syncFavoritesApi(localSlugs, token)
        .then((res) => {
          if (res?.results) {
            setFavorites(res.results)
          }
        })
        .catch(() => {})
    } else {
      fetchFavorites(token)
        .then((res) => {
          if (res?.results) {
            setFavorites(res.results)
          }
        })
        .catch(() => {})
    }
  }, [token])

  // Save to localStorage whenever favorites change
  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ message, type })
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
    }, 2800)
  }, [])

  const isFavorite = useCallback(
    (idOrSlug) => {
      if (idOrSlug == null) return false
      return favorites.some(
        (item) =>
          item.id === idOrSlug ||
          item.slug === idOrSlug ||
          String(item.id) === String(idOrSlug)
      )
    },
    [favorites]
  )

  const addFavorite = useCallback(
    (product) => {
      if (!product) return
      setFavorites((prev) => {
        const identifier = product.slug || product.id
        const exists = prev.some(
          (item) => item.id === product.id || item.slug === identifier
        )
        if (exists) return prev

        const item = {
          id: product.id,
          slug: product.slug,
          name: product.name,
          nameKey: product.nameKey,
          price: product.price,
          oldPrice: product.oldPrice,
          badge: product.badge,
          brand: product.brand,
          makerBrand: product.makerBrand,
          image: product.image,
          images: product.images,
          category: product.category,
        }
        return [item, ...prev]
      })

      const name = product.name || 'محصول'
      showToast(`«${name}» به علاقه‌مندی‌ها اضافه شد`, 'success')
    },
    [showToast]
  )

  const removeFavorite = useCallback(
    (idOrSlug, productName) => {
      if (idOrSlug == null) return
      setFavorites((prev) =>
        prev.filter(
          (item) =>
            item.id !== idOrSlug &&
            item.slug !== idOrSlug &&
            String(item.id) !== String(idOrSlug)
        )
      )
      if (productName) {
        showToast(`«${productName}» از علاقه‌مندی‌ها حذف شد`, 'info')
      }
    },
    [showToast]
  )

  const toggleFavorite = useCallback(
    (product) => {
      if (!product) return false
      const identifier = product.slug || product.id
      const currentlyFav = isFavorite(identifier)

      if (token && product.slug) {
        toggleFavoriteApi(product.slug, token).catch(() => {})
      }

      if (currentlyFav) {
        removeFavorite(identifier, product.name)
        return false
      } else {
        addFavorite(product)
        return true
      }
    },
    [isFavorite, addFavorite, removeFavorite, token]
  )

  const clearFavorites = useCallback(() => {
    setFavorites([])
    showToast('لیست علاقه‌مندی‌ها پاکسازی شد', 'info')
  }, [showToast])

  const openFavorites = useCallback(() => {
    setIsFavoritesOpen(true)
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden'
    }
  }, [])

  const closeFavorites = useCallback(() => {
    setIsFavoritesOpen(false)
    if (typeof document !== 'undefined') {
      document.body.style.overflow = ''
    }
  }, [])

  const toggleFavorites = useCallback(() => {
    if (isFavoritesOpen) {
      closeFavorites()
    } else {
      openFavorites()
    }
  }, [isFavoritesOpen, openFavorites, closeFavorites])

  const value = {
    favorites,
    count: favorites.length,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    clearFavorites,
    isFavoritesOpen,
    openFavorites,
    closeFavorites,
    toggleFavorites,
    toast,
  }

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}
