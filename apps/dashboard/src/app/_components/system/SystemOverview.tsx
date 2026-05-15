'use client'

import { type MetricDataPoint, MetricsChart } from '@/app/_components/charts'
import { MetricCardSkeleton, SkeletonGrid } from '@/app/_components/ui/skeletons'
import { useServerContext } from '@/lib/contexts/ServerContext'
import { generateInitialHistory, useMetricsHistory } from '@/lib/hooks/useMetricsHistory'
import { useUnifiedStream } from '@/lib/hooks/useUnifiedStream'
import { Badge, Box, Card, Grid, HStack, Icon, Stat } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { memo, useEffect, useMemo } from 'react'
import { LuClock, LuCpu, LuHardDrive, LuMemoryStick } from 'react-icons/lu'

interface UptimeInfo {
  uptime: number
}

// Цвета графиков в соответствии с брендовой палитрой
const CHART_COLORS = {
  cpu: '#CA9E67', // Brand golden
  memory: '#4ADE80', // Green
  disk: '#60A5FA', // Blue
}

/**
 * Форматирование байтов в человекочитаемый формат
 */
const formatBytes = (bytes: number) => {
  const gb = bytes / (1024 * 1024 * 1024)
  return `${gb.toFixed(2)} GB`
}

/**
 * Форматирование uptime в дни, часы, минуты
 */
const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${days}д ${hours}ч ${minutes}м`
}

/**
 * Цвет статуса в зависимости от процента использования
 */
const getStatusColor = (percentage: number) => {
  if (percentage < 60) {
    return 'green'
  }
  if (percentage < 80) {
    return 'yellow'
  }
  return 'red'
}

/**
 * Мемоизированная карточка метрики
 */
const MetricCard = memo(function MetricCard({
  icon: IconComponent,
  label,
  value,
  helpText,
  chartData,
  chartColor,
  gradientId,
}: {
  icon: typeof LuCpu
  label: string
  value: string
  helpText: string
  chartData: MetricDataPoint[]
  chartColor: string
  gradientId: string
}) {
  return (
    <Card.Root>
      <Card.Body p={4}>
        <Stat.Root>
          <HStack gap={2}>
            <Icon color="fg.muted">
              <IconComponent />
            </Icon>
            <Stat.Label color="fg.muted">{label}</Stat.Label>
          </HStack>
          <Stat.ValueText fontSize="2xl" fontWeight="bold" color={getStatusColor(parseFloat(value))}>
            {value}%
          </Stat.ValueText>
          <Box h="80px" mt={2}>
            <MetricsChart
              data={chartData}
              color={chartColor}
              gradientId={gradientId}
              unit="%"
              label={label}
              height={80}
              showAxis={false}
              showGrid={false}
            />
          </Box>
          <Stat.HelpText color="fg.muted" mt={2} fontSize="xs">
            {helpText}
          </Stat.HelpText>
        </Stat.Root>
      </Card.Body>
    </Card.Root>
  )
})

/**
 * SystemOverview — обзор системных метрик
 *
 * Оптимизации:
 * - Использует единый SSE поток (useUnifiedStream) вместо 3+ отдельных соединений
 * - Uptime запрашивается отдельно с интервалом 30 сек (редко меняется)
 * - Мемоизированные компоненты карточек
 * - История графиков ограничена 20 точками (вместо 30)
 */
export const SystemOverview = memo(function SystemOverview() {
  // Получаем выбранный сервер из контекста
  const { selectedServerId } = useServerContext()

  // История для графиков (уменьшен maxPoints с 30 до 20)
  const { history, addDataPoint } = useMetricsHistory({
    maxPoints: 20, // Было 30, теперь 20 для снижения памяти
    intervalMs: 5000,
  })

  // Единый SSE поток для metrics и containers с поддержкой выбранного сервера
  const {
    metrics,
    isConnected,
    error: streamError,
    reconnectAttempts,
  } = useUnifiedStream({
    serverId: selectedServerId,
  })

  // Uptime запрашиваем отдельно — редко меняется, не нужен realtime
  const { data: uptimeData } = useQuery<UptimeInfo>({
    queryKey: ['system', 'uptime', selectedServerId],
    queryFn: async () => {
      const url = selectedServerId
        ? `/api/system/uptime?serverId=${encodeURIComponent(selectedServerId)}`
        : '/api/system/uptime'
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error('Failed to fetch uptime info')
      }
      return res.json()
    },
    refetchInterval: 30000, // 30 сек — uptime меняется медленно
    staleTime: 25000, // 25 сек — данные считаются свежими
    gcTime: 60000, // 1 мин — время жизни в кэше
  })

  // Извлекаем данные из unified stream
  const cpu = metrics?.cpu
  const memory = metrics?.memory
  const disk = metrics?.disk

  // Вычисляем реальное использование памяти (без буферов/кеша)
  const realMemoryUsage = useMemo(() => {
    if (!memory) {
      return 0
    }
    return ((memory.total - memory.available) / memory.total) * 100
  }, [memory])

  // Обновляем историю при изменении данных
  useEffect(() => {
    if (cpu || memory || disk) {
      addDataPoint(cpu?.currentLoad, memory ? realMemoryUsage : undefined, disk?.[0]?.use)
    }
  }, [cpu, memory, disk, addDataPoint, realMemoryUsage])

  // Показываем состояние загрузки когда данные недоступны
  const isLoading = !cpu && !memory && !disk && !uptimeData

  // Используем начальные демо-данные для графиков если истории ещё нет
  const chartData = useMemo(() => {
    return history.cpu.length > 2 ? history : generateInitialHistory(10)
  }, [history])

  // Статус соединения
  const connectionStatus = useMemo(() => {
    if (streamError) {
      return { color: 'red' as const, text: `🔴 Ошибка (${reconnectAttempts})` }
    }
    if (isConnected) {
      return { color: 'green' as const, text: '🟢 Real-time' }
    }
    return { color: 'yellow' as const, text: '🟡 Подключение...' }
  }, [isConnected, streamError, reconnectAttempts])

  if (isLoading) {
    return (
      <Box>
        <HStack mb={4} justify="flex-end">
          <Badge colorPalette="gray" size="sm">
            Загрузка...
          </Badge>
        </HStack>
        <SkeletonGrid count={4} columns={{ base: 1, md: 2, lg: 4 }} SkeletonComponent={MetricCardSkeleton} />
      </Box>
    )
  }

  return (
    <Box>
      {/* Бейдж статуса соединения */}
      <HStack mb={4} justify="flex-end">
        <Badge colorPalette={connectionStatus.color} size="sm">
          {connectionStatus.text}
        </Badge>
      </HStack>

      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={6}>
        {/* Карточка CPU с графиком */}
        <MetricCard
          icon={LuCpu}
          label="CPU"
          value={cpu?.currentLoad?.toFixed(1) || '0'}
          helpText={`${cpu?.cores || 0} ядер • ${cpu?.brand || 'Unknown'}`}
          chartData={chartData.cpu}
          chartColor={CHART_COLORS.cpu}
          gradientId="cpuGradient"
        />

        {/* Карточка памяти с графиком */}
        <MetricCard
          icon={LuMemoryStick}
          label="Память"
          value={realMemoryUsage.toFixed(1)}
          helpText={`${memory ? formatBytes(memory.total - memory.available) : '0'} / ${
            memory ? formatBytes(memory.total) : '0'
          }`}
          chartData={chartData.memory}
          chartColor={CHART_COLORS.memory}
          gradientId="memoryGradient"
        />

        {/* Карточка диска с графиком */}
        <MetricCard
          icon={LuHardDrive}
          label="Диск"
          value={disk?.[0]?.use?.toFixed(1) || '0'}
          helpText={`${disk?.[0]?.used ? formatBytes(disk[0].used) : '0'} / ${
            disk?.[0]?.size ? formatBytes(disk[0].size) : '0'
          }`}
          chartData={chartData.disk}
          chartColor={CHART_COLORS.disk}
          gradientId="diskGradient"
        />

        {/* Карточка Uptime */}
        <Card.Root>
          <Card.Body p={4}>
            <Stat.Root>
              <HStack gap={2}>
                <Icon color="fg.muted">
                  <LuClock />
                </Icon>
                <Stat.Label color="fg.muted">Uptime</Stat.Label>
              </HStack>
              <Stat.ValueText fontSize="xl" fontWeight="bold" color="fg">
                {uptimeData && formatUptime(uptimeData.uptime)}
              </Stat.ValueText>
              <Box h="80px" mt={2} display="flex" alignItems="center" justifyContent="center">
                <Icon boxSize={12} color="fg.subtle">
                  <LuClock />
                </Icon>
              </Box>
              <Stat.HelpText color="fg.muted" mt={2} fontSize="xs">
                Время работы системы
              </Stat.HelpText>
            </Stat.Root>
          </Card.Body>
        </Card.Root>
      </Grid>
    </Box>
  )
})
