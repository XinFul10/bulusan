import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import NotificationDropdown from './NotificationDropdown'

const Header = () => {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 pl-14 lg:pl-6 sticky top-0 z-20">
      <div>
        <h2 className="text-text-light text-sm">
          <span className="font-semibold text-text-dark">2026</span>
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <NotificationDropdown
          unreadCount={unreadCount}
          onUnreadCountChange={setUnreadCount}
        />

        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 min-h-[44px] rounded-lg hover:bg-gray-100 transition-colors"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-text-dark">{user?.full_name}</p>
              <p className="text-xs text-text-light capitalize">{user?.role}</p>
            </div>
            <ChevronDownIcon className="w-4 h-4 text-text-light" />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-card border border-gray-200 z-20 py-1">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false)
                    navigate('/profile')
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-text-dark hover:bg-gray-50 flex items-center gap-2"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  Profile Settings
                </button>
                {isAdmin() && (
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false)
                      navigate('/users')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-text-dark hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    User Management
                  </button>
                )}
                <hr className="my-1 border-gray-200" />
                <button
                  onClick={() => {
                    setIsDropdownOpen(false)
                    handleLogout()
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-gray-50 flex items-center gap-2"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
