'use client'

/**
 * Панель критичных алертов для dashboard
 *
 * Показывает важные уведомления: долги, отмены, неявки, ожидающие действия
 *
 * @module alerts-panel
 */

import { Alert, Badge, Box, Button, CloseButton, Collapsible, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useState } from 'react'
import { LuChevronDown, LuChevronUp, LuCircleAlert, LuInfo, LuTriangleAlert } from 'react-icons/lu'

import type { AlertType, DashboardAlert } from '../_actions/alerts.action'

interface AlertsPanelProps {
  /** Список алертов */
  alerts: DashboardAlert[]
  /** Заголовок панели */
  title?: string
}

/**
 * Иконка по типу алерта
 */
function getAlertIcon(type: AlertType) {
  switch (type) {
    case 'error':
      return LuCircleAlert
    case 'warning':
      return LuTriangleAlert
    case 'info':
      return LuInfo
    default:
      return LuInfo
  }
}

/**
 * Цветовая палитра по типу алерта
 */
function getAlertColorPalette(type: AlertType): 'red' | 'orange' | 'blue' {
  switch (type) {
    case 'error':
      return 'red'
    case 'warning':
      return 'orange'
    case 'info':
      return 'blue'
    default:
      return 'blue'
  }
}

/**
 * Отдельный алерт
 */
function AlertItem({ alert, onDismiss }: { alert: DashboardAlert; onDismiss: (id: string) => void }) {
  const colorPalette = getAlertColorPalette(alert.type)
  const IconComponent = getAlertIcon(alert.type)

  return (
    <Alert.Root status={alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}>
      <Alert.Indicator>
        <Icon as={IconComponent} />
      </Alert.Indicator>
      <Box flex="1">
        <HStack justify="space-between" align="flex-start">
          <VStack align="start" gap={0}>
            <HStack>
              <Alert.Title>{alert.title}</Alert.Title>
              <Badge colorPalette={colorPalette} size="sm">
                {alert.count}
              </Badge>
            </HStack>
            <Alert.Description>{alert.description}</Alert.Description>
          </VStack>
          <HStack>
            {alert.href && (
              <Button asChild size="xs" variant="ghost" colorPalette={colorPalette}>
                <Link href={alert.href}>Перейти</Link>
              </Button>
            )}
            <CloseButton size="sm" onClick={() => onDismiss(alert.id)} />
          </HStack>
        </HStack>
      </Box>
    </Alert.Root>
  )
}

/**
 * Панель алертов с возможностью сворачивания
 */
export function AlertsPanel({ alerts: initialAlerts, title = 'Требуют внимания' }: AlertsPanelProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [isOpen, setIsOpen] = useState(true)

  // Фильтруем скрытые алерты
  const visibleAlerts = initialAlerts.filter((a) => !dismissedIds.has(a.id))

  // Если нет алертов — ничего не показываем
  if (visibleAlerts.length === 0) {
    return null
  }

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]))
  }

  // Считаем общее количество проблем
  const totalCount = visibleAlerts.reduce((sum, a) => sum + a.count, 0)

  // Сортируем по приоритету: error -> warning -> info
  const sortedAlerts = [...visibleAlerts].sort((a, b) => {
    const priority = { error: 0, warning: 1, info: 2 }
    return priority[a.type] - priority[b.type]
  })

  // Определяем цвет панели по самому критичному алерту
  const mostCriticalType = sortedAlerts[0]?.type || 'info'
  const panelColorPalette = getAlertColorPalette(mostCriticalType)

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      borderColor={`${panelColorPalette}.200`}
      bg={`${panelColorPalette}.50`}
      _dark={{
        borderColor: `${panelColorPalette}.800`,
        bg: `${panelColorPalette}.900/20`,
      }}
      overflow="hidden"
    >
      {/* Заголовок панели */}
      <HStack
        px={4}
        py={3}
        justify="space-between"
        cursor="pointer"
        onClick={() => setIsOpen(!isOpen)}
        _hover={{ bg: `${panelColorPalette}.100`, _dark: { bg: `${panelColorPalette}.900/30` } }}
        transition="background 0.2s"
      >
        <HStack>
          <Icon as={getAlertIcon(mostCriticalType)} color={`${panelColorPalette}.500`} />
          <Text fontWeight="semibold">{title}</Text>
          <Badge colorPalette={panelColorPalette}>{totalCount}</Badge>
        </HStack>
        <Icon as={isOpen ? LuChevronUp : LuChevronDown} />
      </HStack>

      {/* Содержимое */}
      <Collapsible.Root open={isOpen}>
        <Collapsible.Content>
          <VStack gap={2} p={4} pt={0} align="stretch">
            {sortedAlerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} onDismiss={handleDismiss} />
            ))}
          </VStack>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  )
}
