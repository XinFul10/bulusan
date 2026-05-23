import { XMarkIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { getActiveStepIndex } from './BudgetProgressStepper'

const TERMINAL_STEPS = new Set(['Budget Requested', 'Completed'])

const RequestTrackingModal = ({ isOpen, onClose, request }) => {
  if (!isOpen || !request) return null

  const departments = request.departments || []
  const activeIndex = getActiveStepIndex(departments)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-text-dark">
              Budget Request {request.requestId || request.id}
            </h2>
            <p className="text-sm text-text-light mt-1">{request.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-light hover:text-text-dark hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <ol className="space-y-0 list-none m-0 p-0">
            {departments.map((step, index) => {
              const isApproved = Boolean(step.approved)
              const isActive = index === activeIndex && !isApproved
              const isLast = index === departments.length - 1
              const showWaiting = isActive && !TERMINAL_STEPS.has(step.name)

              return (
                <li key={step.id ?? `${step.name}-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                        isApproved
                          ? 'bg-success/10 text-success'
                          : isActive
                            ? 'bg-warning/15 text-warning ring-2 ring-warning/40'
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isApproved ? (
                        <CheckCircleIcon className="w-5 h-5" aria-hidden />
                      ) : (
                        <span
                          className={`block w-4 h-4 rounded-full border-2 ${
                            isActive ? 'border-warning bg-warning/30' : 'border-gray-300'
                          }`}
                          aria-hidden
                        />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 flex-1 min-h-[2rem] my-1 rounded-full transition-colors duration-500 ${
                          isApproved ? 'bg-success' : 'bg-gray-200'
                        }`}
                        aria-hidden
                      />
                    )}
                  </div>

                  <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                    <p className="text-sm font-semibold text-text-dark">
                      {step.name}
                      {isApproved && (
                        <span className="ml-1.5 text-success font-normal">✓</span>
                      )}
                    </p>
                    {isApproved && step.date && (
                      <p className="text-xs text-success mt-0.5">{step.date}</p>
                    )}
                    {showWaiting && (
                      <p className="text-xs text-warning font-medium mt-0.5">
                        Waiting for Approval
                      </p>
                    )}
                    {!isApproved && !isActive && !TERMINAL_STEPS.has(step.name) && (
                      <p className="text-xs text-text-light mt-0.5">Pending</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-light">Progress</span>
              <span className="font-semibold text-text-dark">{request.progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-light rounded-full transition-all duration-500 ease-out"
                style={{ width: `${request.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RequestTrackingModal
