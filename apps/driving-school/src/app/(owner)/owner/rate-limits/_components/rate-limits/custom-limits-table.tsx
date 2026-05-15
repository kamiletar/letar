'use client'

import { Badge, Button, Card, Heading, HStack, Icon, Table } from '@chakra-ui/react'
import { LuRefreshCw, LuSettings, LuTrash2 } from 'react-icons/lu'

import type { RateLimitSettings } from './types'

interface CustomLimitsTableProps {
  settings: RateLimitSettings
  getOrganizationName: (organizationId: string) => string
  onRemoveLimit: (organizationId: string) => void
  onResetCounters: (organizationId: string) => void
  actionLoading: string | null
}

/**
 * Таблица кастомных лимитов.
 */
export function CustomLimitsTable({
  settings,
  getOrganizationName,
  onRemoveLimit,
  onResetCounters,
  actionLoading,
}: CustomLimitsTableProps) {
  if (settings.customLimits.length === 0) {
    return null
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack>
          <Icon as={LuSettings} />
          <Heading size="md">Кастомные лимиты</Heading>
        </HStack>
      </Card.Header>
      <Card.Body p={0}>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Организация</Table.ColumnHeader>
              <Table.ColumnHeader>Лимит</Table.ColumnHeader>
              <Table.ColumnHeader width="100px">Действия</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {settings.customLimits.map((item) => (
              <Table.Row key={item.organizationId}>
                <Table.Cell>{getOrganizationName(item.organizationId)}</Table.Cell>
                <Table.Cell>
                  <Badge colorPalette="blue">{item.limit} / мин</Badge>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1}>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => onRemoveLimit(item.organizationId)}
                      loading={actionLoading === `removeLimit-${item.organizationId}`}
                    >
                      <Icon as={LuTrash2} />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => onResetCounters(item.organizationId)}
                      loading={actionLoading === `resetCounters-${item.organizationId}`}
                    >
                      <Icon as={LuRefreshCw} />
                    </Button>
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card.Body>
    </Card.Root>
  )
}
