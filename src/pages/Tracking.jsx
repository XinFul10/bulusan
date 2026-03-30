import { useState, useEffect, useCallback } from 'react'
import { dashboardService } from '../services/transactionService'
import ObligationChart from '../components/Tracking/ObligationChart'
import ActivityFeed from '../components/Tracking/ActivityFeed'
import toast from 'react-hot-toast'

const Tracking = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await dashboardService.getStats()
      setStats(response.data)
    } catch (error) {
      toast.error('Failed to load tracking data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()

    const handleRefresh = () => fetchStats()
    window.addEventListener('refreshData', handleRefresh)

    return () => {
      window.removeEventListener('refreshData', handleRefresh)
    }
  }, [fetchStats])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const GaugeChart = ({ title, value, max, color }) => {
    const percentage = Math.min((value / max) * 100, 100)
    const getColor = (pct) => {
      if (pct < 25) return 'bg-success'
      if (pct < 50) return 'bg-warning'
      if (pct < 75) return 'bg-orange-500'
      return 'bg-danger'
    }

    return (
      <div className="card flex flex-col items-center">
        <h4 className="text-sm font-medium text-text-dark mb-4 text-center">{title}</h4>
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="#E5E7EB"
              strokeWidth="12"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${percentage * 3.52} 351.86`}
              strokeLinecap="round"
              className={getColor(percentage)}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-text-dark">{percentage.toFixed(1)}%</span>
            <span className="text-xs text-text-light">used</span>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-text-light">
            {formatCurrency(value)} / {formatCurrency(max)}
          </p>
        </div>
      </div>
    )
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-dark">Budget Tracking</h1>
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ObligationChart />
        </div>
        <div>
          <ActivityFeed />
        </div>
      </div>

      {/* Gauge Charts - Category Utilization */}
      <div>
        <h2 className="text-xl font-semibold text-text-dark mb-4">Budget Utilization by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats?.categories?.map((category) => (
            <GaugeChart
              key={category.id}
              title={category.name}
              value={category.obligated}
              max={category.allocation}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Tracking
