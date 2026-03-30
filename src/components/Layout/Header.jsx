import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BellIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Left side - Breadcrumb could go here */}
      <div>
        <h2 className="text-text-light text-sm">
          Fiscal Year: <span className="font-semibold text-text-dark">2026</span>
        </h2>
      </div>

      {/* Right side - Notifications & Profile */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-text-light hover:text-text-dark transition-colors rounded-lg hover:bg-gray-100">
          <BellIcon className="w-6 h-6" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-text-dark">{user?.full_name}</p>
              <p className="text-xs text-text-light capitalize">{user?.role}</p>
            </div>
            <ChevronDownIcon className="w-4 h-4 text-text-light" />
          </button>

          {/* Dropdown */}
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
                    navigate('/users')
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-text-dark hover:bg-gray-50 flex items-center gap-2"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  Profile Settings
                </button>
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
