import { XMarkIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline'

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount || 0)
}

const DeleteTransactionModal = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  loading = false
}) => {
  if (!isOpen || !transaction) return null

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !loading) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => !loading && onClose()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden mx-2 sm:mx-0 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-danger">
              <ExclamationTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-dark">Delete Transaction</h2>
              <p className="text-xs text-text-light">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-text-light hover:text-text-dark hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-sm text-text-dark">
            Are you sure you want to permanently delete this transaction? Please confirm the details below before proceeding.
          </p>

          {/* Transaction Summary Card */}
          <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-200 text-xs sm:text-sm space-y-2">
            <div className="flex justify-between items-start gap-2">
              <span className="text-text-light">Description:</span>
              <span className="font-medium text-text-dark text-right break-words max-w-[65%]">
                {transaction.description || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-text-light">Category:</span>
              <span className="font-medium text-text-dark">
                {transaction.category_name || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-text-light">Date:</span>
              <span className="font-medium text-text-dark">
                {transaction.transaction_date || transaction.date || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2 pt-1 border-t border-gray-200/60">
              <span className="text-text-light">Allocated:</span>
              <span className="font-semibold text-text-dark">
                {formatCurrency(transaction.allocated_amount)}
              </span>
            </div>
            {Number(transaction.obligated_amount) > 0 && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-text-light">Obligated:</span>
                <span className="font-semibold text-danger">
                  {formatCurrency(transaction.obligated_amount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-4 sm:p-6 bg-gray-50/50 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="btn-danger flex items-center justify-center gap-2 min-w-[100px]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <TrashIcon className="w-4 h-4" />
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteTransactionModal
