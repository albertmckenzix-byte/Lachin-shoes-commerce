// Search utilities for product search with Persian/Arabic normalization
import { brands } from '../data/brands'

const ARABIC_Y = '\u064A'
const ARABIC_K = '\u0643'
const PERSIAN_Y = '\u06CC'
const PERSIAN_K = '\u06A9'
const DIACRITICS = /[\u064B-\u0652\u0670\u0653-\u0655\u0670\uFE20-\uFE2F]/g
const TATWEEL = /\u0640/g
const ZWNJ = /\u200C/g
const PERSIAN_DIGITS = /[۰۱۲۳۴۵۶۷۸۹]/g
const ARABIC_DIGITS = /[٠١٢٣٤٥٦٧٨٩]/g

const PERSIAN_TO_ENGLISH = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
}
const ARABIC_TO_ENGLISH = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

export function normalize(text) {
  if (!text) return ''
  let result = text
  result = result.replace(ARABIC_Y, PERSIAN_Y)
  result = result.replace(ARABIC_K, PERSIAN_K)
  result = result.replace(DIACRITICS, '')
  result = result.replace(TATWEEL, '')
  result = result.replace(ZWNJ, ' ')
  result = result.replace(PERSIAN_DIGITS, (d) => PERSIAN_TO_ENGLISH[d])
  result = result.replace(ARABIC_DIGITS, (d) => ARABIC_TO_ENGLISH[d])
  result = result.toLowerCase()
  result = result.trim()
  result = result.replace(/\s+/g, ' ')
  return result
}

function slugToCamelCase(slug) {
  return slug.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

export function searchProducts(products, query, t) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return products
  const words = normalizedQuery.split(' ').filter(Boolean)

  const scored = products
    .map((product) => {
      const camelSlug = slugToCamelCase(product.slug)
      const apiName = normalize(product.name || '')
      const apiDescription = normalize(
        `${product.descriptionFa || ''} ${product.descriptionEn || ''}`
      )
      const persianName = normalize(product.nameKey ? t(`products.${camelSlug}.name`) : product.name || '')
      const englishName = normalize(t(`products.${camelSlug}.name`) || '')
      const description = normalize(
        (product.descriptionKey ? t(`products.${camelSlug}.description`) : '') || apiDescription
      )
      const category = normalize(
        (product.categories || [product.category]).filter(Boolean).join(' ')
      )
      const tags = normalize((product.tags || []).join(' '))
      const brandEntry = brands.find(b => b.key === product.makerBrand)
      const brandLatin = normalize(brandEntry ? brandEntry.name : '')
      const brandPersian = normalize(t(`brands.${product.makerBrand || ''}`))

      const haystacks = [apiName, persianName, englishName, description, category, tags, brandLatin, brandPersian]
      const matched = words.every((word) =>
        haystacks.some((h) => h && h.includes(word))
      )

      if (!matched) return null

      const nameStarts = persianName.startsWith(normalizedQuery) || englishName.startsWith(normalizedQuery) ? 1 : 0

      return { product, score: nameStarts }
    })
    .filter(Boolean)

  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.product)
}