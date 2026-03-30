import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { transactionService } from '../../services/transactionService'
import toast from 'react-hot-toast'

const categories = [
  { id: 1, name: 'Capacity Development' },
  { id: 2, name: 'TM & Promotions' },
  { id: 3, name: 'Socio-Cultural & Eco' },
  { id: 4, name: 'Product & Market Dev' }
]

const abTests = ['T1', 'T2', 'T3', 'None']

const AddTransactionModal = ({ isOpen, onClose, onSuccess, editData = null }) => {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: editData || {
      date: new Date().toISOString().split('T')[0],
      category_id: '',
      a_b_test: 'None',
      allocated_amount: '',
      obligated_amount: ''
    }
  })

  const allocated = watch('allocated_amount') || 0
  const obligated = watch('obligated_amount') || 0
  const balance = allocated - obligated

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      const payload = {
        ...data,
        allocated_amount: parseFloat(data.allocated_amount),
        obligated_amount: parseFloat(data.obligated_amount)
      }

      if (editData) {
        await transactionService.update(editData.id, payload)
        toast.success('Transaction updated successfully')
      } else {
        await transactionService.create(payload)
        toast.success('Transaction created successfully')
      }
      
      reset()
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error(error.message || 'Failed to save transaction')
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
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-text-dark">
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
        <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="p-6 space-y-4">
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
              {...register('category_id', { required: 'Category is required' })}
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

          {/* A/B Test */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              A/B Test
            </label>
            <select {...register('a_b_test')} className="input-field">
              {abTests.map(test => (
                <option key={test} value={test === 'None' ? null : test}>{test}</option>
              ))}
            </select>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
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
                  min: { value: 0, message: 'Must be positive' }
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
                {...register('obligated_amount')}
                className="input-field"
              />
            </div>
          </div>

          {/* Balance Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-text-light">Calculated Balance</p>
            <p className={`text-xl font-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
              ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
