'use client'

import { useCallback, useState } from 'react'

/**
 * Хук для управления множественным выбором элементов
 *
 * @example
 * ```tsx
 * const { selected, toggle, toggleAll, clear, isSelected, isAllSelected } = useSelection(items.map(i => i.id))
 * ```
 */
export function useSelection<T extends string>(allIds: T[]) {
  const [selected, setSelected] = useState<Set<T>>(new Set())

  const toggle = useCallback((id: T) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === allIds.length) {
        return new Set()
      }
      return new Set(allIds)
    })
  }, [allIds])

  const clear = useCallback(() => {
    setSelected(new Set())
  }, [])

  const isSelected = useCallback((id: T) => selected.has(id), [selected])

  const isAllSelected = selected.size === allIds.length && allIds.length > 0
  const isIndeterminate = selected.size > 0 && selected.size < allIds.length

  return {
    selected,
    selectedArray: Array.from(selected),
    selectedCount: selected.size,
    toggle,
    toggleAll,
    clear,
    isSelected,
    isAllSelected,
    isIndeterminate,
  }
}
