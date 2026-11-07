import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/vazirmatn'
import './index.css'
import './i18n.js'
import i18n from './i18n.js'
import App from './App.jsx'

function Root() {
  useEffect(() => {
    const updateHtmlAttributes = (lng) => {
      document.documentElement.lang = lng
      document.documentElement.dir = lng === 'fa' ? 'rtl' : 'ltr'
    }
    updateHtmlAttributes(i18n.language)
    const handleLanguageChange = (lng) => updateHtmlAttributes(lng)
    i18n.on('languageChanged', handleLanguageChange)
    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [])

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)