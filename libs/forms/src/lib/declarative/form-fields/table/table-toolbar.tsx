'use client'

import { Button, HStack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useTableEditorContext } from './table-editor-context'

interface TableToolbarProps {
  /** Текст кнопки добавления */
  addLabel?: string
  /** Кастомные действия */
  actions?: ReactNode
}

/**
 * Панель управления таблицей: кнопка добавления + bulk delete + счётчик.
 */
export function TableEditorToolbar({ addLabel = 'Добавить строку', actions }: TableToolbarProps) {
  const { rows, canAdd, addRow, selectedRows, removeRow, readOnly, disabled } = useTableEditorContext()

  // Массовое удаление выбранных строк
  const handleBulkDelete = () => {
    // Удаляем с конца чтобы не сбивать индексы
    const indices = [...selectedRows].sort((a, b) => b - a)
    for (const idx of indices) {
      removeRow(idx)
    }
  }

  return (
    <HStack justify="space-between" py="2">
      <HStack gap="2">
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={addRow} disabled={!canAdd || disabled}>
            + {addLabel}
          </Button>
        )}

        {!readOnly && selectedRows.size > 0 && (
          <Button size="sm" variant="ghost" colorPalette="red" onClick={handleBulkDelete} disabled={disabled}>
            Удалить выбранные ({selectedRows.size})
          </Button>
        )}

        {actions}
      </HStack>

      <Text fontSize="sm" color="fg.muted">
        {rows.length} {rows.length === 1 ? 'строка' : rows.length < 5 ? 'строки' : 'строк'}
      </Text>
    </HStack>
  )
}
