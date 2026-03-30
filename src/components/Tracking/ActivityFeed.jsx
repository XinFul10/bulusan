import { useEffect, useState } from 'react'
import { ClockIcon, UserIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { transactionService } from '../../services/transactionService'

const ActivityFeed = () => {
  const [activities, setActivities] = useState([])

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await transactionService.getAll()
        // Sort by created_at desc and take first 10
        const sorted = response.data
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10)
        setActivities(sorted)
      } catch (error) {
        console.error('Failed to load activities:', error)
      }
    }
    fetchActivities()
  }, [])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const getActivityIcon = (amount) => {
    if (amount > 100000) return <CurrencyDollarIcon className="w-4 h-4" />
    return <ClockIcon className="w-4 h-4" />
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-text-dark mb-4">Recent Activities</h3>
      
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-text-light text-center py-4">No recent activities</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
                {getActivityIcon(activity.allocated_amount)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-dark truncate">
                  {activity.description}
                </p>
                <p className="text-xs text-text-light">
                  {activity.category_name} • {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium text-primary">
                    Alloc: {formatCurrency(activity.allocated_amount)}
                  </span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs font-medium text-danger">
                    Obl: {formatCurrency(activity.obligated_amount)}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                  activity.balance > 0 
                    ? 'bg-success/10 text-success' 
                    : 'bg-danger/10 text-danger'
                }`}>
                  {activity.balance > 0 ? 'Active' : 'Fully Obligated'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ActivityFeed
