'use client'

import { type KeyboardEvent, type MutableRefObject, useCallback, useRef } from 'react'
import type { CellCoord, ResolvedColumn } from './table-types'

interface UseTableNavigationOptions {
  /** Разрешённые колонки */
  columns: ResolvedColumn[]
  /** Количество строк */
  rowCount: number
  /** Текущая редактируемая ячейка */
  editingCell: CellCoord | null
  /** Установить редактируемую ячейку */
  setEditingCell: (cell: CellCoord | null) => void
  /** Добавить новую строку */
  addRow: () => void
  /** Можно ли добавить строку */
  canAdd: boolean
  /** ReadOnly */
  readOnly: boolean
  /**
   * Ref на функцию коммита значения активной ячейки (регистрируется EditingCell).
   * Вызывается перед сменой ячейки на Tab/Enter/стрелках — иначе `setEditingCell(null)`
   * размонтирует `<Input>` без нативного `blur`, и введённое значение теряется молча.
   * На Escape НЕ вызывается — это намеренная отмена редактирования, не коммит.
   */
  commitEditingCellRef: MutableRefObject<(() => void) | null>
}

/**
 * Индексы редактируемых колонок (исключая computed и readOnly).
 */
function getEditableColIndices(columns: ResolvedColumn[]): number[] {
  return columns.map((col, i) => (!col.computed && !col.readOnly ? i : -1)).filter((i) => i !== -1)
}

/**
 * Хук навигации по таблице: Tab, Shift+Tab, Enter, Escape, стрелки.
 *
 * Привязывается к onKeyDown контейнера таблицы.
 * Ячейки используют data-row и data-col атрибуты для DOM-фокусировки.
 */
export function useTableNavigation({
  columns,
  rowCount,
  editingCell,
  setEditingCell,
  addRow,
  canAdd,
  readOnly,
  commitEditingCellRef,
}: UseTableNavigationOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editableIndices = getEditableColIndices(columns)

  /**
   * Сфокусировать ячейку в DOM (найти по data-атрибутам).
   */
  const focusCell = useCallback((row: number, col: number) => {
    const container = containerRef.current
    if (!container) {
      return
    }

    // Ищем input/select внутри ячейки
    const cell = container.querySelector(`[data-row="${row}"][data-col="${col}"]`)
    if (cell instanceof HTMLElement) {
      const input = cell.querySelector('input, select') as HTMLElement | null
      if (input) {
        input.focus()
      } else {
        cell.focus()
      }
    }
  }, [])

  /**
   * Перейти к следующей редактируемой ячейке.
   */
  const moveToNext = useCallback(
    (currentRow: number, currentCol: number, reverse = false) => {
      if (readOnly || editableIndices.length === 0) {
        return
      }

      const currentEditIdx = editableIndices.indexOf(currentCol)
      if (currentEditIdx === -1) {
        return
      }

      if (!reverse) {
        // Вперёд
        if (currentEditIdx < editableIndices.length - 1) {
          // Следующая колонка в строке
          const nextCol = editableIndices[currentEditIdx + 1]
          setEditingCell({ row: currentRow, col: nextCol })
          requestAnimationFrame(() => focusCell(currentRow, nextCol))
        } else if (currentRow < rowCount - 1) {
          // Первая колонка следующей строки
          const nextCol = editableIndices[0]
          setEditingCell({ row: currentRow + 1, col: nextCol })
          requestAnimationFrame(() => focusCell(currentRow + 1, nextCol))
        } else if (canAdd) {
          // Последняя ячейка последней строки — добавить новую
          addRow()
          const nextCol = editableIndices[0]
          requestAnimationFrame(() => {
            setEditingCell({ row: currentRow + 1, col: nextCol })
            requestAnimationFrame(() => focusCell(currentRow + 1, nextCol))
          })
        }
      } else {
        // Назад
        if (currentEditIdx > 0) {
          const prevCol = editableIndices[currentEditIdx - 1]
          setEditingCell({ row: currentRow, col: prevCol })
          requestAnimationFrame(() => focusCell(currentRow, prevCol))
        } else if (currentRow > 0) {
          const prevCol = editableIndices[editableIndices.length - 1]
          setEditingCell({ row: currentRow - 1, col: prevCol })
          requestAnimationFrame(() => focusCell(currentRow - 1, prevCol))
        }
      }
    },
    [readOnly, editableIndices, rowCount, canAdd, addRow, setEditingCell, focusCell],
  )

  /**
   * Обработчик onKeyDown на контейнере таблицы.
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!editingCell) {
        return
      }

      const { row, col } = editingCell

      switch (e.key) {
        case 'Tab':
          e.preventDefault()
          commitEditingCellRef.current?.() // сохранить введённое перед выходом из ячейки
          setEditingCell(null)
          requestAnimationFrame(() => moveToNext(row, col, e.shiftKey))
          break

        case 'Enter':
          e.preventDefault()
          commitEditingCellRef.current?.()
          setEditingCell(null)
          requestAnimationFrame(() => moveToNext(row, col, false))
          break

        case 'Escape':
          // Намеренно БЕЗ коммита — Escape отменяет редактирование, не сохраняет его
          e.preventDefault()
          setEditingCell(null)
          requestAnimationFrame(() => focusCell(row, col))
          break

        case 'ArrowUp':
          if (row > 0) {
            e.preventDefault()
            commitEditingCellRef.current?.()
            setEditingCell(null)
            setEditingCell({ row: row - 1, col })
            requestAnimationFrame(() => focusCell(row - 1, col))
          }
          break

        case 'ArrowDown':
          if (row < rowCount - 1) {
            e.preventDefault()
            commitEditingCellRef.current?.()
            setEditingCell(null)
            setEditingCell({ row: row + 1, col })
            requestAnimationFrame(() => focusCell(row + 1, col))
          }
          break
      }
    },
    [editingCell, setEditingCell, moveToNext, focusCell, rowCount, commitEditingCellRef],
  )

  return { containerRef, handleKeyDown, focusCell }
}
