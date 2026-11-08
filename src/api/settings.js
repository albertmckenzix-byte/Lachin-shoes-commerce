const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export async function getSettings() {
  const response = await fetch(`${API_URL}/settings/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error('خطا در دریافت تنظیمات')
  }

  return data
}
