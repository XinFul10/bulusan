import api from './api'

// Transaction service for handling CRUD operations
export const transactionService = {
  getAll: async (params = {}) => {
    const response = await api.get('/transactions', { params })
    return response.data
  },

  getCategories: async () => {
    const response = await api.get('/categories')
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

export const approvalService = {
  getSteps: async () => {
    const response = await api.get('/budget/approval-steps')
    return response.data
  },

  approve: async (stepId) => {
    const response = await api.post(`/budget/approval-steps/${stepId}/approve`)
    return response.data
  },
}

export const requestService = {
  getAll: async () => {
    const response = await api.get('/budget/requests')
    return response.data
  },

  getById: async (requestId) => {
    const response = await api.get(`/budget/requests/${requestId}`)
    return response.data
  },
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

export const reportService = {
  getAll: async () => {
    const response = await api.get('/reports')
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/reports', data)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/reports/${id}`)
    return response.data
  }
}
