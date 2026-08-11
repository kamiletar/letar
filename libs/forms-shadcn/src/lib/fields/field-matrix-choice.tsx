'use client'

import { Star } from 'lucide-react'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { cn } from '../utils/cn'
import type { MatrixChoiceFieldProps, MatrixColumn, MatrixRow } from './types'

/**
 * Form.Field.MatrixChoice — shadcn-скин. Значение — `Record<string, string | string[]>`.
 *
 * Таблица «вопрос × вариант ответа» (native `<table>`). Портирован из Chakra-версии без
 * изменений логики (radio/checkbox/rating варианты, per-row required-подсветка). Beta: одна
 * разметка на все брейкпоинты (без мобильных карточек), без стрелочной клавиатурной навигации
 * по ячейкам.
 */
export const FieldMatrixChoice = createField<MatrixChoiceFieldProps, Record<string, string | string[]>>({
  displayName: 'FieldMatrixChoice',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { rows, columns, variant = 'radio' } = componentProps
    const value: Record<string, string | string[]> = (field.state.value as Record<string, string | string[]>) ?? {}
    const disabled = resolved.disabled || resolved.readOnly

    const isSelected = (rowValue: string, colValue: string): boolean => {
      const rowVal = value[rowValue]
      if (variant === 'checkbox') {
        return Array.isArray(rowVal) && rowVal.includes(colValue)
      }
      return rowVal === colValue
    }

    const setRowValue = (rowValue: string, colValue: string) => {
      if (disabled) {
        return
      }
      if (variant === 'checkbox') {
        const current = (value[rowValue] as string[] | undefined) ?? []
        const next = current.includes(colValue) ? current.filter((v) => v !== colValue) : [...current, colValue]
        field.handleChange({ ...value, [rowValue]: next })
      } else {
        field.handleChange({ ...value, [rowValue]: colValue })
      }
    }

    const renderCell = (row: MatrixRow, col: MatrixColumn) => {
      const selected = isSelected(row.value, col.value)
      if (variant === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => setRowValue(row.value, col.value)}
            disabled={disabled}
            aria-label={`${row.label}: ${col.label}`}
            className="size-4"
          />
        )
      }
      if (variant === 'rating') {
        return (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setRowValue(row.value, col.value)}
            aria-label={`${row.label}: ${col.label}`}
            aria-pressed={selected}
            className={cn(
              'inline-flex',
              selected ? 'text-yellow-400' : 'text-muted-foreground hover:text-yellow-400',
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            <Star className={cn('size-4', selected && 'fill-current')} />
          </button>
        )
      }
      return (
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={disabled}
          onClick={() => setRowValue(row.value, col.value)}
          aria-label={`${row.label}: ${col.label}`}
          className={cn(
            'inline-flex size-[18px] items-center justify-center rounded-full border-2 transition-colors',
            selected ? 'border-primary bg-primary' : 'border-border bg-transparent',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          {selected && <span className="size-2 rounded-full bg-white" />}
        </button>
      )
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div className="overflow-x-auto" data-field-name={fullPath}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-2/5" />
                {columns.map((col) => (
                  <th key={col.value} className="text-muted-foreground px-2 py-2 text-center font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowValue = value[row.value]
                const isRowEmpty = variant === 'checkbox'
                  ? !Array.isArray(rowValue) || rowValue.length === 0
                  : !rowValue
                const showRowError = resolved.required && hasError && isRowEmpty

                return (
                  <tr key={row.value} className={cn('border-t', showRowError && 'bg-destructive/5')}>
                    <td className={cn('py-2 pr-3 font-medium', showRowError && 'text-destructive')}>
                      {row.label}
                    </td>
                    {columns.map((col) => (
                      <td key={col.value} className="px-2 py-2 text-center">
                        {renderCell(row, col)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </FieldWrapper>
    )
  },
})
