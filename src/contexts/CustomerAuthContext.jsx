import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  sendOtp,
  verifyOtp,
  registerCustomer,
  passwordLogin,
  fetchMe,
  updateMe,
  logoutCustomer,
} from '../api/auth'

const CustomerAuthContext = createContext(null)

const TOKEN_KEY = 'lachin_customer_token'
const USER_KEY = 'lachin_customer_data'

export function CustomerAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null)
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState('otp') // 'otp' | 'register' | 'password'
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = useCallback((msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }, [])

  const openAuthModal = useCallback((tab = 'otp') => {
    setAuthModalTab(tab)
    setIsAuthModalOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false)
  }, [])

  const handleAuthSuccess = useCallback((newToken, newCustomer) => {
    setToken(newToken)
    setCustomer(newCustomer)
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newCustomer))
    setIsAuthModalOpen(false)
    const name = newCustomer.firstName ? `${newCustomer.firstName} عزیز` : 'عزیز'
    showToast(`خوش آمدید، ${name} 👋`)
  }, [showToast])

  const loginWithOtpCode = async (phone, code) => {
    const res = await verifyOtp(phone, code)
    handleAuthSuccess(res.token, res.customer)
    return res
  }

  const registerNewCustomer = async (data) => {
    const res = await registerCustomer(data)
    handleAuthSuccess(res.token, res.customer)
    return res
  }

  const loginWithPass = async (phone, password) => {
    const res = await passwordLogin(phone, password)
    handleAuthSuccess(res.token, res.customer)
    return res
  }

  const logout = useCallback(async () => {
    if (token) {
      await logoutCustomer(token)
    }
    setToken(null)
    setCustomer(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    showToast('از حساب کاربری خود خارج شدید.')
  }, [token, showToast])

  const updateProfile = async (data) => {
    if (!token) return
    const updated = await updateMe(token, data)
    setCustomer(updated)
    localStorage.setItem(USER_KEY, JSON.stringify(updated))
    return updated
  }

  // Refresh customer profile on mount if token exists
  useEffect(() => {
    if (!token) return
    fetchMe(token)
      .then((data) => {
        setCustomer(data)
        localStorage.setItem(USER_KEY, JSON.stringify(data))
      })
      .catch(() => {
        // If token expired/invalid, clear local storage
        setToken(null)
        setCustomer(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      })
  }, [token])

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        token,
        isAuthenticated: Boolean(token && customer),
        isAuthModalOpen,
        authModalTab,
        toastMessage,
        openAuthModal,
        closeAuthModal,
        sendOtp,
        loginWithOtpCode,
        registerNewCustomer,
        loginWithPass,
        logout,
        updateProfile,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext)
  if (!context) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider')
  }
  return context
}
