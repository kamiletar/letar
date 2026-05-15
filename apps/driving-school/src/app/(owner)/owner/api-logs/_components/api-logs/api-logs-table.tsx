'use client'

import { Badge, Box, Code, Table, Text, VStack } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

import { getMethodColor, getStatusColor } from './constants'
import type { ApiLogWithRelations } from './types'

interface ApiLogsTableProps {
  logs: ApiLogWithRelations[]
}

/**
 * Таблица API-логов
 */
export function ApiLogsTable({ logs }: ApiLogsTableProps) {
  return (
    <Box overflowX="auto">
      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader minW="100px">Время</Table.ColumnHeader>
            <Table.ColumnHeader minW="80px">Метод</Table.ColumnHeader>
            <Table.ColumnHeader minW="250px">Endpoint</Table.ColumnHeader>
            <Table.ColumnHeader minW="80px">Статус</Table.ColumnHeader>
            <Table.ColumnHeader minW="100px">Время (мс)</Table.ColumnHeader>
            <Table.ColumnHeader minW="150px">Организация / API ключ</Table.ColumnHeader>
            <Table.ColumnHeader minW="120px">IP адрес</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {logs.map((log) => (
            <Table.Row key={log.id}>
              {/* Время */}
              <Table.Cell>
                <Text fontSize="xs" color="fg.muted">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ru })}
                </Text>
              </Table.Cell>

              {/* Метод */}
              <Table.Cell>
                <Badge colorPalette={getMethodColor(log.method)} size="sm">
                  {log.method}
                </Badge>
              </Table.Cell>

              {/* Endpoint */}
              <Table.Cell>
                <Code fontSize="xs" maxW="250px" truncate>
                  {log.endpoint}
                </Code>
              </Table.Cell>

              {/* Статус */}
              <Table.Cell>
                <Badge colorPalette={getStatusColor(log.statusCode)} size="sm">
                  {log.statusCode}
                </Badge>
              </Table.Cell>

              {/* Время ответа */}
              <Table.Cell>
                <Text fontSize="sm">{log.responseTimeMs} мс</Text>
              </Table.Cell>

              {/* Организация / API ключ */}
              <Table.Cell>
                {log.organization ? (
                  <VStack align="start" gap={0}>
                    <Text fontSize="sm" fontWeight="medium">
                      {log.organization.name}
                    </Text>
                    {log.apiKey && (
                      <Text fontSize="xs" color="fg.muted">
                        {log.apiKey.name} ({log.apiKey.keyPrefix})
                      </Text>
                    )}
                  </VStack>
                ) : (
                  <Text fontSize="sm" color="fg.muted" fontStyle="italic">
                    Без ключа
                  </Text>
                )}
              </Table.Cell>

              {/* IP адрес */}
              <Table.Cell>
                <Code fontSize="xs">{log.ipAddress || 'N/A'}</Code>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
