'use client'

import type { ColumnMapping, ImportRow, ParsedRow, SystemField } from '@/lib/excel'
import { Badge, Box, HStack, Icon, Table, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuCircleX } from 'react-icons/lu'

interface DataPreviewProps<T extends ImportRow> {
  rows: ParsedRow<T>[]
  systemFields: SystemField[]
  mapping: ColumnMapping[]
  maxRows?: number
}

export function DataPreview<T extends ImportRow>({ rows, systemFields, mapping, maxRows = 10 }: DataPreviewProps<T>) {
  const displayRows = rows.slice(0, maxRows)
  const validCount = rows.filter((r) => r.isValid).length
  const invalidCount = rows.filter((r) => !r.isValid).length

  // Получаем только смапленные поля для отображения
  const displayFields = systemFields.filter((f) => mapping.some((m) => m.systemField === f.key))

  return (
    <VStack align="stretch" gap={4}>
      <HStack justify="space-between">
        <Text fontWeight="medium">Предпросмотр данных</Text>
        <HStack gap={4}>
          <HStack gap={1}>
            <Icon color="success.solid">
              <LuCheck />
            </Icon>
            <Text fontSize="sm">{validCount} корректных</Text>
          </HStack>
          {invalidCount > 0 && (
            <HStack gap={1}>
              <Icon color="error.solid">
                <LuCircleX />
              </Icon>
              <Text fontSize="sm" color="error.fg">
                {invalidCount} с ошибками
              </Text>
            </HStack>
          )}
        </HStack>
      </HStack>

      <Box borderWidth="1px" borderRadius="lg" overflow="auto" maxH="400px">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader w="60px">#</Table.ColumnHeader>
              <Table.ColumnHeader w="80px">Статус</Table.ColumnHeader>
              {displayFields.map((field) => (
                <Table.ColumnHeader key={field.key}>{field.label}</Table.ColumnHeader>
              ))}
              <Table.ColumnHeader>Ошибки</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {displayRows.map((row) => (
              <Table.Row key={row.rowIndex} bg={row.isValid ? undefined : 'error.subtle'}>
                <Table.Cell>{row.rowIndex}</Table.Cell>
                <Table.Cell>
                  {row.isValid ? <Badge colorPalette="green">OK</Badge> : <Badge colorPalette="red">Ошибка</Badge>}
                </Table.Cell>
                {displayFields.map((field) => {
                  const value = (row.data as unknown as Record<string, unknown>)[field.key]
                  return (
                    <Table.Cell key={field.key}>
                      <Text fontSize="sm" maxW="200px" truncate>
                        {Array.isArray(value) ? value.join(', ') : String(value || '—')}
                      </Text>
                    </Table.Cell>
                  )
                })}
                <Table.Cell>
                  {row.errors.length > 0 ? (
                    <VStack align="start" gap={0}>
                      {row.errors.map((error) => (
                        <Text key={error} fontSize="xs" color="error.fg">
                          {error}
                        </Text>
                      ))}
                    </VStack>
                  ) : (
                    <Text color="fg.muted">—</Text>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      {rows.length > maxRows && (
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Показано {maxRows} из {rows.length} строк
        </Text>
      )}
    </VStack>
  )
}
