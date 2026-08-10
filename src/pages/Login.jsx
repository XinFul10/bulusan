import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import bulusanLogo from '../public/bulusan-logo.png'
import municipalHall from '../public/municipal-hall.png'

const Login = () => {
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    console.log('Attempting login with:', data.username)
    const result = await login(data.username, data.password)
    setLoading(false)
    
    if (!result.success) {
      console.error('Login failed:', result.error)
      toast.error(result.error || 'Login failed')
    }
  }

  return (
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Username
            </label>
            <input
              type="text"
              placeholder="Enter your username"
              autoComplete="off"
              readOnly
              onFocus={(e) => e.target.removeAttribute('readOnly')}
              {...register('username', { required: 'Username is required' })}
              className="input-field"
            />
            {errors.username && (
              <p className="text-danger text-sm mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="new-password"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readOnly')}
                {...register('password', { required: 'Password is required' })}
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text-dark"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-danger text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-primary rounded cursor-pointer"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-text-dark cursor-pointer">
              Remember Me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2 text-base flex justify-center items-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-text-light mt-4">
          © 2026 Municipality of Bulusan. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default Login
