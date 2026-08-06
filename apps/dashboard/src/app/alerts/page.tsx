'use client'

import { Header } from '@/app/_components/layout/Header'
import { toaster } from '@/app/_components/ui/toaster'
import type { AlertSeverity, AlertStatus, AlertType } from '@/generated/models'
import { formatDateTime } from '@/lib/format'
import { Badge, Box, Button, Card, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  status: AlertStatus
  title: string
  message: string
  metadata?: Record<string, unknown>
  createdAt: string
  acknowledgedAt?: string
  resolvedAt?: string
  server?: {
    id: string
    name: string
    displayName: string
  } | null
}

async function fetchAlerts() {
  const res = await fetch('/api/alerts')
  if (!res.ok) {
    throw new Error('Failed to fetch alerts')
  }
  const data = await res.json()
  return data.alerts as Alert[]
}

async function acknowledgeAlert(alertId: string) {
  const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error('Failed to acknowledge alert')
  }
  return res.json()
}

export default function AlertsPage() {
  const queryClient = useQueryClient()

  const {
    data: alerts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
    refetchInterval: 10000,
  })

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toaster.create({
        title: 'Alert acknowledged',
        type: 'success',
      })
    },
    onError: (error: Error) => {
      toaster.create({
        title: 'Failed to acknowledge alert',
        description: error.message,
        type: 'error',
      })
    },
  })

  if (isLoading) {
    return (
      <Box p="8" textAlign="center">
        <Spinner size="xl" colorPalette="brand" />
        <Text mt="4" color="fg.muted">
          Loading alerts...
        </Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box p="8">
        <Text color="red.500">Failed to load alerts</Text>
      </Box>
    )
  }

  // Группируем алерты по статусу (БД хранит UPPERCASE enum значения)
  const activeAlerts = alerts?.filter((a) => a.status === 'ACTIVE') || []
  const acknowledgedAlerts = alerts?.filter((a) => a.status === 'ACKNOWLEDGED') || []
  const resolvedAlerts = alerts?.filter((a) => a.status === 'RESOLVED') || []

  // Функция для получения цвета severity (БД хранит UPPERCASE enum значения)
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'red'
      case 'ERROR':
        return 'orange'
      case 'WARNING':
        return 'yellow'
      case 'INFO':
        return 'blue'
      default:
        return 'gray'
    }
  }

  // Компонент карточки алерта
  const AlertCard = ({ alert }: { alert: Alert }) => (
    <Card.Root key={alert.id}>
      <Card.Body>
        <VStack align="start" gap="3">
          <HStack justify="space-between" w="full" flexWrap="wrap" gap="2">
            <VStack align="start" gap="1">
              <HStack flexWrap="wrap" gap="1">
                <Badge colorPalette={getSeverityColor(alert.severity)} size="sm">
                  {alert.severity.toUpperCase()}
                </Badge>
                <Badge colorPalette="gray" size="sm">
                  {alert.type.replace('_', ' ')}
                </Badge>
                {alert.server && (
                  <Badge colorPalette="blue" size="sm" variant="subtle">
                    {alert.server.displayName}
                  </Badge>
                )}
              </HStack>
              <Text fontWeight="bold">{alert.title}</Text>
            </VStack>
            {alert.status === 'ACTIVE' && (
              <Button
                size="sm"
                colorPalette="brand"
                onClick={() => acknowledgeMutation.mutate(alert.id)}
                loading={acknowledgeMutation.isPending}
              >
                Acknowledge
              </Button>
            )}
          </HStack>

          <Text fontSize="sm">{alert.message}</Text>

          {alert.metadata && Object.keys(alert.metadata).length > 0 && (
            <Box>
              <Text fontSize="xs" fontWeight="medium" mb="1">
                Details:
              </Text>
              <VStack align="start" gap="0" fontSize="xs" color="fg.muted">
                {Object.entries(alert.metadata).map(([key, value]) => (
                  <Text key={key}>
                    • {key}: {String(value)}
                  </Text>
                ))}
              </VStack>
            </Box>
          )}

          <HStack fontSize="xs" color="fg.muted" flexWrap="wrap" gap="1">
            <Text>Created: {formatDateTime(alert.createdAt)}</Text>
            {alert.acknowledgedAt && <Text>• Acknowledged: {formatDateTime(alert.acknowledgedAt)}</Text>}
            {alert.resolvedAt && <Text>• Resolved: {formatDateTime(alert.resolvedAt)}</Text>}
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )

  return (
    <>
      <Header />
      <Box p={{ base: '4', md: '8' }}>
        <HStack justify="space-between" mb="6" flexWrap="wrap" gap="2">
          <Heading>Alerts</Heading>
          <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['alerts'] })}>
            Refresh
          </Button>
        </HStack>

        {/* Statistics */}
        <HStack gap={{ base: '3', md: '6' }} mb="6" flexWrap="wrap">
          <Card.Root flex="1" minW="100px">
            <Card.Body py={{ base: '3', md: '4' }} px={{ base: '3', md: '4' }}>
              <VStack align="start" gap="1">
                <Text color="fg.muted" fontSize="sm">
                  Active
                </Text>
                <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="red.500">
                  {activeAlerts.length}
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>

          <Card.Root flex="1" minW="100px">
            <Card.Body py={{ base: '3', md: '4' }} px={{ base: '3', md: '4' }}>
              <VStack align="start" gap="1">
                <Text color="fg.muted" fontSize="sm">
                  Acknowledged
                </Text>
                <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="yellow.500">
                  {acknowledgedAlerts.length}
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>

          <Card.Root flex="1" minW="100px">
            <Card.Body py={{ base: '3', md: '4' }} px={{ base: '3', md: '4' }}>
              <VStack align="start" gap="1">
                <Text color="fg.muted" fontSize="sm">
                  Resolved
                </Text>
                <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="green.500">
                  {resolvedAlerts.length}
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        </HStack>

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <Box mb="8">
            <Heading size="md" mb="4" color="red.500">
              Active Alerts
            </Heading>
            <VStack gap="4" align="stretch">
              {activeAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
            </VStack>
          </Box>
        )}

        {/* Acknowledged Alerts */}
        {acknowledgedAlerts.length > 0 && (
          <Box mb="8">
            <Heading size="md" mb="4" color="yellow.500">
              Acknowledged Alerts
            </Heading>
            <VStack gap="4" align="stretch">
              {acknowledgedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
            </VStack>
          </Box>
        )}

        {/* Resolved Alerts */}
        {resolvedAlerts.length > 0 && (
          <Box mb="8">
            <Heading size="md" mb="4" color="green.500">
              Resolved Alerts
            </Heading>
            <VStack gap="4" align="stretch">
              {resolvedAlerts.slice(0, 10).map((alert) => <AlertCard key={alert.id} alert={alert} />)}
            </VStack>
          </Box>
        )}

        {alerts?.length === 0 && (
          <Card.Root>
            <Card.Body>
              <Text color="fg.muted" textAlign="center">
                No alerts found
              </Text>
            </Card.Body>
          </Card.Root>
        )}
      </Box>
    </>
  )
}
