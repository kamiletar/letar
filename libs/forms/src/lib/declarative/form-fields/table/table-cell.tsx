'use client'

import { Input, NativeSelect, Table } from '@chakra-ui/react'
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useDeclarativeForm } from '../../form-context'
import { formatFieldErrors, hasFieldErrors } from '../base/field-utils'
import { useTableEditorContext } from './table-editor-context'
import type { ResolvedColumn } from './table-types'
import { formatCellValue } from './table-utils'

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
  const cellRef = useRef<HTMLTableCellElement>(null)

  const isEditing = navigation.editingCell?.row === rowIndex && navigation.editingCell?.col === colIndex

  const isComputed = !!column.computed
  const isReadOnly = readOnly || column.readOnly || isComputed || disabled

  // Путь к значению ячейки в форме
  const fieldPath = `${fullPath}[${rowIndex}].${column.name}`

  // Хуки ДО условного return (rules of hooks)
  const startEdit = useCallback(() => {
    if (isReadOnly) return
    setEditingCell({ row: rowIndex, col: colIndex })
  }, [isReadOnly, setEditingCell, rowIndex, colIndex])

  const handleCellKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isReadOnly) return
      if (e.key === 'Enter' || e.key === 'F2') {
        e.preventDefault()
        startEdit()
      }
    },
    [isReadOnly, startEdit]
  )

  // Вычисляемое значение — ранний return после хуков
  if (isComputed) {
    const computedValue = column.computed!(rowData)
    return (
      <Table.Cell textAlign={column.align} data-row={rowIndex} data-col={colIndex} ref={cellRef}>
        {formatCellValue(computedValue, column)}
      </Table.Cell>
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
          <Table.Cell
            ref={cellRef}
            textAlign={column.align}
            data-row={rowIndex}
            data-col={colIndex}
            tabIndex={isReadOnly ? undefined : 0}
            cursor={isReadOnly ? 'default' : 'pointer'}
            onClick={startEdit}
            onKeyDown={handleCellKeyDown}
            onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
            borderColor={hasError ? 'red.500' : undefined}
            borderWidth={hasError ? '1px' : undefined}
            title={hasError ? formatFieldErrors(errors) : undefined}
            _hover={isReadOnly ? undefined : { bg: 'bg.subtle' }}
          >
            {formatCellValue(value, column) || <span style={{ opacity: 0.4 }}>{column.placeholder ?? '—'}</span>}
          </Table.Cell>
        )
      }}
    </form.Field>
  )
}

/**
 * Ячейка в режиме редактирования
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  ref: React.RefObject<HTMLInputElement | HTMLSelectElement | null>
}) {
  const { setEditingCell } = useTableEditorContext()
  const [localValue, setLocalValue] = useState(String(value ?? ''))

  // Автофокус при входе в режим редактирования
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
      if (e.key === 'Tab' || e.key === 'Enter') {
        // Пусть всплывает — обработается use-table-navigation
      }
    },
    [setEditingCell]
  )

  // Enum → NativeSelect
  if (column.fieldType === 'enum' && column.enumValues) {
    return (
      <Table.Cell data-row={rowIndex} data-col={colIndex} p="0">
        <NativeSelect.Root size="sm">
          <NativeSelect.Field
            ref={ref as React.RefObject<HTMLSelectElement>}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => onBlur(value)}
            onKeyDown={handleKeyDown}
            borderColor={hasError ? 'red.500' : undefined}
          >
            <option value="">—</option>
            {column.enumValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
      </Table.Cell>
    )
  }

  // Boolean → чекбокс напрямую (слишком простой для отдельного компонента)
  if (column.fieldType === 'boolean') {
    return (
      <Table.Cell data-row={rowIndex} data-col={colIndex} textAlign="center" p="0">
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          type="checkbox"
          checked={!!value}
          onChange={(e) => {
            onChange(e.target.checked)
            onBlur(e.target.checked)
          }}
          onKeyDown={handleKeyDown}
        />
      </Table.Cell>
    )
  }

  // Число или строка → Input
  const inputType = column.fieldType === 'number' ? 'number' : 'text'

  return (
    <Table.Cell data-row={rowIndex} data-col={colIndex} p="0">
      <Input
        ref={ref as React.RefObject<HTMLInputElement>}
        size="sm"
        type={inputType}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          const coerced = column.fieldType === 'number' ? Number(localValue) || 0 : localValue
          onBlur(coerced)
        }}
        onKeyDown={handleKeyDown}
        textAlign={column.align}
        borderColor={hasError ? 'red.500' : undefined}
        borderRadius="0"
        title={hasError ? formatFieldErrors(errors) : undefined}
      />
    </Table.Cell>
  )
}
