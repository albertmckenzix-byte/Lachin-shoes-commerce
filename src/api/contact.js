const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function submitContactMessage({ name, phone }) {
  const res = await fetch(`${API_URL}/api/contact/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone }),
  })
  const data = await res.json()
  if (!res.ok) {
    const errorMsg =
      data.phone?.[0] ||
      data.name?.[0] ||
      data.error ||
      data.detail ||
      'خطا در ثبت درخواست'
    throw new Error(errorMsg)
  }
  return data
}
