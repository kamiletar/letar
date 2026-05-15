'use client'

import { Box } from '@chakra-ui/react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface MetricDataPoint {
  time: string
  value: number
  timestamp: number
}

interface MetricsChartProps {
  data: MetricDataPoint[]
  color?: string
  gradientId?: string
  unit?: string
  label?: string
  height?: number
  maxValue?: number
  showGrid?: boolean
  showAxis?: boolean
}

interface CustomTooltipProps {
  active?: boolean
  payload?: readonly { value?: string | number | readonly (string | number)[]; color?: string }[]
  label?: string | number
  unit?: string
  metricLabel?: string
}

const CustomTooltip = ({ active, payload, label, unit, metricLabel }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <Box bg="bg.muted" border="1px solid" borderColor="border.muted" borderRadius="md" p={2} fontSize="sm">
        <Box color="fg.muted">{label}</Box>
        <Box color={payload[0].color} fontWeight="bold">
          {metricLabel}: {typeof payload[0].value === 'number' ? payload[0].value.toFixed(1) : payload[0].value}
          {unit}
        </Box>
      </Box>
    )
  }
  return null
}

export const MetricsChart = ({
  data,
  color = '#CA9E67',
  gradientId = 'metricGradient',
  unit = '%',
  label = 'Value',
  height = 120,
  maxValue = 100,
  showGrid = true,
  showAxis = true,
}: MetricsChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: showAxis ? 0 : -20, bottom: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />}
        {showAxis && (
          <>
            <XAxis dataKey="time" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[0, maxValue]}
              tickFormatter={(value) => `${value}${unit}`}
              width={40}
            />
          </>
        )}
        <Tooltip content={(props) => <CustomTooltip {...props} unit={unit} metricLabel={label} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
