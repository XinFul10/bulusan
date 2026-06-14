import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  BellIcon,
  CheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { notificationService } from '../../services/notificationService'
import { buildNotificationPath } from '../../utils/notificationNavigation'

const typeConfig = {
  approval_request: {
    icon: BellIcon,
    iconClass: 'text-primary bg-primary/10',
    borderClass: 'border-l-primary',
  },
  approval_update: {
    icon: CheckCircleIcon,
    iconClass: 'text-success bg-success/10',
    borderClass: 'border-l-success',
  },
  rejection: {
    icon: XCircleIcon,
    iconClass: 'text-danger bg-danger/10',
    borderClass: 'border-l-danger',
  },
  system: {
    icon: ExclamationCircleIcon,
    iconClass: 'text-warning bg-warning/10',
    borderClass: 'border-l-warning',
  },
  info: {
    icon: BellIcon,
    iconClass: 'text-text-light bg-gray-100',
    borderClass: 'border-l-gray-300',
  },
}

const NotificationDropdown = ({ unreadCount, onUnreadCountChange }) => {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const panelRef = useRef(null)

  const fetchNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const response = await notificationService.getAll()
      setNotifications(response.data || [])
      onUnreadCountChange?.(response.unread_count ?? 0)
    } catch {
      if (!silent) setNotifications([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [onUnreadCountChange])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationService.getUnreadCount()
      onUnreadCountChange?.(response.count || 0)
    } catch {
      onUnreadCountChange?.(0)
    }
  }, [onUnreadCountChange])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 15000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
      const interval = setInterval(() => fetchNotifications(true), 5000)
      return () => clearInterval(interval)
    }
  }, [isOpen, fetchNotifications])

  useEffect(() => {
    const handleRefresh = () => {
      fetchUnreadCount()
      if (isOpen) fetchNotifications(true)
    }
    window.addEventListener('notifications:refresh', handleRefresh)
    return () => window.removeEventListener('notifications:refresh', handleRefresh)
  }, [isOpen, fetchNotifications, fetchUnreadCount])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleToggle = () => setIsOpen((prev) => !prev)

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      onUnreadCountChange?.(Math.max(0, unreadCount - 1))
    } catch {
      // silent
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true)
      await notificationService.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      onUnreadCountChange?.(0)
    } catch {
      // silent
    } finally {
      setMarkingAll(false)
    }
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id)
    }

    setIsOpen(false)

    const path = buildNotificationPath(notification)
    if (path) {
      navigate(path)
    }
  }

  const formatRelativeTime = (isoString) => {
    if (!isoString) return ''
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true })
    } catch {
      return ''
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleToggle}
        className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
          isOpen
            ? 'bg-primary/10 text-primary'
            : 'text-text-light hover:text-text-dark hover:bg-gray-100'
        }`}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-danger text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] bg-white rounded-xl shadow-card border border-gray-200 z-50 overflow-hidden notification-dropdown-enter">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div>
              <h3 className="font-semibold text-text-dark">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-text-light">{unreadCount} unread</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 min-h-[44px] px-2 disabled:opacity-50"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 px-4">
                <BellIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-text-light">No notifications available.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notification) => {
                  const config = typeConfig[notification.type] || typeConfig.info
                  const Icon = config.icon
                  const isClickable = Boolean(notification.requestId || notification.targetPage)

                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => isClickable && handleNotificationClick(notification)}
                        disabled={!isClickable}
                        className={`w-full text-left border-l-4 ${config.borderClass} ${
                          !notification.isRead ? 'bg-primary/[0.02]' : 'bg-white'
                        } ${isClickable ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'} transition-colors`}
                      >
                        <div className="flex gap-3 p-4">
                          <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${config.iconClass}`}>
                            <Icon className="w-[18px] h-[18px]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-semibold text-text-dark ${!notification.isRead ? '' : 'font-medium'}`}>
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                              )}
                            </div>
                            <p className="text-sm text-text-light mt-0.5 line-clamp-3 whitespace-pre-line">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-text-light">
                                {formatRelativeTime(notification.createdAt) || notification.dateTime}
                              </span>
                              <span
                                className={`text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                  notification.isRead
                                    ? 'text-text-light bg-gray-100'
                                    : 'text-primary bg-primary/10'
                                }`}
                              >
                                {notification.isRead ? 'Read' : 'Unread'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown
