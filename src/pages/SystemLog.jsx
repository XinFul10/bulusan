import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { systemLogService } from '../services/transactionService'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const actionColors = {
  CREATE: 'bg-green-50 text-green-800',
  UPDATE: 'bg-blue-50 text-blue-800',
  DELETE: 'bg-red-50 text-red-800',
  APPROVE: 'bg-purple-50 text-purple-800',
}

const actionBadgeColors = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  APPROVE: 'bg-purple-100 text-purple-800',
}

const SystemLog = () => {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState(null)
  const rowRefs = useRef({})

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const response = await systemLogService.getAll(page)
      setLogs(response.data || [])
      setPagination(response.pagination || {})
      setCurrentPage(page)
    } catch (error) {
      console.error('Failed to load system logs', error)
      toast.error('Failed to load system logs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check if user has permission to view logs
    if (!user || !['admin', 'head of tourism'].includes(user.role)) {
      toast.error('You do not have permission to view system logs')
      return
    }

    fetchLogs()

    const handleRefresh = () => fetchLogs()
    window.addEventListener('refreshData', handleRefresh)
    return () => window.removeEventListener('refreshData', handleRefresh)
  }, [user, fetchLogs])

  if (!user || !['admin', 'head of tourism'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-text-dark mb-2">Access Denied</h2>
          <p className="text-text-light">You do not have permission to view system logs</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-dark">System Logs</h1>
          <p className="text-sm text-text-light mt-1">
            Track all system activities: account creation, profile changes, password resets, transactions, and approvals
          </p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="responsive-table-wrap">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th scope="col" className="table-header">Timestamp</th>
                <th scope="col" className="table-header">Action</th>
                <th scope="col" className="table-header">User</th>
                <th scope="col" className="table-header">Entity Type</th>
                <th scope="col" className="table-header">Description</th>
                <th scope="col" className="table-header">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-card">
              {logs.map((log, idx) => (
                <tr
                  key={log.id}
                  ref={(el) => {
                    rowRefs.current[log.id] = el
                  }}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors duration-200`}
                >
                  <td className="table-cell whitespace-nowrap">
                    <span className="text-xs text-text-light">
                      {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionBadgeColors[log.action] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div>
                      <p className="text-sm font-medium text-text-dark">{log.user?.full_name}</p>
                      <p className="text-xs text-text-light">{log.user?.username}</p>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-text-dark">{log.entity_type}</span>
                  </td>
                  <td className="table-cell">
                    <span className="block max-w-xs truncate text-sm text-text-dark" title={log.description}>
                      {log.description}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                      className="text-sm font-medium text-primary hover:text-primary-light transition-colors duration-200"
                    >
                      {selectedLog?.id === log.id ? 'Hide' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td className="table-cell text-text-light text-center py-8" colSpan={6}>
                    No system logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Details */}
      {selectedLog && (
        <div className="card py-6 px-4 sm:px-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-dark">Log Details</h2>
            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="text-text-light hover:text-text-dark transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-text-dark mb-2">Timestamp</h3>
              <p className="text-sm text-text-light">
                {format(new Date(selectedLog.created_at), 'MMM dd, yyyy HH:mm:ss')}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-text-dark mb-2">Action</h3>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${actionBadgeColors[selectedLog.action] || 'bg-gray-100 text-gray-800'}`}
              >
                {selectedLog.action}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-text-dark mb-2">User</h3>
              <div>
                <p className="text-sm font-medium text-text-dark">{selectedLog.user?.full_name}</p>
                <p className="text-xs text-text-light">{selectedLog.user?.username}</p>
                <p className="text-xs text-text-light capitalize">{selectedLog.user?.role}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-text-dark mb-2">Entity</h3>
              <p className="text-sm text-text-light">
                {selectedLog.entity_type}
                {selectedLog.entity_id && ` (ID: ${selectedLog.entity_id})`}
              </p>
            </div>

            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-text-dark mb-2">Description</h3>
              <p className="text-sm text-text-dark break-words">{selectedLog.description}</p>
            </div>

            {selectedLog.ip_address && (
              <div>
                <h3 className="text-sm font-semibold text-text-dark mb-2">IP Address</h3>
                <p className="text-sm text-text-light font-mono">{selectedLog.ip_address}</p>
              </div>
            )}

            {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-text-dark mb-3">Changes</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 overflow-auto max-h-48">
                  {Object.entries(selectedLog.changes).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <p className="font-medium text-text-dark capitalize">{key}:</p>
                      {typeof value === 'object' && value !== null ? (
                        <div className="ml-3 mt-1 space-y-1 text-text-light">
                          {value.from && <p>From: <span className="font-mono text-red-600">{value.from}</span></p>}
                          {value.to && <p>To: <span className="font-mono text-green-600">{value.to}</span></p>}
                        </div>
                      ) : (
                        <p className="ml-3 text-text-light font-mono">{String(value)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-light">
            Page {pagination.current_page} of {pagination.last_page}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fetchLogs(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className="px-4 py-2 bg-gray-200 text-text-dark rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => fetchLogs(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.last_page}
              className="px-4 py-2 bg-gray-200 text-text-dark rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SystemLog
