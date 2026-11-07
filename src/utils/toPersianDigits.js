const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const PERSIAN_DECIMAL_SEPARATOR = '٫'

export function toPersianDigits(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return String(value)
  }

  return String(value)
    .replace(/\d/g, digit => PERSIAN_DIGITS[digit])
    .replace('.', PERSIAN_DECIMAL_SEPARATOR)
}