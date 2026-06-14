import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useMediaQuery, shortenCategoryName } from '../../utils/useMediaQuery'

const BudgetBarChart = ({ data }) => {
  const isMobile = useMediaQuery('(max-width: 767px)')

  const chartData = data?.map(item => ({
    name: shortenCategoryName(item.name),
    fullName: item.name,
    Allocation: item.allocation,
    Obligation: item.obligated
  })) || []

  if (!chartData || chartData.length === 0) {
    return (
      <div className="card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-text-dark mb-4">Obligation vs Allocation</h3>
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
      notation: isMobile ? 'compact' : 'standard',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const fullName = payload[0]?.payload?.fullName || payload[0]?.payload?.name
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-[200px]">
          <p className="font-semibold text-text-dark mb-2 text-sm">{fullName}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="card p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-text-dark mb-3 sm:mb-4">Obligation vs Allocation</h3>
      <div className="h-64 sm:h-80 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 10,
              right: isMobile ? 8 : 30,
              left: isMobile ? 0 : 20,
              bottom: isMobile ? 56 : 20
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#6B7280', fontSize: isMobile ? 10 : 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
              interval={0}
              angle={isMobile ? -35 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 64 : 30}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: isMobile ? 10 : 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={formatCurrency}
              width={isMobile ? 52 : 70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: isMobile ? 12 : 14, paddingTop: 8 }}
            />
            <Bar dataKey="Allocation" fill="#1E3A8A" radius={[4, 4, 0, 0]} maxBarSize={isMobile ? 32 : 48} />
            <Bar dataKey="Obligation" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={isMobile ? 32 : 48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default BudgetBarChart
