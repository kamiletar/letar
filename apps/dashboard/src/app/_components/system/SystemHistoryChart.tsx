'use client'

import { useServerContext } from '@/lib/contexts/ServerContext'
import {
  Box,
  Card,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Spinner,
  Stat,
  Tabs,
  Text,
  useToken,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { LuCalendar, LuCalendarDays, LuClock, LuCpu, LuHardDrive, LuMemoryStick } from 'react-icons/lu'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ChartDataPoint {
  time: string
  value: number
  timestamp: number
}

interface HistoryStats {
  min: number
  max: number
  avg: number
}

interface HistoryResponse {
  tier: string
  hours: number
  pointsCount: number
  stats: {
    cpu: HistoryStats
    memory: HistoryStats
    disk: HistoryStats
  } | null
  data: {
    cpu: ChartDataPoint[]
    memory: ChartDataPoint[]
    disk: ChartDataPoint[]
  }
  timeRange: {
    from: string | null
    to: string | null
  }
}

// Time range options
const TIME_RANGES = [
  { value: '1', label: '1 час', hours: 1, icon: LuClock },
  { value: '6', label: '6 часов', hours: 6, icon: LuClock },
  { value: '24', label: '24 часа', hours: 24, icon: LuCalendar },
  { value: '168', label: '7 дней', hours: 168, icon: LuCalendarDays },
  { value: '720', label: '30 дней', hours: 720, icon: LuCalendarDays },
]

interface CustomTooltipProps {
  active?: boolean
  payload?: readonly { value?: number; color?: string; dataKey?: string; name?: string }[]
  label?: string | number
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <Box bg="bg.panel" border="1px solid" borderColor="border.muted" borderRadius="md" p={3} fontSize="sm">
        <Text color="fg.muted" mb={2}>
          {label}
        </Text>
        {payload.map((entry) => (
          <HStack key={entry.name} gap={2}>
            <Box w={3} h={3} borderRadius="sm" bg={entry.color} />
            <Text color={entry.color}>
              {entry.name}: {entry.value?.toFixed(1)}%
            </Text>
          </HStack>
        ))}
      </Box>
    )
  }
  return null
}

interface StatCardProps {
  label: string
  stats: HistoryStats | undefined
  color: string
  icon: React.ElementType
}

const StatCard = ({ label, stats, color, icon: IconComponent }: StatCardProps) => (
  <Card.Root bg="bg.muted" borderColor="border.muted" size="sm">
    <Card.Body p={3}>
      <HStack gap={2} mb={2}>
        <Icon color={color}>
          <IconComponent />
        </Icon>
        <Text fontWeight="medium" color="fg.muted">
          {label}
        </Text>
      </HStack>
      <SimpleGrid columns={3} gap={2}>
        <Stat.Root>
          <Stat.Label fontSize="xs" color="fg.subtle">
            Мин
          </Stat.Label>
          <Stat.ValueText fontSize="sm" color={color}>
            {stats?.min.toFixed(1) ?? '-'}%
          </Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label fontSize="xs" color="fg.subtle">
            Сред
          </Stat.Label>
          <Stat.ValueText fontSize="sm" color={color}>
            {stats?.avg.toFixed(1) ?? '-'}%
          </Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label fontSize="xs" color="fg.subtle">
            Макс
          </Stat.Label>
          <Stat.ValueText fontSize="sm" color={color}>
            {stats?.max.toFixed(1) ?? '-'}%
          </Stat.ValueText>
        </Stat.Root>
      </SimpleGrid>
    </Card.Body>
  </Card.Root>
)

export const SystemHistoryChart = () => {
  const [selectedRange, setSelectedRange] = useState('24')
  const hours = parseInt(selectedRange, 10)
  const { selectedServerId } = useServerContext()

  // Get semantic colors for Recharts (requires hex values)
  const [cpuColor, memoryColor, diskColor, gridColor, axisColor] = useToken('colors', [
    'brand.solid', // CPU - brand golden
    'green.solid', // Memory - green
    'blue.solid', // Disk - blue
    'border.muted', // Grid lines
    'fg.subtle', // Axis text
  ])

  const { data, isLoading, error } = useQuery<HistoryResponse>({
    queryKey: ['system-history', hours, selectedServerId],
    queryFn: async () => {
      const params = new URLSearchParams({ hours: String(hours), combined: 'true' })
      if (selectedServerId) {
        params.set('serverId', selectedServerId)
      }
      const res = await fetch(`/api/system/history?${params}`)
      if (!res.ok) {
        throw new Error('Failed to fetch history')
      }
      return res.json()
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  })

  // Combine data for multi-line chart
  const combinedData = data?.data.cpu.map((point, index) => ({
    time: point.time,
    timestamp: point.timestamp,
    cpu: point.value,
    memory: data.data.memory[index]?.value ?? 0,
    disk: data.data.disk[index]?.value ?? 0,
  })) ?? []

  // Sample data for display if too many points
  const displayData = combinedData.length > 100
    ? combinedData.filter((_, i) => i % Math.ceil(combinedData.length / 100) === 0)
    : combinedData

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'realtime':
        return 'Детальные (30 сек)'
      case 'hourly':
        return 'Агрегированные (5 мин)'
      case 'daily':
        return 'Дневные (1 час)'
      case 'combined':
        return 'Комбинированные'
      default:
        return tier
    }
  }

  return (
    <Card.Root bg="bg.muted" borderColor="border.muted">
      <Card.Body p={6}>
        <VStack align="stretch" gap={4}>
          {/* Header */}
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <VStack align="start" gap={0}>
              <Heading size="md" color="fg">
                История системных метрик
              </Heading>
              {data && (
                <Text fontSize="sm" color="brand.subtle">
                  {getTierLabel(data.tier)} • {data.pointsCount} точек
                </Text>
              )}
            </VStack>

            {/* Time Range Tabs */}
            <Tabs.Root value={selectedRange} onValueChange={(e) => setSelectedRange(e.value)} size="sm">
              <Tabs.List bg="bg.subtle" borderRadius="md" p={1}>
                {TIME_RANGES.map((range) => (
                  <Tabs.Trigger
                    key={range.value}
                    value={range.value}
                    px={3}
                    py={1}
                    fontSize="sm"
                    _selected={{ bg: 'brand.solid', color: 'brand.inverted' }}
                  >
                    {range.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Tabs.Root>
          </HStack>

          {/* Stats Cards */}
          {data?.stats && (
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
              <StatCard label="CPU" stats={data.stats.cpu} color={cpuColor} icon={LuCpu} />
              <StatCard label="Память" stats={data.stats.memory} color={memoryColor} icon={LuMemoryStick} />
              <StatCard label="Диск" stats={data.stats.disk} color={diskColor} icon={LuHardDrive} />
            </SimpleGrid>
          )}

          {/* Chart */}
          <Box h="300px" position="relative">
            {isLoading
              ? (
                <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center">
                  <Spinner size="lg" color="brand" />
                </Box>
              )
              : error
              ? (
                <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center">
                  <Text color="fg.error">Ошибка загрузки данных</Text>
                </Box>
              )
              : displayData.length === 0
              ? (
                <Box
                  position="absolute"
                  inset={0}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexDirection="column"
                  gap={2}
                >
                  <Icon boxSize={12} color="brand.subtle">
                    <LuCalendar />
                  </Icon>
                  <Text color="brand.muted">Нет данных за выбранный период</Text>
                  <Text color="brand.subtle" fontSize="sm">
                    Данные начнут появляться после запуска мониторинга
                  </Text>
                </Box>
              )
              : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cpuHistoryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={cpuColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={cpuColor} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="memoryHistoryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={memoryColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={memoryColor} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="diskHistoryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={diskColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={diskColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke={axisColor}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={50}
                    />
                    <YAxis
                      stroke={axisColor}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      width={45}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => {
                        const labels: Record<string, string> = {
                          cpu: 'CPU',
                          memory: 'Память',
                          disk: 'Диск',
                        }
                        return <span style={{ color: axisColor }}>{labels[value] || value}</span>
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cpu"
                      name="cpu"
                      stroke={cpuColor}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#cpuHistoryGradient)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="memory"
                      name="memory"
                      stroke={memoryColor}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#memoryHistoryGradient)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="disk"
                      name="disk"
                      stroke={diskColor}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#diskHistoryGradient)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
          </Box>

          {/* Time Range Info */}
          {data?.timeRange.from && data?.timeRange.to && (
            <Text fontSize="xs" color="fg.subtle" textAlign="center">
              {new Date(data.timeRange.from).toLocaleString('ru-RU')} —{' '}
              {new Date(data.timeRange.to).toLocaleString('ru-RU')}
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
