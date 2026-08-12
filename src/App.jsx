import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/Layout/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Tracking from './pages/Tracking'
import Reports from './pages/Reports'
import UserManagement from './pages/UserManagement'
import Profile from './pages/Profile'
import SystemLog from './pages/SystemLog'

function App() {
  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('newTransaction'))
      }
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('focusSearch'))
      }
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('refreshData'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="tracking" element={<Tracking />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="users" element={<ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>} />
          <Route path="system-logs" element={<ProtectedRoute logsOnly><SystemLog /></ProtectedRoute>} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
