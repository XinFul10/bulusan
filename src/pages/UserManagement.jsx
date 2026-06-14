import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, KeyIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { userService } from '../services/transactionService'
import toast from 'react-hot-toast'

const emptyFormData = {
  full_name: '',
  email: '',
  username: '',
  password: '',
  confirm_password: '',
  role: 'staff',
  department: '',
}

const UserManagement = () => {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState(emptyFormData)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await userService.getAll()
      setUsers(response.data)
    } catch (error) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      await userService.create({
        full_name: formData.full_name,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: formData.role,
        department: formData.department || null,
      })
      
      toast.success('User created successfully')
      setShowCreateForm(false)
      setFormData(emptyFormData)
      fetchUsers()
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to create user'
      toast.error(message)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    
    try {
      await userService.update(editingUser.id, {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        department: formData.department || null,
      })
      
      toast.success('User updated successfully')
      setEditingUser(null)
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update user')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      await userService.delete(id)
      toast.success('User deleted successfully')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const handleResetPassword = async (id) => {
    const newPassword = prompt('Enter new password (min 6 characters):')
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    try {
      await userService.update(id, { password: newPassword })
      toast.success('Password reset successfully')
    } catch (error) {
      toast.error('Failed to reset password')
    }
  }

  const startEdit = (user) => {
    setEditingUser(user)
    setFormData({
      full_name: user.full_name,
      email: user.email,
      username: user.username,
      password: '',
      confirm_password: '',
      role: user.role,
      status: user.status,
      department: user.department || '',
    })
    setShowCreateForm(false)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-dark">User Management</h1>
        <button
          onClick={() => {
            setShowCreateForm(true)
            setEditingUser(null)
            setFormData(emptyFormData)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Create Staff Account
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Table */}
        <div className="lg:col-span-2">
          <div className="card overflow-x-auto">
            <h2 className="text-lg font-semibold text-text-dark mb-4">All Users</h2>
            
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">User</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Last Login</th>
                  <th className="table-header text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-text-light">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                              {user.full_name?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-text-dark">{user.full_name}</p>
                            <p className="text-xs text-text-light">@{user.username}</p>
                            <p className="text-xs text-text-light">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-sm text-text-dark">
                        {user.department || '—'}
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          user.role === 'admin' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-gray-100 text-text-dark'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          user.status === 'active' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-danger/10 text-danger'
                        }`}>
                          {user.status === 'active' ? (
                            <CheckCircleIcon className="w-3 h-3" />
                          ) : (
                            <XCircleIcon className="w-3 h-3" />
                          )}
                          {user.status}
                        </span>
                      </td>
                      <td className="table-cell text-sm text-text-light">
                        {formatDate(user.last_login)}
                      </td>
                      <td className="table-cell">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="p-1 text-primary hover:bg-primary/10 rounded"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className="p-1 text-warning hover:bg-warning/10 rounded"
                            title="Reset Password"
                          >
                            <KeyIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-1 text-danger hover:bg-danger/10 rounded"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Form */}
        <div className="lg:col-span-1">
          {(showCreateForm || editingUser) && (
            <div className="card">
              <h2 className="text-lg font-semibold text-text-dark mb-4">
                {editingUser ? 'Edit User' : 'Create New Staff Account'}
              </h2>
              
              <form 
                onSubmit={editingUser ? handleUpdate : handleCreate}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>
                )}

                {!editingUser && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="input-field"
                        required
                        minLength={6}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={formData.confirm_password}
                        onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                        className="input-field"
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="input-field"
                    placeholder="e.g. Office of the Municipal Tourism Office"
                  />
                </div>

                {editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="input-field"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setEditingUser(null)
                    }}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                  >
                    {editingUser ? 'Update User' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Role Info */}
          <div className="card mt-6">
            <h3 className="font-semibold text-text-dark mb-3">Role Permissions</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="font-medium text-primary">Admin</p>
                <ul className="text-text-light mt-1 space-y-1 text-xs">
                  <li>• Full access to all pages</li>
                  <li>• Manage users and permissions</li>
                  <li>• Delete transactions</li>
                  <li>• Generate all reports</li>
                </ul>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-text-dark">Staff</p>
                <ul className="text-text-light mt-1 space-y-1 text-xs">
                  <li>• View Dashboard and Tracking</li>
                  <li>• Manage Transactions</li>
                  <li>• Add/Edit transactions</li>
                  <li>• View reports (read-only)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserManagement
