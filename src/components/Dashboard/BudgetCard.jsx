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
    }).format(amount || 0)
  }

  const stats = [
    { label: 'Allocation', value: formatCurrency(allocation), color: 'text-primary' },
    { label: 'Obligated', value: formatCurrency(obligated), sub: `(${percentage}%)`, color: 'text-danger' },
    { label: 'Balance', value: formatCurrency(balance), color: 'text-success' },
  ]

  return (
    <div className="card p-4 sm:p-5 hover:shadow-card-hover transition-shadow duration-200 flex flex-col justify-between">
      <div>
        <h3 className="text-sm sm:text-base font-bold text-text-dark mb-3 leading-snug truncate" title={category}>
          {category}
        </h3>

        {/* 3-column stats with nowrap & responsive font scaling to prevent number collisions */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col min-w-0"
            >
              <p className="text-[10px] sm:text-[11px] font-semibold text-text-light uppercase tracking-wider truncate" title={stat.label}>
                {stat.label}
              </p>
              <div className="mt-0.5 min-w-0">
                <p className={`text-xs sm:text-sm xl:text-[13px] 2xl:text-sm font-bold ${stat.color} whitespace-nowrap truncate`} title={stat.value}>
                  {stat.value}
                </p>
                {stat.sub && (
                  <p className="text-[10px] sm:text-xs text-text-light whitespace-nowrap">
                    {stat.sub}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor(percentage)} transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <p className="text-[11px] text-text-light mt-1.5 text-right font-medium">{percentage}% utilized</p>
      </div>
    </div>
  )
}

export default BudgetCard
