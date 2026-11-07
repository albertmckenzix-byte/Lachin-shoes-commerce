import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sizeTable } from '../../data/sizes'
import { formatNumber } from '../../utils/format'

export default function SizeSelector({ product, selectedUsSize, onSizeChange, showError, errorRef }) {
  const { t } = useTranslation()
  const [activeSystem, setActiveSystem] = useState('eu')

  const apiSizes = Array.isArray(product.sizes) ? product.sizes : []
  const entries = apiSizes.length
    ? apiSizes
        .map((s) => ({
          us: Number(s.us),
          eu: Number(s.eu),
          cm: Number(s.cm),
          stock: s.stock || 0,
          available: s.available !== false && (s.stock || 0) > 0,
        }))
        .sort((a, b) => a.us - b.us)
    : sizeTable.map((s) => ({
        us: s.us,
        eu: s.eu,
        cm: s.cm,
        stock: null,
        available: (product.availableSizes || []).includes(s.us),
      }))

  const systems = [
    { key: 'us', label: t('purchasePanel.sizeSystems.us') },
    { key: 'eu', label: t('purchasePanel.sizeSystems.eu') },
    { key: 'cm', label: t('purchasePanel.sizeSystems.cm') },
  ]

  const getDisplayValue = (entry) => formatNumber(entry[activeSystem])

  const handleSizeClick = (entry) => {
    if (!entry.available) return
    onSizeChange(entry.us)
  }

  const selectedEntry = entries.find(
    (e) => Number(selectedUsSize) === e.us
  )
  const lowStock =
    selectedEntry && selectedEntry.stock !== null && selectedEntry.stock > 0 && selectedEntry.stock <= 3
      ? selectedEntry.stock
      : null

  return (
    <div className="mt-[30px]">
      <h3 className="text-[18px] font-semibold text-black mb-[14px]">
        {t('purchasePanel.sizeChart')}
      </h3>

      <div className="inline-flex items-center gap-[3px] p-[3px] bg-[#F3F3F3] rounded-full mb-[18px]" role="radiogroup" aria-label={t('purchasePanel.sizeSystemLabel')}>
        {systems.map((system) => (
          <button
            key={system.key}
            type="button"
            role="radio"
            aria-checked={activeSystem === system.key}
            onClick={() => setActiveSystem(system.key)}
            className={`px-[14px] py-[4px] text-[12px] font-medium rounded-full transition-all duration-200 ${
              activeSystem === system.key
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            {system.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-[10px] sm:grid-cols-6">
        {entries.map((entry) => {
          const displayValue = getDisplayValue(entry)
          const isSelected = Number(selectedUsSize) === entry.us

          return (
            <button
              key={entry.us}
              type="button"
              onClick={() => handleSizeClick(entry)}
              disabled={!entry.available}
              className={`w-[56px] h-[36px] rounded-full border text-[13px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                isSelected
                  ? 'bg-black text-white border-black'
                  : entry.available
                  ? 'bg-white text-black border-[#EDEDED] hover:border-black hover:bg-gray-50'
                  : 'bg-white text-gray-400 border-[#EDEDED] line-through cursor-not-allowed'
              }`}
              aria-pressed={isSelected}
              aria-disabled={!entry.available}
              aria-label={`${t('purchasePanel.sizeLabel')} ${displayValue}`}
            >
              {displayValue}
            </button>
          )
        })}
      </div>

      {lowStock !== null && (
        <p className="mt-[8px] text-[12px] text-[#B36B00]">
          فقط {formatNumber(lowStock)} جفت باقی مانده
        </p>
      )}

      {showError && (
        <p ref={errorRef} className="mt-[8px] text-[12px] text-red-600" role="alert">
          {t('purchasePanel.selectSizeError')}
        </p>
      )}
    </div>
  )
}
