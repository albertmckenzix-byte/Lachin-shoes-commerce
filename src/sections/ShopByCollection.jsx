import { useTranslation } from 'react-i18next'
import CollectionCard from '../components/CollectionCard'
import { collections } from '../data/collections'

export default function ShopByCollection() {
  const { t } = useTranslation()

  return (
    <section className="relative z-10 w-full bg-white pt-20 pb-[90px] px-5" dir="rtl">
      <h2 className="text-[16px] uppercase font-normal tracking-[0.01em] text-black mb-7 text-start">
        {t('collections.title')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
        {collections.slice(0, 3).map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>
    </section>
  )
}