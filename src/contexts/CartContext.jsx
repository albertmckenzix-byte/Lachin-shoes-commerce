import { createContext, useContext, useState, useEffect } from 'react'
import { useProducts } from '../context/ProductsContext'

const CartContext = createContext(null)

const STORAGE_KEY = 'lachin_cart'

function loadCart() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
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
      const demoItems = [
        { productId: 7, size: '42', color: '', quantity: 1 },
        { productId: 6, size: '41', color: '', quantity: 1 },
        { productId: 8, size: '43', color: '', quantity: 1 },
      ]
      setItems(demoItems)
      setDemoLoaded(true)
    }
  }, [items.length, demoLoaded])

  const addItem = (product, { size = 'M', color = '', quantity = 1 } = {}) => {
    if (product && Array.isArray(product.sizes) && product.sizes.length && size && size !== 'M') {
      const entry = product.sizes.find((s) => Number(s.us) === Number(size))
      if (entry) {
        const existing = items.find(
          (i) => i.productId === product.id && i.size === size && i.color === color
        )
        const resulting = (existing ? existing.quantity : 0) + quantity
        if (resulting > entry.stock) {
          return false
        }
      }
    }
    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.productId === product.id && i.size === size && i.color === color
      )
      if (existingIdx >= 0) {
        const next = [...prev]
        next[existingIdx].quantity += quantity
        return next
      }
      return [...prev, { productId: product.id, size, color, quantity }]
    })
    return true
  }

  const removeItem = (productId, size, color) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.size === size && i.color === color)))
  }

  const updateQuantity = (productId, size, color, quantity) => {
    if (quantity <= 0) {
      removeItem(productId, size, color)
      return
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.size === size && i.color === color ? { ...i, quantity } : i
      )
    )
  }

  const clearCart = () => setItems([])

  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  const subtotal = items.reduce((sum, i) => {
    const product = products.find((p) => p.id === i.productId)
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