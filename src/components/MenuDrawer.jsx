import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronUp } from 'lucide-react'
import { menuData } from '../data/menu'
import { useMenu } from '../contexts/MenuContext'
import { Link, useLocation } from 'react-router-dom'

const SUBMENU_ROUTES = {
  'menu.allProducts': '/all-products',
  'menu.bestSellers': '/all-products?category=best-sellers',
  'menu.limitedEdition': '/all-products?category=limited-edition',
  'menu.performanceSeries': '/all-products?category=performance-series',
  'menu.kidsShoes': '/all-products?category=kids',
  'filters.men': '/all-products?gender=men',
  'filters.women': '/all-products?gender=women',
}

const TOP_LEVEL_ROUTES = {
  'menu.home': '/',
  'menu.about': '/about',
}

export default function MenuDrawer() {
  const { t, i18n } = useTranslation()
  const { isMenuOpen, closeMenu, shopExpanded, setShopExpanded } = useMenu()
  const drawerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previousActiveElement = useRef(null)
  const location = useLocation()
  const currentPath = location.pathname + location.search
  const [genderExpanded, setGenderExpanded] = useState(false)
  const [brandExpanded, setBrandExpanded] = useState(false)
  const [isRtl, setIsRtl] = useState(false)

  const isActive = (path) => {
    if (path === '/') return currentPath === '/'
    return currentPath === path || currentPath.startsWith(path + '?') || currentPath.startsWith(path + '&')
  }

  const handleLinkClick = () => {
    closeMenu()
  }

  const handleShopToggle = (e) => {
    e.stopPropagation()
    setShopExpanded((v) => !v)
  }

  useEffect(() => {
    const dir = document.documentElement.dir
    setIsRtl(dir === 'rtl')
  }, [])

  useEffect(() => {
    const dir = document.documentElement.dir
    setIsRtl(dir === 'rtl')
  }, [i18n.language])

  useEffect(() => {
    if (isMenuOpen) {
      previousActiveElement.current = document.activeElement
      document.body.style.overflow = 'hidden'
      setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 0)
    } else {
      document.body.style.overflow = ''
      previousActiveElement.current?.focus()
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen, closeMenu])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isMenuOpen) return
      if (e.key === 'Escape') {
        handleLinkClick()
        return
      }
      if (e.key === 'Tab') {
        const focusableElements = drawerRef.current?.querySelectorAll(
          'a[href], button, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusableElements?.length) return
        const first = focusableElements[0]
        const last = focusableElements[focusableElements.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen])

  useEffect(() => {
    if (!isMenuOpen) {
      setShopExpanded(false)
    }
  }, [isMenuOpen, setShopExpanded])

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const transitionDuration = prefersReducedMotion ? '1ms' : '600ms'

  const drawerStyle = {
    position: 'fixed',
    top: 0,
    bottom: 0,
    right: 0,
    width: '30%',
    minWidth: '360px',
    maxWidth: '820px',
    maxWidth: '100%',
    padding: '70px 20px 20px',
    background: 'white',
    zIndex: 110,
    overflowY: 'auto',
    transform: isMenuOpen ? 'translateX(0)' : 'translateX(100%)',
    transition: `transform ${transitionDuration} cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear ${isMenuOpen ? '0s' : transitionDuration}`,
    visibility: isMenuOpen ? 'visible' : 'hidden',
  }

  const backdropStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(0, 0, 0, 0.3)',
    opacity: isMenuOpen ? 1 : 0,
    pointerEvents: isMenuOpen ? 'auto' : 'none',
    transition: `opacity ${transitionDuration} ease`,
  }

  return (
    <>
      <div
        className="menu-backdrop"
        style={backdropStyle}
        onClick={handleLinkClick}
        aria-hidden={!isMenuOpen}
      />
      <aside
        ref={drawerRef}
        className="menu-drawer"
        style={drawerStyle}
        role="dialog"
        aria-modal="true"
        aria-label={t('header.menu')}
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
      >
        <button
          ref={closeButtonRef}
          className="absolute top-[15px] right-[20px] z-[120] pill"
          style={{
            width: '67px',
            height: '27px',
            padding: 0,
            fontSize: '11px',
            fontWeight: 700,
          }}
          onClick={handleLinkClick}
          aria-label={t('menu.close')}
        >
          {t('menu.close')}
        </button>

        <nav className="flex flex-col">
          {menuData.map((item, index) => (
            <div
              key={item.labelKey}
              className="relative w-full"
              style={{
                borderBottom: '1px solid #BDBDBD',
                ...(index === 0 && { borderTop: '1px solid #BDBDBD' }),
              }}
            >
              {item.children ? (
                <button
                  type="button"
                  className="top-level-item w-full text-start py-[10px] px-0"
                  style={{
                    fontSize: '34px',
                    fontWeight: 600,
                    lineHeight: 1.1,
                    letterSpacing: '-0.01em',
                    color: isActive('/') ? '#7A7A7A' : '#000',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'opacity 150ms ease',
                  }}
                  onClick={handleShopToggle}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.6')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  aria-expanded={shopExpanded}
                >
                  <span className="flex items-center justify-between w-full">
                    {t(item.labelKey)}
                    <ChevronUp
                      size={18}
                      strokeWidth={1.5}
                      className="flex-shrink-0 ms-[20px] transition-transform duration-250 ease"
                      style={{
                        transform: shopExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </span>
                </button>
              ) : (
                <Link
                  to={TOP_LEVEL_ROUTES[item.labelKey] || '/'}
                  onClick={handleLinkClick}
                  className="top-level-item w-full text-start py-[10px] px-0 block"
                  style={{
                    fontSize: '34px',
                    fontWeight: 600,
                    lineHeight: 1.1,
                    letterSpacing: '-0.01em',
                    color: isActive(TOP_LEVEL_ROUTES[item.labelKey] || '/') ? '#7A7A7A' : '#000',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    transition: 'opacity 150ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.6')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <span className="flex items-center justify-between w-full">
                    {t(item.labelKey)}
                  </span>
                </Link>
              )}

              {item.children && (
                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${shopExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="ps-0">
                  {item.children.map((child) => {
                          const isBrand = typeof child !== 'string'
                          const childPath = isBrand ? child.path : SUBMENU_ROUTES[child]
                          const labelKey = isBrand ? child.labelKey : child
                          return (
                            <Link
                              key={childPath || child}
                              to={childPath}
                              onClick={handleLinkClick}
                              className="block w-full text-start py-[11px] px-0"
                              style={{
                                fontSize: '16px',
                                fontWeight: 400,
                                lineHeight: 1,
                                letterSpacing: 0,
                                textTransform: isBrand ? 'none' : 'uppercase',
                                color: isActive(childPath) ? '#7A7A7A' : '#000',
                                textDecoration: 'none',
                                transition: 'opacity 150ms ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.6')}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                            >
                              {t(labelKey)}
                            </Link>
                          )
                        })}
                    </div>
                    <div
                      className="w-full"
                      style={{
                        borderTop: '1px solid #BDBDBD',
                        marginTop: '12px',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}