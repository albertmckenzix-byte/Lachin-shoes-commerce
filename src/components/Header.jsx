import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Heart, ShoppingBag, X, User, LogOut } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useMenu } from '../contexts/MenuContext'
import { useCustomerAuth } from '../contexts/CustomerAuthContext'
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
  const { customer, isAuthenticated, openAuthModal, logout } = useCustomerAuth()
  const [fav, setFav] = useState(false)
  const [scrolledPastAnnouncement, setScrolledPastAnnouncement] = useState(false)
  const [isOverHero, setIsOverHero] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const userMenuRef = useRef(null)
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

          {/* Customer Auth / Login Button */}
          {isAuthenticated ? (
            <div className="relative hidden sm:block" ref={userMenuRef}>
              <button
                dir="rtl"
                type="button"
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                className={`pill inline-flex items-center gap-1.5 ${
                  isOverHero
                    ? 'text-white border-white hover:bg-white hover:text-black'
                    : 'text-black border-black hover:bg-black hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFC83D]" />
                <span className="max-w-[100px] truncate">
                  {customer?.firstName || 'حساب من'}
                </span>
              </button>

              {userDropdownOpen && (
                <div
                  dir="rtl"
                  className="absolute left-0 mt-2 w-48 rounded-2xl bg-white border border-[#E5E5E5] shadow-xl py-2 z-50 text-xs text-neutral-800 animate-fadeIn"
                >
                  <div className="px-3.5 py-2 border-b border-neutral-100">
                    <p className="font-bold text-black truncate">
                      {customer?.firstName
                        ? `${customer.firstName} ${customer.lastName || ''}`
                        : 'کاربر گرامی'}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                      {customer?.phone}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false)
                      logout()
                    }}
                    className="w-full px-3.5 py-2 text-start flex items-center gap-2 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>خروج از حساب</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              dir="rtl"
              type="button"
              onClick={() => openAuthModal('otp')}
              className={`pill hidden sm:inline-flex ${
                isOverHero
                  ? 'text-white border-white hover:bg-white hover:text-black'
                  : 'text-black border-black hover:bg-black hover:text-white'
              }`}
            >
              {t('header.logIn')}
            </button>
          )}

          <button dir="rtl" className={`pill ${isOverHero ? 'text-white border-white hover:bg-white hover:text-black' : 'text-black border-black hover:bg-black hover:text-white'}`} onClick={toggleMenu}>{t('header.menu')}</button>
        </div>
      </div>

      <SearchOverlay />
    </header>
  )
}