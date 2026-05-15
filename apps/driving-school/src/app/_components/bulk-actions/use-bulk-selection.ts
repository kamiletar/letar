'use client'

import { useCallback, useMemo, useState } from 'react'

/**
 * Опции для хука выбора элементов
 */
export interface UseBulkSelectionOptions<T> {
  /** Список всех элементов */
  items: T[]
  /** Функция получения ID элемента */
  getItemId: (item: T) => string
}

/**
 * Хук для управления множественным выбором элементов
 *
 * @example
 * const selection = useBulkSelection({
 *   items: users,
 *   getItemId: (user) => user.id,
 * })
 *
 * // Использование в таблице
 * <RowCheckbox isSelected={selection.isSelected(id)} onToggle={selection.toggleItem} />
 */
export function useBulkSelection<T>({ items, getItemId }: UseBulkSelectionOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  /** Проверка, выбран ли элемент */
  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  /** Переключение выбора элемента */
  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  /** Выбрать все элементы */
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getItemId)))
  }, [items, getItemId])

  /** Снять выделение со всех */
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  /** Выбрать список элементов */
  const selectMany = useCallback((ids: string[]) => {
    setSelectedIds((prev) => new Set([...prev, ...ids]))
  }, [])

  /** Количество выбранных */
  const selectedCount = selectedIds.size

  /** Все ли выбраны */
  const isAllSelected = selectedCount > 0 && selectedCount === items.length

  /** Частичный выбор (indeterminate) */
  const isIndeterminate = selectedCount > 0 && selectedCount < items.length

  /** Выбранные элементы (полные объекты) */
  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(getItemId(item)))
  }, [items, selectedIds, getItemId])

  return {
    // Состояние
    selectedIds,
    selectedCount,
    selectedItems,
    isAllSelected,
    isIndeterminate,

    // Методы
    isSelected,
    toggleItem,
    selectAll,
    deselectAll,
    selectMany,
  }
}
