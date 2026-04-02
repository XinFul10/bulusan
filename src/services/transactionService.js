import api from './api'

// Transaction service for handling CRUD operations
export const transactionService = {
  getAll: async (params = {}) => {
    const response = await api.get('/transactions', { params })
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/transactions', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await api.put(`/transactions/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/transactions/${id}`)
    return response.data
  }
}

export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats')
    return response.data
  }
}

export const userService = {
  getAll: async () => {
    const response = await api.get('/users')
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/users', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await api.put(`/users/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  }
}

export const documentService = {
  getAll: async () => {
    const response = await api.get('/documents')
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/documents', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await api.put(`/documents/${id}`, data)
    return response.data
  }
}
