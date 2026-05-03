import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  EyeIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import AddTransactionModal from '../components/Transactions/AddTransactionModal'
import { transactionService } from '../services/transactionService'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const categories = [
  { id: '', name: 'All Categories' },
  { id: 1, name: 'Capacity Development' },
  { id: 2, name: 'TM & Promotions' },
  { id: 3, name: 'Socio-Cultural & Eco' },
  { id: 4, name: 'Product & Market Dev' }
]

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'fully', label: 'Fully Obligated' },
  { value: 'partial', label: 'Partially Obligated' },
  { value: 'not_started', label: 'Not Started' }
]

const Transactions = () => {
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const { user, isAdmin } = useAuth()
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await transactionService.getAll()
      setTransactions(response.data)
      setFilteredTransactions(response.data)
    } catch (error) {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()

    // Listen for keyboard shortcuts
    const handleFocusSearch = () => {
      document.getElementById('search-input')?.focus()
    }
    const handleRefresh = () => fetchTransactions()

    window.addEventListener('focusSearch', handleFocusSearch)
    window.addEventListener('refreshData', handleRefresh)

    return () => {
      window.removeEventListener('focusSearch', handleFocusSearch)
      window.removeEventListener('refreshData', handleRefresh)
    }
  }, [fetchTransactions])

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions]

    // Search
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category
    if (categoryFilter) {
      filtered = filtered.filter(t => t.category_id === parseInt(categoryFilter))
    }

    // Status
    if (statusFilter) {
      filtered = filtered.filter(t => {
        const pct = (t.obligated_amount / t.allocated_amount) * 100
        if (statusFilter === 'fully') return pct >= 100
        if (statusFilter === 'partial') return pct > 0 && pct < 100
        if (statusFilter === 'not_started') return pct === 0
        return true
      })
    }

    // Date range
    if (dateFrom) {
      filtered = filtered.filter(t => t.transaction_date >= dateFrom)
    }
    if (dateTo) {
      filtered = filtered.filter(t => t.transaction_date <= dateTo)
    }

    setFilteredTransactions(filtered)
    setCurrentPage(1)
  }, [transactions, searchTerm, categoryFilter, statusFilter, dateFrom, dateTo])

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / pageSize)
  const paginatedData = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return
    
    try {
      await transactionService.delete(id)
      toast.success('Transaction deleted')
      fetchTransactions()
    } catch (error) {
      toast.error('Failed to delete transaction')
    }
  }

  const handleEdit = (transaction) => {
    setEditData({
      ...transaction,
      date: transaction.transaction_date,
      a_b_test: transaction.a_b_test || 'None'
    })
    setIsModalOpen(true)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  const getStatus = (allocated, obligated) => {
    const pct = (obligated / allocated) * 100
    if (pct >= 100) return { label: 'Fully', color: 'bg-success' }
    if (pct > 0) return { label: 'Partial', color: 'bg-warning' }
    return { label: 'Not Started', color: 'bg-gray-400' }
  }

  const exportToCSV = () => {
    const data = filteredTransactions.map(t => ({
      Date: format(new Date(t.transaction_date), 'MMM dd, yy'),
      Description: t.description,
      Category: t.category_name,
      'A/B Test': t.a_b_test || '-',
      Allocated: t.allocated_amount,
      Obligated: t.obligated_amount,
      Balance: t.balance
    }))
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
    XLSX.writeFile(wb, `transactions_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Exported to Excel')
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.text('OMTO Budget Tracker - Transactions', 14, 15)
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy')}`, 14, 25)
    
    const tableData = filteredTransactions.map(t => [
      format(new Date(t.transaction_date), 'MMM dd, yy'),
      t.description,
      t.category_name,
      t.a_b_test || '-',
      formatCurrency(t.allocated_amount),
      formatCurrency(t.obligated_amount),
      formatCurrency(t.balance)
    ])

    doc.autoTable({
      head: [['Date', 'Description', 'Category', 'A/B', 'Allocated', 'Obligated', 'Balance']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] }
    })

    doc.save(`transactions_${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('Exported to PDF')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-dark">Transactions</h1>
        <button
          onClick={() => {
            setEditData(null)
            setIsModalOpen(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          New Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="card space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
            <input
              id="search-input"
              type="text"
              placeholder="Search by description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field md:w-48"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field md:w-48"
          >
            {statusOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Date Range & Export */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field"
            />
            <span className="text-text-light">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field"
            />
          </div>
          
          <div className="flex gap-2 ml-auto">
            <button
              onClick={exportToCSV}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={exportToPDF}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">Date</th>
              <th className="table-header">Description</th>
              <th className="table-header">Category</th>
              <th className="table-header">A/B Test</th>
              <th className="table-header text-right">Allocated</th>
              <th className="table-header text-right">Obligated</th>
              <th className="table-header text-right">Balance</th>
              <th className="table-header">Status</th>
              <th className="table-header text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-text-light">
                  No transactions found
                </td>
              </tr>
            ) : (
              paginatedData.map((transaction) => {
                const status = getStatus(transaction.allocated_amount, transaction.obligated_amount)
                return (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      {format(new Date(transaction.transaction_date), 'MMM dd, yy')}
                    </td>
                    <td className="table-cell">{transaction.description}</td>
                    <td className="table-cell">{transaction.category_name}</td>
                    <td className="table-cell">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {transaction.a_b_test || '-'}
                      </span>
                    </td>
                    <td className="table-cell text-right font-medium">
                      {formatCurrency(transaction.allocated_amount)}
                    </td>
                    <td className="table-cell text-right text-danger">
                      {formatCurrency(transaction.obligated_amount)}
                    </td>
                    <td className="table-cell text-right text-success">
                      {formatCurrency(transaction.balance)}
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs text-white ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex justify-center gap-2">
                        {(isAdmin() || transaction.created_by === user?.id) && (
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="p-1 text-primary hover:bg-primary/10 rounded"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin() && (
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className="p-1 text-danger hover:bg-danger/10 rounded"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-light">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="input-field py-1 px-2 w-20"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-text-light">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTransactions.length)} of {filteredTransactions.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-sm text-text-dark">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditData(null)
        }}
        onSuccess={fetchTransactions}
        editData={editData}
      />
    </div>
  )
}

export default Transactions
