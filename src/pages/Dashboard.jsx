import { useState, useEffect, useCallback } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import BudgetCard from '../components/Dashboard/BudgetCard'
import BudgetBarChart from '../components/Dashboard/BudgetBarChart'
import BudgetPieChart from '../components/Dashboard/BudgetPieChart'
import AddTransactionModal from '../components/Transactions/AddTransactionModal'
import { dashboardService } from '../services/transactionService'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="card bg-gradient-to-r from-primary to-primary-light text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">🏛️ MUNICIPALITY OF BULUSAN</h1>
            <p className="text-blue-100 mt-1">Office of the Municipal Tourism Officer (OMTO)</p>
            <p className="text-blue-200 text-sm mt-2">Fiscal Year Budget Allocation & Obligation Tracker</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-200">Current Fiscal Year</p>
            <p className="text-3xl font-bold">2026</p>
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          New Transaction
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-primary text-white">
          <p className="text-blue-200 text-sm">Total Budget</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(stats?.total_budget || 0)}</p>
        </div>
        <div className="card bg-danger text-white">
          <p className="text-red-200 text-sm">Total Obligated</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(stats?.total_obligated || 0)}</p>
        </div>
        <div className="card bg-success text-white">
          <p className="text-green-200 text-sm">Remaining Balance</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(stats?.remaining_balance || 0)}</p>
        </div>
        <div className="card bg-warning text-white">
          <p className="text-yellow-200 text-sm">Overall Utilization</p>
          <p className="text-2xl font-bold mt-1">{stats?.overall_utilization || 0}%</p>
        </div>
      </div>

      {/* Budget Category Cards */}
      <div>
        <h2 className="text-xl font-semibold text-text-dark mb-4">Budget by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {stats?.categories?.map((category) => (
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetBarChart data={stats?.categories} />
        <BudgetPieChart data={stats?.categories} />
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchStats()
          toast.success('Transaction added successfully')
        }}
      />
    </div>
  )
}

export default Dashboard
