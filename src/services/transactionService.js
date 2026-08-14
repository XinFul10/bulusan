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

export const categoryService = {
  getAll: async () => {
    const response = await api.get('/categories')
    return response.data
  },

  updateAllocations: async (categories) => {
    const response = await api.put('/categories/allocations', { categories })
    return response.data
  },
}

export const budgetService = {
  setBudget: async (totalBudget) => {
    const response = await api.post('/budget', { total_budget: totalBudget })
    return response.data
  },

  getCurrentBudget: async () => {
    const response = await api.get('/budget')
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

  approveStep: async (requestId, stepId) => {
    const response = await api.post(
      `/budget/requests/${encodeURIComponent(requestId)}/steps/${stepId}/approve`
    )
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
  },

  // Verify a code against ALL reports (incl. soft-deleted) via the backend.
  // This is the authoritative check — it works even after the report is
  // removed from the Saved Reports list.
  verifyCode: async (code) => {
    const response = await api.post('/reports/verify', { code })
    return response.data
  },

  // Save/update the optional description for a report.
  // Works for soft-deleted reports (backend uses withTrashed).
  updateDescription: async (id, description) => {
    const response = await api.patch(`/reports/${id}/description`, { description })
    return response.data
  }
}

export const systemLogService = {
  getAll: async (page = 1) => {
    const response = await api.get('/system-logs', { params: { page } })
    return response.data
  },

  getById: async (logId) => {
    const response = await api.get(`/system-logs/${logId}`)
    return response.data
  },
}
