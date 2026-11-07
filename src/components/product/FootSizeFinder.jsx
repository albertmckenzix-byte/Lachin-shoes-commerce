import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cmToSize } from '../../utils/cmToSize'
import { toPersianDigits } from '../../utils/toPersianDigits'

export default function FootSizeFinder() {
  const { t, i18n } = useTranslation()
  const [footLengthCm, setFootLengthCm] = useState(25)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)
  const isRTL = i18n.language === 'fa'
  const wrapperRef = useRef(null)
  const trackRef = useRef(null)

  const size = cmToSize(footLengthCm)

  // Handle keyboard input for arrows
  const handleKeyDown = (e) => {
    const increment = e.shiftKey ? 0.5 : 0.1
    let newValue = footLengthCm

    if (isRTL) {
      if (e.key === 'ArrowLeft') newValue -= increment
      if (e.key === 'ArrowRight') newValue += increment
    } else {
      if (e.key === 'ArrowRight') newValue += increment
      if (e.key === 'ArrowLeft') newValue -= increment
    }

    // Clamp to valid range
    newValue = Math.max(22, Math.min(32, newValue))
    setFootLengthCm(newValue)
    e.preventDefault()
  }

  // Update track gradient on resize
  useEffect(() => {
    if (!trackRef.current) return

    const updateTrack = () => {
      const track = trackRef.current
      const percent = ((footLengthCm - 22) / (32 - 22)) * 100
      
      if (isRTL) {
        track.style.background = `linear-gradient(90deg, #000000 ${percent}%, #eeeeee ${percent}%)`
      } else {
        track.style.background = `linear-gradient(90deg, #000000 ${percent}%, #eeeeee ${percent}%)`
      }
    }

    updateTrack()
    
    // Update on resize
    const resizeObserver = new ResizeObserver(() => updateTrack())
    resizeObserver.observe(trackRef.current)
    
    return () => resizeObserver.disconnect()
  }, [footLengthCm, isRTL])

  // Generate tick marks
  const majorTicks = []
  for (let i = 22; i <= 32; i++) {
    majorTicks.push(i)
  }

  const minorTicks = []
  for (let i = 22.5; i < 32; i += 1) {
    minorTicks.push(i)
  }

  return (
    <div 
      ref={wrapperRef}
      className="mt-[30px] p-[24px] bg-white border border-[#EDEDED] rounded-[8px] text-center"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ minWidth: '280px' }}
    >
      <h3 className="text-[20px] font-semibold text-black mb-[16px]">
        {t('footSizeFinder.title', { defaultValue: 'Foot Size Finder' })}
      </h3>

      <div className="relative mb-[20px]">
        {/* Hidden range input for value handling */}
        <input
          type="range"
          min="22"
          max="32"
          step="0.1"
          value={footLengthCm}
          ref={inputRef}
          className="absolute inset-0 w-full h-full opacity-0"
          onInput={(e) => setFootLengthCm(parseFloat(e.target.value))}
          onChange={(e) => setFootLengthCm(parseFloat(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          onKeyDown={handleKeyDown}
          aria-label={t('footSizeFinder.sliderLabel', { defaultValue: 'Foot length in cm' })}
        />

        {/* Custom track for tick marks */}
        <div 
          ref={trackRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            height: '4px',
            background: 'linear-gradient(90deg, #000000 0%, #eeeeee 100%)',
            borderRadius: '2px',
            padding: '0 12px',
            boxSizing: 'border-box'
          }}
        />

        {/* Tick marks container */}
        <div className="absolute inset-0 pointer-events-none flex items-end justify-between px-[12px]">
          {/* Major ticks (1cm intervals) */}
          <div className="flex justify-between w-full">
            {majorTicks.map((tick) => (
              <div 
                key={`major-${tick}`}
                className="flex items-end"
                style={{ height: '100%' }}
              >
                <div className="w-[2px] h-[8px] bg-black mb-[4px]"></div>
                <div className="text-[10px] text-[#666666] text-center w-[24px]">
                  {toPersianDigits(tick)}
                </div>
              </div>
            ))}
          </div>
          
          {/* Minor ticks (0.5cm intervals) */}
          <div className="flex justify-between w-full">
            {minorTicks.map((tick) => (
              <div 
                key={`minor-${tick}`}
                className="flex items-end"
                style={{ height: '100%' }}
              >
                <div className="w-[1px] h-[4px] bg-[#999999] mb-[4px]"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current value display */}
      <div className="bg-[#F5F5F5] rounded-[6px] p-[16px] mb-[12px]">
        <p className="text-[14px] text-[#666666] mb-[4px]">
          {t('footSizeFinder.yourFootLength', { defaultValue: 'Your Foot Length' })}
        </p>
        <p 
          className="text-[36px] font-bold text-black mono-space"
          dir="ltr"
        >
          {toPersianDigits(footLengthCm.toFixed(1))}
        </p>
        <p className="text-[12px] text-[#888888]">
          {t('footSizeFinder.cm', { defaultValue: 'cm' })}
        </p>
      </div>

      {/* Size recommendation */}
      <div className="bg-white border border-[#EDEDED] rounded-[6px] p-[16px]">
        <p className="text-[14px] text-[#666666] mb-[8px]">
          {t('footSizeFinder.recommendedSize', { defaultValue: 'Recommended Size' })}
        </p>
        <div className="flex justify-center space-x-[8px] flex-wrap">
          <span 
            className="px-[12px] py-[6px] rounded-full bg-black text-white text-[18px] font-bold"
          >
            {size.us}
          </span>
          <span 
            className="px-[12px] py-[6px] rounded-full bg-black text-white text-[18px] font-bold"
          >
            {size.eu}
          </span>
          <span 
            className="px-[12px] py-[6px] rounded-full bg-black text-white text-[18px] font-bold"
          >
            {toPersianDigits(size.cm)}
          </span>
        </div>
        
        {size.isBetweenSizes && (
          <p className="mt-[8px] text-[12px] text-[#666666]">
            {t('footSizeFinder.betweenSizes', { defaultValue: '(Between sizes - rounded up)' })}
          </p>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-[16px] text-[12px] text-[#666666] space-y-[2px]">
        <p>
          ← → {t('footSizeFinder.arrowKeys', { defaultValue: 'Arrow keys: ±0.1 cm' })} |
          Shift + ← → {t('footSizeFinder.shiftArrowKeys', { defaultValue: 'Shift + Arrow: ±0.5 cm' })}
        </p>
        <p>
          {t('footSizeFinder.clickDrag', { defaultValue: 'Click and drag the slider or click on the track' })}
        </p>
      </div>
    </div>
  )
}