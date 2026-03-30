import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { dashboardService } from '../../services/transactionService'

const monthlyData = [
  { month: 'Jan', planned: 50000, actual: 45000 },
  { month: 'Feb', planned: 60000, actual: 55000 },
  { month: 'Mar', planned: 45000, actual: 50000 },
  { month: 'Apr', planned: 70000, actual: 60000 },
  { month: 'May', planned: 55000, actual: 65000 },
  { month: 'Jun', planned: 80000, actual: 75000 },
  { month: 'Jul', planned: 65000, actual: 70000 },
  { month: 'Aug', planned: 70000, actual: 68000 },
  { month: 'Sep', planned: 60000, actual: 62000 },
  { month: 'Oct', planned: 75000, actual: 70000 },
  { month: 'Nov', planned: 80000, actual: 78000 },
  { month: 'Dec', planned: 90000, actual: 85000 }
]

const ObligationChart = () => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-text-dark mb-2">{label}</p>
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
    <div className="card">
      <h3 className="text-lg font-semibold text-text-dark mb-2">Monthly Obligation Timeline</h3>
      <p className="text-sm text-text-light mb-4">Planned vs Actual Obligations</p>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine y={0} stroke="#E5E7EB" />
            <Line 
              type="monotone" 
              dataKey="planned" 
              name="Planned" 
              stroke="#1E3A8A" 
              strokeWidth={2}
              dot={{ fill: '#1E3A8A', strokeWidth: 0, r: 4 }}
              strokeDasharray="5 5"
            />
            <Line 
              type="monotone" 
              dataKey="actual" 
              name="Actual" 
              stroke="#EF4444" 
              strokeWidth={2}
              dot={{ fill: '#EF4444', strokeWidth: 0, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ObligationChart
