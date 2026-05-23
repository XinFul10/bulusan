import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import BudgetProgressStepper, { getActiveStepIndex } from '../components/Tracking/BudgetProgressStepper'
import RequestTrackingModal from '../components/Tracking/RequestTrackingModal'
import { useAuth } from '../context/AuthContext'
import { approvalService, requestService } from '../services/transactionService'
import { getStatusClass } from '../utils/requestStatus'

const normalize = (value) => (value ?? '').trim().toLowerCase()

const departmentCanApprove = (user, stepName) => {
  if (!user || !stepName) return false
  if (user.role === 'admin') return true
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
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const activeStepIndex = useMemo(() => getActiveStepIndex(departments), [departments])
  const currentStep = departments[activeStepIndex] ?? null

  const canApprove = useMemo(() => {
    if (!currentStep || currentStep.approved) return false
    if (['Budget Requested', 'Completed'].includes(currentStep.name)) return false
    return departmentCanApprove(user, currentStep.name)
  }, [currentStep, user])

  const loadApprovalSteps = useCallback(async () => {
    const response = await approvalService.getSteps()
    setDepartments(response.data || [])
  }, [])

  const loadRequests = useCallback(async () => {
    const response = await requestService.getAll()
    setRequests(response.data || [])
  }, [])

  useEffect(() => {
    if (!modalOpen || !selectedRequest) return
    const updated = requests.find((r) => r.id === selectedRequest.id)
    if (updated) setSelectedRequest(updated)
  }, [requests, modalOpen, selectedRequest?.id])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        await Promise.all([loadApprovalSteps(), loadRequests()])
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
  }, [loadApprovalSteps, loadRequests])

  const handleApprove = async () => {
    if (!currentStep?.id) return

    setApproving(true)
    try {
      const response = await approvalService.approve(currentStep.id)
      setDepartments(response.data || [])
      await loadRequests()
      toast.success('Approval recorded')
      window.dispatchEvent(new Event('refreshData'))
    } catch (e) {
      const message = e.response?.data?.message || 'Failed to record approval'
      toast.error(message)
    } finally {
      setApproving(false)
    }
  }

  const openTrackingModal = (request) => {
    setSelectedRequest(request)
    setModalOpen(true)
  }

  const closeTrackingModal = () => {
    setModalOpen(false)
    setSelectedRequest(null)
  }

  const inReviewCount = useMemo(
    () => requests.filter((r) => r.status === 'Under Review').length,
    [requests]
  )

  if (loading) {
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
          <h1 className="text-2xl font-bold text-text-dark">Budget Tracking</h1>
          <p className="text-sm text-text-light mt-1">
            Follow allocation through expenses, review, and finalization
          </p>
        </div>
      </div>

      <div className="card py-8 px-6">
        <BudgetProgressStepper
          departments={departments}
          onApprove={handleApprove}
          canApprove={canApprove}
          approving={approving}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-text-dark mb-1">Request Progress</h2>
        <p className="text-sm text-text-light mb-4">
          {requests.length} request{requests.length !== 1 ? 's' : ''} submitted
          {inReviewCount > 0 && ` · ${inReviewCount} under review`}
        </p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th scope="col" className="table-header">Request ID</th>
                <th scope="col" className="table-header">Request Title</th>
                <th scope="col" className="table-header">Requested By</th>
                <th scope="col" className="table-header">Current Department</th>
                <th scope="col" className="table-header">Status</th>
                <th scope="col" className="table-header">Progress</th>
                <th scope="col" className="table-header">Date Submitted</th>
                <th scope="col" className="table-header">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-card">
              {requests.map((req, idx) => (
                <tr key={req.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="table-cell font-medium whitespace-nowrap">{req.id}</td>
                  <td className="table-cell">
                    <span className="block max-w-[14rem] truncate" title={req.title}>
                      {req.title}
                    </span>
                  </td>
                  <td className="table-cell">{req.requestedBy}</td>
                  <td className="table-cell">{req.currentDepartment}</td>
                  <td className="table-cell">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-300 ${getStatusClass(req.status)}`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="table-cell">
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
                  <td className="table-cell whitespace-nowrap">{req.submittedDate}</td>
                  <td className="table-cell">
                    <button
                      type="button"
                      className="text-sm font-medium text-primary hover:text-primary-light transition-colors duration-200"
                      onClick={() => openTrackingModal(req)}
                    >
                      View Tracking
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

      <RequestTrackingModal
        isOpen={modalOpen}
        onClose={closeTrackingModal}
        request={selectedRequest}
      />
    </div>
  )
}

export default Tracking
