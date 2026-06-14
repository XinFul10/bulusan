const BudgetCard = ({ category, allocation, obligated, balance, percentage }) => {
  const getProgressColor = (pct) => {
    if (pct < 25) return 'bg-success'
    if (pct < 50) return 'bg-warning'
    if (pct < 75) return 'bg-orange-500'
    return 'bg-danger'
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const stats = [
    { label: 'Allocation', value: formatCurrency(allocation), color: 'text-primary' },
    { label: 'Obligated', value: formatCurrency(obligated), sub: `(${percentage}%)`, color: 'text-danger' },
    { label: 'Balance', value: formatCurrency(balance), color: 'text-success' },
  ]

  return (
    <div className="card p-4 sm:p-6 hover:shadow-card-hover transition-shadow duration-200">
      <h3 className="text-base sm:text-lg font-semibold text-text-dark mb-3 sm:mb-4 leading-snug">{category}</h3>

      {/* Mobile: stacked rows; tablet+: 3-column grid */}
      <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4 mb-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex sm:block justify-between items-center sm:items-start gap-2 border-b border-gray-100 sm:border-0 pb-3 sm:pb-0 last:border-0 last:pb-0"
          >
            <p className="text-xs sm:text-xs text-text-light uppercase tracking-wider">{stat.label}</p>
            <div className="text-right sm:text-left">
              <p className={`text-base sm:text-lg font-bold ${stat.color}`}>{stat.value}</p>
              {stat.sub && <p className="text-xs text-text-light">{stat.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 sm:mt-4">
        <div className="h-2.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor(percentage)} transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <p className="text-xs text-text-light mt-1.5 text-right">{percentage}% utilized</p>
      </div>
    </div>
  )
}

export default BudgetCard
