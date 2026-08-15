import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { budgetService } from '../../services/budgetService'
import toast from 'react-hot-toast'

const SetBudgetModal = ({ isOpen, onClose, onSuccess }) => {
  const [totalBudget, setTotalBudget] = useState('')
  const [loading, setLoading] = useState(false)
  const [settingBudget, setSettingBudget] = useState(false)

  const loadCurrentBudget = async () => {
    try {
      setLoading(true)
      const response = await budgetService.getCurrentBudget()
      const currentBudget = response.data?.total_budget || 0
      setTotalBudget(currentBudget > 0 ? String(currentBudget) : '')
    } catch (error) {
      console.error('Failed to load current budget:', error)
      // Don't show error on load, just leave empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadCurrentBudget()
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!totalBudget || Number(totalBudget) <= 0) {
      toast.error('Please enter a valid budget amount')
      return
    }

    setSettingBudget(true)
    try {
      await budgetService.setBudget(Number(totalBudget))
      toast.success('Budget set successfully')
      setTotalBudget('')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to set budget')
      console.error('Budget submission failed:', error)
    } finally {
      setSettingBudget(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold text-text-dark">Set Overall Budget</h2>
            <p className="text-sm text-text-light">Admin and Head of Tourism may update the budget.</p>
          </div>
          <button onClick={onClose} className="text-text-light hover:text-text-dark">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-text-light">Loading current budget...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-text-dark mb-2">Total Budget (PHP)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 mb-5"
              placeholder="Enter total budget amount"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-text-dark rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={settingBudget}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60"
              >
                {settingBudget ? 'Saving...' : 'Save Budget'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default SetBudgetModal
