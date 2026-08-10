import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { profileService } from '../services/profileService'

// Append a timestamp query param so the browser never serves a cached avatar
const bustCache = (url) => {
  if (!url || url.startsWith('blob:')) return url
  return `${url}?t=${Date.now()}`
}

const Profile = () => {
  const { user, setUser, loading: authLoading } = useAuth()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: ''
  })

  const initials = useMemo(() => {
    const name = form.full_name || user?.full_name || ''
    return name.trim().slice(0, 1).toUpperCase() || 'U'
  }, [form.full_name, user?.full_name])

  useEffect(() => {
    if (authLoading) return
    if (!user) return
    setForm((prev) => ({
      ...prev,
      full_name: user.full_name || '',
      email: user.email || ''
    }))
  }, [authLoading, user])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await profileService.getMe()
        // Only trust the server — never use the stale localStorage value as fallback.
        // Using user?.avatar_url here would re-trigger this effect (user is a dep)
        // and keep re-applying a broken URL in a loop.
        const rawUrl = res?.data?.avatar_url ?? null
        const nextAvatarUrl = rawUrl ? bustCache(rawUrl) : null

        setAvatarUrl(nextAvatarUrl)
      } catch {
        // ignore; page still usable with local user info
      }
    }
    if (!authLoading && user) load()
  }, [authLoading, user?.id])  // depend only on user.id — not the whole object — to avoid re-running when setUser updates avatar_url

  const handleSave = async (e) => {
    e.preventDefault()

    if (form.password && form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setSaving(true)
      const payload = {
        full_name: form.full_name,
        email: form.email
      }
      if (form.password) payload.password = form.password

      const res = await profileService.updateMe(payload)
      const updated = res?.data
      if (updated) {
        const newUser = {
          ...(JSON.parse(localStorage.getItem('user') || '{}')),
          full_name: updated.full_name,
          email: updated.email
        }
        localStorage.setItem('user', JSON.stringify(newUser))
        toast.success('Profile updated')
        setForm((prev) => ({ ...prev, password: '', confirm_password: '' }))
      } else {
        toast.success('Profile updated')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (file) => {
    if (!file) return

    const previousAvatarUrl = avatarUrl
    // Show an instant local preview while the upload is in flight
    const previewUrl = URL.createObjectURL(file)
    setAvatarUrl(previewUrl)

    try {
      setUploading(true)
      const res = await profileService.uploadAvatar(file)
      const nextAvatarUrl = res?.data?.avatar_url || null

      if (nextAvatarUrl) {
        // Add cache-busting so the browser fetches the new image, not the cached one
        const bustedUrl = bustCache(nextAvatarUrl)
        setAvatarUrl(bustedUrl)

        // Persist with cache-busted URL so Header and other consumers re-render correctly
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
        const updatedUser = { ...storedUser, avatar_url: bustedUrl }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser((prev) => (prev ? { ...prev, avatar_url: bustedUrl } : prev))
      } else {
        // Server didn't return a URL — keep the local blob preview and warn
        console.warn('Avatar upload succeeded but no avatar_url returned from server')
      }

      toast.success('Profile picture updated')
    } catch (err) {
      // Roll back to the previous avatar on failure
      setAvatarUrl(previousAvatarUrl)
      toast.error(err?.response?.data?.message || 'Failed to upload profile picture')
    } finally {
      setUploading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Profile Settings</h1>
          <p className="text-sm text-text-light mt-1">
            Update your profile information and profile picture.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold text-text-dark mb-4">Profile Picture</h2>

            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border border-gray-200"
                  key={avatarUrl}
                  onError={() => {
                    // Clear stale URL from state, localStorage, and user context
                    // so nothing can re-apply it after the image fails to load
                    setAvatarUrl(null)
                    setUser((prev) => (prev ? { ...prev, avatar_url: null } : prev))
                    const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
                    delete storedUser.avatar_url
                    localStorage.setItem('user', JSON.stringify(storedUser))
                  }}
                />
              ) : (
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-2xl">
                  {initials}
                </div>
              )}

              <div className="flex-1">
                <p className="text-sm text-text-dark font-medium">{user?.full_name}</p>
                <p className="text-xs text-text-light">@{user?.username}</p>
                <p className="text-xs text-text-light capitalize">{user?.role}</p>

                <label className="inline-block mt-3">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => handleAvatarChange(e.target.files?.[0])}
                  />
                  <span className={`btn-secondary inline-flex items-center ${uploading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                    {uploading ? 'Uploading...' : 'Change photo'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-text-dark mb-4">Account Details</h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
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
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">
                    New Password (optional)
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field"
                    minLength={6}
                    placeholder="Leave blank to keep current"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={form.confirm_password}
                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                    className="input-field"
                    minLength={6}
                    placeholder="Repeat new password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile

