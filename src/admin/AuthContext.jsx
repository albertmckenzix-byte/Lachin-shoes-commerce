import { createContext, useCallback, useContext, useState } from 'react'
import { api } from './api'

const AuthContext = createContext(null)
const STORAGE_KEY = 'ryst_admin_session'

function loadSession() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && parsed.token) return parsed
    }
  } catch {}
  return null
}

export function getAdminToken() {
  const session = loadSession()
  return session ? session.token : null
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession)

  const login = useCallback(async (username, password) => {
    const data = await api('/admin/login/', {
      method: 'POST',
      body: { username, password },
    })
    const next = { token: data.token, username: data.username }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
    setSession(next)
    return next
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/admin/logout/', { method: 'POST' })
    } catch {}
    clearAdminToken()
    setSession(null)
  }, [])

  const value = {
    token: session ? session.token : null,
    username: session ? session.username : null,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
