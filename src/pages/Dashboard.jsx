import { useState, useEffect, useCallback } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import BudgetCard from '../components/Dashboard/BudgetCard'
import BudgetBarChart from '../components/Dashboard/BudgetBarChart'
import BudgetPieChart from '../components/Dashboard/BudgetPieChart'
import AddTransactionModal from '../components/Transactions/AddTransactionModal'
import SetBudgetModal from '../components/Dashboard/SetBudgetModal'
import { dashboardService } from '../services/transactionService'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const { isAdmin } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await dashboardService.getStats()
      setStats(response.data)
    } catch (error) {
      toast.error('Failed to load dashboard data')
      console.error('Dashboard error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()

    // Listen for refresh event
    const handleRefresh = () => fetchStats()
    window.addEventListener('refreshData', handleRefresh)
    window.addEventListener('newTransaction', () => setIsModalOpen(true))

    return () => {
      window.removeEventListener('refreshData', handleRefresh)
      window.removeEventListener('newTransaction', () => setIsModalOpen(true))
    }
  }, [fetchStats])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Filter categories with actual data (allocation > 0)
  const categoriesWithData = stats?.categories?.filter(cat => cat.allocation > 0) || []
  const hasData = categoriesWithData.length > 0

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section — stacks on mobile (≤768px) */}
      <div className="card bg-gradient-to-r from-primary to-primary-light text-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">MUNICIPALITY OF BULUSAN</h1>
            <p className="text-blue-100 mt-1 text-sm sm:text-base">Office of the Municipal Tourism Office (OMTO)</p>
            <p className="text-blue-200 text-xs sm:text-sm mt-2">Fiscal Year Budget Allocation & Obligation Tracker</p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-blue-200">Current Fiscal Year</p>
            <p className="text-2xl sm:text-3xl font-bold">2026</p>
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        {isAdmin() && (
          <button
            onClick={() => setIsBudgetModalOpen(true)}
            className="btn-secondary flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto"
          >
            Set Total Budget
          </button>
        )}
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto"
        >
          <PlusIcon className="w-5 h-5" />
          New Transaction
        </button>
      </div>

      {/* Summary Cards — 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card bg-primary text-white !p-4 sm:!p-6">
          <p className="text-blue-200 text-sm">Total Budget</p>
          <p className="text-lg sm:text-2xl font-bold mt-1 break-words">{formatCurrency(stats?.total_budget || 0)}</p>
        </div>
        <div className="card bg-danger text-white !p-4 sm:!p-6">
          <p className="text-red-200 text-sm">Total Obligated</p>
          <p className="text-lg sm:text-2xl font-bold mt-1 break-words">{formatCurrency(stats?.total_obligated || 0)}</p>
        </div>
        <div className="card bg-success text-white !p-4 sm:!p-6">
          <p className="text-green-200 text-sm">Remaining Balance</p>
          <p className="text-lg sm:text-2xl font-bold mt-1 break-words">{formatCurrency(stats?.remaining_balance || 0)}</p>
        </div>
        <div className="card bg-warning text-white !p-4 sm:!p-6">
          <p className="text-yellow-200 text-sm">Overall Utilization</p>
          <p className="text-lg sm:text-2xl font-bold mt-1">{stats?.overall_utilization || 0}%</p>
        </div>
      </div>

      {/* Budget Category Cards */}
      {hasData ? (
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-text-dark mb-4">Budget by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            {categoriesWithData.map((category) => (
              <BudgetCard
                key={category.id}
                category={category.name}
                allocation={category.allocation}
                obligated={category.obligated}
                balance={category.balance}
                percentage={category.percentage}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="card bg-gray-50 border-2 border-dashed border-gray-300">
          <div className="text-center py-12">
            <p className="text-text-light text-lg">No data available</p>
            <p className="text-text-light text-sm mt-1">Set a budget and create transactions to see data here</p>
          </div>
        </div>
      )}

      <div className="mt-6 sm:mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-text-dark">Recent Transactions</h2>
          <span className="text-sm text-text-light">Latest 5 entries</span>
        </div>

        {(stats?.recent_transactions || []).length === 0 ? (
          <div className="card p-6 text-center text-text-light text-sm">
            No recent transactions yet.
          </div>
        ) : (
          <>
            {/* Mobile: card list (≤768px) */}
            <div className="md:hidden space-y-3">
              {stats.recent_transactions.map((transaction) => (
                <div key={transaction.id} className="card p-4 space-y-3">
                  <div className="flex justify-between items-start gap-3">
                    <p className="font-medium text-text-dark text-sm leading-snug flex-1">
                      {transaction.description}
                    </p>
                    <span className="text-xs text-text-light shrink-0 bg-gray-100 px-2 py-1 rounded">
                      {transaction.transaction_date}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-text-light">Category</p>
                      <p className="text-text-dark truncate">{transaction.category_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-light">Created By</p>
                      <p className="text-text-dark truncate">{transaction.creator_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-light">Allocated</p>
                      <p className="font-semibold text-primary">{formatCurrency(transaction.allocated_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-light">Obligated</p>
                      <p className="font-semibold text-danger">{formatCurrency(transaction.obligated_amount)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet+: table */}
            <div className="hidden md:block card p-0 sm:p-6 overflow-hidden">
              <div className="responsive-table-wrap">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="table-header">Date</th>
                      <th className="table-header">Description</th>
                      <th className="table-header">Category</th>
                      <th className="table-header">Created By</th>
                      <th className="table-header text-right">Allocated</th>
                      <th className="table-header text-right">Obligated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.recent_transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="table-cell">{transaction.transaction_date}</td>
                        <td className="table-cell">{transaction.description}</td>
                        <td className="table-cell">{transaction.category_name || '-'}</td>
                        <td className="table-cell">{transaction.creator_name || 'Unknown'}</td>
                        <td className="table-cell text-right">{formatCurrency(transaction.allocated_amount)}</td>
                        <td className="table-cell text-right">{formatCurrency(transaction.obligated_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts — stack on mobile, 2-col on desktop (≥1024px) */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
          <BudgetBarChart data={categoriesWithData} />
          <BudgetPieChart data={categoriesWithData} />
        </div>
      )}

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchStats()
          toast.success('Transaction added successfully')
        }}
      />

      {/* Set Budget Modal */}
      <SetBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onSuccess={() => {
          fetchStats()
          toast.success('Budget updated successfully')
        }}
      />
    </div>
  )
}

export default Dashboard
