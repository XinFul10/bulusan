import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { transactionService, dashboardService } from '../../services/transactionService'
import toast from 'react-hot-toast'

const defaultCategories = [
  { id: 1, name: 'Capacity Development' },
  { id: 2, name: 'TM & Promotions' },
  { id: 3, name: 'Socio-Cultural & Eco' },
  { id: 4, name: 'Product & Market Dev' }
]

const AddTransactionModal = ({ isOpen, onClose, onSuccess, editData = null }) => {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState(defaultCategories)
  const [budgetInfo, setBudgetInfo] = useState({ total_budget: null, remaining_balance: null })
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: editData ? {
      date: editData.transaction_date,
      description: editData.description,
      category_id: editData.category_id ? editData.category_id.toString() : '',
      custom_category: '',
      allocated_amount: editData.allocated_amount,
      obligated_amount: editData.obligated_amount
    } : {
      date: new Date().toISOString().split('T')[0],
      category_id: '',
      custom_category: '',
      allocated_amount: '',
      obligated_amount: ''
    }
  })

  const customCategory = watch('custom_category')
  const allocated = Number(watch('allocated_amount') || 0)
  const obligated = Number(watch('obligated_amount') || 0)
  const balance = allocated - obligated
  const budgetTotal = budgetInfo.total_budget
  const budgetRemaining = budgetInfo.remaining_balance

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const loadBudgetInfo = async () => {
      try {
        const response = await dashboardService.getStats()
        setBudgetInfo(response.data)
      } catch (error) {
        setBudgetInfo({ total_budget: null, remaining_balance: null })
      }
    }

    const loadCategories = async () => {
      try {
        const response = await transactionService.getCategories()
        setCategories(response.data?.data?.length ? response.data.data : defaultCategories)
      } catch (error) {
        setCategories(defaultCategories)
      }
    }

    loadBudgetInfo()
    loadCategories()
  }, [isOpen])

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      const payload = {
        transaction_date: data.date,
        description: data.description,
        category_id: data.category_id ? parseInt(data.category_id) : null,
        custom_category: data.custom_category || null,
        allocated_amount: Number(data.allocated_amount) || 0,
        obligated_amount: Number(data.obligated_amount) || 0
      }

      if (editData) {
        await transactionService.update(editData.id, payload)
        toast.success('Transaction updated successfully')
      } else {
        await transactionService.create(payload)
        toast.success('Transaction created successfully')
        window.dispatchEvent(new Event('notifications:refresh'))
      }
      
      reset()
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to save transaction')
    } finally {
      setLoading(false)
    }
  }

  // Handle Enter key to submit
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(onSubmit)()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-text-dark">
            {editData ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-light hover:text-text-dark hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="p-4 sm:p-6 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              {...register('date', { required: 'Date is required' })}
              className="input-field"
            />
            {errors.date && (
              <p className="text-danger text-sm mt-1">{errors.date.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Description <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter transaction description"
              {...register('description', { required: 'Description is required' })}
              className="input-field"
            />
            {errors.description && (
              <p className="text-danger text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Category <span className="text-danger">*</span>
            </label>
            <select
              {...register('category_id', {
                validate: value => {
                  if (value && customCategory) {
                    return 'Please choose either a preset category or a custom category, not both.'
                  }
                  if (!value && !customCategory) {
                    return 'Category or custom category is required'
                  }
                  return true
                }
              })}
              className="input-field"
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.category_id && (
              <p className="text-danger text-sm mt-1">{errors.category_id.message}</p>
            )}
          </div>

          {/* Custom Category */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Custom Category
            </label>
            <input
              type="text"
              placeholder="Optional: add a new category"
              {...register('custom_category', {
                validate: value => {
                  if (value && watch('category_id')) {
                    return 'Please choose either a preset category or a custom category, not both.'
                  }
                  return true
                }
              })}
              className="input-field"
            />
            {errors.custom_category && (
              <p className="text-danger text-sm mt-1">{errors.custom_category.message}</p>
            )}
          </div>

          {/* Amounts — single column on mobile, 2 columns on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                Allocated (₱) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('allocated_amount', { 
                  required: 'Amount is required',
                  min: { value: 0, message: 'Must be positive' },
                  validate: value => {
                    const amount = Number(value)
                    if (budgetTotal !== null && amount > budgetTotal) {
                      return `Allocated amount cannot exceed total budget of ₱${budgetTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                    }
                    return true
                  }
                })}
                className="input-field"
              />
              {errors.allocated_amount && (
                <p className="text-danger text-sm mt-1">{errors.allocated_amount.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                Obligated (₱)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('obligated_amount', {
                  validate: value => {
                    if (!value) return true
                    const amount = Number(value)
                    if (budgetRemaining !== null && amount > budgetRemaining) {
                      return `Obligated amount cannot exceed remaining budget of ₱${budgetRemaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                    }
                    return true
                  }
                })}
                className="input-field"
              />
              {errors.obligated_amount && (
                <p className="text-danger text-sm mt-1">{errors.obligated_amount.message}</p>
              )}
            </div>
          </div>

          {/* Balance Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-text-light">Calculated Balance</p>
            <p className={`text-xl font-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
              ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-text-light mt-2">
              {budgetRemaining !== null
                ? `Remaining budget: ₱${budgetRemaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                : 'No budget is set yet.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                editData ? 'Update Transaction' : 'Submit Transaction'
              )}
            </button>
          </div>
          
          <p className="text-xs text-text-light text-center">
            Press Enter to submit
          </p>
        </form>
      </div>
    </div>
  )
}

export default AddTransactionModal
