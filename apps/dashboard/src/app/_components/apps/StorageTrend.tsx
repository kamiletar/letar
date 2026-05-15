'use client'

import { formatBytes } from '@/lib/format'
import { Badge, Box, Card, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { LuMinus, LuTrendingDown, LuTrendingUp } from 'react-icons/lu'

interface StorageStats {
  currentSize: number
  oldestSize: number
  growthBytes: number
  growthPercent: number
  avgDailyGrowth: number
}

interface StorageHistoryData {
  appName: string
  days: number
  pointsCount: number
  stats: StorageStats | null
  total: Array<{ time: string; value: number; timestamp: number }>
  uploads: Array<{ time: string; value: number; timestamp: number }>
  nextStatic: Array<{ time: string; value: number; timestamp: number }>
}

async function fetchStorageHistory(appName: string, days: number): Promise<StorageHistoryData> {
  const res = await fetch(`/api/apps/${appName}/storage-history?days=${days}`)
  if (!res.ok) {
    throw new Error('Failed to fetch storage history')
  }
  return res.json()
}

interface StorageTrendProps {
  appName: string
  days?: number
}

export function StorageTrend({ appName, days = 30 }: StorageTrendProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['storage-history', appName, days],
    queryFn: () => fetchStorageHistory(appName, days),
    refetchInterval: 60 * 60 * 1000, // Refresh every hour
  })

  if (isLoading) {
    return (
      <Card.Root>
        <Card.Header>
          <Heading size="md">Storage Trend ({days}d)</Heading>
        </Card.Header>
        <Card.Body>
          <Text color="fg.muted">Loading...</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  if (error || !data) {
    return (
      <Card.Root>
        <Card.Header>
          <Heading size="md">Storage Trend ({days}d)</Heading>
        </Card.Header>
        <Card.Body>
          <Text color="fg.muted">No data available</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  if (!data.stats || data.pointsCount < 2) {
    return (
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between">
            <Heading size="md">Storage Trend ({days}d)</Heading>
            <Badge colorPalette="yellow" size="sm">
              Collecting data
            </Badge>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Text color="fg.muted" textAlign="center" py={4}>
            Storage data is being collected. Check back in a few hours.
          </Text>
        </Card.Body>
      </Card.Root>
    )
  }

  const { stats } = data
  const isGrowing = stats.growthBytes > 0
  const isShrinking = stats.growthBytes < 0

  const TrendIcon = isGrowing ? LuTrendingUp : isShrinking ? LuTrendingDown : LuMinus
  const trendColor = isGrowing ? 'red' : isShrinking ? 'green' : 'gray'

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md">Storage Trend ({days}d)</Heading>
          <Badge colorPalette={trendColor} size="sm">
            <Icon mr={1}>
              <TrendIcon />
            </Icon>
            {isGrowing ? '+' : ''}
            {stats.growthPercent.toFixed(1)}%
          </Badge>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          {/* Growth Stats */}
          <Box bg="bg.muted" p={4} rounded="md">
            <VStack align="stretch" gap={3}>
              <HStack justify="space-between">
                <Text color="fg.muted">Current Size</Text>
                <Text fontWeight="bold">{formatBytes(stats.currentSize)}</Text>
              </HStack>

              <HStack justify="space-between">
                <Text color="fg.muted">Size {days}d ago</Text>
                <Text>{formatBytes(stats.oldestSize)}</Text>
              </HStack>

              <HStack justify="space-between">
                <Text color="fg.muted">Total Change</Text>
                <Text color={`${trendColor}.400`} fontWeight="medium">
                  {isGrowing ? '+' : ''}
                  {formatBytes(Math.abs(stats.growthBytes))}
                </Text>
              </HStack>

              <HStack justify="space-between">
                <Text color="fg.muted">Avg Daily Growth</Text>
                <Text color={stats.avgDailyGrowth > 0 ? 'red.400' : 'green.400'}>
                  {stats.avgDailyGrowth > 0 ? '+' : ''}
                  {formatBytes(Math.abs(stats.avgDailyGrowth))}/day
                </Text>
              </HStack>
            </VStack>
          </Box>

          {/* Mini Sparkline - simplified bar chart */}
          {data.total.length > 1 && (
            <Box>
              <Text fontSize="xs" color="fg.muted" mb={2}>
                Total size over time ({data.pointsCount} data points)
              </Text>
              <HStack gap={0.5} h="40px" align="end">
                {data.total.slice(-30).map((point, idx) => {
                  const maxValue = Math.max(...data.total.map((p) => p.value))
                  const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0
                  return (
                    <Box
                      key={idx}
                      flex={1}
                      bg="blue.500"
                      opacity={0.6 + (idx / 30) * 0.4}
                      h={`${Math.max(height, 5)}%`}
                      rounded="sm"
                      title={`${point.time}: ${formatBytes(point.value)}`}
                    />
                  )
                })}
              </HStack>
              <HStack justify="space-between" mt={1}>
                <Text fontSize="xs" color="fg.muted">
                  {data.total[0]?.time}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  {data.total[data.total.length - 1]?.time}
                </Text>
              </HStack>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
