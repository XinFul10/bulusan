import { useState } from 'react'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import ErrorModal from '../components/ErrorModal'
import bulusanLogo from '../public/bulusan-logo.png'
import municipalHall from '../public/municipal-hall.png'

const Login = () => {
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleLogin = async (e) => {
    // Stop all event propagation
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault()
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation()
    }
    if (e && typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation()
    }

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password')
      setShowErrorModal(true)
      return
    }

    setLoading(true)
    setShowErrorModal(false)

    try {
      console.log('Login attempt with:', username)
      const result = await login(username, password)
      console.log('Login result:', result)

      if (!result.success) {
        console.error('Login failed:', result.error)
        setErrorMessage(result.error || 'Login failed. Please try again.')
        setShowErrorModal(true)
      }
      // If successful, login() navigates to dashboard
    } catch (error) {
      console.error('Login error:', error)
      setErrorMessage(error?.message || 'An error occurred during login')
      setShowErrorModal(true)
    } finally {
      setLoading(false)
    }
  }

  const closeErrorModal = () => {
    setShowErrorModal(false)
    setErrorMessage('')
  }

  return (
    <>
      <div 
        className="min-h-screen flex items-start justify-center pt-20 p-4"
        style={{
          backgroundImage: `url(${municipalHall})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Semi-transparent overlay */}
        <div className="absolute inset-0 bg-black/30"></div>
        
        {/* Content */}
        <div className="relative z-10 bg-white/70 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-sm p-6">
          {/* Logo - Bulusan Seal */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-3">
              <img 
                src={bulusanLogo} 
                alt="Municipality of Bulusan Logo" 
                className="w-full h-full rounded-full shadow-lg object-cover"
              />
            </div>
            <h1 className="text-xl font-bold text-text-dark">Municipality of Bulusan</h1>
            <p className="text-sm text-text-light mt-1">OMTO Budget Tracker</p>
            <p className="text-xs text-text-light mt-1">2026</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.stopPropagation()
                    handleLogin()
                  }
                }}
                placeholder="Enter your username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                      handleLogin()
                    }
                  }}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-text-dark cursor-pointer">
                Remember Me
              </label>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleLogin()
              }}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 text-base font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex justify-center items-center transition-colors min-h-[44px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          <p className="text-center text-xs text-text-light mt-4">
            © 2026 Municipality of Bulusan. All rights reserved.
          </p>
        </div>
      </div>

      {/* Error Modal - rendered via Portal */}
      <ErrorModal
        isOpen={showErrorModal}
        title="Authentication Error"
        message={errorMessage}
        onClose={closeErrorModal}
      />
    </>
  )
}

export default Login
