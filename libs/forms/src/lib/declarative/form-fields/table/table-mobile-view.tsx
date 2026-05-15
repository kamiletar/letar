'use client'

import { Box, Button, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { useTableEditorContext } from './table-editor-context'
import { formatCellValue } from './table-utils'

/**
 * Мобильный вид TableEditor — карточки вместо таблицы.
 * Отображается на base/sm breakpoints.
 */
export function TableMobileView() {
  const { columns, rows, addRow, removeRow, canAdd, canRemove, readOnly, disabled } = useTableEditorContext()

  return (
    <VStack gap={3} align="stretch">
      {rows.length === 0 ? (
        <Text color="fg.muted" textAlign="center" py={6}>
          Нет данных
        </Text>
      ) : (
        rows.map((rowData, rowIndex) => (
          <Box key={rowIndex} p={3} borderWidth="1px" borderRadius="md" position="relative">
            {/* Номер строки + удаление */}
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" color="fg.muted" fontWeight="bold">
                #{rowIndex + 1}
              </Text>
              {!readOnly && (
                <IconButton
                  aria-label="Удалить"
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  onClick={() => removeRow(rowIndex)}
                  disabled={!canRemove || disabled}
                >
                  ✕
                </IconButton>
              )}
            </HStack>

            {/* Поля как label: value */}
            <VStack gap={1} align="stretch">
              {columns.map((col) => {
                const value = col.computed ? col.computed(rowData) : rowData[col.name]
                return (
                  <HStack key={col.name} justify="space-between" fontSize="sm">
                    <Text color="fg.muted" fontWeight="medium" minW="80px">
                      {col.label}
                    </Text>
                    <Text textAlign="right">{formatCellValue(value, col) || '—'}</Text>
                  </HStack>
                )
              })}
            </VStack>
          </Box>
        ))
      )}

      {!readOnly && (
        <Button size="sm" variant="outline" onClick={addRow} disabled={!canAdd || disabled}>
          + Добавить
        </Button>
      )}
    </VStack>
  )
}
