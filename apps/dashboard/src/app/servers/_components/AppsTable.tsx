'use client'

/**
 * Таблица приложений сервера
 */

import { formatLastDeployed } from '@/lib/format'
import { HStack, IconButton, Table, Text, VStack } from '@chakra-ui/react'
import { LuPencil, LuRocket, LuTrash2 } from 'react-icons/lu'
import type { DeployedApp } from '../_types'

interface AppsTableProps {
  apps: DeployedApp[]
  deployingAppId: string | null
  onEdit: (app: DeployedApp) => void
  onDelete: (appId: string) => void
  onDeploy: (appId: string) => void
}

export function AppsTable({ apps, deployingAppId, onEdit, onDelete, onDeploy }: AppsTableProps) {
  if (apps.length === 0) {
    return (
      <Text fontSize="sm" color="fg.muted" textAlign="center" py="4">
        Нет приложений. Нажмите &quot;Сканировать&quot; для автообнаружения.
      </Text>
    )
  }

  return (
    <Table.Root size="sm">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Приложение</Table.ColumnHeader>
          <Table.ColumnHeader>Контейнер</Table.ColumnHeader>
          <Table.ColumnHeader>Порт</Table.ColumnHeader>
          <Table.ColumnHeader>Последний деплой</Table.ColumnHeader>
          <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {apps.map((app) => (
          <Table.Row key={app.id}>
            <Table.Cell>
              <VStack align="start" gap="0">
                <Text fontWeight="medium" fontSize="sm">
                  {app.displayName}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  {app.name}
                </Text>
              </VStack>
            </Table.Cell>
            <Table.Cell>
              <Text fontSize="sm" fontFamily="mono">
                {app.containerName || '—'}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Text fontSize="sm">{app.port || '—'}</Text>
            </Table.Cell>
            <Table.Cell>
              <Text fontSize="sm" color="fg.muted">
                {formatLastDeployed(app.lastDeployed)}
              </Text>
            </Table.Cell>
            <Table.Cell textAlign="right">
              <HStack gap="1" justify="end">
                {app.containerName && (
                  <IconButton
                    aria-label="Деплой"
                    size="xs"
                    variant="ghost"
                    colorPalette="green"
                    onClick={() => onDeploy(app.id)}
                    loading={deployingAppId === app.id}
                  >
                    <LuRocket />
                  </IconButton>
                )}
                <IconButton aria-label="Редактировать" size="xs" variant="ghost" onClick={() => onEdit(app)}>
                  <LuPencil />
                </IconButton>
                <IconButton
                  aria-label="Удалить"
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  onClick={() => onDelete(app.id)}
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
