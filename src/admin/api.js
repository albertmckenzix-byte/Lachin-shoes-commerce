import { getAdminToken, clearAdminToken } from './AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function extractError(data, status) {
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail
    const parts = []
    for (const value of Object.values(data)) {
      if (Array.isArray(value)) parts.push(...value)
      else if (typeof value === 'string') parts.push(value)
    }
    if (parts.length) return parts.join(' ')
  }
  return `خطا در ارتباط با سرور (${status})`
}

export async function api(path, options = {}) {
  const token = getAdminToken()
  const headers = { ...(options.headers || {}) }
  let body = options.body

  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(body)
  }
  if (token) {
    headers['Authorization'] = `Token ${token}`
  }

  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers,
    body,
  })

  if (response.status === 401) {
    clearAdminToken()
    window.location.assign('/admin/login')
    throw new Error('نشست شما منقضی شده است. دوباره وارد شوید.')
  }

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    throw new Error(extractError(data, response.status))
  }

  return data
}
