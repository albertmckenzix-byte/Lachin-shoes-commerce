/**
 * Jalali date conversion and formatting utilities for Lachin Admin.
 */

const PERSIAN_ARABIC_DIGITS = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

export function toEnglishDigits(str) {
  if (str === null || str === undefined) return ''
  return String(str).replace(/[۰-۹٠-٩]/g, (d) => PERSIAN_ARABIC_DIGITS[d] || d)
}

/**
 * Converts a Jalali (Shamsi) date to Gregorian date.
 * Based on Kazimierz M. Borkowski's algorithm.
 */
export function jalaliToGregorian(jy, jm, jd) {
  let y = parseInt(jy, 10)
  const m = parseInt(jm, 10)
  const d = parseInt(jd, 10)

  let gy = y <= 979 ? 621 : 1600
  y -= y <= 979 ? 0 : 979

  let days =
    365 * y +
    Math.floor(y / 33) * 8 +
    Math.floor(((y % 33) + 3) / 4) +
    78 +
    d +
    (m < 7 ? (m - 1) * 31 : (m - 7) * 30 + 186)

  gy += 400 * Math.floor(days / 146097)
  days %= 146097

  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524)
    days %= 36524
    if (days >= 365) days++
  }

  gy += 4 * Math.floor(days / 1461)
  days %= 1461

  gy += Math.floor((days - 1) / 365)
  if (days > 365) days = (days - 1) % 365

  let gd = days + 1
  const salA = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]

  let gm = 0
  for (gm = 0; gm < 13; gm++) {
    const v = salA[gm]
    if (gd <= v) break
    gd -= v
  }

  return [gy, gm, gd]
}

/**
 * Validates a Jalali date string (accepts 1405/10/15, 1405-10-15, in Persian or English digits).
 */
export function validateJalaliDate(input) {
  if (!input || typeof input !== 'string') return false
  const clean = toEnglishDigits(input.trim()).replace(/-/g, '/')
  const parts = clean.split('/')
  if (parts.length !== 3) return false

  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)

  if (isNaN(year) || isNaN(month) || isNaN(day)) return false
  if (year < 1300 || year > 1500) return false
  if (month < 1 || month > 12) return false

  if (month <= 6) {
    if (day < 1 || day > 31) return false
  } else if (month <= 11) {
    if (day < 1 || day > 30) return false
  } else {
    // Esfand has 29 or 30 days
    if (day < 1 || day > 30) return false
  }

  return true
}

/**
 * Parses a Jalali date string and returns an ISO string at the end of that day in Asia/Tehran (23:59:59+03:30).
 */
export function parseJalaliDateToISO(input) {
  if (!validateJalaliDate(input)) return null
  const clean = toEnglishDigits(input.trim()).replace(/-/g, '/')
  const [jy, jm, jd] = clean.split('/').map((s) => parseInt(s, 10))
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd)

  const monthStr = String(gm).padStart(2, '0')
  const dayStr = String(gd).padStart(2, '0')
  const tehranDateStr = `${gy}-${monthStr}-${dayStr}T23:59:59+03:30`
  return new Date(tehranDateStr).toISOString()
}

/**
 * Formats an ISO date string to Persian Jalali format (e.g. ۱۴۰۵/۱۰/۱۵).
 */
export function formatJalaliDate(isoDate) {
  if (!isoDate) return ''
  try {
    const d = new Date(isoDate)
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(d)
  } catch {
    return String(isoDate)
  }
}
