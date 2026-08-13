import type { CellCoord, ResolvedColumn } from '@letar/forms-core/table'
import { type Ref, ref } from 'vue'

interface UseTableNavigationOptions {
  columns: ResolvedColumn[]
  rowCount: number
  editingCell: CellCoord | null
  setEditingCell: (cell: CellCoord | null) => void
  addRow: () => void
  canAdd: boolean
  readOnly: boolean
}

/** Индексы редактируемых колонок (исключая computed и readOnly). */
function getEditableColIndices(columns: ResolvedColumn[]): number[] {
  return columns.map((col, i) => (!col.computed && !col.readOnly ? i : -1)).filter((i) => i !== -1)
}

/**
 * Навигация по таблице: Tab, Shift+Tab, Enter, Escape, стрелки вверх/вниз.
 *
 * Портировано из `libs/forms-shadcn/src/lib/table/use-table-navigation.ts` (React-хук) —
 * `containerRef`/фокус ячейки через `data-row`/`data-col` работают одинаково в обоих фреймворках
 * (обычный DOM API), заменился только слой хранения ref (`vue.ref` вместо `useRef`) и вызов
 * `requestAnimationFrame` остался тем же браузерным API.
 *
 * Вызывается заново на каждый рендер `field-table-editor.ts` (свежие `columns`/`rowCount`/
 * `editingCell` в замыкании) — как и `resolveTableColumns`, отдельного мемо-слоя не требуется:
 * сам `containerRef` создаётся один раз при первом вызове и передаётся вызывающей стороной между
 * рендерами (см. `field-table-editor.ts`).
 */
export function useTableNavigation(
  containerRef: Ref<HTMLElement | null>,
  { columns, rowCount, editingCell, setEditingCell, addRow, canAdd, readOnly }: UseTableNavigationOptions,
) {
  const editableIndices = getEditableColIndices(columns)

  /** Сфокусировать ячейку в DOM (найти по data-атрибутам). */
  function focusCell(row: number, col: number) {
    const container = containerRef.value
    if (!container) {
      return
    }

    const cell = container.querySelector(`[data-row="${row}"][data-col="${col}"]`)
    if (cell instanceof HTMLElement) {
      const input = cell.querySelector('input, select') as HTMLElement | null
      if (input) {
        input.focus()
      } else {
        cell.focus()
      }
    }
  }

  /** Перейти к следующей редактируемой ячейке. */
  function moveToNext(currentRow: number, currentCol: number, reverse = false) {
    if (readOnly || editableIndices.length === 0) {
      return
    }

    const currentEditIdx = editableIndices.indexOf(currentCol)
    if (currentEditIdx === -1) {
      return
    }

    if (!reverse) {
      if (currentEditIdx < editableIndices.length - 1) {
        const nextCol = editableIndices[currentEditIdx + 1]
        setEditingCell({ row: currentRow, col: nextCol })
        requestAnimationFrame(() => focusCell(currentRow, nextCol))
      } else if (currentRow < rowCount - 1) {
        const nextCol = editableIndices[0]
        setEditingCell({ row: currentRow + 1, col: nextCol })
        requestAnimationFrame(() => focusCell(currentRow + 1, nextCol))
      } else if (canAdd) {
        addRow()
        const nextCol = editableIndices[0]
        requestAnimationFrame(() => {
          setEditingCell({ row: currentRow + 1, col: nextCol })
          requestAnimationFrame(() => focusCell(currentRow + 1, nextCol))
        })
      }
    } else {
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
  }

  /** Обработчик `keydown` на контейнере таблицы. */
  function handleKeyDown(e: KeyboardEvent) {
    if (!editingCell) {
      return
    }

    const { row, col } = editingCell

    switch (e.key) {
      case 'Tab':
        e.preventDefault()
        setEditingCell(null)
        requestAnimationFrame(() => moveToNext(row, col, e.shiftKey))
        break

      case 'Enter':
        e.preventDefault()
        setEditingCell(null)
        requestAnimationFrame(() => moveToNext(row, col, false))
        break

      case 'Escape':
        e.preventDefault()
        setEditingCell(null)
        requestAnimationFrame(() => focusCell(row, col))
        break

      case 'ArrowUp':
        if (row > 0) {
          e.preventDefault()
          setEditingCell({ row: row - 1, col })
          requestAnimationFrame(() => focusCell(row - 1, col))
        }
        break

      case 'ArrowDown':
        if (row < rowCount - 1) {
          e.preventDefault()
          setEditingCell({ row: row + 1, col })
          requestAnimationFrame(() => focusCell(row + 1, col))
        }
        break
    }
  }

  return { handleKeyDown, focusCell }
}

/** Создаёт `containerRef`, переживающий рендеры (вызывается один раз в `setup()`). */
export function createTableContainerRef(): Ref<HTMLElement | null> {
  return ref(null)
}
