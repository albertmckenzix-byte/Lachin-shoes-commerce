const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export async function createOrder(payload) {
  const response = await fetch(`${API_URL}/orders/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      first_name: payload.firstName,
      last_name: payload.lastName,
      phone: payload.phone,
      email: payload.email,
      country: payload.country,
      city: payload.city,
      address: payload.address,
      postal_code: payload.postalCode,
      delivery_method: payload.deliveryMethod,
      coupon_code: payload.couponCode,
      note: payload.note,
      items: payload.items.map(item => ({
        slug: item.slug,
        size_us: item.sizeUs,
        quantity: item.quantity,
      })),
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      success: false,
      error: {
        detail: data.detail || 'خطا در ثبت سفارش',
        code: data.code || 'unknown',
        fields: data.fields || {},
      },
    }
  }

  return {
    success: true,
    data,
  }
}

export async function checkCoupon(code, subtotal) {
  const response = await fetch(`${API_URL}/coupons/check/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      subtotal,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      valid: false,
      percent: 0,
      discount: 0,
    }
  }

  return data
}

export async function getOrder(number, token) {
  const response = await fetch(`${API_URL}/orders/${number}/?token=${token}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      success: false,
      error: data.detail || 'خطا در دریافت سفارش',
    }
  }

  return {
    success: true,
    data,
  }
}
