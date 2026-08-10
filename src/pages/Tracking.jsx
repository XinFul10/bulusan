import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import BudgetProgressStepper, { getActiveStepIndex } from '../components/Tracking/BudgetProgressStepper'
import { useAuth } from '../context/AuthContext'
import { approvalService, requestService, categoryService } from '../services/transactionService'
import { getStatusClass } from '../utils/requestStatus'
import { scrollToElement } from '../utils/notificationNavigation'

const normalize = (value) => (value ?? '').trim().toLowerCase()

const departmentCanApprove = (user, stepName) => {
  if (!user || !stepName) return false
  if (user.role === 'head of tourism') return true
  if (!user.department) return false

  const userDept = normalize(user.department)
  const stepDept = normalize(stepName)

  if (userDept === stepDept) return true

  const aliases = {
    'department head': ['department head', 'dept head', 'head of department'],
    'budget office': ['budget office', 'office of the budget'],
    'finance office': ['finance office', 'office of finance', 'finance'],
    "mayor's office": ["mayor's office", 'office of the mayor', 'mayors office', 'mayor office'],
  }

  for (const [canonical, values] of Object.entries(aliases)) {
    if (stepDept === canonical && values.includes(userDept)) return true
    if (values.includes(stepDept) && values.includes(userDept)) return true
  }

  return userDept.includes(stepDept) || stepDept.includes(userDept)
}

const Tracking = () => {
  const { user, isHeadOfTourism } = useAuth()
  const [searchParams] = useSearchParams()
  const requestIdParam = searchParams.get('requestId')
  const [requests, setRequests] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [categories, setCategories] = useState([])
  const [categoryAllocations, setCategoryAllocations] = useState({})
  const [settingBudget, setSettingBudget] = useState(false)
  const rowRefs = useRef({})
  const timelineRef = useRef(null)
  const handledRequestId = useRef(null)

  const timelineDepartments = useMemo(
    () => selectedRequest?.departments || departments,
    [departments, selectedRequest]
  )

  const activeStepIndex = useMemo(() => getActiveStepIndex(timelineDepartments), [timelineDepartments])
  const currentStep = useMemo(
    () => timelineDepartments[activeStepIndex] ?? null,
    [timelineDepartments, activeStepIndex]
  )

  const canApprove = useMemo(() => {
    if (!currentStep || currentStep.approved) return false
    if (['Budget Requested', 'Completed'].includes(currentStep.name)) return false
    return departmentCanApprove(user, currentStep.name)
  }, [currentStep, user])

  const timelineCanApprove = canApprove

  const loadCategories = useCallback(async () => {
    const response = await categoryService.getAll()
    const items = response.data || []
    setCategories(items)
    setCategoryAllocations(
      Object.fromEntries(items.map((cat) => [cat.id, cat.allocation ?? 0]))
    )
  }, [])

  const loadApprovalSteps = useCallback(async () => {
    const response = await approvalService.getSteps()
    setDepartments(response.data || [])
  }, [])

  const loadRequests = useCallback(async () => {
    const response = await requestService.getAll()
    setRequests(response.data || [])
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const tasks = [loadApprovalSteps(), loadRequests()]
        if (isHeadOfTourism()) {
          tasks.push(loadCategories())
        }
        await Promise.all(tasks)
      } catch (e) {
        toast.error('Failed to load tracking data')
      } finally {
        setLoading(false)
      }
    }

    load()

    const handleRefresh = () => load()
    window.addEventListener('refreshData', handleRefresh)
    return () => window.removeEventListener('refreshData', handleRefresh)
  }, [loadApprovalSteps, loadRequests, loadCategories, isHeadOfTourism])

  const selectRequest = useCallback(async (request) => {
    try {
      const response = await requestService.getById(request.id)
      setSelectedRequest(response.data || request)
    } catch (error) {
      console.error('Failed to load request tracking details', error)
      setSelectedRequest(request)
    }
  }, [])

  // Auto-select request from URL ?requestId=BR-2026-001
  useEffect(() => {
    if (loading || !requestIdParam || requests.length === 0) return
    if (handledRequestId.current === requestIdParam) return

    const match = requests.find(
      (r) => r.id === requestIdParam || r.requestId === requestIdParam
    )

    if (!match) return

    handledRequestId.current = requestIdParam

    const loadFromUrl = async () => {
      await selectRequest(match)
      scrollToElement(timelineRef.current, { behavior: 'smooth', block: 'start' })
      scrollToElement(rowRefs.current[match.id])
    }

    loadFromUrl()
  }, [loading, requestIdParam, requests, selectRequest])

  const handleApprove = async () => {
    if (!currentStep?.id) return

    setApproving(true)
    try {
      if (selectedRequest?.id) {
        const requestKey = selectedRequest.requestId || selectedRequest.id
        const response = await requestService.approveStep(requestKey, currentStep.id)
        setSelectedRequest(response.data || selectedRequest)
        await loadRequests()
        toast.success('Approval recorded')
        window.dispatchEvent(new Event('notifications:refresh'))
        window.dispatchEvent(new Event('refreshData'))
        return
      }

      const approvalStep = departments.find((step) => step.name === currentStep?.name)
      if (!approvalStep?.id) return

      const response = await approvalService.approve(approvalStep.id)
      setDepartments(response.data || [])
      await loadRequests()
      toast.success('Approval recorded')
      window.dispatchEvent(new Event('refreshData'))
      window.dispatchEvent(new Event('notifications:refresh'))
    } catch (e) {
      const message = e.response?.data?.message || 'Failed to record approval'
      toast.error(message)
    } finally {
      setApproving(false)
    }
  }

  const totalCategoryBudget = useMemo(
    () => Object.values(categoryAllocations).reduce((sum, value) => sum + (parseFloat(value) || 0), 0),
    [categoryAllocations]
  )

  const handleSetBudget = async (e) => {
    e.preventDefault()

    const payload = categories.map((cat) => ({
      id: cat.id,
      allocation: parseFloat(categoryAllocations[cat.id]) || 0,
    }))

    if (payload.some((item) => item.allocation < 0)) {
      toast.error('Please enter valid budget amounts')
      return
    }

    if (payload.every((item) => item.allocation === 0)) {
      toast.error('Set at least one category budget')
      return
    }

    setSettingBudget(true)
    try {
      await categoryService.updateAllocations(payload)
      toast.success('Category budgets saved successfully')
      setShowBudgetForm(false)
      await loadCategories()
      window.dispatchEvent(new Event('refreshData'))
    } catch (e) {
      const message = e.response?.data?.error || 'Failed to set budget'
      toast.error(message)
    } finally {
      setSettingBudget(false)
    }
  }

  const inReviewCount = useMemo(
    () => requests.filter((r) => r.status === 'Under Review').length,
    [requests]
  )

  const isHighlighted = (req) => {
    if (!requestIdParam) return selectedRequest?.id === req.id
    return req.id === requestIdParam || req.requestId === requestIdParam || selectedRequest?.id === req.id
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-dark">Budget Tracking</h1>
          <p className="text-sm text-text-light mt-1">
            Follow allocation through expenses, review, and finalization
          </p>
        </div>
      </div>

      <div ref={timelineRef} id="request-timeline" className="card py-6 sm:py-8 px-4 sm:px-6">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-text-dark">Request Timeline</h2>
            <p className="text-sm text-text-light">
              {selectedRequest
                ? `Showing approval stages for ${selectedRequest.requestId || selectedRequest.id}.`
                : 'Select a request to view its approval flow and progress.'}
            </p>
          </div>
          {selectedRequest && (
            <span className="inline-flex items-center self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Active request: {selectedRequest.requestId || selectedRequest.id}
            </span>
          )}
        </div>

        <BudgetProgressStepper
          departments={timelineDepartments}
          onApprove={handleApprove}
          canApprove={timelineCanApprove}
          approving={approving}
          approveLabel="Approve"
        />
      </div>

      {isHeadOfTourism() && (
        <div className="card py-6 sm:py-8 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-text-dark">Set Budget</h2>
              <p className="text-sm text-text-light mt-1">
                As Head of Tourism, you can set the budget for all categories
              </p>
            </div>
            {!showBudgetForm && (
              <button
                type="button"
                onClick={() => {
                  setShowBudgetForm(true)
                  loadCategories()
                }}
                className="self-start sm:self-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors duration-200 font-medium text-sm"
              >
                Set Category Budgets
              </button>
            )}
          </div>

          {showBudgetForm && (
            <form onSubmit={handleSetBudget} className="mt-6">
              <div className="space-y-4">
                {categories.map((cat) => (
                  <div key={cat.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 sm:items-center">
                    <label htmlFor={`budget-cat-${cat.id}`} className="text-sm font-medium text-text-dark">
                      {cat.name}
                    </label>
                    <input
                      id={`budget-cat-${cat.id}`}
                      type="number"
                      step="1"
                      min="0"
                      value={categoryAllocations[cat.id] ?? ''}
                      onChange={(e) =>
                        setCategoryAllocations((prev) => ({
                          ...prev,
                          [cat.id]: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                ))}

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-text-light">
                    Total budget:{' '}
                    <span className="font-semibold text-text-dark">
                      {new Intl.NumberFormat('en-PH', {
                        style: 'currency',
                        currency: 'PHP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(totalCategoryBudget)}
                    </span>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={settingBudget}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:bg-gray-400 transition-colors duration-200 font-medium text-sm"
                  >
                    {settingBudget ? 'Saving...' : 'Save Category Budgets'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBudgetForm(false)}
                    className="px-4 py-2 bg-gray-200 text-text-dark rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      <div>
        <h2 className="text-base sm:text-lg font-semibold text-text-dark mb-1">Request Progress</h2>
        <p className="text-sm text-text-light mb-4">
          {requests.length} request{requests.length !== 1 ? 's' : ''} submitted
          {inReviewCount > 0 && ` · ${inReviewCount} under review`}
        </p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="responsive-table-wrap">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th scope="col" className="table-header">Request ID</th>
                <th scope="col" className="table-header">Request Title</th>
                <th scope="col" className="table-header hidden md:table-cell">Requested By</th>
                <th scope="col" className="table-header">Current Dept.</th>
                <th scope="col" className="table-header">Status</th>
                <th scope="col" className="table-header hidden sm:table-cell">Progress</th>
                <th scope="col" className="table-header hidden lg:table-cell">Date Submitted</th>
                <th scope="col" className="table-header">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-card">
              {requests.map((req, idx) => (
                <tr
                  key={req.id}
                  ref={(el) => { rowRefs.current[req.id] = el }}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} transition-colors duration-300 ${
                    isHighlighted(req) ? 'ring-2 ring-primary/40 bg-primary/5' : ''
                  }`}
                >
                  <td className="table-cell font-medium whitespace-nowrap">
                    <button
                      type="button"
                      className="text-primary hover:text-primary-light transition-colors duration-200 underline-offset-2 hover:underline min-h-[44px] min-w-[44px] inline-flex items-center"
                      onClick={() => selectRequest(req)}
                    >
                      {req.id}
                    </button>
                  </td>
                  <td className="table-cell">
                    <span className="block max-w-[10rem] sm:max-w-[14rem] truncate" title={req.title}>
                      {req.title}
                    </span>
                  </td>
                  <td className="table-cell hidden md:table-cell">{req.requestedBy}</td>
                  <td className="table-cell">{req.currentDepartment}</td>
                  <td className="table-cell">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-300 ${getStatusClass(req.status)}`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="table-cell hidden sm:table-cell">
                    <div className="min-w-[7rem]">
                      <div className="flex justify-between text-xs text-text-light mb-1">
                        <span>{req.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-light rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${req.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="table-cell whitespace-nowrap hidden lg:table-cell">{req.submittedDate}</td>
                  <td className="table-cell">
                    <button
                      type="button"
                      className="text-sm font-medium text-primary hover:text-primary-light transition-colors duration-200 min-h-[44px] px-2"
                      onClick={() => selectRequest(req)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {requests.length === 0 && (
                <tr>
                  <td className="table-cell text-text-light" colSpan={8}>
                    No budget requests submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Tracking
