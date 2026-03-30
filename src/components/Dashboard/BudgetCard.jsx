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
  
    return (
      <div className="card hover:shadow-card-hover transition-shadow duration-200">
        <h3 className="text-lg font-semibold text-text-dark mb-4">{category}</h3>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-text-light uppercase tracking-wider">Allocation</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(allocation)}</p>
          </div>
          <div>
            <p className="text-xs text-text-light uppercase tracking-wider">Obligated</p>
            <p className="text-lg font-bold text-danger">{formatCurrency(obligated)}</p>
            <p className="text-xs text-text-light">({percentage}%)</p>
          </div>
          <div>
            <p className="text-xs text-text-light uppercase tracking-wider">Balance</p>
            <p className="text-lg font-bold text-success">{formatCurrency(balance)}</p>
          </div>
        </div>
  
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(percentage)} transition-all duration-500`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-text-light mt-1 text-right">{percentage}% utilized</p>
        </div>
      </div>
    )
  }
  
  export default BudgetCard
  
