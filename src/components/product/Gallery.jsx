import { useState, useCallback } from 'react'
import { getProductGallery } from '../../utils/productImages'

export default function Gallery({ product }) {
  const [activeIndex, setActiveIndex] = useState(0)

  const images = getProductGallery(product)

  const handleThumbnailClick = useCallback((index) => {
    setActiveIndex(index)
  }, [])

  const handleKeyDown = useCallback(
    (e, index) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setActiveIndex(index)
      }
    },
    []
  )

  const thumbnails = images.slice(0, 4)

  return (
    <div className="w-full lg:sticky lg:top-6 lg:self-start">
      <div
        className="relative aspect-square max-h-[460px] bg-[#F7F7F7] overflow-hidden"
        style={{ background: '#F7F7F7' }}
      >
        {images[activeIndex] ? (
          <img
            src={images[activeIndex]}
            alt=""
            className="w-full h-full object-contain p-6 mix-blend-multiply"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#F2F2F2] to-[#FAFAFA]" />
        )}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {thumbnails.map((img, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleThumbnailClick(idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`relative aspect-square bg-[#F7F7F7] overflow-hidden transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-black ${
              idx === activeIndex ? 'border border-black' : 'border border-transparent'
            }`}
            aria-label={`Thumbnail ${idx + 1}`}
            aria-current={idx === activeIndex ? 'true' : 'false'}
          >
            {img ? (
              <img
                src={img}
                alt=""
                className="w-full h-full object-contain p-2 mix-blend-multiply"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-[#F2F2F2] to-[#FAFAFA]" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}