'use client'

import { Badge, Box, Button, Flex, HStack, IconButton, Popover, Portal, Spinner, Text, VStack } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useOptimistic, useTransition } from 'react'
import { LuBell, LuCheck } from 'react-icons/lu'

interface Alert {
  id: string
  type: string
  severity: string
  status: string
  title: string
  message: string
  createdAt: string
}

interface AlertsResponse {
  success: boolean
  count: number
  alerts: Alert[]
}

async function fetchActiveAlerts(): Promise<AlertsResponse> {
  const res = await fetch('/api/alerts?active=true')
  if (!res.ok) {
    return { success: false, count: 0, alerts: [] }
  }
  return res.json()
}

async function acknowledgeAlert(alertId: string): Promise<void> {
  const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error('Failed to acknowledge alert')
  }
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'red'
    case 'error':
      return 'orange'
    case 'warning':
      return 'yellow'
    case 'info':
      return 'blue'
    default:
      return 'gray'
  }
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {
    return 'только что'
  }
  if (diffMins < 60) {
    return `${diffMins} мин назад`
  }
  if (diffHours < 24) {
    return `${diffHours} ч назад`
  }
  return `${diffDays} д назад`
}

export const NotificationsPopover = () => {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  const { data, isLoading } = useQuery({
    queryKey: ['active-alerts'],
    queryFn: fetchActiveAlerts,
    refetchInterval: 10000,
  })

  // Оптимистичное состояние — мгновенное удаление алерта из списка
  const [optimisticAlerts, addOptimisticAction] = useOptimistic(
    data?.alerts || [],
    (currentAlerts: Alert[], alertIdToRemove: string) => currentAlerts.filter((alert) => alert.id !== alertIdToRemove)
  )

  // Обработчик acknowledge с оптимистичным обновлением
  const handleAcknowledge = (alertId: string) => {
    startTransition(async () => {
      // Мгновенно убираем алерт из UI
      addOptimisticAction(alertId)

      try {
        await acknowledgeAlert(alertId)
        // Инвалидируем кэш для синхронизации с сервером
        queryClient.invalidateQueries({ queryKey: ['active-alerts'] })
        queryClient.invalidateQueries({ queryKey: ['alerts-count'] })
        queryClient.invalidateQueries({ queryKey: ['alerts'] })
      } catch {
        // При ошибке React автоматически откатит оптимистичное состояние
        // через revalidation от TanStack Query
        queryClient.invalidateQueries({ queryKey: ['active-alerts'] })
      }
    })
  }

  // Используем оптимистичные алерты для отображения
  const activeCount = optimisticAlerts.length
  const alerts = optimisticAlerts

  return (
    <Popover.Root positioning={{ placement: 'bottom-end' }}>
      <Popover.Trigger asChild>
        <IconButton aria-label="Notifications" variant="ghost" position="relative" _hover={{ color: 'fg' }}>
          <LuBell size={20} />
          {activeCount > 0 && (
            <Badge
              colorPalette="red"
              size="xs"
              variant="solid"
              borderRadius="full"
              position="absolute"
              top="0"
              right="0"
              minW="4"
              h="4"
              fontSize="xs"
            >
              {activeCount > 9 ? '9+' : activeCount}
            </Badge>
          )}
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content w="350px" maxH="400px">
            <Popover.Header borderBottomWidth="1px" borderColor="border.muted" py="3">
              <Flex justify="space-between" align="center">
                <Text fontWeight="medium">Уведомления</Text>
                {activeCount > 0 && (
                  <Badge colorPalette="red" size="sm">
                    {activeCount} активных
                  </Badge>
                )}
              </Flex>
            </Popover.Header>
            <Popover.Body p="0" overflowY="auto" maxH="280px">
              {isLoading ? (
                <Flex justify="center" py="6">
                  <Spinner size="sm" />
                </Flex>
              ) : alerts.length === 0 ? (
                <Box py="6" textAlign="center">
                  <Text color="fg.muted" fontSize="sm">
                    Нет активных уведомлений
                  </Text>
                </Box>
              ) : (
                <VStack gap="0" align="stretch">
                  {alerts.slice(0, 5).map((alert) => (
                    <Box
                      key={alert.id}
                      px="4"
                      py="3"
                      borderBottomWidth="1px"
                      borderColor="border.muted"
                      _hover={{ bg: 'bg.emphasized' }}
                    >
                      <Flex justify="space-between" align="start" gap="2">
                        <VStack align="start" gap="1" flex="1">
                          <HStack gap="2">
                            <Badge colorPalette={getSeverityColor(alert.severity)} size="xs">
                              {alert.severity}
                            </Badge>
                            <Text fontSize="xs" color="fg.muted">
                              {formatTimeAgo(alert.createdAt)}
                            </Text>
                          </HStack>
                          <Text fontSize="sm" fontWeight="medium">
                            {alert.title}
                          </Text>
                          <Text fontSize="xs" color="fg.muted" lineClamp={2}>
                            {alert.message}
                          </Text>
                        </VStack>
                        <IconButton
                          aria-label="Acknowledge"
                          size="xs"
                          variant="ghost"
                          colorPalette="green"
                          onClick={() => handleAcknowledge(alert.id)}
                          loading={isPending}
                        >
                          <LuCheck size={14} />
                        </IconButton>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              )}
            </Popover.Body>
            <Popover.Footer borderTopWidth="1px" borderColor="border.muted" py="2">
              <Link href="/alerts">
                <Button size="sm" variant="ghost" w="full" color="fg">
                  Все уведомления
                </Button>
              </Link>
            </Popover.Footer>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
