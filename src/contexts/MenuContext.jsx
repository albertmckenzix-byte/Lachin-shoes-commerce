import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

const MenuContext = createContext(null)

export function MenuProvider({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [shopExpanded, setShopExpanded] = useState(true)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const previousMenuElement = useRef(null)
  const previousSearchElement = useRef(null)

  const openMenu = useCallback(() => {
    previousMenuElement.current = document.activeElement
    setIsMenuOpen(true)
    setShopExpanded(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
    document.body.style.overflow = ''
    previousMenuElement.current?.focus()
  }, [])

  const openSearch = useCallback(() => {
    previousSearchElement.current = document.activeElement
    setIsSearchOpen(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false)
    document.body.style.overflow = ''
    previousSearchElement.current?.focus()
  }, [])

  const toggleMenu = useCallback(() => {
    if (isMenuOpen) {
      closeMenu()
    } else {
      openMenu()
    }
  }, [isMenuOpen, openMenu, closeMenu])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          closeSearch()
        } else if (isMenuOpen) {
          closeMenu()
        }
      }
    }
    if (isSearchOpen || isMenuOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isSearchOpen, isMenuOpen, closeSearch, closeMenu])

  return (
    <MenuContext.Provider
      value={{
        isMenuOpen,
        openMenu,
        closeMenu,
        toggleMenu,
        shopExpanded,
        setShopExpanded,
        isSearchOpen,
        openSearch,
        closeSearch,
      }}
    >
      {children}
    </MenuContext.Provider>
  )
}

export function useMenu() {
  const context = useContext(MenuContext)
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider')
  }
  return context
}