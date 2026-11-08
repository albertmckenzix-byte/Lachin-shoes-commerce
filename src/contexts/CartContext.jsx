import { createContext, useContext, useState, useEffect } from 'react'
import { useProducts } from '../context/ProductsContext'

const CartContext = createContext(null)

const STORAGE_KEY = 'lachin_cart'

function loadCart() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Check if cart has old format (has productId) - discard it
      if (parsed.length > 0 && parsed[0].productId !== undefined) {
        return []
      }
      return parsed
    }
  } catch {}
  return []
}

function saveCart(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

export function CartProvider({ children }) {
  const { products } = useProducts()
  const [items, setItems] = useState([])
  const [demoLoaded, setDemoLoaded] = useState(false)

  useEffect(() => {
    setItems(loadCart())
  }, [])

  useEffect(() => {
    saveCart(items)
  }, [items])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('demo') === '1' && !demoLoaded && items.length === 0) {
      // Use slugs of existing products for demo
      const demoItems = [
        { slug: 'air-max', sizeUs: 9, quantity: 1 },
        { slug: 'air-max-90', sizeUs: 10, quantity: 1 },
        { slug: 'air-force-1', sizeUs: 9.5, quantity: 1 },
      ]
      setItems(demoItems)
      setDemoLoaded(true)
    }
  }, [items.length, demoLoaded])

  const addItem = (product, { sizeUs, quantity = 1 } = {}) => {
    if (!product || !product.slug || !sizeUs) {
      return false
    }

    if (product && Array.isArray(product.sizes) && product.sizes.length) {
      const entry = product.sizes.find((s) => Number(s.us) === Number(sizeUs))
      if (entry) {
        const existing = items.find(
          (i) => i.slug === product.slug && i.sizeUs === sizeUs
        )
        const resulting = (existing ? existing.quantity : 0) + quantity
        if (resulting > entry.stock) {
          return false
        }
      }
    }
    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.slug === product.slug && i.sizeUs === sizeUs
      )
      if (existingIdx >= 0) {
        const next = [...prev]
        next[existingIdx].quantity += quantity
        return next
      }
      return [...prev, { slug: product.slug, sizeUs, quantity }]
    })
    return true
  }

  const removeItem = (slug, sizeUs) => {
    setItems((prev) => prev.filter((i) => !(i.slug === slug && i.sizeUs === sizeUs)))
  }

  const updateQuantity = (slug, sizeUs, quantity) => {
    if (quantity <= 0) {
      removeItem(slug, sizeUs)
      return
    }
    setItems((prev) =>
      prev.map((i) =>
        i.slug === slug && i.sizeUs === sizeUs ? { ...i, quantity } : i
      )
    )
  }

  const clearCart = () => setItems([])

  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  const subtotal = items.reduce((sum, i) => {
    const product = products.find((p) => p.slug === i.slug)
    return sum + (product ? product.price * i.quantity : 0)
  }, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, count, subtotal }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}