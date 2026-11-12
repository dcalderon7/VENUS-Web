import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { clearStoredToken, getCurrentUser, getStoredToken, login as loginRequest, storeToken } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const storedToken = getStoredToken()

    if (!storedToken) {
      setStatus('anonymous')
      return () => { active = false }
    }

    getCurrentUser(storedToken)
      .then(({ user: currentUser }) => {
        if (!active) return
        setToken(storedToken)
        setUser(currentUser)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!active) return
        clearStoredToken()
        setStatus('anonymous')
        setError('Tu sesión ya no es válida. Inicia sesión nuevamente.')
      })

    return () => { active = false }
  }, [])

  async function signIn(identifier, password) {
    setError('')
    const result = await loginRequest(identifier, password)
    storeToken(result.token)
    try {
      const session = await getCurrentUser(result.token)
      setToken(result.token)
      setUser(session.user)
      setStatus('authenticated')
      return session.user
    } catch (requestError) {
      clearStoredToken()
      throw requestError
    }
  }

  function signOut() {
    clearStoredToken()
    setToken(null)
    setUser(null)
    setStatus('anonymous')
    setError('')
  }

  const value = useMemo(() => ({
    user,
    token,
    status,
    error,
    isAdmin: user?.role === 'admin',
    signIn,
    signOut,
  }), [user, token, status, error])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider.')
  return context
}
