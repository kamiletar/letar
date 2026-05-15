'use client'

/**
 * Connected Calendars List
 *
 * Список подключённых внешних календарей с возможностью
 * управления и запуска синхронизации.
 */

import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Menu,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { LuCalendar, LuEllipsisVertical, LuRefreshCw, LuTrash2 } from 'react-icons/lu'
import { SiGoogle } from 'react-icons/si'

import { toaster } from '@/app/_components/ui/toaster'
import type {
  CalendarConnection,
  CalendarProvider,
  CalendarSyncDirection,
  CalendarSyncStatus,
} from '@letar/driving-school-db/prisma'
import { deleteCalendarConnectionAction, triggerCalendarSyncAction } from '../_actions/calendar.action'

// === Типы ===

type ConnectionData = Pick<
  CalendarConnection,
  'id' | 'provider' | 'calendarName' | 'syncDirection' | 'syncStatus' | 'lastSyncAt' | 'lastSyncError' | 'createdAt'
>

interface ConnectedCalendarsListProps {
  connections: ConnectionData[]
  onAddClick: () => void
}

// === Helpers ===

function getProviderIcon(provider: CalendarProvider) {
  switch (provider) {
    case 'GOOGLE':
      return SiGoogle
    default:
      return LuCalendar
  }
}

function getProviderName(provider: CalendarProvider): string {
  switch (provider) {
    case 'GOOGLE':
      return 'Google Calendar'
    case 'YANDEX':
      return 'Яндекс Календарь'
    case 'APPLE':
      return 'Apple Calendar'
    case 'OUTLOOK':
      return 'Outlook'
    default:
      return provider
  }
}

function getSyncDirectionLabel(direction: CalendarSyncDirection): string {
  switch (direction) {
    case 'EXPORT_ONLY':
      return 'Только экспорт'
    case 'IMPORT_ONLY':
      return 'Только импорт'
    case 'BIDIRECTIONAL':
      return 'Двусторонняя'
    default:
      return direction
  }
}

function getSyncStatusBadge(status: CalendarSyncStatus) {
  switch (status) {
    case 'SUCCESS':
      return <Badge colorPalette="green">Синхронизировано</Badge>
    case 'SYNCING':
      return <Badge colorPalette="blue">Синхронизация...</Badge>
    case 'PENDING':
      return <Badge colorPalette="gray">Ожидает</Badge>
    case 'ERROR':
      return <Badge colorPalette="red">Ошибка</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

// === Connection Card ===

interface ConnectionCardProps {
  connection: ConnectionData
  onDelete: () => void
  onSync: () => void
  isDeleting: boolean
  isSyncing: boolean
}

function ConnectionCard({ connection, onDelete, onSync, isDeleting, isSyncing }: ConnectionCardProps) {
  const ProviderIcon = getProviderIcon(connection.provider)

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4}>
      <Flex justify="space-between" align="flex-start">
        <HStack gap={3}>
          <Icon as={ProviderIcon} boxSize={6} color="fg.muted" />
          <Box>
            <Text fontWeight="medium">{connection.calendarName}</Text>
            <Text fontSize="sm" color="fg.muted">
              {getProviderName(connection.provider)} · {getSyncDirectionLabel(connection.syncDirection)}
            </Text>
          </Box>
        </HStack>

        <HStack gap={2}>
          {getSyncStatusBadge(connection.syncStatus)}

          <Menu.Root>
            <Menu.Trigger asChild>
              <IconButton variant="ghost" size="sm" aria-label="Меню">
                <LuEllipsisVertical />
              </IconButton>
            </Menu.Trigger>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item value="sync" onClick={onSync} disabled={isSyncing}>
                  <LuRefreshCw />
                  <Text>Синхронизировать</Text>
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item value="delete" onClick={onDelete} disabled={isDeleting} color="red.500">
                  <LuTrash2 />
                  <Text>Удалить</Text>
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Menu.Root>
        </HStack>
      </Flex>

      {/* Дополнительная информация */}
      <HStack mt={3} gap={4} fontSize="xs" color="fg.muted">
        {connection.lastSyncAt && (
          <Text>Последняя синхронизация: {new Date(connection.lastSyncAt).toLocaleString('ru-RU')}</Text>
        )}
        {connection.lastSyncError && <Text color="red.500">Ошибка: {connection.lastSyncError}</Text>}
      </HStack>
    </Box>
  )
}

// === Main Component ===

export function ConnectedCalendarsList({ connections, onAddClick }: ConnectedCalendarsListProps) {
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'delete' | 'sync' | null>(null)

  const handleDelete = (connectionId: string) => {
    setActionId(connectionId)
    setActionType('delete')

    startTransition(async () => {
      const result = await deleteCalendarConnectionAction(connectionId)

      if (result.error) {
        toaster.error({ title: 'Ошибка', description: result.error })
      } else {
        toaster.success({ title: 'Календарь отключён' })
      }

      setActionId(null)
      setActionType(null)
    })
  }

  const handleSync = (connectionId: string) => {
    setActionId(connectionId)
    setActionType('sync')

    startTransition(async () => {
      const result = await triggerCalendarSyncAction(connectionId)

      if (result.error) {
        toaster.error({ title: 'Ошибка синхронизации', description: result.error })
      } else {
        toaster.success({ title: 'Синхронизация завершена' })
      }

      setActionId(null)
      setActionType(null)
    })
  }

  return (
    <Card.Root>
      <Card.Header>
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="md">Подключённые календари</Heading>
            <Text color="fg.muted" fontSize="sm">
              Автоматическая синхронизация занятий с внешними календарями
            </Text>
          </Box>
          <Button onClick={onAddClick} size="sm" colorPalette="blue">
            Подключить
          </Button>
        </Flex>
      </Card.Header>

      <Card.Body>
        {connections.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Icon as={LuCalendar} boxSize={12} color="fg.subtle" mb={4} />
            <Text color="fg.muted" mb={4}>
              Нет подключённых календарей
            </Text>
            <Button onClick={onAddClick} variant="outline">
              Подключить Google Calendar
            </Button>
          </Box>
        ) : (
          <Stack gap={3}>
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onDelete={() => handleDelete(connection.id)}
                onSync={() => handleSync(connection.id)}
                isDeleting={isPending && actionId === connection.id && actionType === 'delete'}
                isSyncing={isPending && actionId === connection.id && actionType === 'sync'}
              />
            ))}
          </Stack>
        )}

        {isPending && (
          <Flex justify="center" py={4}>
            <Spinner size="sm" />
          </Flex>
        )}
      </Card.Body>
    </Card.Root>
  )
}
