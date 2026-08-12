import { createPortal } from 'react-dom'
import { useState } from 'react'
import { KeyIcon } from '@heroicons/react/24/outline'

const PasswordResetModal = ({ isOpen, userName, onClose, onConfirm, isLoading = false }) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    setError('')

    if (!password.trim()) {
      setError('Password is required')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    onConfirm(password)
  }

  const handleClose = () => {
    setPassword('')
    setConfirmPassword('')
    setError('')
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <style>{`
        @keyframes modalPopIn {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(-50px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .password-reset-modal {
          animation: modalPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
      <div className="password-reset-modal bg-white rounded-3xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-200 flex items-center gap-3 rounded-t-3xl">
          <KeyIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <h2 className="text-lg font-bold text-blue-600">Reset Password</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-gray-700 text-sm">
            Resetting password for <span className="font-semibold">{userName}</span>
          </p>

          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter new password"
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Confirm new password"
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 flex justify-end gap-3 rounded-b-3xl">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 active:bg-gray-400 transition-colors min-h-[44px] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Reset Password'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default PasswordResetModal
