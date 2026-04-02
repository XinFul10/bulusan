import api from './api'

export const profileService = {
  getMe: async () => {
    const response = await api.get('/me')
    return response.data
  },

  updateMe: async (data) => {
    const response = await api.put('/me', data)
    return response.data
  },

  uploadAvatar: async (file) => {
    const form = new FormData()
    form.append('avatar', file)
    const response = await api.post('/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }
}

