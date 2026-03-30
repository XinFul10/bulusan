// Transaction service for handling CRUD operations
export const transactionService = {
  getAll: async (params = {}) => {
    // Mock data for development
    return Promise.resolve({
      data: mockTransactions,
      total: mockTransactions.length
    })
    // Actual API:
    // return api.get('/transactions.php', { params })
  },

  create: async (data) => {
    // return api.post('/transactions.php', data)
    const newTransaction = {
      ...data,
      id: Date.now(),
      created_at: new Date().toISOString(),
      balance: data.allocated_amount - data.obligated_amount
    }
    mockTransactions.unshift(newTransaction)
    return Promise.resolve({ data: newTransaction })
  },

  update: async (id, data) => {
    // return api.put(`/transactions.php?id=${id}`, data)
    const index = mockTransactions.findIndex(t => t.id === id)
    if (index !== -1) {
      mockTransactions[index] = {
        ...mockTransactions[index],
        ...data,
        balance: data.allocated_amount - data.obligated_amount
      }
      return Promise.resolve({ data: mockTransactions[index] })
    }
    throw new Error('Transaction not found')
  },

  delete: async (id) => {
    // return api.delete(`/transactions.php?id=${id}`)
    const index = mockTransactions.findIndex(t => t.id === id)
    if (index !== -1) {
      mockTransactions.splice(index, 1)
      return Promise.resolve({ success: true })
    }
    throw new Error('Transaction not found')
  }
}

// Mock data
const mockTransactions = [
  {
    id: 1,
    transaction_date: '2026-01-15',
    description: 'Training Workshop - Digital Marketing',
    category_id: 1,
    category_name: 'Capacity Development',
    a_b_test: 'T1',
    allocated_amount: 50000,
    obligated_amount: 25000,
    balance: 25000,
    created_by: 1,
    created_at: '2026-01-15T10:00:00Z'
  },
  {
    id: 2,
    transaction_date: '2026-01-20',
    description: 'Eco-Tourism Site Development',
    category_id: 3,
    category_name: 'Socio-Cultural & Eco',
    a_b_test: 'T2',
    allocated_amount: 200000,
    obligated_amount: 150000,
    balance: 50000,
    created_by: 1,
    created_at: '2026-01-20T14:30:00Z'
  },
  {
    id: 3,
    transaction_date: '2026-02-01',
    description: 'Promotional Materials Printing',
    category_id: 2,
    category_name: 'TM & Promotions',
    a_b_test: null,
    allocated_amount: 30000,
    obligated_amount: 30000,
    balance: 0,
    created_by: 1,
    created_at: '2026-02-01T09:00:00Z'
  }
]

export const dashboardService = {
  getStats: async () => {
    return Promise.resolve({
      data: {
        categories: [
          {
            id: 1,
            name: 'Capacity Development',
            allocation: 400000,
            obligated: 100000,
            balance: 300000,
            percentage: 25
          },
          {
            id: 2,
            name: 'TM & Promotions',
            allocation: 500000,
            obligated: 0,
            balance: 500000,
            percentage: 0
          },
          {
            id: 3,
            name: 'Socio-Cultural & Eco',
            allocation: 3000000,
            obligated: 200000,
            balance: 2800000,
            percentage: 7
          },
          {
            id: 4,
            name: 'Product & Market Dev',
            allocation: 1500000,
            obligated: 0,
            balance: 1500000,
            percentage: 0
          }
        ],
        total_budget: 5400000,
        total_obligated: 300000,
        remaining_balance: 5100000,
        overall_utilization: 5.56
      }
    })
  }
}

export const userService = {
  getAll: async () => {
    return Promise.resolve({
      data: [
        {
          id: 1,
          username: 'admin',
          full_name: 'System Administrator',
          email: 'admin@bulusan.gov.ph',
          role: 'admin',
          status: 'active',
          last_login: '2026-03-30T08:00:00Z'
        },
        {
          id: 2,
          username: 'staff1',
          full_name: 'Juan Dela Cruz',
          email: 'staff1@bulusan.gov.ph',
          role: 'staff',
          status: 'active',
          last_login: '2026-03-29T16:30:00Z'
        }
      ]
    })
  },

  create: async (data) => {
    return Promise.resolve({ data: { ...data, id: Date.now() } })
  },

  update: async (id, data) => {
    return Promise.resolve({ data: { ...data, id } })
  },

  delete: async (id) => {
    return Promise.resolve({ success: true })
  }
}
