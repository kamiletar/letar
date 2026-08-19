'use client'

import { useCallback, useState } from 'react'
import type { CellFieldType } from './table-types'

/**
 * Общий стейт черновика для инпута редактируемой ячейки таблицы.
 * Используется и `TableEditor` (`EditingCell`), и `DataGrid` (`EditableCell`) — раньше
 * коэрсия по `fieldType` (`Number(localValue) || 0`) была продублирована в каждом отдельно.
 */
export function useEditableCellValue(value: unknown, fieldType: CellFieldType | undefined) {
  const [localValue, setLocalValue] = useState(String(value ?? ''))

  const coerce = useCallback(
    () => (fieldType === 'number' ? Number(localValue) || 0 : localValue),
    [fieldType, localValue],
  )

  return { localValue, setLocalValue, coerce }
}
