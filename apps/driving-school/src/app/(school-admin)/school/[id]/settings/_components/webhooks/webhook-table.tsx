'use client'

import { StatusBadge, WEBHOOK_STATUS_CONFIG } from '@/app/_components/status-badge'
import { HStack, IconButton, Table, Text, VStack } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { LuActivity, LuEye, LuPause, LuPlay, LuTestTube, LuTrash2 } from 'react-icons/lu'

import type { WebhookListItem } from './types'

interface WebhookTableProps {
  webhooks: WebhookListItem[]
  onOpenDetail: (webhookId: string) => void
  onOpenLogs: (webhookId: string) => void
  onTest: (webhookId: string) => void
  onToggleStatus: (webhook: WebhookListItem) => void
  onDelete: (webhookId: string) => void
}

/**
 * Таблица webhooks
 */
export function WebhookTable({
  webhooks,
  onOpenDetail,
  onOpenLogs,
  onTest,
  onToggleStatus,
  onDelete,
}: WebhookTableProps) {
  return (
    <Table.Root size="sm">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Название</Table.ColumnHeader>
          <Table.ColumnHeader>Статус</Table.ColumnHeader>
          <Table.ColumnHeader>Успешно / Ошибок</Table.ColumnHeader>
          <Table.ColumnHeader>Последний вызов</Table.ColumnHeader>
          <Table.ColumnHeader />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {webhooks.map((webhook) => (
          <Table.Row key={webhook.id}>
            <Table.Cell>
              <VStack align="start" gap={0}>
                <Text fontWeight="medium">{webhook.name}</Text>
                <Text fontSize="xs" color="fg.muted" truncate maxW="200px">
                  {webhook.url}
                </Text>
              </VStack>
            </Table.Cell>
            <Table.Cell>
              <StatusBadge status={webhook.status} config={WEBHOOK_STATUS_CONFIG} />
            </Table.Cell>
            <Table.Cell>
              <HStack gap={1}>
                <Text color="green.500">{webhook.successCount}</Text>
                <Text color="fg.muted">/</Text>
                <Text color="red.500">{webhook.failureCount}</Text>
              </HStack>
            </Table.Cell>
            <Table.Cell>
              {webhook.lastTriggeredAt ? (
                <Text fontSize="sm" color="fg.muted">
                  {formatDistanceToNow(new Date(webhook.lastTriggeredAt), { addSuffix: true, locale: ru })}
                </Text>
              ) : (
                <Text fontSize="sm" color="fg.muted">
                  —
                </Text>
              )}
            </Table.Cell>
            <Table.Cell>
              <HStack gap={1}>
                <IconButton aria-label="Детали" variant="ghost" size="sm" onClick={() => onOpenDetail(webhook.id)}>
                  <LuEye />
                </IconButton>
                <IconButton aria-label="Логи" variant="ghost" size="sm" onClick={() => onOpenLogs(webhook.id)}>
                  <LuActivity />
                </IconButton>
                <IconButton aria-label="Тест" variant="ghost" size="sm" onClick={() => onTest(webhook.id)}>
                  <LuTestTube />
                </IconButton>
                <IconButton
                  aria-label={webhook.status === 'ACTIVE' ? 'Приостановить' : 'Активировать'}
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleStatus(webhook)}
                >
                  {webhook.status === 'ACTIVE' ? <LuPause /> : <LuPlay />}
                </IconButton>
                <IconButton
                  aria-label="Удалить"
                  variant="ghost"
                  size="sm"
                  colorPalette="red"
                  onClick={() => onDelete(webhook.id)}
                >
                  <LuTrash2 />
                </IconButton>
              </HStack>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}
