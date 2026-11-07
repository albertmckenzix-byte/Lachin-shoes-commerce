import i18n from 'i18next'
import { CURRENCY_LABEL_FA, CURRENCY_LABEL_EN } from '../config'

export function formatPrice(n) {
  const lang = i18n.language || 'fa'
  if (lang === 'fa') {
    return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(n) + ' ' + CURRENCY_LABEL_FA
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) + ' ' + CURRENCY_LABEL_EN
}

export function formatNumber(n) {
  return new Intl.NumberFormat('fa-IR').format(n)
}