import { useTranslation } from 'react-i18next'
import { formatNumber } from '../../utils/format'

export default function QuantityStepper({ value, onChange, min = 1, max = 10, disabled = false }) {
  const { t } = useTranslation()

  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1)
    }
  }

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp' && value < max) {
      e.preventDefault()
      onChange(value + 1)
    } else if (e.key === 'ArrowDown' && value > min) {
      e.preventDefault()
      onChange(value - 1)
    }
  }

  return (
    <div className="flex items-center gap-[12px]" role="group" aria-label={t('purchasePanel.quantityLabel')}>
      <button
        type="button"
        onClick={handleDecrement}
        onKeyDown={handleKeyDown}
        disabled={value <= min || disabled}
        aria-label={t('purchasePanel.decreaseQuantity')}
        className="w-[56px] h-[36px] rounded-full border border-[#EDEDED] bg-white text-black text-[18px] font-medium transition-all duration-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
      >
        −
      </button>
      <span className="text-[13px] font-medium text-black min-w-[32px] text-center" aria-live="polite">
        {formatNumber(value)}
      </span>
      <button
        type="button"
        onClick={handleIncrement}
        onKeyDown={handleKeyDown}
        disabled={value >= max || disabled}
        aria-label={t('purchasePanel.increaseQuantity')}
        className="w-[56px] h-[36px] rounded-full bg-black text-white text-[18px] font-medium transition-all duration-200 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
      >
        +
      </button>
    </div>
  )
}