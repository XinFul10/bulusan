import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useMediaQuery, shortenCategoryName } from '../../utils/useMediaQuery'

const BudgetPieChart = ({ data }) => {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const COLORS = ['#1E3A8A', '#3B82F6', '#10B981', '#F59E0B']

  const chartData = data?.map(item => ({
    name: item.name,
    shortName: shortenCategoryName(item.name),
    value: item.allocation
  })) || []

  if (!chartData || chartData.length === 0) {
    return (
      <div className="card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-text-dark mb-4">Budget Allocation Distribution</h3>
        <div className="h-56 sm:h-80 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-text-light text-sm">No data available</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-text-dark text-sm">{payload[0].payload.name}</p>
          <p className="text-sm text-primary">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="card p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-text-dark mb-3 sm:mb-4">Budget Allocation Distribution</h3>
      <div className="h-72 sm:h-80 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy={isMobile ? '45%' : '50%'}
              labelLine={false}
              outerRadius={isMobile ? 72 : 100}
              fill="#8884d8"
              dataKey="value"
              label={isMobile ? false : ({ percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout={isMobile ? 'horizontal' : 'horizontal'}
              verticalAlign="bottom"
              wrapperStyle={{
                fontSize: isMobile ? 11 : 14,
                paddingTop: isMobile ? 16 : 8,
                lineHeight: '1.4'
              }}
              formatter={(value, entry) => (
                <span className="text-text-dark">
                  {isMobile ? entry.payload.shortName : value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default BudgetPieChart
