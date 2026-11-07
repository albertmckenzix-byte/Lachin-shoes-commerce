import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export default function CollectionCard({ collection }) {
  const { t } = useTranslation()
  const label = t(collection.labelKey)

  const getCategory = (label) => {
    switch (label) {
      case 'PERFORMANCE SERIES':
        return 'performance-series'
      case 'LIMITED EDITION':
        return 'limited-edition'
      case 'KIDS COLLECTION':
        return 'kids'
      default:
        return ''
    }
  }

  const category = getCategory(label)
  const href = category ? `/all-products?category=${category}` : '/all-products'

  return (
    <Link to={href} className="group block">
      <div className="relative aspect-[508/416] overflow-hidden bg-gradient-to-b from-[#E9E9E9] to-[#F4F4F2]">
        {collection.image && (
          <img
            src={collection.image}
            alt={label}
            className="w-full h-full object-cover transition-transform duration-500 ease group-hover:scale-105"
          />
        )}
        <span className="absolute start-[19px] bottom-6 inline-flex items-center justify-center h-[30px] rounded-full border border-black px-[9px] bg-white/40 text-black text-[10px] font-bold uppercase tracking-normal transition-colors group-hover:bg-black group-hover:text-white">
          {label}
        </span>
      </div>
    </Link>
  )
}