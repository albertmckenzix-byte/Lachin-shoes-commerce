const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Validates a coupon code against the backend.
 * @param {{ code: string, subtotal: number }} params
 * @returns {Promise<{ valid: boolean, percent: number, discount: number }>}
 */
export async function checkCoupon({ code, subtotal }) {
  const res = await fetch(`${API_URL}/api/coupons/check/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, subtotal }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || 'خطا در بررسی کد تخفیف')
  }
  return data
}

/**
 * Creates an order in the backend database and reserves stock atomically.
 * @param {object} payload
 * @returns {Promise<{ number: number, total: number, subtotal: number, shippingFee: number, discountTotal: number, status: string, paymentStatus: string, token: string }>}
 */
export async function createOrder(payload) {
  const res = await fetch(`${API_URL}/api/orders/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) {
    let errorMsg = data.detail || 'خطا در ثبت سفارش'
    if (data.fields && typeof data.fields === 'object') {
      const fieldErrors = Object.entries(data.fields)
        .map(([k, v]) => (Array.isArray(v) ? v.join(', ') : String(v)))
        .join(' | ')
      if (fieldErrors) {
        errorMsg = `${errorMsg}: ${fieldErrors}`
      }
    }
    const err = new Error(errorMsg)
    err.data = data
    throw err
  }
  return data
}

/**
 * Retrieves public details of a placed order using its order number and public token.
 * @param {number|string} number
 * @param {string} token
 * @returns {Promise<{ number: number, status: string, paymentStatus: string, total: number, createdAt: string, items: Array }|null>}
 */
export async function fetchOrderDetailPublic(number, token) {
  const res = await fetch(`${API_URL}/api/orders/${number}/?token=${encodeURIComponent(token)}`)
  if (res.status === 404) return null
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || 'خطا در دریافت اطلاعات سفارش')
  }
  return data
}

/**
 * Initiates payment with the bank gateway (or sandbox simulator).
 * @param {{ orderNumber: number|string, token: string }} params
 * @returns {Promise<{ payment_url: string, authority: string, simulated: boolean }>}
 */
export async function requestPayment({ orderNumber, token }) {
  const res = await fetch(`${API_URL}/api/orders/${orderNumber}/pay/?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || 'خطا در برقراری ارتباط با درگاه پرداخت')
  }
  return data
}
