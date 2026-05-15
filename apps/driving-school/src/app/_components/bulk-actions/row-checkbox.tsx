'use client'

import { Checkbox } from '@chakra-ui/react'

interface RowCheckboxProps {
  /** ID элемента */
  id: string
  /** Выбран ли элемент */
  isSelected: boolean
  /** Обработчик переключения */
  onToggle: (id: string) => void
  /** Aria-label для доступности */
  label?: string
}

/**
 * Чекбокс для строки таблицы
 *
 * @example
 * <RowCheckbox
 *   id={user.id}
 *   isSelected={selection.isSelected(user.id)}
 *   onToggle={selection.toggleItem}
 *   label={`Выбрать ${user.name}`}
 * />
 */
export function RowCheckbox({ id, isSelected, onToggle, label }: RowCheckboxProps) {
  return (
    <Checkbox.Root
      checked={isSelected}
      onCheckedChange={() => onToggle(id)}
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control />
    </Checkbox.Root>
  )
}
