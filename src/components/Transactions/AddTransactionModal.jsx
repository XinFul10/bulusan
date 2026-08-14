import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { XMarkIcon, InformationCircleIcon, PlusCircleIcon } from '@heroicons/react/24/outline'
import { transactionService, dashboardService } from '../../services/transactionService'
import toast from 'react-hot-toast'

const defaultCategories = [
  { id: 1, name: 'Capacity Development' },
  { id: 2, name: 'TM & Promotions' },
  { id: 3, name: 'Socio-Cultural & Eco' },
  { id: 4, name: 'Product & Market Dev' }
]

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount || 0)
}

const AddTransactionModal = ({ isOpen, onClose, onSuccess, editData = null }) => {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState(defaultCategories)
  const [budgetInfo, setBudgetInfo] = useState({ total_budget: null, remaining_balance: null })
  const isEditing = Boolean(editData)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      description: '',
      category_id: '',
      custom_category: '',
      allocated_amount: '',
      obligated_amount: '',
      // Add obligation fields
      new_obligation_amount: '',
      obligation_date: new Date().toISOString().split('T')[0],
      obligation_note: ''
    }
  })

  // Synchronize form values whenever modal opens or editData changes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        reset({
          date: editData.transaction_date || editData.date || '',
          description: editData.description || '',
          category_id: editData.category_id ? editData.category_id.toString() : '',
          custom_category: editData.custom_category || '',
          allocated_amount: editData.allocated_amount ?? '',
          obligated_amount: editData.obligated_amount ?? 0,
          new_obligation_amount: '',
          obligation_date: new Date().toISOString().split('T')[0],
          obligation_note: ''
        })
      } else {
        reset({
          date: new Date().toISOString().split('T')[0],
          description: '',
          category_id: '',
          custom_category: '',
          allocated_amount: '',
          obligated_amount: '',
          new_obligation_amount: '',
          obligation_date: new Date().toISOString().split('T')[0],
          obligation_note: ''
        })
      }
    }
  }, [isOpen, editData, reset])

  const customCategory = watch('custom_category')
  const allocated = Number(watch('allocated_amount') || (editData ? editData.allocated_amount : 0))
  const existingObligated = isEditing ? Number(editData?.obligated_amount || 0) : 0
  const newObligationAmt = isEditing ? Number(watch('new_obligation_amount') || 0) : 0
  const initialObligated = !isEditing ? Number(watch('obligated_amount') || 0) : 0
  const totalProjectedObligated = isEditing ? (existingObligated + newObligationAmt) : initialObligated
  const balance = allocated - totalProjectedObligated
  const remainingAllocatedBeforeNew = Math.max(0, allocated - existingObligated)

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

      if (isEditing) {
        // When editing, record a new incremental obligation entry
        const obligationAmount = Number(data.new_obligation_amount)
        if (!obligationAmount || obligationAmount <= 0) {
          toast.error('Please enter a valid obligation amount greater than zero')
          setLoading(false)
          return
        }

        await transactionService.addObligation(editData.id, {
          amount: obligationAmount,
          date: data.obligation_date || new Date().toISOString().split('T')[0],
          note: data.obligation_note || null
        })

        toast.success(`Added ₱${obligationAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} obligation successfully`)
      } else {
        const payload = {
          transaction_date: data.date,
          description: data.description,
          category_id: data.category_id ? parseInt(data.category_id) : null,
          custom_category: data.custom_category || null,
          allocated_amount: Number(data.allocated_amount) || 0,
          obligated_amount: Number(data.obligated_amount) || 0
        }
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
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-text-dark">
              {isEditing ? 'Add Obligation Entry' : 'New Transaction'}
            </h2>
            {isEditing && (
              <p className="text-xs text-text-light mt-0.5">
                Record an incremental obligation payment against this transaction
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-light hover:text-text-dark hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Informative notice when editing */}
        {isEditing && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2.5 text-xs text-blue-800">
            <InformationCircleIcon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Incremental Obligation:</strong> Enter only the new amount being committed now. It will be added automatically to this transaction's cumulative obligation total.
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="p-4 sm:p-6 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Transaction Date {!isEditing && <span className="text-danger">*</span>}
            </label>
            <input
              type="date"
              disabled={isEditing}
              {...register('date', { required: !isEditing ? 'Date is required' : false })}
              className="input-field disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200"
            />
            {errors.date && (
              <p className="text-danger text-sm mt-1">{errors.date.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Description {!isEditing && <span className="text-danger">*</span>}
            </label>
            <input
              type="text"
              disabled={isEditing}
              placeholder="Enter transaction description"
              {...register('description', { required: !isEditing ? 'Description is required' : false })}
              className="input-field disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200"
            />
            {errors.description && (
              <p className="text-danger text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Category {!isEditing && <span className="text-danger">*</span>}
            </label>
            <select
              disabled={isEditing}
              {...register('category_id', {
                validate: value => {
                  if (isEditing) return true
                  if (value && customCategory) {
                    return 'Please choose either a preset category or a custom category, not both.'
                  }
                  if (!value && !customCategory) {
                    return 'Category or custom category is required'
                  }
                  return true
                }
              })}
              className="input-field disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200"
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

          {/* Custom Category (only displayed if not editing) */}
          {!isEditing && (
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
          )}

          {/* Creation Mode: Amounts */}
          {!isEditing && (
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
                  Initial Obligated (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('obligated_amount', {
                    min: { value: 0, message: 'Must be positive or zero' },
                    validate: value => {
                      if (!value) return true
                      const amount = Number(value)
                      const alloc = Number(watch('allocated_amount') || 0)
                      if (alloc > 0 && amount > alloc) {
                        return `Initial obligation cannot exceed allocated amount of ₱${alloc.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
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
          )}

          {/* Edit / Incremental Mode: Add Obligation Entry */}
          {isEditing && (
            <div className="space-y-4 pt-2 border-t border-gray-200">
              {/* Allocation Reference Card */}
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 text-xs sm:text-sm space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-text-light">Fixed Allocation:</span>
                  <span className="font-semibold text-text-dark">{formatCurrency(allocated)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-light">Currently Obligated:</span>
                  <span className="font-semibold text-danger">{formatCurrency(existingObligated)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-gray-200/60">
                  <span className="text-text-light">Remaining Available to Obligate:</span>
                  <span className="font-bold text-primary">{formatCurrency(remainingAllocatedBeforeNew)}</span>
                </div>
              </div>

              {/* Incremental Obligation Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text-dark mb-1">
                    New Obligation Amount (₱) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    autoFocus
                    placeholder="e.g. 30000"
                    {...register('new_obligation_amount', {
                      required: 'Obligation amount is required',
                      min: { value: 1, message: 'Amount must be greater than 0' },
                      validate: value => {
                        const amount = Number(value)
                        if (amount <= 0) return 'Amount must be greater than 0'
                        if (amount > remainingAllocatedBeforeNew) {
                          const excess = amount - remainingAllocatedBeforeNew
                          return `This would exceed the allocated ₱${allocated.toLocaleString('en-PH', { minimumFractionDigits: 2 })} by ₱${excess.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                        }
                        return true
                      }
                    })}
                    className="input-field focus:ring-2 focus:ring-primary focus:border-primary font-medium text-base"
                  />
                  {errors.new_obligation_amount && (
                    <p className="text-danger text-xs mt-1 font-medium">{errors.new_obligation_amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">
                    Obligation Date
                  </label>
                  <input
                    type="date"
                    {...register('obligation_date')}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Optional Note / Reference */}
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">
                  Payment / Reference Note <span className="text-xs text-text-light font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Phase 1 downpayment, Voucher #1024"
                  {...register('obligation_note')}
                  className="input-field text-sm"
                />
              </div>

              {/* Live Computation Preview */}
              <div className="bg-primary/5 rounded-xl p-3.5 border border-primary/20 text-xs sm:text-sm space-y-1.5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Projected Total Calculation</p>
                <div className="flex justify-between items-center text-text-light text-xs">
                  <span>Current Obligated ({formatCurrency(existingObligated)}) + New Entry ({formatCurrency(newObligationAmt)}):</span>
                  <span className="font-semibold text-text-dark">{formatCurrency(totalProjectedObligated)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-primary/10">
                  <span className="font-medium text-text-dark">New Remaining Balance:</span>
                  <span className={`font-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Creation Balance Preview */}
          {!isEditing && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-text-light">Calculated Balance</p>
              <p className={`text-xl font-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(balance)}
              </p>
              <p className="text-xs text-text-light mt-2">
                {budgetRemaining !== null
                  ? `Remaining budget: ${formatCurrency(budgetRemaining)}`
                  : 'No budget is set yet.'}
              </p>
            </div>
          )}

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
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                <>
                  <PlusCircleIcon className="w-4 h-4" />
                  <span>Add Obligation</span>
                </>
              ) : (
                <span>Submit Transaction</span>
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
