import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { fetchProducts } from '../api/products'
import { products as fallbackProducts } from '../data/products'

const ProductsContext = createContext(null)

function normalizeProduct(p) {
  const images = Array.isArray(p.images) ? p.images : []
  return {
    ...p,
    category:
      Array.isArray(p.categories) && p.categories.length
        ? p.categories[0]
        : '',
    image: images.length ? images[0].url : null,
    gallery: images
      .map((i) => (typeof i === 'string' ? i : i.url))
      .filter(Boolean),
    reviews: [],
    brand: 'Lachin',
  }
}

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProducts()
      setProducts((Array.isArray(data) ? data : []).map(normalizeProduct))
    } catch (err) {
      console.warn(
        'Products API unreachable, falling back to static data:',
        err
      )
      if (fallbackProducts && fallbackProducts.length) {
        setProducts(fallbackProducts)
      } else {
        setError(err.message || 'خطا در دریافت محصولات')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const getBySlug = useCallback(
    (slug) => products.find((p) => p.slug === slug) || null,
    [products]
  )

  return (
    <ProductsContext.Provider
      value={{ products, loading, error, getBySlug, reload: load }}
    >
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider')
  return ctx
}
