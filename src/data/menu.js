import { brands } from '../data/brands'

export const menuData = [
  { labelKey: 'menu.home', href: '/' },
  { labelKey: 'menu.about', href: '/about' },
  {
    labelKey: 'menu.shop',
    href: '#',
    expandedKey: 'shop',
    children: [
      'menu.allProducts',
      'menu.bestSellers',
      'menu.limitedEdition',
      'menu.performanceSeries',
      'menu.kidsShoes',
    ],
  },
  {
    labelKey: 'filters.gender',
    href: '#',
    expandedKey: 'gender',
    children: [
      'filters.men',
      'filters.women',
    ],
  },
  {
    labelKey: 'filters.brand',
    href: '#',
    expandedKey: 'brand',
    children: brands.map(b => ({ labelKey: `brands.${b.key}`, path: `/all-products?brand=${b.key}` })),
  },
]
