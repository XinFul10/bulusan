import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  HomeIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UsersIcon,
  BuildingLibraryIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'

const Sidebar = ({ isCollapsed, onToggleCollapse }) => {
  const { isAdmin } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: HomeIcon },
    { path: '/transactions', name: 'Transactions', icon: CurrencyDollarIcon },
    { path: '/tracking', name: 'Tracking', icon: ChartBarIcon },
    { path: '/reports', name: 'Reports', icon: DocumentTextIcon },
    ...(isAdmin() ? [{ path: '/users', name: 'User Management', icon: UsersIcon }] : []),
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-md bg-primary text-white"
      >
        {isMobileOpen ? (
          <XMarkIcon className="w-6 h-6" />
        ) : (
          <Bars3Icon className="w-6 h-6" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-primary text-white flex flex-col transition-all duration-300 z-40
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-primary-light/30">
          <div className="flex items-center justify-between gap-3">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
              <BuildingLibraryIcon className="w-8 h-8 shrink-0" />
              {!isCollapsed && (
                <div>
                  <h1 className="font-bold text-sm leading-tight">Municipality of</h1>
                  <h2 className="font-bold text-lg leading-tight">BULUSAN</h2>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden rounded-md p-2 text-blue-100 hover:bg-white/10 hover:text-white lg:inline-flex"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <Bars3Icon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}
            </button>
          </div>
          {!isCollapsed && <p className="text-xs mt-2 text-blue-200">OMTO</p>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200
                ${isCollapsed ? 'justify-center' : ''}
                ${isActive 
                  ? 'bg-white/20 text-white font-medium' 
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-primary-light/30">
          {!isCollapsed && (
            <p className="text-xs text-blue-200 text-center">Fiscal Year 2026</p>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}

export default Sidebar
