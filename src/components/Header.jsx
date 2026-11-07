import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Heart, ShoppingBag, X } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useMenu } from '../contexts/MenuContext'
import { useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { formatNumber } from '../utils/format'
import SearchOverlay from './SearchOverlay'

const HEADER_HEIGHT = 56
const ANNOUNCEMENT_BAR_HEIGHT = 23

export default function Header() {
  const { t } = useTranslation()
  const { count } = useCart()
  const { toggleMenu, openSearch } = useMenu()
  const [fav, setFav] = useState(false)
  const [scrolledPastAnnouncement, setScrolledPastAnnouncement] = useState(false)
  const [isOverHero, setIsOverHero] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    if (!isHome) {
      setIsOverHero(false)
      return
    }

    const handleScroll = () => {
      const scrollY = window.scrollY

      const pastAnnouncement = scrollY > ANNOUNCEMENT_BAR_HEIGHT
      setScrolledPastAnnouncement(prev =>
        pastAnnouncement === prev ? prev : pastAnnouncement
      )

      const heroEl = document.querySelector('section')
      const heroHeight = heroEl?.clientHeight || window.innerHeight * 0.6
      const heroOffset = heroEl?.offsetTop || 0
      const heroBottom = heroOffset + heroHeight
      const overHero = scrollY < heroBottom - HEADER_HEIGHT
      setIsOverHero(prev => (overHero === prev ? prev : overHero))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isHome, location.pathname])

  const topPosition = isHome ? (scrolledPastAnnouncement ? 'top-0' : 'top-[23px]') : 'top-0'
  const positionClass = isHome ? 'fixed' : 'relative'

  return (
    <header
      className={`${positionClass} inset-x-0 z-50 h-[56px] px-5 flex items-center transition-colors duration-300 ${topPosition} ${isOverHero ? 'bg-transparent' : 'bg-white border-b border-[#E5E5E5]'}`}
    >
      <div dir="ltr" className="w-full flex items-center justify-between">
        <Link to="/" className={`text-[22px] font-medium ${isOverHero ? 'text-white' : 'text-black'}`}>
          <bdi dir="ltr" className="inline-block">{t('header.brand')}</bdi>
        </Link>
        <div className="flex items-center gap-[14px]">
          <button
            className={`p-1 ${isOverHero ? 'text-white' : 'text-black'}`}
            aria-label={t('header.search')}
            onClick={openSearch}
          >
            <Search size={20} strokeWidth={1.5} />
          </button>
          <button
            className={`p-1 ${isOverHero ? 'text-white' : 'text-black'}`}
            aria-label={t('header.favorites')}
            onClick={() => setFav((f) => !f)}
          >
            <Heart
              size={20}
              strokeWidth={1.5}
              fill={fav ? (isOverHero ? '#fff' : '#000') : 'none'}
              color={isOverHero ? '#fff' : '#000'}
            />
          </button>
          <Link
            to="/checkout"
            className={`relative p-1 ${isOverHero ? 'text-white' : 'text-black'}`}
            aria-label={t('header.cart')}
          >
            <ShoppingBag size={20} strokeWidth={1.5} />
            <span className={`absolute -top-1 -right-1 w-4 h-4 ${isOverHero ? 'bg-white text-black' : 'bg-black text-white'} text-[9px] font-bold rounded-full flex items-center justify-center`}>
              {formatNumber(count)}
            </span>
          </Link>

          <button dir="rtl" className={`pill hidden sm:inline-flex ${isOverHero ? 'text-white border-white hover:bg-white hover:text-black' : 'text-black border-black hover:bg-black hover:text-white'}`}>{t('header.logIn')}</button>
          <button dir="rtl" className={`pill ${isOverHero ? 'text-white border-white hover:bg-white hover:text-black' : 'text-black border-black hover:bg-black hover:text-white'}`} onClick={toggleMenu}>{t('header.menu')}</button>
        </div>
      </div>

      <SearchOverlay />
    </header>
  )
}