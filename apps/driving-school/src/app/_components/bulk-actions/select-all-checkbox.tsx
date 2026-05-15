'use client'

import { Checkbox, Text, VStack } from '@chakra-ui/react'

interface SelectAllCheckboxProps {
  /** Все ли элементы выбраны */
  isAllSelected: boolean
  /** Частичный выбор */
  isIndeterminate: boolean
  /** Выбрать все */
  onSelectAll: () => void
  /** Снять выбор со всех */
  onDeselectAll: () => void
  /** Общее количество элементов */
  totalCount: number
  /** Количество выбранных */
  selectedCount: number
  /** Показывать счётчик */
  showCount?: boolean
}

/**
 * Чекбокс "Выбрать все" для заголовка таблицы
 *
 * @example
 * <SelectAllCheckbox
 *   isAllSelected={selection.isAllSelected}
 *   isIndeterminate={selection.isIndeterminate}
 *   onSelectAll={selection.selectAll}
 *   onDeselectAll={selection.deselectAll}
 *   totalCount={users.length}
 *   selectedCount={selection.selectedCount}
 * />
 */
export function SelectAllCheckbox({
  isAllSelected,
  isIndeterminate,
  onSelectAll,
  onDeselectAll,
  totalCount,
  selectedCount,
  showCount = false,
}: SelectAllCheckboxProps) {
  const handleChange = () => {
    if (isAllSelected || isIndeterminate) {
      onDeselectAll()
    } else {
      onSelectAll()
    }
  }

  return (
    <VStack gap={0} align="start">
      <Checkbox.Root
        checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
        onCheckedChange={handleChange}
        aria-label={isAllSelected ? 'Снять выделение со всех' : 'Выбрать все'}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control />
      </Checkbox.Root>
      {showCount && selectedCount > 0 && (
        <Text fontSize="xs" color="fg.muted">
          {selectedCount}/{totalCount}
        </Text>
      )}
    </VStack>
  )
}
