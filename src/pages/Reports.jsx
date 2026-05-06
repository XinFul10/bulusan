import { useState, useEffect } from 'react'
import { DocumentArrowDownIcon, PrinterIcon, EyeIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { reportService } from '../services/transactionService'

const reportTypes = [
  { value: 'budget_summary', label: 'Budget Summary' },
  { value: 'obligation_details', label: 'Obligation Details' },
  { value: 'category_analysis', label: 'Category Analysis' },
  { value: 'monthly_trends', label: 'Monthly Trends' }
]

const categories = [
  { id: '', name: 'All Categories' },
  { id: 1, name: 'Capacity Development' },
  { id: 2, name: 'TM & Promotions' },
  { id: 3, name: 'Socio-Cultural & Eco' },
  { id: 4, name: 'Product & Market Dev' }
]

// Mock data for charts
const mockBarData = [
  { name: 'Cap. Dev.', allocated: 400000, obligated: 100000 },
  { name: 'TM & Promo.', allocated: 500000, obligated: 0 },
  { name: 'SCET', allocated: 3000000, obligated: 200000 },
  { name: 'Prod. Dev.', allocated: 1500000, obligated: 0 }
]

const mockPieData = [
  { name: 'Cap. Dev.', value: 400000 },
  { name: 'TM & Promo.', value: 500000 },
  { name: 'SCET', value: 3000000 },
  { name: 'Prod. Dev.', value: 1500000 }
]

const mockLineData = [
  { month: 'Jan', budget: 450000, actual: 420000 },
  { month: 'Feb', budget: 480000, actual: 450000 },
  { month: 'Mar', budget: 500000, actual: 520000 },
  { month: 'Apr', budget: 520000, actual: 480000 },
  { month: 'May', budget: 550000, actual: 530000 },
  { month: 'Jun', budget: 580000, actual: 560000 }
]

const COLORS = ['#1E3A8A', '#3B82F6', '#10B981', '#F59E0B']

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('budget_summary')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [generatedReports, setGeneratedReports] = useState([])
  const [previewData, setPreviewData] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch reports on load
  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await reportService.getAll()
      // Transform API response (snake_case) to frontend format (camelCase)
      const transformedReports = (response.data || []).map(report => ({
        id: report.id,
        type: report.type,
        typeLabel: report.type_label,
        dateFrom: report.date_from,
        dateTo: report.date_to,
        category: report.category,
        data: report.data,
        generatedAt: report.generated_at,
        createdBy: report.created_by // Transform snake_case to camelCase
      }))
      setGeneratedReports(transformedReports)
    } catch (error) {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  // Safe date formatter that handles invalid dates
  const safeFormatDate = (dateValue, formatString = 'MMM dd, yyyy HH:mm') => {
    if (!dateValue) return 'N/A'
    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return 'N/A'
      return format(date, formatString)
    } catch (e) {
      return 'N/A'
    }
  }

  const generateReport = async () => {
    setGenerating(true)
    
    try {
      const newReport = {
        type: selectedReport,
        type_label: reportTypes.find(t => t.value === selectedReport)?.label,
        date_from: dateFrom || '2026-01-01',
        date_to: dateTo || format(new Date(), 'yyyy-MM-dd'),
        category: categoryFilter || 'All'
        // Data will be calculated by the backend based on date range and category
      }
      
      const response = await reportService.create(newReport)
      const savedReport = response.data
      
      // Transform to match frontend format
      const report = {
        id: savedReport.id,
        type: savedReport.type,
        typeLabel: savedReport.type_label,
        dateFrom: savedReport.date_from,
        dateTo: savedReport.date_to,
        category: savedReport.category,
        generatedAt: savedReport.generated_at,
        data: savedReport.data,
        createdBy: savedReport.created_by
      }
      
      setPreviewData(report)
      setGeneratedReports(prev => [report, ...prev])
      toast.success('Report generated successfully')
    } catch (error) {
      toast.error(error.message || 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const downloadPDF = (report) => {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(18)
    doc.text(`Municipality of Bulusan - OMTO`, 14, 20)
    doc.setFontSize(14)
    doc.text(`${report.typeLabel} Report`, 14, 30)
    
    // Metadata
    doc.setFontSize(10)
    doc.text(`Generated: ${safeFormatDate(report.generatedAt, 'MMM dd, yyyy HH:mm')}`, 14, 40)
    doc.text(`Period: ${safeFormatDate(report.dateFrom, 'MMM dd, yyyy')} to ${safeFormatDate(report.dateTo, 'MMM dd, yyyy')}`, 14, 46)
    doc.text(`Category: ${report.category}`, 14, 52)
    
    // Table
    const tableData = report.data.map(item => [
      item.name,
      formatCurrency(item.allocated),
      formatCurrency(item.obligated),
      formatCurrency(item.allocated - item.obligated),
      `${((item.obligated / item.allocated) * 100).toFixed(1)}%`
    ])
    
    doc.autoTable({
      head: [['Category', 'Allocated', 'Obligated', 'Balance', 'Utilization']],
      body: tableData,
      startY: 60,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 138] }
    })
    
    doc.save(`report_${report.type}_${safeFormatDate(report.generatedAt, 'yyyyMMdd')}.pdf`)
    toast.success('PDF downloaded')
  }

  const downloadExcel = (report) => {
    const data = report.data.map(item => ({
      Category: item.name,
      Allocated: item.allocated,
      Obligated: item.obligated,
      Balance: item.allocated - item.obligated,
      Utilization: `${((item.obligated / item.allocated) * 100).toFixed(1)}%`
    }))
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    XLSX.writeFile(wb, `report_${report.type}_${safeFormatDate(report.generatedAt, 'yyyyMMdd')}.xlsx`)
    toast.success('Excel downloaded')
  }

  const deleteReport = async (id) => {
    try {
      await reportService.delete(id)
      setGeneratedReports(prev => prev.filter(r => r.id !== id))
      if (previewData?.id === id) setPreviewData(null)
      toast.success('Report deleted')
    } catch (error) {
      toast.error('Failed to delete report')
    }
  }

  const renderChart = () => {
    if (!previewData) return null

    switch (selectedReport) {
      case 'budget_summary':
      case 'obligation_details':
        return (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={previewData.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => `₱${val/1000}K`} />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Legend />
                <Bar dataKey="allocated" fill="#1E3A8A" />
                <Bar dataKey="obligated" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      
      case 'category_analysis':
        return (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={previewData.data || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="allocated"
                  label
                >
                  {(previewData.data || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )
      
      case 'monthly_trends':
        return (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockLineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(val) => `₱${val/1000}K`} />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Legend />
                <Line type="monotone" dataKey="budget" stroke="#1E3A8A" />
                <Line type="monotone" dataKey="actual" stroke="#EF4444" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-dark">Reports</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Generator Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-text-dark mb-4">Generate Report</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">Report Type</label>
                <select
                  value={selectedReport}
                  onChange={(e) => setSelectedReport(e.target.value)}
                  className="input-field"
                >
                  {reportTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">Category Filter</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input-field"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <button
                onClick={generateReport}
                disabled={generating}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowPathIcon className="w-5 h-5" />
                )}
                Generate Report
              </button>
            </div>
          </div>

          {/* Saved Reports */}
          <div className="card">
            <h2 className="text-lg font-semibold text-text-dark mb-4">Saved Reports</h2>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : generatedReports.length === 0 ? (
                <p className="text-text-light text-center py-4">No reports generated yet</p>
              ) : (
                generatedReports.map(report => (
                  <div 
                    key={report.id} 
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
                          {safeFormatDate(report.generatedAt, 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadPDF(report)
                          }}
                          className="p-1 text-primary hover:bg-primary/10 rounded"
                          title="Download PDF"
                        >
                          <DocumentArrowDownIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteReport(report.id)
                          }}
                          className="p-1 text-danger hover:bg-danger/10 rounded"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-2">
          <div className="card min-h-[600px]">
            {previewData ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between border-b border-gray-200 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-text-dark">{previewData.typeLabel} Report</h2>
                    <p className="text-sm text-text-light mt-1">
                      Generated on {safeFormatDate(previewData.generatedAt, 'MMM dd, yyyy at HH:mm')}
                    </p>
                    <p className="text-sm text-primary font-medium mt-1">
                      By: {previewData.createdBy?.full_name || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadPDF(previewData)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      PDF
                    </button>
                    <button
                      onClick={() => downloadExcel(previewData)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      Excel
                    </button>
                    <button className="btn-secondary flex items-center gap-2">
                      <PrinterIcon className="w-4 h-4" />
                      Print
                    </button>
                  </div>
                </div>

                {/* Chart */}
                {renderChart()}

                {/* Data Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="table-header">Category</th>
                        <th className="table-header text-right">Allocated</th>
                        <th className="table-header text-right">Obligated</th>
                        <th className="table-header text-right">Balance</th>
                        <th className="table-header text-right">Utilization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.data.map((item, index) => (
                        <tr key={index}>
                          <td className="table-cell font-medium">{item.name}</td>
                          <td className="table-cell text-right">{formatCurrency(item.allocated)}</td>
                          <td className="table-cell text-right text-danger">{formatCurrency(item.obligated)}</td>
                          <td className="table-cell text-right text-success">
                            {formatCurrency(item.allocated - item.obligated)}
                          </td>
                          <td className="table-cell text-right">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs text-white ${
                              ((item.obligated / item.allocated) * 100) < 25 ? 'bg-success' :
                              ((item.obligated / item.allocated) * 100) < 50 ? 'bg-warning' :
                              ((item.obligated / item.allocated) * 100) < 75 ? 'bg-orange-500' : 'bg-danger'
                            }`}>
                              {((item.obligated / item.allocated) * 100).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-light">
                <EyeIcon className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">Select or generate a report to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
