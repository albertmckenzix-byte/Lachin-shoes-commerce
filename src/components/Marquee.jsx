import { Asterisk } from 'lucide-react'

export default function Marquee({ text = 'NEW ENERGY, SAME HIGH QUALITY' }) {
  return (
    <div className="marquee-container h-14 bg-black flex items-center overflow-hidden">
      <div className="marquee-track flex items-center whitespace-nowrap h-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="inline-flex items-center leading-none">
            <span className="text-white text-[20px] uppercase font-medium whitespace-nowrap">
              {text}
            </span>
            <Asterisk
              size={28}
              strokeWidth={3}
              className="text-[#2F7BFF] mx-8 flex-shrink-0"
              aria-hidden="true"
            />
          </span>
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i + 6} className="inline-flex items-center leading-none">
            <span className="text-white text-[20px] uppercase font-medium whitespace-nowrap">
              {text}
            </span>
            <Asterisk
              size={28}
              strokeWidth={3}
              className="text-[#2F7BFF] mx-8 flex-shrink-0"
              aria-hidden="true"
            />
          </span>
        ))}
      </div>
    </div>
  )
}