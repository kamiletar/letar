'use client'

import type { ResolvedColumn } from './table-types'

/**
 * Форматировать значение ячейки для отображения.
 */
export function formatCellValue(value: unknown, column: ResolvedColumn): string {
  if (value === null || value === undefined || value === '') return ''

  // Вычисляемая колонка с кастомным форматом
  if (column.format) {
    return column.format(value)
  }

  if (column.fieldType === 'boolean') {
    return value ? '✓' : '✗'
  }

  if (column.fieldType === 'date' && value instanceof Date) {
    return value.toLocaleDateString()
  }

  if (column.fieldType === 'number' && typeof value === 'number') {
    return value.toLocaleString()
  }

  return String(value)
}

/**
 * Создать дефолтную строку на основе колонок.
 */
export function getDefaultRow(columns: ResolvedColumn[]): Record<string, unknown> {
  const row: Record<string, unknown> = {}

  for (const col of columns) {
    if (col.computed) continue // вычисляемые не в данных

    switch (col.fieldType) {
      case 'string':
        row[col.name] = ''
        break
      case 'number':
        row[col.name] = 0
        break
      case 'boolean':
        row[col.name] = false
        break
      case 'date':
        row[col.name] = ''
        break
      case 'enum':
        row[col.name] = col.enumValues?.[0] ?? ''
        break
      default:
        row[col.name] = ''
    }
  }

  return row
}

/**
 * Привести строковое значение из clipboard к правильному типу.
 */
export function coerceValue(raw: string, column: ResolvedColumn): unknown {
  const trimmed = raw.trim()

  switch (column.fieldType) {
    case 'number': {
      // Поддержка запятых как десятичного разделителя
      const normalized = trimmed.replace(',', '.').replace(/\s/g, '')
      const num = Number(normalized)
      return Number.isNaN(num) ? 0 : num
    }
    case 'boolean':
      return ['true', '1', 'да', 'yes', '✓'].includes(trimmed.toLowerCase())
    case 'date':
      return trimmed
    default:
      return trimmed
  }
}

/**
 * Парсинг TSV (Tab-Separated Values) из буфера обмена.
 * Excel и Google Sheets копируют данные в этом формате.
 */
export function parseTSV(text: string): string[][] {
  return text
    .split('\n')
    .map((line) => line.split('\t'))
    .filter((row) => row.some((cell) => cell.trim() !== ''))
}

/**
 * Собрать TSV из данных таблицы (для копирования).
 */
export function buildTSV(
  rows: Record<string, unknown>[],
  columns: ResolvedColumn[],
  selectedIndices?: Set<number>
): string {
  // Заголовки
  const headers = columns.map((c) => c.label).join('\t')

  // Строки
  const dataRows = rows
    .filter((_, i) => !selectedIndices || selectedIndices.has(i))
    .map((row) =>
      columns
        .map((col) => {
          if (col.computed) return String(col.computed(row) ?? '')
          return String(row[col.name] ?? '')
        })
        .join('\t')
    )

  return [headers, ...dataRows].join('\n')
}

/**
 * Вычислить агрегатное значение по колонке.
 */
export function computeAggregate(
  rows: Record<string, unknown>[],
  columnName: string,
  type: 'sum' | 'avg' | 'count' | 'min' | 'max',
  computeFn?: (row: Record<string, unknown>) => unknown
): number {
  const values = rows
    .map((row) => {
      const raw = computeFn ? computeFn(row) : row[columnName]
      return typeof raw === 'number' ? raw : Number(raw)
    })
    .filter((v) => !Number.isNaN(v))

  if (values.length === 0) return 0

  switch (type) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0)
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length
    case 'count':
      return values.length
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
  }
}
