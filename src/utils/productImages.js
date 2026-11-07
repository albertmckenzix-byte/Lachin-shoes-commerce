const modules = import.meta.glob('../assets/images/products/*/*.{webp,jpg,jpeg,png,avif,WEBP,JPG,JPEG,PNG,AVIF}', {
  eager: true,
  query: '?url',
  import: 'default',
})

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
}

const imagesBySlug = {}

for (const path in modules) {
  const match = path.match(/products\/([^/]+)\//)
  if (!match) continue
  const folder = match[1]
  const slug = slugify(folder)
  if (!imagesBySlug[slug]) imagesBySlug[slug] = []
  imagesBySlug[slug].push(modules[path])
}

for (const slug in imagesBySlug) {
  imagesBySlug[slug].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

const productSlugs = [
  'air-jordan-1-mid-linen',
  'jordan-4-retro-oxidized-green',
  'new-balance-740-v2-trainers',
  'nike-sportswear-older-kids-air-force-1-lv8',
  'reebok-dmx-1200-grey-blue',
]

const missing = productSlugs.filter((s) => !imagesBySlug[s] || imagesBySlug[s].length === 0)
const detected = Object.keys(imagesBySlug).filter((s) => productSlugs.includes(s))

if (import.meta.env.DEV) {
  console.log('[productImages] detected folder slugs:', detected)
  console.log('[productImages] product slugs with no photos:', missing)
}

export function getProductImages(slug) {
  return imagesBySlug[slugify(slug)] || []
}

export function getMainImage(slug) {
  const arr = imagesBySlug[slugify(slug)]
  return arr && arr.length > 0 ? arr[0] : null
}

export function getProductImage(product) {
  if (!product) return null
  if (Array.isArray(product.images) && product.images.length) {
    const first = product.images[0]
    return typeof first === 'string' ? first : first.url
  }
  if (product.image) return product.image
  if (product.slug) return getMainImage(product.slug)
  return null
}

export function getProductGallery(product) {
  if (!product) return []
  if (Array.isArray(product.images) && product.images.length) {
    return product.images
      .map((i) => (typeof i === 'string' ? i : i.url))
      .filter(Boolean)
  }
  if (Array.isArray(product.gallery) && product.gallery.some(Boolean)) {
    return product.gallery.filter(Boolean)
  }
  if (product.slug) return getProductImages(product.slug)
  return []
}