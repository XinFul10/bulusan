import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BoltIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon as ChevronRightSm,
} from '@heroicons/react/24/outline'
import BudgetProgressStepper, { getActiveStepIndex } from '../components/Tracking/BudgetProgressStepper'
import { useAuth } from '../context/AuthContext'
import { approvalService, requestService } from '../services/transactionService'
import { getStatusClass } from '../utils/requestStatus'
import { scrollToElement } from '../utils/notificationNavigation'
import { SkeletonTable } from '../components/Skeleton'

const ROWS_OPTIONS = [10, 25, 50]

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
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const requestIdParam = searchParams.get('requestId')
  const [requests, setRequests] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const rowRefs = useRef({})
  const timelineRef = useRef(null)
  const handledRequestId = useRef(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Admin override
  const [adminActing, setAdminActing] = useState(false)
  const [fastTrackConfirmOpen, setFastTrackConfirmOpen] = useState(false)

  const isPrivileged = useMemo(
    () => user?.role === 'admin' || user?.role === 'head of tourism',
    [user]
  )

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

  const requestIsActive = useMemo(() => {
    if (!selectedRequest) return false
    const key = selectedRequest.statusKey ?? selectedRequest.status?.toLowerCase()
    return !['completed', 'rejected'].includes(key)
  }, [selectedRequest])

  const pendingStageNames = useMemo(() => {
    if (!timelineDepartments.length) return []
    return timelineDepartments
      .filter(s => !s.approved && !['Budget Requested', 'Completed'].includes(s.name))
      .map(s => s.name)
  }, [timelineDepartments])

  // ── Pagination derived values ──────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(requests.length / rowsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const pageStart = (safePage - 1) * rowsPerPage
  const pageEnd = Math.min(pageStart + rowsPerPage, requests.length)
  const pagedRequests = requests.slice(pageStart, pageEnd)

  // ── Data loading ───────────────────────────────────────────────────────────
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

  // ── Select a request + scroll + flash ─────────────────────────────────────
  const selectRequest = useCallback(async (request, { scroll = false } = {}) => {
    try {
      const response = await requestService.getById(request.id)
      setSelectedRequest(response.data || request)
    } catch (error) {
      console.error('Failed to load request tracking details', error)
      setSelectedRequest(request)
    }

    if (scroll && timelineRef.current) {
      // Smooth scroll to timeline card
      timelineRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })

      // Apply flash highlight class — remove+re-add to restart animation if triggered again
      const el = timelineRef.current
      el.classList.remove('timeline-highlight')
      // Tiny frame delay so the browser registers the removal before re-adding
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.classList.add('timeline-highlight')
          // Remove after animation ends so it doesn't interfere with other styles
          const cleanup = () => {
            el.classList.remove('timeline-highlight')
            el.removeEventListener('animationend', cleanup)
          }
          el.addEventListener('animationend', cleanup)
        })
      })
    }
  }, [])

  // Auto-select from URL param
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

  // ── Normal department approval ─────────────────────────────────────────────
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

  // ── Admin overrides ────────────────────────────────────────────────────────
  const handleAdminApproveStage = async () => {
    if (!selectedRequest) return
    const requestKey = selectedRequest.requestId || selectedRequest.id
    setAdminActing(true)
    try {
      const response = await requestService.adminApproveStage(requestKey)
      setSelectedRequest(response.data || selectedRequest)
      await loadRequests()
      toast.success('Stage approved — request advanced to next step.')
      window.dispatchEvent(new Event('notifications:refresh'))
      window.dispatchEvent(new Event('refreshData'))
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to approve stage')
    } finally {
      setAdminActing(false)
    }
  }

  const handleAdminFastTrackConfirm = async () => {
    if (!selectedRequest) return
    const requestKey = selectedRequest.requestId || selectedRequest.id
    setFastTrackConfirmOpen(false)
    setAdminActing(true)
    try {
      const response = await requestService.adminFastTrack(requestKey)
      setSelectedRequest(response.data || selectedRequest)
      await loadRequests()
      toast.success('Request fast-tracked to Completed.')
      window.dispatchEvent(new Event('notifications:refresh'))
      window.dispatchEvent(new Event('refreshData'))
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to fast-track request')
    } finally {
      setAdminActing(false)
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

  // ── Pagination controls ────────────────────────────────────────────────────
  const handleRowsChange = (e) => {
    setRowsPerPage(Number(e.target.value))
    setCurrentPage(1)
  }

  const goToPrev = () => setCurrentPage((p) => Math.max(1, p - 1))
  const goToNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1))

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <div className="skeleton-shimmer h-7 w-44 rounded" />
          <div className="skeleton-shimmer h-4 w-80 rounded" />
        </div>
        <div className="card py-6 sm:py-8 px-4 sm:px-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="skeleton-shimmer h-5 w-40 rounded" />
              <div className="skeleton-shimmer h-3.5 w-64 rounded" />
            </div>
          </div>
          <div className="flex gap-3 overflow-hidden mt-2">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="flex-1 space-y-2">
                <div className="skeleton-shimmer h-8 w-8 rounded-full mx-auto" />
                <div className="skeleton-shimmer h-3 w-full rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="skeleton-shimmer h-5 w-40 rounded" />
          <div className="skeleton-shimmer h-3.5 w-32 rounded" />
        </div>
        <div className="card p-0 overflow-hidden">
          <div className="responsive-table-wrap">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  {['Request ID','Title','Requested By','Dept.','Status','Progress','Date','Action'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <SkeletonTable rows={6} cols={8}
                  colWidths={['w-24','w-full','w-28','w-28','w-20','w-32','w-24','w-16']} />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────
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

      {/* Request Timeline */}
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
          canApprove={canApprove}
          approving={approving}
          approveLabel="Approve"
          isPrivileged={isPrivileged && !!selectedRequest}
          requestIsActive={requestIsActive}
          onAdminApproveStage={handleAdminApproveStage}
          onAdminFastTrack={() => setFastTrackConfirmOpen(true)}
          adminActing={adminActing}
          pendingStageNames={pendingStageNames}
        />
      </div>

      {/* Request Progress heading */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-text-dark mb-1">Request Progress</h2>
        <p className="text-sm text-text-light mb-4">
          {requests.length} request{requests.length !== 1 ? 's' : ''} submitted
          {inReviewCount > 0 && ` · ${inReviewCount} under review`}
        </p>
      </div>

      {/* Table */}
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
              {pagedRequests.map((req, idx) => (
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
                      onClick={() => selectRequest(req, { scroll: true })}
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
                      onClick={() => selectRequest(req, { scroll: true })}
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

        {/* Pagination bar */}
        {requests.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-gray-200 bg-white">
            {/* Left: rows per page + showing label */}
            <div className="flex items-center gap-3 text-sm text-text-light">
              <label htmlFor="tracking-rows-per-page" className="whitespace-nowrap">
                Rows per page:
              </label>
              <select
                id="tracking-rows-per-page"
                value={rowsPerPage}
                onChange={handleRowsChange}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
              >
                {ROWS_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="hidden sm:inline whitespace-nowrap">
                Showing {requests.length === 0 ? 0 : pageStart + 1}–{pageEnd} of {requests.length}
              </span>
            </div>

            {/* Right: page navigation */}
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={goToPrev}
                disabled={safePage <= 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 text-text-dark hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                aria-label="Previous page"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>

              <span className="text-text-dark font-medium whitespace-nowrap px-1">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={goToNext}
                disabled={safePage >= totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 text-text-dark hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                aria-label="Next page"
              >
                <ChevronRightSm className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fast-Track Confirmation Modal */}
      {fastTrackConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setFastTrackConfirmOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/10 shrink-0">
                  <BoltIcon className="w-5 h-5 text-warning" />
                </div>
                <h2 className="text-lg font-bold text-text-dark">Fast-Track to Completed</h2>
              </div>
              <button
                type="button"
                onClick={() => setFastTrackConfirmOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-3 bg-warning/8 border border-warning/25 rounded-xl p-3 mb-4">
              <ExclamationTriangleIcon className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-text-dark leading-relaxed">
                This will immediately mark <strong>all remaining approval stages</strong> as completed, bypassing the normal department-by-department flow.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-light">Request</span>
                <span className="font-semibold text-text-dark">
                  {selectedRequest?.requestId || selectedRequest?.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-light">Title</span>
                <span className="font-medium text-text-dark max-w-[55%] text-right truncate" title={selectedRequest?.title}>
                  {selectedRequest?.title}
                </span>
              </div>
              {pendingStageNames.length > 0 && (
                <div className="pt-1 border-t border-gray-200">
                  <p className="text-text-light mb-1.5">Stages that will be bypassed:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pendingStageNames.map(name => (
                      <span
                        key={name}
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-warning/10 text-warning text-xs font-medium"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-text-light mb-5">
              This action will be recorded in the System Logs with your name and a list of bypassed stages.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setFastTrackConfirmOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-text-dark hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-fast-track-confirm"
                type="button"
                onClick={handleAdminFastTrackConfirm}
                className="px-4 py-2 rounded-lg bg-warning text-white text-sm font-semibold hover:bg-amber-600 active:bg-amber-700 transition-colors flex items-center gap-2"
              >
                <BoltIcon className="w-4 h-4" />
                Fast-Track Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tracking
