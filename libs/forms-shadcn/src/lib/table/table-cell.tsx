'use client'

import type { ResolvedColumn } from '@letar/forms-core/table'
import { formatCellValue } from '@letar/forms-core/table'
import { formatFieldErrors, hasFieldErrors, useDeclarativeForm } from '@letar/forms-react'
import { type KeyboardEvent, type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../utils/cn'
import { useTableEditorContext } from './table-editor-context'

interface TableCellProps {
  /** Индекс строки */
  rowIndex: number
  /** Индекс колонки */
  colIndex: number
  /** Описание колонки */
  column: ResolvedColumn
  /** Значение строки целиком (для computed) */
  rowData: Record<string, unknown>
}

/**
 * Ячейка таблицы с переключением display/edit.
 * Клик → inline editing, Escape → выход, Tab → следующая ячейка.
 */
export function TableCell({ rowIndex, colIndex, column, rowData }: TableCellProps) {
  const { form } = useDeclarativeForm()
  const { navigation, setEditingCell, setFocusedCell, fullPath, disabled, readOnly } = useTableEditorContext()
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  const isEditing = navigation.editingCell?.row === rowIndex && navigation.editingCell?.col === colIndex

  const isComputed = !!column.computed
  const isReadOnly = readOnly || column.readOnly || isComputed || disabled

  const fieldPath = `${fullPath}[${rowIndex}].${column.name}`

  const startEdit = useCallback(() => {
    if (isReadOnly) {
      return
    }
    setEditingCell({ row: rowIndex, col: colIndex })
  }, [isReadOnly, setEditingCell, rowIndex, colIndex])

  const handleCellKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isReadOnly) {
        return
      }
      if (e.key === 'Enter' || e.key === 'F2') {
        e.preventDefault()
        startEdit()
      }
    },
    [isReadOnly, startEdit],
  )

  if (isComputed) {
    const computedValue = column.computed?.(rowData)
    return (
      <td
        className={cn(
          'p-2 align-middle',
          column.align === 'right' && 'text-right',
          column.align === 'center' && 'text-center',
        )}
        data-row={rowIndex}
        data-col={colIndex}
      >
        {formatCellValue(computedValue, column)}
      </td>
    )
  }

  return (
    <form.Field name={fieldPath}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(field: any) => {
        const errors = field.state.meta.errors
        const hasError = hasFieldErrors(errors)
        const value = field.state.value

        if (isEditing) {
          return (
            <EditingCell
              ref={inputRef}
              column={column}
              value={value}
              hasError={hasError}
              errors={errors}
              onBlur={(newValue) => {
                field.handleChange(newValue)
                setEditingCell(null)
              }}
              onChange={(newValue) => field.handleChange(newValue)}
              rowIndex={rowIndex}
              colIndex={colIndex}
            />
          )
        }

        return (
          <td
            className={cn(
              'p-2 align-middle',
              column.align === 'right' && 'text-right',
              column.align === 'center' && 'text-center',
              !isReadOnly && 'cursor-pointer hover:bg-muted/50',
              hasError && 'border border-destructive',
            )}
            data-row={rowIndex}
            data-col={colIndex}
            tabIndex={isReadOnly ? undefined : 0}
            onClick={startEdit}
            onKeyDown={handleCellKeyDown}
            onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
            title={hasError ? formatFieldErrors(errors) : undefined}
          >
            {formatCellValue(value, column) || <span className="opacity-40">{column.placeholder ?? '—'}</span>}
          </td>
        )
      }}
    </form.Field>
  )
}

/** Ячейка в режиме редактирования */
function EditingCell({
  column,
  value,
  hasError,
  errors,
  onBlur,
  onChange,
  rowIndex,
  colIndex,
  ref,
}: {
  column: ResolvedColumn
  value: unknown
  hasError: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any
  onBlur: (value: unknown) => void
  onChange: (value: unknown) => void
  rowIndex: number
  colIndex: number
  ref: RefObject<HTMLInputElement | HTMLSelectElement | null>
}) {
  const { setEditingCell } = useTableEditorContext()
  const [localValue, setLocalValue] = useState(String(value ?? ''))

  useEffect(() => {
    const el = ref.current
    if (el) {
      el.focus()
      if ('select' in el) {
        ;(el as HTMLInputElement).select()
      }
    }
  }, [ref])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setEditingCell(null)
      }
      // Tab/Enter — пусть всплывает, обработается use-table-navigation
    },
    [setEditingCell],
  )

  const errorTitle = hasError ? formatFieldErrors(errors) : undefined

  // Enum → native select
  if (column.fieldType === 'enum' && column.enumValues) {
    return (
      <td data-row={rowIndex} data-col={colIndex} className="p-0">
        <select
          ref={ref as RefObject<HTMLSelectElement>}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onBlur(value)}
          onKeyDown={handleKeyDown}
          className={cn(
            'h-9 w-full border-0 bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
            hasError && 'ring-2 ring-destructive',
          )}
        >
          <option value="">—</option>
          {column.enumValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </td>
    )
  }

  // Boolean → чекбокс напрямую
  if (column.fieldType === 'boolean') {
    return (
      <td data-row={rowIndex} data-col={colIndex} className="p-0 text-center">
        <input
          ref={ref as RefObject<HTMLInputElement>}
          type="checkbox"
          checked={!!value}
          onChange={(e) => {
            onChange(e.target.checked)
            onBlur(e.target.checked)
          }}
          onKeyDown={handleKeyDown}
          className="size-4 cursor-pointer"
        />
      </td>
    )
  }

  const inputType = column.fieldType === 'number' ? 'number' : 'text'

  return (
    <td data-row={rowIndex} data-col={colIndex} className="p-0">
      <input
        ref={ref as RefObject<HTMLInputElement>}
        type={inputType}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          const coerced = column.fieldType === 'number' ? Number(localValue) || 0 : localValue
          onBlur(coerced)
        }}
        onKeyDown={handleKeyDown}
        title={errorTitle}
        className={cn(
          'h-9 w-full border-0 bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
          column.align === 'right' && 'text-right',
          column.align === 'center' && 'text-center',
          hasError && 'ring-2 ring-destructive',
        )}
      />
    </td>
  )
}
