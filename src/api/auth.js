const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function sendOtp(phone) {
  const res = await fetch(`${API_URL}/api/auth/otp/send/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  const data = await res.json()
  if (!res.ok) {
    const errorMsg = data.phone?.[0] || data.error || 'خطا در ارسال کد تأیید'
    throw new Error(errorMsg)
  }
  return data
}

export async function verifyOtp(phone, code) {
  const res = await fetch(`${API_URL}/api/auth/otp/verify/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  })
  const data = await res.json()
  if (!res.ok) {
    const errorMsg = data.code?.[0] || data.phone?.[0] || data.error || 'کد تأیید نامعتبر است'
    throw new Error(errorMsg)
  }
  return data
}

export async function registerCustomer(customerData) {
  const res = await fetch(`${API_URL}/api/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData),
  })
  const data = await res.json()
  if (!res.ok) {
    const errorMsg =
      data.first_name?.[0] ||
      data.last_name?.[0] ||
      data.phone?.[0] ||
      data.error ||
      'خطا در ثبت‌نام'
    throw new Error(errorMsg)
  }
  return data
}

export async function passwordLogin(phone, password) {
  const res = await fetch(`${API_URL}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  })
  const data = await res.json()
  if (!res.ok) {
    const errorMsg = data.error || data.non_field_errors?.[0] || 'شماره موبایل یا رمز عبور اشتباه است'
    throw new Error(errorMsg)
  }
  return data
}

export async function fetchMe(token) {
  const res = await fetch(`${API_URL}/api/auth/me/`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch profile (${res.status})`)
  }
  return res.json()
}

export async function updateMe(token, profileData) {
  const res = await fetch(`${API_URL}/api/auth/me/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(profileData),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error('خطا در به‌روزرسانی اطلاعات')
  }
  return data
}

export async function logoutCustomer(token) {
  try {
    await fetch(`${API_URL}/api/auth/logout/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
      },
    })
  } catch {
    // Ignore network errors during logout
  }
}
