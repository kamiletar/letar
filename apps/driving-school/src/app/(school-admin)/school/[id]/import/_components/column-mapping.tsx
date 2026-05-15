'use client'

import { NativeSelectField, NativeSelectRoot } from '@/app/_components/ui/native-select'
import type { ColumnMapping, SystemField } from '@/lib/excel'
import { Box, HStack, Icon, Table, Text, VStack } from '@chakra-ui/react'
import { LuArrowRight, LuCheck, LuX } from 'react-icons/lu'

interface ColumnMappingProps {
  headers: string[]
  systemFields: SystemField[]
  mapping: ColumnMapping[]
  onMappingChange: (newMapping: ColumnMapping[]) => void
}

export function ColumnMappingEditor({ headers, systemFields, mapping, onMappingChange }: ColumnMappingProps) {
  const handleChange = (systemFieldKey: string, fileColumn: string) => {
    const newMapping = [...mapping]
    const existingIndex = newMapping.findIndex((m) => m.systemField === systemFieldKey)

    if (fileColumn === '') {
      // Удаляем маппинг
      if (existingIndex !== -1) {
        newMapping.splice(existingIndex, 1)
      }
    } else {
      // Добавляем или обновляем маппинг
      if (existingIndex !== -1) {
        newMapping[existingIndex] = { systemField: systemFieldKey, fileColumn }
      } else {
        newMapping.push({ systemField: systemFieldKey, fileColumn })
      }
    }

    onMappingChange(newMapping)
  }

  const getMappedColumn = (systemFieldKey: string): string => {
    const found = mapping.find((m) => m.systemField === systemFieldKey)
    return found?.fileColumn || ''
  }

  const isMapped = (systemFieldKey: string): boolean => {
    return mapping.some((m) => m.systemField === systemFieldKey)
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader w="200px">Поле системы</Table.ColumnHeader>
            <Table.ColumnHeader w="50px" />
            <Table.ColumnHeader>Колонка файла</Table.ColumnHeader>
            <Table.ColumnHeader w="60px" textAlign="center">
              Статус
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {systemFields.map((field) => (
            <Table.Row key={field.key}>
              <Table.Cell>
                <VStack align="start" gap={0}>
                  <HStack gap={1}>
                    <Text fontWeight="medium">{field.label}</Text>
                    {field.required && (
                      <Text color="error.solid" fontSize="sm">
                        *
                      </Text>
                    )}
                  </HStack>
                  <Text fontSize="xs" color="fg.muted">
                    {field.type === 'email' && 'Email адрес'}
                    {field.type === 'phone' && 'Номер телефона'}
                    {field.type === 'category' && 'Категория прав'}
                    {field.type === 'categories' && 'Несколько категорий через запятую'}
                    {field.type === 'string' && 'Текст'}
                  </Text>
                </VStack>
              </Table.Cell>
              <Table.Cell>
                <Icon color="fg.muted">
                  <LuArrowRight />
                </Icon>
              </Table.Cell>
              <Table.Cell>
                <NativeSelectRoot size="sm">
                  <NativeSelectField
                    value={getMappedColumn(field.key)}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  >
                    <option value="">— Не выбрано —</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </NativeSelectField>
                </NativeSelectRoot>
              </Table.Cell>
              <Table.Cell textAlign="center">
                {isMapped(field.key) ? (
                  <Icon color="success.solid">
                    <LuCheck />
                  </Icon>
                ) : field.required ? (
                  <Icon color="error.solid">
                    <LuX />
                  </Icon>
                ) : (
                  <Text color="fg.muted">—</Text>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
