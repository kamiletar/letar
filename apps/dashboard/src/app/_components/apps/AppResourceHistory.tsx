'use client'

import { MetricsChart } from '@/app/_components/charts'
import { Badge, Box, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'

interface HistoryData {
  appName: string
  hours: number
  pointsCount: number
  cpu: Array<{ time: string; value: number; timestamp: number }>
  memory: Array<{ time: string; value: number; timestamp: number }>
}

async function fetchAppHistory(appName: string, hours: number): Promise<HistoryData> {
  const res = await fetch(`/api/apps/${appName}/history?hours=${hours}`)
  if (!res.ok) {
    throw new Error('Failed to fetch history')
  }
  return res.json()
}

interface AppResourceHistoryProps {
  appName: string
  hours?: number
}

export function AppResourceHistory({ appName, hours = 24 }: AppResourceHistoryProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['app-history', appName, hours],
    queryFn: () => fetchAppHistory(appName, hours),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })

  if (isLoading) {
    return (
      <Card.Root>
        <Card.Header>
          <Heading size="md">Resource History ({hours}h)</Heading>
        </Card.Header>
        <Card.Body>
          <Text color="fg.muted">Loading history...</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  if (error || !data) {
    return (
      <Card.Root>
        <Card.Header>
          <Heading size="md">Resource History ({hours}h)</Heading>
        </Card.Header>
        <Card.Body>
          <Text color="fg.muted">No history data available</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  if (data.pointsCount === 0) {
    return (
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between">
            <Heading size="md">Resource History ({hours}h)</Heading>
            <Badge colorPalette="yellow" size="sm">
              No data
            </Badge>
          </HStack>
        </Card.Header>
        <Card.Body>
          <VStack gap={4} align="stretch">
            <Text color="fg.muted" textAlign="center" py={8}>
              Metrics collection will begin shortly. Data is collected every 5 minutes.
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md">Resource History ({hours}h)</Heading>
          <Badge colorPalette="green" size="sm">
            {data.pointsCount} points
          </Badge>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap={6} align="stretch">
          {/* CPU Chart */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
              CPU Usage (%)
            </Text>
            <Box h="120px">
              <MetricsChart data={data.cpu} color="#4299E1" maxValue={100} />
            </Box>
          </Box>

          {/* Memory Chart */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
              Memory Usage (%)
            </Text>
            <Box h="120px">
              <MetricsChart data={data.memory} color="#48BB78" maxValue={100} />
            </Box>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
