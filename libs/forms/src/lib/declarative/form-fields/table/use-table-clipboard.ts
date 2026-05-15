'use client'

import { type ClipboardEvent, useCallback } from 'react'
import type { ResolvedColumn } from './table-types'
import { buildTSV, coerceValue, parseTSV } from './table-utils'

interface UseTableClipboardOptions {
  /** Колонки таблицы */
  columns: ResolvedColumn[]
  /** Добавить строку в массив */
  pushRow: (row: Record<string, unknown>) => void
  /** Можно ли добавить строку */
  canAdd: boolean
  /** Максимум строк */
  maxRows?: number
  /** Текущее кол-во строк */
  currentRowCount: number
  /** Данные строк (для копирования) */
  rows: Record<string, unknown>[]
  /** Выбранные строки */
  selectedRows: Set<number>
  /** Disabled */
  disabled: boolean
  /** ReadOnly */
  readOnly: boolean
}

/**
 * Хук для copy-paste из/в Excel/Sheets через Clipboard API.
 *
 * Paste: парсинг TSV, приведение типов, добавление строк.
 * Copy: сборка TSV из выбранных строк.
 */
export function useTableClipboard({
  columns,
  pushRow,
  canAdd,
  maxRows,
  currentRowCount,
  rows,
  selectedRows,
  disabled,
  readOnly,
}: UseTableClipboardOptions) {
  /**
   * Обработка вставки (Ctrl+V / Cmd+V).
   */
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (disabled || readOnly || !canAdd) return

      const text = e.clipboardData?.getData('text/plain')
      if (!text) return

      const parsed = parseTSV(text)
      if (parsed.length === 0) return

      e.preventDefault()

      // Редактируемые колонки (не computed, не readOnly)
      const editableCols = columns.filter((col) => !col.computed && !col.readOnly)

      let added = 0
      for (const rawRow of parsed) {
        // Проверяем лимит строк
        if (maxRows !== undefined && currentRowCount + added >= maxRows) break

        const row: Record<string, unknown> = {}
        for (let i = 0; i < editableCols.length && i < rawRow.length; i++) {
          row[editableCols[i].name] = coerceValue(rawRow[i], editableCols[i])
        }

        // Заполняем пропущенные поля дефолтами
        for (let i = rawRow.length; i < editableCols.length; i++) {
          const col = editableCols[i]
          row[col.name] = col.fieldType === 'number' ? 0 : ''
        }

        pushRow(row)
        added++
      }
    },
    [disabled, readOnly, canAdd, columns, maxRows, currentRowCount, pushRow]
  )

  /**
   * Обработка копирования (Ctrl+C / Cmd+C).
   */
  const handleCopy = useCallback(
    (e: ClipboardEvent) => {
      // Копируем только если есть выбранные строки
      if (selectedRows.size === 0) return

      e.preventDefault()
      const tsv = buildTSV(rows, columns, selectedRows)
      e.clipboardData?.setData('text/plain', tsv)
    },
    [selectedRows, rows, columns]
  )

  return { handlePaste, handleCopy }
}
