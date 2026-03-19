import { useId } from 'react'
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { format } from 'date-fns'
import type { PriceHistory } from '../types'
import { formatPrice, parseNumericValue } from '../utils/format'

interface PriceChartProps {
  data: PriceHistory[]
  height?: number
}

export default function PriceChart({ data, height = 200 }: PriceChartProps) {
  const chartId = useId().replace(/:/g, '')
  const emptyState = (
    <div className="flex items-center justify-center text-slate-500" style={{ height }}>
      Sem dados disponíveis
    </div>
  )

  const chartData = data.flatMap((item) => {
    const price = parseNumericValue(item.price_usd)
    if (price === null) {
      return []
    }

    return [{
      price,
      displayTime: format(new Date(item.collected_at), 'HH:mm'),
    }]
  })

  if (chartData.length === 0) {
    return emptyState
  }

  const prices = chartData.map((d) => d.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceChange = prices.length > 1 ? prices[prices.length - 1] - prices[0] : 0
  const isPositive = priceChange >= 0

  const gradientId = `gradient-${chartId}-${isPositive ? 'green' : 'red'}`
  const strokeColor = isPositive ? '#10b981' : '#ef4444'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="displayTime"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minPrice * 0.999, maxPrice * 1.001]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={(value) => formatPrice(value, 'USD', true)}
          width={80}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#fff',
          }}
          labelFormatter={(label) => `Horário: ${label}`}
          formatter={(value: number) => [
            `$${formatPrice(value)}`,
            'Preço',
          ]}
        />

        <Area
          type="monotone"
          dataKey="price"
          stroke={strokeColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
