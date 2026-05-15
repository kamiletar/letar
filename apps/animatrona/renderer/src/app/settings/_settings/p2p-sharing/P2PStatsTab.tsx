'use client'

/**
 * Вкладка «Статистика» для P2P — дашборд с графиками bandwidth,
 * дневной историей трафика и суммарными метриками.
 */

import { Box, Grid, Heading, HStack, Icon, SegmentGroup, Text, VStack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { LuArrowDown, LuArrowUp, LuClock, LuDatabase, LuHash, LuShield, LuUsers } from 'react-icons/lu'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatBytes, formatSpeed, getNatStatusColor, getNatStatusLabel, getPeerColor } from './format-utils'
import type { BandwidthPoint } from './use-p2p-stats'
import { useP2PStats } from './use-p2p-stats'

/** Периоды для графика скорости */
type SpeedPeriod = '1m' | '5m' | '10m' | '30m' | '1h' | '3h'

const PERIOD_MS: Record<SpeedPeriod, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '10m': 600_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '3h': 10_800_000,
}

const SPEED_PERIOD_ITEMS = [
  { value: '1m', label: '1м' },
  { value: '5m', label: '5м' },
  { value: '10m', label: '10м' },
  { value: '30m', label: '30м' },
  { value: '1h', label: '1ч' },
  { value: '3h', label: '3ч' },
]

/** Максимум точек на графике для читаемости */
const MAX_CHART_POINTS = 180

/** Фильтрация и прореживание данных bandwidth по периоду */
function filterAndThinBandwidth(
  history: BandwidthPoint[],
  period: SpeedPeriod
): { chartData: BandwidthPoint[]; avgIn: number; avgOut: number } {
  const cutoff = Date.now() - PERIOD_MS[period]
  const filtered = history.filter((p) => p.timestamp >= cutoff)

  if (filtered.length === 0) {
    return { chartData: [], avgIn: 0, avgOut: 0 }
  }

  const avgIn = filtered.reduce((s, p) => s + p.inSpeed, 0) / filtered.length
  const avgOut = filtered.reduce((s, p) => s + p.outSpeed, 0) / filtered.length

  if (filtered.length <= MAX_CHART_POINTS) {
    return { chartData: filtered, avgIn, avgOut }
  }

  const step = Math.ceil(filtered.length / MAX_CHART_POINTS)
  const thinned = filtered.filter((_, i) => i % step === 0 || i === filtered.length - 1)

  return { chartData: thinned, avgIn, avgOut }
}

/**
 * Форматирование длительности из миллисекунд (BigInt строка) в "Xд Yч Zм"
 */
function formatSeedingDuration(ms: string): string {
  const totalMs = Number(ms)
  if (!totalMs || totalMs <= 0) {
    return '0м'
  }

  const totalMinutes = Math.floor(totalMs / 60_000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  const parts: string[] = []
  if (days > 0) {
    parts.push(`${days}д`)
  }
  if (hours > 0) {
    parts.push(`${hours}ч`)
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}м`)
  }

  return parts.join(' ')
}

/**
 * Форматирование короткой даты (DD.MM) из ISO строки YYYY-MM-DD
 */
function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length !== 3) {
    return dateStr
  }
  return `${parts[2]}.${parts[1]}`
}

/**
 * Форматирование байт для оси Y графика (компактный формат)
 */
function formatBytesAxis(bytes: number): string {
  if (bytes === 0) {
    return '0'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Форматирование скорости для оси Y графика (компактный формат)
 */
function formatSpeedAxis(bytesPerSec: number): string {
  if (bytesPerSec === 0) {
    return '0'
  }
  if (bytesPerSec < 1024) {
    return `${bytesPerSec.toFixed(0)} B/s`
  }
  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(0)} KB/s`
  }
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
}

/** Карточка суммарной метрики */
function StatCard({
  icon,
  color,
  label,
  value,
  subtitle,
}: {
  icon: React.ElementType
  color: string
  label: string
  value: string
  subtitle?: string
}) {
  return (
    <Box p={4} bg="bg.subtle" borderRadius="lg" textAlign="center">
      <Icon as={icon} color={`${color}.400`} boxSize={5} mb={2} />
      <Text fontSize="xs" color="fg.subtle" mb={1}>
        {label}
      </Text>
      <Text fontWeight="bold" fontSize="xl" color={`${color}.400`}>
        {value}
      </Text>
      {subtitle && (
        <Text fontSize="xs" color="fg.muted" mt={1}>
          {subtitle}
        </Text>
      )}
    </Box>
  )
}

/** Кастомный Tooltip для графика bandwidth */
function BandwidthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <Box bg="bg.panel" p={2} borderRadius="md" borderWidth="1px" borderColor="border.muted" shadow="md">
      <Text fontSize="xs" color="fg.subtle" mb={1}>
        {label}
      </Text>
      {payload.map((entry) => (
        <Text key={entry.dataKey} fontSize="xs" color={entry.dataKey === 'inSpeed' ? 'green.400' : 'orange.400'}>
          {entry.dataKey === 'inSpeed' ? '↓ Вход' : '↑ Исход'}: {formatSpeed(entry.value)}
        </Text>
      ))}
    </Box>
  )
}

/** Кастомный Tooltip для графика дневного трафика */
function DailyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <Box bg="bg.panel" p={2} borderRadius="md" borderWidth="1px" borderColor="border.muted" shadow="md">
      <Text fontSize="xs" color="fg.subtle" mb={1}>
        {label}
      </Text>
      {payload.map((entry) => (
        <Text key={entry.dataKey} fontSize="xs" color={entry.dataKey === 'uploaded' ? 'green.400' : 'blue.400'}>
          {entry.dataKey === 'uploaded' ? '↑ Отдано' : '↓ Скачано'}: {formatBytes(entry.value)}
        </Text>
      ))}
    </Box>
  )
}

export function P2PStatsTab() {
  const { userStats, dailyHistory, bandwidthHistory, ipfsStatus, isLoading } = useP2PStats()
  const [speedPeriod, setSpeedPeriod] = useState<SpeedPeriod>('1m')

  // Фильтрация и прореживание bandwidth по выбранному периоду
  const { chartData, avgIn, avgOut } = useMemo(
    () => filterAndThinBandwidth(bandwidthHistory, speedPeriod),
    [bandwidthHistory, speedPeriod]
  )

  // Преобразуем дневную историю для BarChart
  const dailyChartData = useMemo(() => {
    return dailyHistory.map((day) => ({
      date: formatShortDate(day.date),
      uploaded: Number(day.bytesUploaded),
      downloaded: Number(day.bytesDownloaded),
    }))
  }, [dailyHistory])

  if (isLoading) {
    return (
      <Box py={6}>
        <Text color="fg.subtle">Загрузка статистики...</Text>
      </Box>
    )
  }

  const isRunning = ipfsStatus?.isRunning ?? false
  const peerCount = ipfsStatus?.connectedPeers ?? 0
  const peerColor = getPeerColor(peerCount)

  return (
    <VStack align="stretch" gap={6}>
      {/* Блок 1: Суммарная статистика (всё время) */}
      <Box>
        <Heading size="sm" mb={4}>
          Суммарная статистика
        </Heading>
        <Grid templateColumns="repeat(5, 1fr)" gap={3}>
          <StatCard
            icon={LuArrowUp}
            color="green"
            label="Отдано"
            value={formatBytes(Number(userStats?.bytesUploaded ?? '0'))}
          />
          <StatCard
            icon={LuArrowDown}
            color="blue"
            label="Скачано"
            value={formatBytes(Number(userStats?.bytesDownloaded ?? '0'))}
          />
          <StatCard
            icon={LuClock}
            color="purple"
            label="Время раздачи"
            value={formatSeedingDuration(userStats?.totalSeedingTimeMs ?? '0')}
          />
          <StatCard icon={LuUsers} color="orange" label="Помог пирам" value={String(userStats?.peersHelped ?? 0)} />
          <StatCard
            icon={LuHash}
            color="cyan"
            label="Раздаёт контента"
            value={String(userStats?.uniqueContentSeeded ?? 0)}
            subtitle="CID"
          />
        </Grid>
      </Box>

      {/* Блок 2: График bandwidth за сессию */}
      <Box>
        <HStack justify="space-between" align="center" mb={2}>
          <Heading size="sm">Скорость</Heading>
          <SegmentGroup.Root
            size="xs"
            value={speedPeriod}
            onValueChange={(e) => setSpeedPeriod(e.value as SpeedPeriod)}
          >
            <SegmentGroup.Indicator />
            {SPEED_PERIOD_ITEMS.map((item) => (
              <SegmentGroup.Item key={item.value} value={item.value}>
                <SegmentGroup.ItemText>{item.label}</SegmentGroup.ItemText>
                <SegmentGroup.ItemHiddenInput />
              </SegmentGroup.Item>
            ))}
          </SegmentGroup.Root>
        </HStack>

        {/* Средняя скорость за период */}
        {chartData.length > 0 && (
          <HStack gap={4} mb={3}>
            <Text fontSize="xs" color="green.400">
              Ср. ↓ {formatSpeed(avgIn)}
            </Text>
            <Text fontSize="xs" color="orange.400">
              Ср. ↑ {formatSpeed(avgOut)}
            </Text>
          </HStack>
        )}

        {!isRunning ? (
          <Box p={6} bg="bg.subtle" borderRadius="lg" textAlign="center">
            <Text color="fg.subtle">IPFS не запущена. Запустите ноду для отслеживания скорости.</Text>
          </Box>
        ) : chartData.length < 2 ? (
          <Box p={6} bg="bg.subtle" borderRadius="lg" textAlign="center">
            <Text color="fg.subtle">Сбор данных... ({bandwidthHistory.length}/2 точек)</Text>
          </Box>
        ) : (
          <Box bg="bg.subtle" borderRadius="lg" p={4} h="250px">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: 'var(--chakra-colors-fg-subtle)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={formatSpeedAxis}
                  tick={{ fontSize: 10, fill: 'var(--chakra-colors-fg-subtle)' }}
                  width={70}
                />
                <Tooltip content={<BandwidthTooltip />} />
                <Line
                  type="monotone"
                  dataKey="inSpeed"
                  name="Входящий"
                  stroke="#48BB78"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="outSpeed"
                  name="Исходящий"
                  stroke="#ED8936"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value: string) => (value === 'Входящий' ? '↓ Входящий' : '↑ Исходящий')}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>

      {/* Блок 3: Дневной трафик за 30 дней */}
      <Box>
        <Heading size="sm" mb={4}>
          Трафик по дням (30 дней)
        </Heading>
        {dailyChartData.length === 0 ? (
          <Box p={6} bg="bg.subtle" borderRadius="lg" textAlign="center">
            <Text color="fg.subtle">Нет данных за последние 30 дней. Начните раздавать контент!</Text>
          </Box>
        ) : (
          <Box bg="bg.subtle" borderRadius="lg" p={4} h="250px">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--chakra-colors-fg-subtle)' }} />
                <YAxis
                  tickFormatter={formatBytesAxis}
                  tick={{ fontSize: 10, fill: 'var(--chakra-colors-fg-subtle)' }}
                  width={70}
                />
                <Tooltip content={<DailyTooltip />} />
                <Bar dataKey="uploaded" name="Отдано" stackId="traffic" fill="#48BB78" radius={[2, 2, 0, 0]} />
                <Bar dataKey="downloaded" name="Скачано" stackId="traffic" fill="#4299E1" radius={[2, 2, 0, 0]} />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value: string) => (value === 'Отдано' ? '↑ Отдано' : '↓ Скачано')}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>

      {/* Блок 4: Текущая сессия — живые метрики */}
      {isRunning && ipfsStatus && (
        <Box>
          <Heading size="sm" mb={4}>
            Текущая сессия
          </Heading>
          <Grid templateColumns="repeat(5, 1fr)" gap={3}>
            {/* Пиры */}
            <Box p={3} bg="bg.subtle" borderRadius="md" textAlign="center">
              <HStack gap={1} justify="center" mb={1}>
                <Icon as={LuUsers} color={`${peerColor}.400`} boxSize={3.5} />
                <Text fontSize="xs" color="fg.subtle">
                  Пиры
                </Text>
              </HStack>
              <Text fontWeight="bold" fontSize="lg" color={`${peerColor}.400`}>
                {peerCount}
              </Text>
            </Box>

            {/* NAT */}
            <Box p={3} bg="bg.subtle" borderRadius="md" textAlign="center">
              <HStack gap={1} justify="center" mb={1}>
                <Icon as={LuShield} color={`${getNatStatusColor(ipfsStatus.natStatus)}.400`} boxSize={3.5} />
                <Text fontSize="xs" color="fg.subtle">
                  NAT
                </Text>
              </HStack>
              <Text fontWeight="bold" fontSize="lg" color={`${getNatStatusColor(ipfsStatus.natStatus)}.400`}>
                {getNatStatusLabel(ipfsStatus.natStatus)}
              </Text>
            </Box>

            {/* Хранилище */}
            <Box p={3} bg="bg.subtle" borderRadius="md" textAlign="center">
              <HStack gap={1} justify="center" mb={1}>
                <Icon as={LuDatabase} color="blue.400" boxSize={3.5} />
                <Text fontSize="xs" color="fg.subtle">
                  Хранилище
                </Text>
              </HStack>
              <Text fontWeight="bold" fontSize="lg">
                {formatBytes(ipfsStatus.blockstoreSize)}
              </Text>
            </Box>

            {/* Входящий */}
            <Box p={3} bg="bg.subtle" borderRadius="md" textAlign="center">
              <HStack gap={1} justify="center" mb={1}>
                <Icon as={LuArrowDown} color="green.400" boxSize={3.5} />
                <Text fontSize="xs" color="fg.subtle">
                  Входящий
                </Text>
              </HStack>
              <Text fontWeight="bold" fontSize="sm">
                {formatBytes(ipfsStatus.bytesIn)}
              </Text>
              {bandwidthHistory.length > 0 && (
                <Text fontSize="xs" color="green.400">
                  {formatSpeed(bandwidthHistory[bandwidthHistory.length - 1]!.inSpeed)}
                </Text>
              )}
            </Box>

            {/* Исходящий */}
            <Box p={3} bg="bg.subtle" borderRadius="md" textAlign="center">
              <HStack gap={1} justify="center" mb={1}>
                <Icon as={LuArrowUp} color="orange.400" boxSize={3.5} />
                <Text fontSize="xs" color="fg.subtle">
                  Исходящий
                </Text>
              </HStack>
              <Text fontWeight="bold" fontSize="sm">
                {formatBytes(ipfsStatus.bytesOut)}
              </Text>
              {bandwidthHistory.length > 0 && (
                <Text fontSize="xs" color="orange.400">
                  {formatSpeed(bandwidthHistory[bandwidthHistory.length - 1]!.outSpeed)}
                </Text>
              )}
            </Box>
          </Grid>

          {/* PeerId */}
          {ipfsStatus.peerId && (
            <Box mt={3} p={3} bg="bg.subtle" borderRadius="md">
              <Text fontSize="xs" color="fg.subtle" mb={1}>
                PeerId
              </Text>
              <Text fontFamily="mono" fontSize="xs" color="fg.muted" wordBreak="break-all">
                {ipfsStatus.peerId}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </VStack>
  )
}
