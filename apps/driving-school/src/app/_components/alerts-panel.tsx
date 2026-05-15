/**
 * Панель критичных уведомлений для админ-панели
 *
 * Показывает алерты о важных событиях:
 * - Долги учеников > 7 дней
 * - Отмены занятий сегодня
 * - Неявки (no-show)
 * - Истекающие документы
 *
 * @module alerts-panel
 */

'use client'

import { Badge, Box, Button, Collapsible, HStack, Icon, IconButton, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useState } from 'react'
import {
  LuBanknote,
  LuCalendarX,
  LuChevronDown,
  LuChevronUp,
  LuFileWarning,
  LuTriangleAlert,
  LuUserX,
  LuX,
} from 'react-icons/lu'

// === Типы ===

export type AlertType = 'debt' | 'cancellation' | 'noshow' | 'document'
export type AlertSeverity = 'error' | 'warning' | 'info'

export interface AlertItem {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  count?: number
  link?: string
  linkText?: string
  dismissible?: boolean
}

// === Конфигурация ===

const alertIcons: Record<AlertType, React.ElementType> = {
  debt: LuBanknote,
  cancellation: LuCalendarX,
  noshow: LuUserX,
  document: LuFileWarning,
}

const severityColors: Record<AlertSeverity, string> = {
  error: 'red',
  warning: 'orange',
  info: 'blue',
}

// === Компонент отдельного алерта ===

interface AlertItemComponentProps {
  alert: AlertItem
  onDismiss?: (id: string) => void
}

function AlertItemComponent({ alert, onDismiss }: AlertItemComponentProps) {
  const IconComponent = alertIcons[alert.type]
  const color = severityColors[alert.severity]

  return (
    <Box
      p={3}
      bg={`${color}.50`}
      borderRadius="md"
      borderWidth="1px"
      borderColor={`${color}.200`}
      _dark={{
        bg: `${color}.900/20`,
        borderColor: `${color}.700`,
      }}
    >
      <HStack gap={3} align="flex-start">
        {/* Иконка */}
        <Box
          p={2}
          borderRadius="full"
          bg={`${color}.100`}
          color={`${color}.600`}
          _dark={{
            bg: `${color}.900/30`,
            color: `${color}.300`,
          }}
          flexShrink={0}
        >
          <Icon boxSize={4}>
            <IconComponent />
          </Icon>
        </Box>

        {/* Контент */}
        <VStack gap={1} align="stretch" flex={1}>
          <HStack justify="space-between">
            <HStack gap={2}>
              <Text fontWeight="semibold" fontSize="sm" color={`${color}.700`} _dark={{ color: `${color}.300` }}>
                {alert.title}
              </Text>
              {alert.count !== undefined && alert.count > 0 && (
                <Badge colorPalette={color} size="sm">
                  {alert.count}
                </Badge>
              )}
            </HStack>

            {/* Кнопка закрытия */}
            {alert.dismissible && onDismiss && (
              <IconButton
                aria-label="Скрыть"
                variant="ghost"
                size="xs"
                color={`${color}.500`}
                onClick={() => onDismiss(alert.id)}
              >
                <LuX />
              </IconButton>
            )}
          </HStack>

          <Text fontSize="xs" color="fg.muted">
            {alert.description}
          </Text>

          {/* Ссылка на решение проблемы */}
          {alert.link && (
            <Button asChild variant="ghost" size="xs" colorPalette={color} alignSelf="flex-start" mt={1}>
              <Link href={alert.link}>{alert.linkText || 'Подробнее'}</Link>
            </Button>
          )}
        </VStack>
      </HStack>
    </Box>
  )
}

// === Основной компонент панели ===

export interface AlertsPanelProps {
  /** Список алертов */
  alerts: AlertItem[]
  /** Заголовок панели */
  title?: string
  /** Callback при скрытии алерта */
  onDismiss?: (id: string) => void
  /** По умолчанию свёрнута */
  defaultCollapsed?: boolean
  /** Максимум видимых алертов без раскрытия */
  maxVisible?: number
}

export function AlertsPanel({
  alerts,
  title = 'Требуют внимания',
  onDismiss,
  defaultCollapsed = false,
  maxVisible = 3,
}: AlertsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // Фильтруем скрытые алерты
  const visibleAlerts = alerts.filter((alert) => !dismissedIds.has(alert.id))

  // Если нет алертов, не показываем панель
  if (visibleAlerts.length === 0) {
    return null
  }

  // Считаем количество по severity для индикации
  const errorCount = visibleAlerts.filter((a) => a.severity === 'error').length
  const warningCount = visibleAlerts.filter((a) => a.severity === 'warning').length

  // Алерты для отображения
  const displayedAlerts = isCollapsed ? visibleAlerts.slice(0, maxVisible) : visibleAlerts
  const hasMore = visibleAlerts.length > maxVisible

  // Обработчик скрытия алерта
  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]))
    onDismiss?.(id)
  }

  return (
    <Box bg="bg" borderRadius="lg" borderWidth="1px" borderColor="border" overflow="hidden">
      {/* Заголовок */}
      <HStack
        px={4}
        py={3}
        bg="bg.subtle"
        borderBottomWidth="1px"
        borderColor="border"
        justify="space-between"
        cursor={hasMore ? 'pointer' : 'default'}
        onClick={() => hasMore && setIsCollapsed(!isCollapsed)}
        _hover={hasMore ? { bg: 'bg.muted' } : undefined}
      >
        <HStack gap={3}>
          <Icon as={LuTriangleAlert} color="orange.500" boxSize={5} />
          <Text fontWeight="semibold">{title}</Text>
          <HStack gap={1}>
            {errorCount > 0 && (
              <Badge colorPalette="red" size="sm">
                {errorCount} критич.
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge colorPalette="orange" size="sm">
                {warningCount} важных
              </Badge>
            )}
          </HStack>
        </HStack>

        {hasMore && (
          <HStack gap={2}>
            <Text fontSize="sm" color="fg.muted">
              {isCollapsed ? `+${visibleAlerts.length - maxVisible} ещё` : 'Свернуть'}
            </Text>
            <Icon as={isCollapsed ? LuChevronDown : LuChevronUp} />
          </HStack>
        )}
      </HStack>

      {/* Список алертов */}
      <Collapsible.Root open={!isCollapsed || !hasMore}>
        <Collapsible.Content>
          <VStack gap={2} p={4} align="stretch">
            {displayedAlerts.map((alert) => (
              <AlertItemComponent
                key={alert.id}
                alert={alert}
                onDismiss={alert.dismissible ? handleDismiss : undefined}
              />
            ))}
          </VStack>
        </Collapsible.Content>
      </Collapsible.Root>

      {/* Свёрнутое состояние */}
      {isCollapsed && hasMore && (
        <VStack gap={2} p={4} align="stretch">
          {displayedAlerts.map((alert) => (
            <AlertItemComponent
              key={alert.id}
              alert={alert}
              onDismiss={alert.dismissible ? handleDismiss : undefined}
            />
          ))}
        </VStack>
      )}
    </Box>
  )
}

// === Хелпер для создания алертов ===

export function createDebtAlert(count: number, totalAmount: number): AlertItem {
  return {
    id: 'debt-overdue',
    type: 'debt',
    severity: 'error',
    title: 'Просроченные долги',
    description: `${count} учеников с долгом более 7 дней на сумму ${totalAmount.toLocaleString('ru-RU')} ₽`,
    count,
    link: '/owner/finances?filter=overdue',
    linkText: 'Перейти к должникам',
    dismissible: false,
  }
}

export function createCancellationAlert(count: number): AlertItem {
  return {
    id: 'cancellations-today',
    type: 'cancellation',
    severity: 'warning',
    title: 'Отмены сегодня',
    description: `${count} занятий отменено сегодня`,
    count,
    link: '/owner/lessons?status=cancelled',
    linkText: 'Посмотреть отмены',
    dismissible: true,
  }
}

export function createNoShowAlert(count: number): AlertItem {
  return {
    id: 'noshows-week',
    type: 'noshow',
    severity: 'warning',
    title: 'Неявки за неделю',
    description: `${count} неявок на занятия за последние 7 дней`,
    count,
    link: '/owner/lessons?status=noshow',
    linkText: 'Посмотреть неявки',
    dismissible: true,
  }
}

export function createDocumentAlert(count: number, daysUntil: number): AlertItem {
  return {
    id: 'documents-expiring',
    type: 'document',
    severity: daysUntil <= 7 ? 'error' : 'warning',
    title: 'Истекающие документы',
    description: `${count} документов истекают в течение ${daysUntil} дней`,
    count,
    link: '/owner/documents?filter=expiring',
    linkText: 'Проверить документы',
    dismissible: false,
  }
}
