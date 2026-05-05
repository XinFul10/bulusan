import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    // Extract proper error message from API response
    if (error.response?.data?.message) {
      error.message = error.response.data.message
    } else if (error.response?.data?.errors) {
      // Laravel validation errors - join all error messages
      const errors = error.response.data.errors
      const messages = Object.values(errors).flat().join(', ')
      error.message = messages
    }
    return Promise.reject(error)
  }
)

export default api
