'use client'

import { Badge, Box, Button, Card, Code, HStack, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import type { AuditAction } from '@letar/driving-school-db/prisma'
import { formatDate, formatTime } from '@letar/format-utils'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'

import { type AuditLogWithUser, getAuditLogsAction, type GetAuditLogsFilters } from '../_actions/audit.action'

interface AuditLogsInfiniteProps {
  filters: GetAuditLogsFilters
}

/**
 * Компонент отображения логов аудита с пагинацией
 *
 * ZenStack v3.2.1 баг: useInfiniteFindManyAuditLog с include генерирует невалидный SQL
 * Используем server action с raw prisma вместо ZenStack хука
 */
export function AuditLogsInfinite({ filters }: AuditLogsInfiniteProps) {
  const [page, setPage] = useState(1)

  // Запрос логов через Server Action
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['auditLogs', filters, page],
    queryFn: () => getAuditLogsAction(filters, page),
    // Автоматически рефетчить при возвращении на вкладку
    refetchOnWindowFocus: true,
  })

  // Состояние загрузки
  if (isLoading) {
    return (
      <Card.Root>
        <Card.Body>
          <VStack gap={4} py={8}>
            <Spinner size="lg" />
            <Text color="fg.muted">Загрузка логов...</Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  // Ошибка
  if (error || !data?.success) {
    return (
      <Card.Root>
        <Card.Body>
          <Text color="fg.error">Ошибка загрузки логов аудита</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  const { logs, totalPages, currentPage, totalCount } = data

  return (
    <VStack gap={4} align="stretch">
      {/* Статистика */}
      <HStack justify="space-between" fontSize="sm" color="fg.muted">
        <Text>
          Всего записей: <strong>{totalCount}</strong>
        </Text>
        <Text>
          Страница {currentPage} из {totalPages || 1}
        </Text>
      </HStack>

      {/* Таблица логов */}
      <Card.Root>
        <Card.Body p={0}>
          <Box overflowX="auto">
            <Table.Root size="sm" variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader minW="180px">Дата/время</Table.ColumnHeader>
                  <Table.ColumnHeader minW="200px">Пользователь</Table.ColumnHeader>
                  <Table.ColumnHeader minW="200px">Действие</Table.ColumnHeader>
                  <Table.ColumnHeader minW="300px">Детали</Table.ColumnHeader>
                  <Table.ColumnHeader minW="150px">IP адрес</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {logs.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} textAlign="center" color="fg.muted" py={8}>
                      Записи не найдены
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  logs.map((log) => <AuditLogRow key={log.id} log={log} />)
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        </Card.Body>
      </Card.Root>

      {/* Пагинация */}
      {totalPages > 1 && (
        <HStack justify="center" gap={2}>
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || isFetching}
            variant="outline"
            size="sm"
          >
            <LuChevronLeft />
            Назад
          </Button>
          <Text fontSize="sm" color="fg.muted" px={4}>
            {isFetching ? <Spinner size="sm" /> : `${currentPage} / ${totalPages}`}
          </Text>
          <Button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || isFetching}
            variant="outline"
            size="sm"
          >
            Вперёд
            <LuChevronRight />
          </Button>
        </HStack>
      )}
    </VStack>
  )
}

// ============================================================================
// КОМПОНЕНТЫ
// ============================================================================

function AuditLogRow({ log }: { log: AuditLogWithUser }) {
  return (
    <Table.Row>
      {/* Дата/время */}
      <Table.Cell>
        <Text fontSize="sm" fontWeight="medium">
          {formatDate(log.createdAt)}
        </Text>
        <Text fontSize="xs" color="fg.muted">
          {formatTime(log.createdAt)}
        </Text>
      </Table.Cell>

      {/* Пользователь */}
      <Table.Cell>
        {log.user ? (
          <VStack align="start" gap={0}>
            <Text fontSize="sm" fontWeight="medium">
              {log.user.name}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {log.user.email}
            </Text>
          </VStack>
        ) : (
          <Text fontSize="sm" color="fg.muted" fontStyle="italic">
            Система
          </Text>
        )}
      </Table.Cell>

      {/* Действие */}
      <Table.Cell>
        <Badge colorPalette={getActionColor(log.action)} size="sm">
          {getActionLabel(log.action)}
        </Badge>
      </Table.Cell>

      {/* Детали */}
      <Table.Cell>
        <VStack align="start" gap={1}>
          <Text fontSize="sm">
            {log.entityType}: <Code fontSize="xs">{log.entityId || 'N/A'}</Code>
          </Text>
          {log.payload !== null && log.payload !== undefined ? (
            <Code fontSize="xs" maxW="300px" truncate>
              {String(JSON.stringify(log.payload))}
            </Code>
          ) : null}
        </VStack>
      </Table.Cell>

      {/* IP адрес */}
      <Table.Cell>
        <Code fontSize="xs">{log.ipAddress || 'N/A'}</Code>
      </Table.Cell>
    </Table.Row>
  )
}

// ============================================================================
// УТИЛИТЫ
// ============================================================================

function getActionLabel(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    USER_REGISTER: 'Регистрация',
    USER_LOGIN: 'Вход',
    LESSON_CREATE: 'Создание занятия',
    LESSON_CONFIRM: 'Подтверждение занятия',
    LESSON_CANCEL: 'Отмена занятия',
    LESSON_RESCHEDULE: 'Перенос занятия',
    LESSON_COMPLETE: 'Завершение занятия',
    PENALTY_CHARGE: 'Начисление штрафа',
    PENALTY_PAY: 'Оплата штрафа',
    PENALTY_CANCEL: 'Отмена штрафа',
    SCHEDULE_UPDATE: 'Обновление расписания',
    STUDENT_TRANSFER: 'Передача ученика',
    ADMIN_ACTION: 'Действие админа',
    OWNER_USER_BLOCK: 'Блокировка пользователя',
    OWNER_USER_UNBLOCK: 'Разблокировка пользователя',
    OWNER_USER_ROLE_CHANGE: 'Изменение роли',
    OWNER_SCHOOL_MODERATE: 'Модерация школы',
    OWNER_REVIEW_HIDE: 'Скрытие отзыва',
    OWNER_TICKET_ASSIGN: 'Назначение тикета',
    OWNER_TICKET_RESOLVE: 'Решение тикета',
  }

  return labels[action] || action
}

function getActionColor(action: AuditAction): string {
  // Действия владельца - красный
  if (action.startsWith('OWNER_')) {
    return 'red'
  }

  // Штрафы - оранжевый
  if (action.startsWith('PENALTY_')) {
    return 'orange'
  }

  // Занятия - синий
  if (action.startsWith('LESSON_')) {
    return 'blue'
  }

  // Пользователи - зелёный
  if (action.startsWith('USER_')) {
    return 'green'
  }

  // Остальное - серый
  return 'gray'
}
