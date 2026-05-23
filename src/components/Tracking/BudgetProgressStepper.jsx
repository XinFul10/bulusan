import { useMemo } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

const TERMINAL_STEPS = new Set(['Budget Requested', 'Completed'])

export function getActiveStepIndex(departments) {
  if (!departments?.length) return 0

  const firstPending = departments.findIndex(
    (step) => !step.approved && !TERMINAL_STEPS.has(step.name)
  )

  if (firstPending >= 0) return firstPending

  const completedIndex = departments.findIndex((step) => step.name === 'Completed')
  return completedIndex >= 0 ? completedIndex : departments.length - 1
}

const BudgetProgressStepper = ({
  departments = [],
  onApprove,
  canApprove = false,
  approving = false,
  className = '',
}) => {
  const activeIndex = useMemo(() => getActiveStepIndex(departments), [departments])

  if (!departments.length) {
    return (
      <p className="text-sm text-text-light text-center py-4">
        No approval steps configured yet.
      </p>
    )
  }

  return (
    <div
      className={`w-full font-sans ${className}`}
      role="group"
      aria-label="Budget approval progress"
    >
      <div className="overflow-x-auto pb-2 -mx-1 px-1 md:overflow-visible">
        <ol className="flex items-start min-w-max md:min-w-0 md:w-full gap-0 list-none m-0 p-0">
          {departments.map((step, index) => {
            const isApproved = Boolean(step.approved)
            const isActive = index === activeIndex && !isApproved
            const isPending = !isApproved && !isActive
            const isLast = index === departments.length - 1
            const lineApproved = isApproved && index < departments.length - 1

            return (
              <li
                key={step.id ?? `${step.name}-${index}`}
                className="flex items-start flex-shrink-0 md:flex-1 md:min-w-0"
                style={{ minWidth: '7.5rem' }}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className="flex flex-col items-center flex-1 px-1 w-full">
                  <div className="flex items-center w-full">
                    <div
                      className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ease-out ${
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
                          className={`block w-5 h-5 rounded-full border-2 ${
                            isActive ? 'border-warning bg-warning/30' : 'border-gray-300 bg-transparent'
                          }`}
                          aria-hidden
                        />
                      )}
                    </div>

                    {!isLast && (
                      <div
                        className="flex-1 h-0.5 mx-1 rounded-full transition-colors duration-500 ease-out min-w-[1.5rem]"
                        style={{
                          backgroundColor: lineApproved ? '#10B981' : '#E5E7EB',
                        }}
                        aria-hidden
                      />
                    )}
                  </div>

                  <p className="mt-3 text-xs font-semibold text-text-dark text-center leading-tight px-0.5">
                    {step.name}
                  </p>

                  {isApproved && step.date && (
                    <p className="mt-1 text-[11px] text-success text-center leading-snug transition-opacity duration-300">
                      {step.date}
                    </p>
                  )}

                  {isActive && (
                    <p className="mt-1 text-[11px] text-warning font-medium text-center leading-snug animate-pulse">
                      Waiting for Approval
                    </p>
                  )}

                  {isPending && (
                    <p className="mt-1 text-[11px] text-text-light text-center leading-snug">
                      Pending
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {canApprove && onApprove && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed transition-opacity duration-200"
            onClick={onApprove}
            disabled={approving}
          >
            {approving ? 'Approving…' : 'Approve'}
          </button>
        </div>
      )}

      <p className="sr-only">
        Step {activeIndex + 1} of {departments.length}:{' '}
        {departments[activeIndex]?.name ?? 'Unknown'}
      </p>
    </div>
  )
}

export default BudgetProgressStepper
