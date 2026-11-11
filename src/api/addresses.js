/**
 * Customer Saved Addresses API
 */

const API_BASE = '/api/customer/addresses/'

export async function fetchAddresses(token) {
  if (!token) return { count: 0, results: [] }
  const res = await fetch(API_BASE, {
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error('خطا در دریافت لیست آدرس‌ها')
  }
  return res.json()
}

export async function createAddress(data, token) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) {
    const errorMsg = json.detail || Object.values(json.errors || {})[0] || 'خطا در ثبت آدرس'
    throw new Error(errorMsg)
  }
  return json
}

export async function updateAddress(id, data, token) {
  const res = await fetch(`${API_BASE}${id}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) {
    const errorMsg = json.detail || Object.values(json.errors || {})[0] || 'خطا در ویرایش آدرس'
    throw new Error(errorMsg)
  }
  return json
}

export async function deleteAddress(id, token) {
  const res = await fetch(`${API_BASE}${id}/`, {
    method: 'DELETE',
    headers: {
      Authorization: `Token ${token}`,
    },
  })
  if (!res.ok && res.status !== 204) {
    throw new Error('خطا در حذف آدرس')
  }
  return true
}

export async function setDefaultAddress(id, token) {
  const res = await fetch(`${API_BASE}${id}/set-default/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error('خطا در تنظیم آدرس پیش‌فرض')
  }
  return res.json()
}
