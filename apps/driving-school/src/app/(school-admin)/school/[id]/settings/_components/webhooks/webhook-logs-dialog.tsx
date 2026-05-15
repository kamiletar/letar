'use client'

import { Badge, CloseButton, Dialog, Portal, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

import { getEventLabel } from './constants'
import type { WebhookLogItem } from './types'

interface WebhookLogsDialogProps {
  isOpen: boolean
  logs: WebhookLogItem[]
  isLoading: boolean
  onClose: () => void
}

/** Получить цвет для статуса лога */
function getLogStatusColor(status: string): string {
  switch (status) {
    case 'DELIVERED':
      return 'green'
    case 'FAILED':
      return 'yellow'
    case 'EXHAUSTED':
      return 'red'
    default:
      return 'gray'
  }
}

/**
 * Диалог просмотра логов доставки webhook
 */
export function WebhookLogsDialog({ isOpen, logs, isLoading, onClose }: WebhookLogsDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="2xl">
            <Dialog.Header>
              <Dialog.Title>Логи доставки</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              {isLoading ? (
                <VStack py={8}>
                  <Spinner />
                </VStack>
              ) : logs.length === 0 ? (
                <Text color="fg.muted" textAlign="center" py={8}>
                  Нет записей
                </Text>
              ) : (
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Событие</Table.ColumnHeader>
                      <Table.ColumnHeader>Статус</Table.ColumnHeader>
                      <Table.ColumnHeader>HTTP</Table.ColumnHeader>
                      <Table.ColumnHeader>Время</Table.ColumnHeader>
                      <Table.ColumnHeader>Попытка</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {logs.map((log) => (
                      <Table.Row key={log.id}>
                        <Table.Cell>
                          <Text fontSize="sm">{getEventLabel(log.eventType)}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={getLogStatusColor(log.status)} size="sm">
                            {log.status}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          {log.responseStatus ? (
                            <Text fontSize="sm" color={log.responseStatus < 400 ? 'green.500' : 'red.500'}>
                              {log.responseStatus}
                            </Text>
                          ) : (
                            '—'
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm" color="fg.muted">
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ru })}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm">{log.attempt}</Text>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
