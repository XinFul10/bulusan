import { useState, useEffect, useRef, Fragment } from 'react'
import {
  DocumentArrowDownIcon, PrinterIcon, EyeIcon, TrashIcon,
  ArrowPathIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon, ChevronRightIcon
} from '@heroicons/react/24/outline'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { reportService } from '../services/transactionService'
import { generateReportCode, isValidReportCode } from '../utils/reportCodeGenerator'
import { useAuth } from '../context/AuthContext'
import { SkeletonReportItem } from '../components/Skeleton'

// ─── Constants ───────────────────────────────────────────────────────────────
const reportTypes = [
  { value: 'budget_summary',    label: 'Budget Summary' },
  { value: 'obligation_details',label: 'Obligation Details' },
  { value: 'category_analysis', label: 'Category Analysis' },
  { value: 'monthly_trends',   label: 'Monthly Trends' }
]

const categories = [
  { id: '',  name: 'All Categories' },
  { id: 1,   name: 'Capacity Development' },
  { id: 2,   name: 'TM & Promotions' },
  { id: 3,   name: 'Socio-Cultural & Eco' },
  { id: 4,   name: 'Product & Market Dev' }
]

const mockLineData = [
  { month: 'Jan', budget: 450000, actual: 420000 },
  { month: 'Feb', budget: 480000, actual: 450000 },
  { month: 'Mar', budget: 500000, actual: 520000 },
  { month: 'Apr', budget: 520000, actual: 480000 },
  { month: 'May', budget: 550000, actual: 530000 },
  { month: 'Jun', budget: 580000, actual: 560000 }
]

const COLORS = ['#0E3642', '#22626B', '#10B981', '#F59E0B']

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Derive a display status label from allocated/obligated amounts. */
const getTransactionStatus = (allocated, obligated) => {
  const a = Number(allocated) || 0
  const o = Number(obligated) || 0
  if (o === 0)        return { label: 'Not Used',     color: 'bg-gray-400' }
  if (o < a)          return { label: 'Partial',       color: 'bg-warning' }
  if (o === a)        return { label: 'Fully Used',    color: 'bg-success' }
  return               { label: 'Over-obligated', color: 'bg-danger' }
}

/**
 * Shared snake_case → camelCase transform.
 * Used for list load, report generation AND verification so every flow
 * produces an identical shape for the preview panel.
 */
const transformReport = (r) => ({
  id:               r.id,
  type:             r.type,
  typeLabel:        r.type_label,
  dateFrom:         r.date_from,
  dateTo:           r.date_to,
  category:         r.category,
  data:             r.data,          // already contains transactions[] snapshot
  generatedAt:      r.generated_at,
  createdBy:        r.created_by,
  verificationCode: r.verification_code,
  description:      r.description ?? '',
  isDeleted:        r.is_deleted ?? false,
})

// ─── Formatters ──────────────────────────────────────────────────────────────
const formatCurrencyPH = (amount) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount || 0)

const safeDate = (dateValue, fmt = 'MMM dd, yyyy HH:mm') => {
  if (!dateValue) return 'N/A'
  try {
    const d = new Date(dateValue)
    return isNaN(d.getTime()) ? 'N/A' : format(d, fmt)
  } catch { return 'N/A' }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * TransactionBreakdown — collapsible transaction rows for one category.
 * Handles the case where older reports have no transactions[] in their data.
 */
const TransactionBreakdown = ({ transactions = [], formatCurrency }) => {
  if (!transactions.length) {
    return (
      <tr>
        <td colSpan="7" className="px-6 py-3 text-xs text-text-light italic bg-gray-50/80">
          No individual transaction records stored for this report period.
          (Re-generate the report to capture a full snapshot.)
        </td>
      </tr>
    )
  }
  return (
    <>
      {transactions.map((t, i) => {
        const status = getTransactionStatus(t.allocated, t.obligated)
        return (
          <tr key={t.id ?? i} className="bg-gray-50/60 hover:bg-primary/[0.03] transition-colors">
            {/* Indent cell */}
            <td className="w-8 pl-6 pr-0 py-2">
              <span className="block w-px h-full bg-gray-300 mx-auto" />
            </td>
            <td className="table-cell text-xs text-text-light py-2">
              {safeDate(t.date, 'MMM dd, yyyy')}
            </td>
            <td className="table-cell text-xs py-2 max-w-[200px]">
              <span className="block truncate" title={t.description}>{t.description}</span>
            </td>
            <td className="table-cell text-xs text-text-light py-2">{t.created_by}</td>
            <td className="table-cell text-xs text-right py-2">{formatCurrency(t.allocated)}</td>
            <td className="table-cell text-xs text-right text-danger py-2">{formatCurrency(t.obligated)}</td>
            <td className="table-cell text-xs text-right text-success py-2">{formatCurrency(t.balance)}</td>
            <td className="table-cell text-xs text-center py-2">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] text-white ${status.color}`}>
                {status.label}
              </span>
            </td>
          </tr>
        )
      })}
    </>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
const Reports = () => {
  const { user, isAdmin } = useAuth()

  // Left-panel form state
  const [selectedReport, setSelectedReport] = useState('budget_summary')
  const [dateFrom,       setDateFrom]       = useState('')
  const [dateTo,         setDateTo]         = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Data state
  const [generatedReports, setGeneratedReports] = useState([])
  const [previewData,      setPreviewData]      = useState(null)
  const [generating,       setGenerating]       = useState(false)
  const [loading,          setLoading]          = useState(true)

  // Verification
  const [verificationCode,   setVerificationCode]   = useState('')
  const [verificationResult, setVerificationResult] = useState(null)
  const [verifying,          setVerifying]          = useState(false)

  // Description
  const [descValue,   setDescValue]   = useState('')
  const [savingDesc,  setSavingDesc]  = useState(false)
  const descTimeoutRef = useRef(null)

  // Expand/collapse state — keyed by category index
  const [expandedCategories, setExpandedCategories] = useState({})

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { fetchReports() }, [])

  // Sync description textarea whenever the previewed report changes
  useEffect(() => {
    setDescValue(previewData?.description ?? '')
    // Collapse all breakdowns when switching reports
    setExpandedCategories({})
  }, [previewData?.id])

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await reportService.getAll()
      setGeneratedReports((response.data || []).map(transformReport))
    } catch {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  // ── Generate ───────────────────────────────────────────────────────────────
  const generateReport = async () => {
    setGenerating(true)
    try {
      const generatedCode = generateReportCode()
      const response = await reportService.create({
        type:              selectedReport,
        type_label:        reportTypes.find(t => t.value === selectedReport)?.label,
        date_from:         dateFrom || '2026-01-01',
        date_to:           dateTo || format(new Date(), 'yyyy-MM-dd'),
        category:          categoryFilter || 'All',
        verification_code: generatedCode
      })
      const report = transformReport(response.data)
      setPreviewData(report)
      setGeneratedReports(prev => [report, ...prev])
      toast.success('Report generated successfully')
    } catch (error) {
      toast.error(error.message || 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  // ── Expand / collapse ──────────────────────────────────────────────────────
  const toggleCategory = (index) =>
    setExpandedCategories(prev => ({ ...prev, [index]: !prev[index] }))

  const expandAll  = () => {
    const all = {}
    ;(previewData?.data || []).forEach((_, i) => { all[i] = true })
    setExpandedCategories(all)
  }
  const collapseAll = () => setExpandedCategories({})

  const anyExpanded = Object.values(expandedCategories).some(Boolean)

  // ── Description auto-save ──────────────────────────────────────────────────
  const handleDescChange = (e) => {
    const val = e.target.value
    setDescValue(val)
    setPreviewData(prev => prev ? { ...prev, description: val } : prev)
    clearTimeout(descTimeoutRef.current)
    descTimeoutRef.current = setTimeout(() => saveDescription(val), 1200)
  }

  const saveDescription = async (val) => {
    if (!previewData?.id) return
    setSavingDesc(true)
    try {
      await reportService.updateDescription(previewData.id, val)
      setGeneratedReports(prev =>
        prev.map(r => r.id === previewData.id ? { ...r, description: val } : r)
      )
    } catch {
      toast.error('Failed to save description')
    } finally {
      setSavingDesc(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteReport = async (id) => {
    try {
      await reportService.delete(id)
      setGeneratedReports(prev => prev.filter(r => r.id !== id))
      if (previewData?.id === id) setPreviewData(null)
      toast.success('Report removed from Saved Reports')
    } catch {
      toast.error('Failed to delete report')
    }
  }

  // ── Verify ─────────────────────────────────────────────────────────────────
  const handleVerifyCode = async () => {
    setVerificationResult(null)

    if (!verificationCode.trim()) {
      setVerificationResult({ valid: false, message: 'Please enter a verification code' })
      return
    }
    if (!isValidReportCode(verificationCode)) {
      setVerificationResult({
        valid: false,
        message: 'Invalid code format. Use format: #XXXXXXXXXXXX (12 alphanumeric characters, case-sensitive)'
      })
      return
    }

    setVerifying(true)
    try {
      const result = await reportService.verifyCode(verificationCode)
      setVerificationResult(result)

      if (result.valid && result.report) {
        const verified = transformReport(result.report)
        setPreviewData(verified)
        // Mirror into the list if still present
        setGeneratedReports(prev =>
          prev.map(r => r.id === verified.id ? { ...r, ...verified } : r)
        )
      }
    } catch {
      setVerificationResult({ valid: false, message: 'Verification failed. Please try again.' })
    } finally {
      setVerifying(false)
    }
  }

  // ── PDF export ─────────────────────────────────────────────────────────────
  const downloadPDF = (report) => {
    const doc = new jsPDF()

    // Header block
    doc.setFontSize(18)
    doc.text('Municipality of Bulusan - OMTO', 14, 20)
    doc.setFontSize(14)
    doc.text(`${report.typeLabel} Report`, 14, 30)
    doc.setFontSize(10)
    doc.text(`Generated: ${safeDate(report.generatedAt, 'MMM dd, yyyy HH:mm')}`, 14, 40)
    doc.text(`Period:    ${safeDate(report.dateFrom, 'MMM dd, yyyy')} to ${safeDate(report.dateTo, 'MMM dd, yyyy')}`, 14, 46)
    doc.text(`Category:  ${report.category}`, 14, 52)

    let startY = 60

    // Optional description
    if (report.description?.trim()) {
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      const lines = doc.splitTextToSize(`Notes: ${report.description}`, 180)
      doc.text(lines, 14, startY)
      startY += lines.length * 5 + 4
      doc.setTextColor(0, 0, 0)
    }

    // ── Category summary table ────────────────────────────────────────────
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text('Category Summary', 14, startY)
    startY += 5

    autoTable(doc, {
      head: [['Category', 'Allocated', 'Obligated', 'Balance', 'Utilization']],
      body: (report.data || []).map(item => [
        item.name,
        formatCurrencyPH(item.allocated),
        formatCurrencyPH(item.obligated),
        formatCurrencyPH((Number(item.allocated) || 0) - (Number(item.obligated) || 0)),
        item.allocated
          ? `${(((Number(item.obligated) || 0) / Number(item.allocated)) * 100).toFixed(1)}%`
          : '0%'
      ]),
      startY,
      styles:     { fontSize: 8 },
      headStyles: { fillColor: [14, 54, 66] },
      didDrawPage: (data) => { startY = data.cursor.y }
    })

    startY = doc.lastAutoTable?.finalY + 8 || startY + 8

    // ── Per-category transaction breakdown ────────────────────────────────
    const categoriesWithTxns = (report.data || []).filter(
      item => item.transactions?.length > 0
    )

    if (categoriesWithTxns.length > 0) {
      doc.setFontSize(11)
      doc.text('Transaction Breakdown', 14, startY)
      startY += 5

      for (const item of categoriesWithTxns) {
        // Check if we need a new page
        if (startY > doc.internal.pageSize.getHeight() - 30) {
          doc.addPage()
          startY = 14
        }

        doc.setFontSize(9)
        doc.setTextColor(14, 54, 66)
        doc.text(item.name, 14, startY)
        startY += 3
        doc.setTextColor(0, 0, 0)

        autoTable(doc, {
          head: [['Date', 'Description', 'Created By', 'Allocated', 'Obligated', 'Balance', 'Status']],
          body: item.transactions.map(t => {
            const status = getTransactionStatus(t.allocated, t.obligated)
            return [
              safeDate(t.date, 'MMM dd, yyyy'),
              t.description,
              t.created_by,
              formatCurrencyPH(t.allocated),
              formatCurrencyPH(t.obligated),
              formatCurrencyPH(t.balance),
              status.label
            ]
          }),
          startY,
          styles:     { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [34, 98, 107], fontSize: 7 },
          margin:     { left: 18 },
          didDrawPage: (data) => { startY = data.cursor.y }
        })

        startY = doc.lastAutoTable?.finalY + 5 || startY + 5
      }
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(`Verification Code: ${report.verificationCode || 'N/A'}`, 14, pageHeight - 10)
    doc.text('This report is valid and can be verified using this code.', 14, pageHeight - 5)

    doc.save(`report_${report.type}_${safeDate(report.generatedAt, 'yyyyMMdd')}.pdf`)
    toast.success('PDF downloaded')
  }

  // ── Excel export ───────────────────────────────────────────────────────────
  const downloadExcel = (report) => {
    const wb = XLSX.utils.book_new()

    // ── Sheet 1: Summary ──────────────────────────────────────────────────
    const summaryData = (report.data || []).map(item => ({
      Category:    item.name,
      Allocated:   Number(item.allocated) || 0,
      Obligated:   Number(item.obligated) || 0,
      Balance:     Math.max(0, (Number(item.allocated) || 0) - (Number(item.obligated) || 0)),
      Utilization: item.allocated
        ? `${(((Number(item.obligated) || 0) / Number(item.allocated)) * 100).toFixed(1)}%`
        : '0%'
    }))
    const wsSummary = XLSX.utils.json_to_sheet(summaryData)

    // Metadata rows above the summary table
    XLSX.utils.sheet_add_aoa(wsSummary, [
      [`${report.typeLabel} Report — Municipality of Bulusan OMTO`],
      [`Generated: ${safeDate(report.generatedAt, 'MMM dd, yyyy HH:mm')}`],
      [`Period: ${safeDate(report.dateFrom, 'MMM dd, yyyy')} to ${safeDate(report.dateTo, 'MMM dd, yyyy')}`],
      [`Category: ${report.category}`],
      report.description?.trim() ? [`Notes: ${report.description}`] : [],
      []
    ], { origin: 'A1' })

    let lastRow = summaryData.length + 9
    wsSummary[`A${lastRow}`] = { v: 'Verification Code:', t: 's' }
    wsSummary[`B${lastRow}`] = { v: report.verificationCode || 'N/A', t: 's' }
    wsSummary[`A${lastRow + 1}`] = { v: 'This report is valid and can be verified using this code.', t: 's' }

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

    // ── Sheet 2: Transaction Breakdown ────────────────────────────────────
    const txnRows = []
    for (const cat of (report.data || [])) {
      if (!cat.transactions?.length) continue
      txnRows.push({ Category: cat.name }) // section header row
      for (const t of cat.transactions) {
        const status = getTransactionStatus(t.allocated, t.obligated)
        txnRows.push({
          Category:    '',              // blank — belongs to the section above
          Date:        safeDate(t.date, 'MMM dd, yyyy'),
          Description: t.description,
          'Created By': t.created_by,
          Allocated:   t.allocated,
          Obligated:   t.obligated,
          Balance:     t.balance,
          Status:      status.label
        })
      }
      txnRows.push({})  // blank separator
    }

    if (txnRows.length) {
      const wsBreakdown = XLSX.utils.json_to_sheet(txnRows)
      XLSX.utils.book_append_sheet(wb, wsBreakdown, 'Transaction Breakdown')
    }

    XLSX.writeFile(wb, `report_${report.type}_${safeDate(report.generatedAt, 'yyyyMMdd')}.xlsx`)
    toast.success('Excel downloaded')
  }

  // ── Print export ───────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print()
  }

  // ── Chart (uses previewData.type so verified reports render correctly) ──
  const renderChart = () => {
    if (!previewData) return null
    const reportType = previewData.type || selectedReport

    switch (reportType) {
      case 'budget_summary':
      case 'obligation_details':
        return (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={previewData.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `₱${v/1000}K`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrencyPH(v)} />
                <Legend />
                <Bar dataKey="allocated" fill="#0E3642" name="Allocated" />
                <Bar dataKey="obligated" fill="#EF4444" name="Obligated" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )

      case 'category_analysis':
        return (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={previewData.data || []} cx="50%" cy="50%" outerRadius={100}
                  fill="#22626B" dataKey="allocated" label>
                  {(previewData.data || []).map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrencyPH(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )

      case 'monthly_trends':
        return (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockLineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `₱${v/1000}K`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrencyPH(v)} />
                <Legend />
                <Line type="monotone" dataKey="budget" stroke="#0E3642" name="Budget" />
                <Line type="monotone" dataKey="actual"  stroke="#EF4444" name="Actual" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )

      default: return null
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-text-dark">Reports</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">

        {/* ─── Left panel ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6 print:hidden">

          {/* Generate Report */}
          <div className="card">
            <h2 className="text-lg font-semibold text-text-dark mb-4">Generate Report</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">Report Type</label>
                <select value={selectedReport} onChange={e => setSelectedReport(e.target.value)} className="input-field">
                  {reportTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">Category Filter</label>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-field">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field" />
                </div>
              </div>
              <button onClick={generateReport} disabled={generating}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                {generating
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <ArrowPathIcon className="w-5 h-5" />}
                Generate Report
              </button>
            </div>
          </div>

          {/* Saved Reports */}
          <div className="card">
            <h2 className="text-lg font-semibold text-text-dark mb-4">Saved Reports</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loading ? (
                <SkeletonReportItem count={3} />
              ) : generatedReports.length === 0 ? (
                <p className="text-text-light text-center py-4">No reports generated yet</p>
              ) : (
                generatedReports.map(report => (
                  <div key={report.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      previewData?.id === report.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setPreviewData(report)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-text-dark text-sm">{report.typeLabel}</p>
                        <p className="text-xs text-primary font-medium mt-0.5">
                          By: {report.createdBy?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-text-light mt-0.5">
                          {safeDate(report.generatedAt, 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); downloadPDF(report) }}
                          className="p-1 text-primary hover:bg-primary/10 rounded" title="Download PDF">
                          <DocumentArrowDownIcon className="w-4 h-4" />
                        </button>
                        {(isAdmin() || report.createdBy?.id === user?.id) && (
                          <button
                            onClick={e => { e.stopPropagation(); deleteReport(report.id) }}
                            className="p-1 text-danger hover:bg-danger/10 rounded" title="Remove from Saved Reports">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Verify Code */}
          <div className="card">
            <h2 className="text-lg font-semibold text-text-dark mb-4">Verify Report Code</h2>
            <div className="space-y-3">
              <p className="text-sm text-text-light">Enter a report verification code to check its validity</p>
              <input
                type="text" value={verificationCode}
                onChange={e => setVerificationCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
                placeholder="e.g. #aB3Cd4Ef5Gh6" className="input-field"
              />
              <button onClick={handleVerifyCode} disabled={verifying}
                className="w-full btn-primary py-2 flex items-center justify-center gap-2">
                {verifying && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Verify Code
              </button>

              {verificationResult && (
                <div className={`p-3 rounded-lg border ${
                  verificationResult.valid
                    ? 'bg-success/10 border-success/30'
                    : 'bg-danger/10 border-danger/30'
                }`}>
                  <div className="flex items-start gap-2">
                    {verificationResult.valid
                      ? <CheckCircleIcon className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      : <XCircleIcon className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />}
                    <div>
                      <p className={`text-sm font-medium ${verificationResult.valid ? 'text-success' : 'text-danger'}`}>
                        {verificationResult.message}
                      </p>
                      {verificationResult.valid && (
                        <p className="text-xs text-text-light mt-1">Full report loaded in the preview panel →</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Preview panel ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2 print:w-full">
          <div className="card min-h-[600px] print:min-h-0 print:p-0 print:shadow-none print:border-none">
            {previewData ? (
              <div className="space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between border-b border-gray-200 pb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-text-dark">{previewData.typeLabel} Report</h2>
                      {previewData.isDeleted && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 print:hidden">
                          Removed from list
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-light mt-1">
                      Generated on {safeDate(previewData.generatedAt, 'MMM dd, yyyy at HH:mm')}
                    </p>
                    <p className="text-sm text-primary font-medium mt-1">
                      By: {previewData.createdBy?.full_name || 'Unknown'}
                    </p>
                    {previewData.verificationCode && (
                      <p className="text-sm text-gray-600 mt-2 font-mono bg-gray-100 px-3 py-1 rounded inline-block">
                        Code: {previewData.verificationCode}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 print:hidden">
                    <button onClick={() => downloadPDF(previewData)} className="btn-secondary flex items-center gap-2" title="Download PDF">
                      <DocumentArrowDownIcon className="w-4 h-4" /> PDF
                    </button>
                    <button onClick={() => downloadExcel(previewData)} className="btn-secondary flex items-center gap-2" title="Download Excel">
                      <DocumentArrowDownIcon className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={handlePrint} className="btn-secondary flex items-center gap-2" title="Print Report">
                      <PrinterIcon className="w-4 h-4" /> Print
                    </button>
                  </div>
                </div>

                {/* Description (Interactive Editor in Screen View) */}
                <div className="space-y-1 print:hidden">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text-light uppercase tracking-wider">
                      Notes / Description
                    </label>
                    {savingDesc && <span className="text-xs text-text-light animate-pulse">Saving…</span>}
                  </div>
                  <textarea
                    value={descValue} onChange={handleDescChange}
                    placeholder="Add a note about this report (optional) — saved automatically"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none
                               focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50
                               text-text-dark placeholder:text-gray-400 transition-colors"
                  />
                </div>

                {/* Description (Clean Print-Formatted Output) */}
                {descValue?.trim() && (
                  <div className="hidden print:block text-sm text-text-dark my-2 p-3 bg-gray-50 border border-gray-200 rounded">
                    <span className="font-semibold text-text-dark">Notes / Description: </span>
                    <span className="whitespace-pre-wrap">{descValue}</span>
                  </div>
                )}

                {/* Chart */}
                {renderChart()}

                {/* ── Category Summary + Transaction Breakdown table ──────── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-text-dark">Category Breakdown</h3>
                    {(previewData.data || []).some(item => item.transactions?.length > 0) && (
                      <button
                        onClick={anyExpanded ? collapseAll : expandAll}
                        className="text-xs text-primary hover:text-primary-light font-medium transition-colors print:hidden"
                      >
                        {anyExpanded ? 'Collapse all' : 'Expand all transactions'}
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-gray-100 print:border-none print:overflow-visible">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          {/* Toggle column */}
                          <th className="w-8 table-header px-2 print:hidden" />
                          <th className="table-header">Category</th>
                          <th className="table-header text-right">Allocated</th>
                          <th className="table-header text-right">Obligated</th>
                          <th className="table-header text-right">Balance</th>
                          <th className="table-header text-right">Utilization</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(previewData.data || []).length === 0 ? (
                          <tr>
                            <td colSpan="6" className="table-cell text-center text-text-light py-6">
                              No category data available for this report period.
                            </td>
                          </tr>
                        ) : (
                          (previewData.data || []).map((item, index) => {
                            const isExpanded = !!expandedCategories[index]
                            const hasTxns    = (item.transactions?.length ?? 0) > 0
                            const util = item.allocated
                              ? ((Number(item.obligated) || 0) / Number(item.allocated)) * 100
                              : 0

                            return (
                              <Fragment key={`cat-group-${item.id ?? index}`}>
                                {/* ── Category summary row ────────────── */}
                                <tr
                                  className={`transition-colors ${
                                    hasTxns ? 'cursor-pointer hover:bg-primary/[0.03]' : ''
                                  } ${isExpanded ? 'bg-primary/[0.02]' : ''}`}
                                  onClick={() => hasTxns && toggleCategory(index)}
                                >
                                  <td className="table-cell px-2 text-center print:hidden">
                                    {hasTxns ? (
                                      isExpanded
                                        ? <ChevronDownIcon  className="w-3.5 h-3.5 text-primary mx-auto" />
                                        : <ChevronRightIcon className="w-3.5 h-3.5 text-text-light mx-auto" />
                                    ) : null}
                                  </td>
                                  <td className="table-cell font-semibold">
                                    <span>{item.name}</span>
                                    {hasTxns && (
                                      <span className="ml-1.5 text-xs text-text-light font-normal print:hidden">
                                        ({item.transactions.length} transaction{item.transactions.length !== 1 ? 's' : ''})
                                      </span>
                                    )}
                                  </td>
                                  <td className="table-cell text-right">{formatCurrencyPH(item.allocated)}</td>
                                  <td className="table-cell text-right text-danger">{formatCurrencyPH(item.obligated)}</td>
                                  <td className="table-cell text-right text-success">
                                    {formatCurrencyPH((Number(item.allocated) || 0) - (Number(item.obligated) || 0))}
                                  </td>
                                  <td className="table-cell text-right">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs text-white ${
                                      util < 25  ? 'bg-success'    :
                                      util < 50  ? 'bg-warning'    :
                                      util < 75  ? 'bg-orange-500' : 'bg-danger'
                                    }`}>
                                      {util.toFixed(1)}%
                                    </span>
                                  </td>
                                </tr>

                                {/* ── Transaction breakdown sub-table ─── */}
                                {isExpanded && (
                                  <>
                                    {/* Sub-header */}
                                    <tr className="bg-primary/[0.04]">
                                      <td className="print:hidden" />
                                      {['Date','Description','Created By','Allocated','Obligated','Balance','Status'].map(h => (
                                        <td key={h} className="px-3 sm:px-6 py-1.5 text-[10px] font-semibold text-text-light uppercase tracking-wider">
                                          {h}
                                        </td>
                                      ))}
                                    </tr>
                                    <TransactionBreakdown
                                      transactions={item.transactions}
                                      formatCurrency={formatCurrencyPH}
                                    />
                                  </>
                                )}
                              </Fragment>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-light">
                <EyeIcon className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">Select or generate a report to preview</p>
                <p className="text-sm mt-1 opacity-70">Or verify a report code to load it here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports

