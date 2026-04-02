import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser))
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    setLoading(false)

    // Auto logout after 30 minutes of inactivity
    let inactivityTimer
    const resetTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        logout()
      }, 30 * 60 * 1000) // 30 minutes
    }

    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('keydown', resetTimer)
    resetTimer()

    return () => {
      clearTimeout(inactivityTimer)
      window.removeEventListener('mousemove', resetTimer)
      window.removeEventListener('keydown', resetTimer)
    }
  }, [])

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password })
      const { user: loggedInUser, token } = response.data

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(loggedInUser))
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser(loggedInUser)
      navigate('/dashboard')
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      }
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      delete api.defaults.headers.common['Authorization']
      setUser(null)
      navigate('/login')
    }
  }

  const isAdmin = () => user?.role === 'admin'

  const value = {
    user,
    login,
    logout,
    isAdmin,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
