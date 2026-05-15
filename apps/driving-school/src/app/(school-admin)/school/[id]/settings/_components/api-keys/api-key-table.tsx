'use client'

import { Badge, Code, HStack, IconButton, Table } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { LuCircleAlert, LuTrash2 } from 'react-icons/lu'

import type { ApiKeyItem } from './types'

interface ApiKeyTableProps {
  apiKeys: ApiKeyItem[]
  onRevoke: (keyId: string) => void
  onDelete: (keyId: string) => void
}

/**
 * Таблица API-ключей
 */
export function ApiKeyTable({ apiKeys, onRevoke, onDelete }: ApiKeyTableProps) {
  return (
    <Table.Root variant="outline" size="sm">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Название</Table.ColumnHeader>
          <Table.ColumnHeader>Ключ</Table.ColumnHeader>
          <Table.ColumnHeader>Статус</Table.ColumnHeader>
          <Table.ColumnHeader>Использований</Table.ColumnHeader>
          <Table.ColumnHeader>Последнее использование</Table.ColumnHeader>
          <Table.ColumnHeader>Создан</Table.ColumnHeader>
          <Table.ColumnHeader></Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {apiKeys.map((key) => (
          <Table.Row key={key.id}>
            <Table.Cell fontWeight="medium">{key.name}</Table.Cell>
            <Table.Cell>
              <Code size="sm">{key.keyPrefix}</Code>
            </Table.Cell>
            <Table.Cell>
              <Badge colorPalette={key.status === 'ACTIVE' ? 'green' : 'red'} size="sm">
                {key.status === 'ACTIVE' ? 'Активен' : 'Отозван'}
              </Badge>
            </Table.Cell>
            <Table.Cell>{key.usageCount}</Table.Cell>
            <Table.Cell>
              {key.lastUsedAt ? formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true, locale: ru }) : '—'}
            </Table.Cell>
            <Table.Cell>{formatDistanceToNow(new Date(key.createdAt), { addSuffix: true, locale: ru })}</Table.Cell>
            <Table.Cell>
              <HStack gap={1}>
                {key.status === 'ACTIVE' && (
                  <IconButton
                    aria-label="Отозвать ключ"
                    variant="ghost"
                    size="xs"
                    colorPalette="red"
                    onClick={() => onRevoke(key.id)}
                  >
                    <LuCircleAlert />
                  </IconButton>
                )}
                {key.status === 'REVOKED' && (
                  <IconButton
                    aria-label="Удалить ключ"
                    variant="ghost"
                    size="xs"
                    colorPalette="red"
                    onClick={() => onDelete(key.id)}
                  >
                    <LuTrash2 />
                  </IconButton>
                )}
              </HStack>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}
