const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function fetchProducts() {
  const res = await fetch(`${API_URL}/api/products/`)
  if (!res.ok) {
    throw new Error(`Failed to fetch products (${res.status})`)
  }
  return res.json()
}

export async function fetchProduct(slug) {
  const res = await fetch(`${API_URL}/api/products/${slug}/`)
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Failed to fetch product (${res.status})`)
  }
  return res.json()
}
