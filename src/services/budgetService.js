import api from './api'

const budgetService = {
  setBudget: async (totalBudget) => {
    const response = await api.post('/budget', { total_budget: totalBudget })
    return response
  },

  getCurrentBudget: async () => {
    const response = await api.get('/budget')
    return response
  }
}

export { budgetService }
