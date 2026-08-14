import { XMarkIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount || 0)
}

const safeDate = (dateValue) => {
  if (!dateValue) return 'N/A'
  try {
    const d = new Date(dateValue)
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'N/A'
  }
}

const ObligationHistoryModal = ({ isOpen, onClose, transaction }) => {
  if (!isOpen || !transaction) return null

  const entries = transaction.obligation_entries || []
  const allocated = Number(transaction.allocated_amount) || 0
  const obligated = Number(transaction.obligated_amount) || 0
  const balance = Math.max(0, allocated - obligated)
  const pct = allocated > 0 ? Math.min(100, (obligated / allocated) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden mx-2 sm:mx-0 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ClockIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-dark">Obligation History</h2>
              <p className="text-xs text-text-light">
                {transaction.description || 'Transaction details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-light hover:text-text-dark hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Summary Card */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-text-light">Allocated</p>
                <p className="text-sm sm:text-base font-bold text-text-dark">
                  {formatCurrency(allocated)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-light">Obligated</p>
                <p className="text-sm sm:text-base font-bold text-danger">
                  {formatCurrency(obligated)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-light">Balance</p>
                <p className="text-sm sm:text-base font-bold text-success">
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-text-light">
                <span>{pct.toFixed(1)}% utilized</span>
                <span>{entries.length} {entries.length === 1 ? 'entry' : 'entries'} recorded</span>
              </div>
            </div>
          </div>

          {/* Entries Timeline / List */}
          <div>
            <h3 className="text-xs font-semibold text-text-light uppercase tracking-wider mb-2">
              Chronological Entries Log
            </h3>

            {entries.length === 0 ? (
              <div className="text-center py-8 bg-gray-50/70 rounded-lg border border-dashed border-gray-200">
                <DocumentTextIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                <p className="text-sm text-text-light">No obligation entries recorded yet.</p>
                <p className="text-xs text-text-light mt-0.5">Use "Add Obligation" to add entries.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {entries.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className="p-3 bg-white rounded-lg border border-gray-200 hover:border-primary/40 transition-colors shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-sm font-bold text-text-dark">
                          {formatCurrency(entry.amount)}
                        </span>
                        <span className="ml-2 text-xs text-text-light">
                          on {safeDate(entry.date)}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded">
                        #{entries.length - idx}
                      </span>
                    </div>

                    {entry.note && (
                      <p className="text-xs text-text-dark mt-1 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        {entry.note}
                      </p>
                    )}

                    <p className="text-[11px] text-text-light mt-1">
                      Recorded by: <span className="font-medium text-text-dark">{entry.created_by}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ObligationHistoryModal
