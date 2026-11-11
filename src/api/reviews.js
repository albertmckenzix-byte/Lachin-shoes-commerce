const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function fetchProductReviews(slug) {
  const res = await fetch(`${API_URL}/api/products/${slug}/reviews/`)
  if (!res.ok) {
    throw new Error(`Failed to fetch reviews (${res.status})`)
  }
  return res.json()
}

export async function submitProductReview(slug, reviewData, token = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Token ${token}`
  }

  const res = await fetch(`${API_URL}/api/products/${slug}/reviews/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(reviewData),
  })

  const data = await res.json()
  if (!res.ok) {
    const errorMsg =
      data.comment?.[0] ||
      data.rating?.[0] ||
      data.name?.[0] ||
      data.error ||
      'خطا در ثبت دیدگاه'
    throw new Error(errorMsg)
  }
  return data
}

export async function fetchAdminReviews(status = 'all', search = '', token) {
  let url = `${API_URL}/api/admin/reviews/?status=${encodeURIComponent(status)}`
  if (search) {
    url += `&search=${encodeURIComponent(search)}`
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${token}`,
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch admin reviews (${res.status})`)
  }
  return res.json()
}

export async function updateAdminReview(id, updateData, token) {
  const res = await fetch(`${API_URL}/api/admin/reviews/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(updateData),
  })
  if (!res.ok) {
    throw new Error('خطا در به‌روزرسانی نظر')
  }
  return res.json()
}

export async function deleteAdminReview(id, token) {
  const res = await fetch(`${API_URL}/api/admin/reviews/${id}/`, {
    method: 'DELETE',
    headers: {
      Authorization: `Token ${token}`,
    },
  })
  if (!res.ok) {
    throw new Error('خطا در حذف نظر')
  }
  return true
}
