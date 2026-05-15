import { describe, expect, it } from 'vitest'
import type { ResolvedColumn } from './table-types'
import { buildTSV, coerceValue, computeAggregate, formatCellValue, getDefaultRow, parseTSV } from './table-utils'

// Вспомогательная функция для создания колонки
function col(overrides: Partial<ResolvedColumn> & { name: string }): ResolvedColumn {
  return {
    fieldType: 'string',
    label: overrides.name,
    width: 'auto',
    align: 'left',
    readOnly: false,
    hidden: false,
    ...overrides,
  } as ResolvedColumn
}

describe('formatCellValue', () => {
  it('должен вернуть пустую строку для null/undefined', () => {
    expect(formatCellValue(null, col({ name: 'a' }))).toBe('')
    expect(formatCellValue(undefined, col({ name: 'a' }))).toBe('')
    expect(formatCellValue('', col({ name: 'a' }))).toBe('')
  })

  it('должен использовать кастомный format', () => {
    const c = col({ name: 'price', format: (v) => `${v} ₽` })
    expect(formatCellValue(100, c)).toBe('100 ₽')
  })

  it('должен форматировать boolean как ✓/✗', () => {
    const c = col({ name: 'active', fieldType: 'boolean' })
    expect(formatCellValue(true, c)).toBe('✓')
    expect(formatCellValue(false, c)).toBe('✗')
  })

  it('должен форматировать number через toLocaleString', () => {
    const c = col({ name: 'count', fieldType: 'number' })
    const result = formatCellValue(1234, c)
    // toLocaleString зависит от locale, проверяем что число есть
    expect(result).toContain('1')
    expect(result).toContain('234')
  })

  it('должен привести к строке для string-типа', () => {
    const c = col({ name: 'title', fieldType: 'string' })
    expect(formatCellValue('hello', c)).toBe('hello')
  })
})

describe('getDefaultRow', () => {
  it('должен создать строку с дефолтами по типам', () => {
    const columns = [
      col({ name: 'title', fieldType: 'string' }),
      col({ name: 'qty', fieldType: 'number' }),
      col({ name: 'active', fieldType: 'boolean' }),
    ]
    const row = getDefaultRow(columns)
    expect(row).toEqual({ title: '', qty: 0, active: false })
  })

  it('должен пропустить computed колонки', () => {
    const columns = [
      col({ name: 'price', fieldType: 'number' }),
      col({ name: 'total', fieldType: 'number', computed: (r: Record<string, unknown>) => Number(r.price) * 2 }),
    ]
    const row = getDefaultRow(columns)
    expect(row).toEqual({ price: 0 })
    expect('total' in row).toBe(false)
  })

  it('должен подставить первое значение enum', () => {
    const c = col({ name: 'status', fieldType: 'enum', enumValues: ['draft', 'published'] })
    const row = getDefaultRow([c])
    expect(row.status).toBe('draft')
  })
})

describe('coerceValue', () => {
  it('должен привести строку к числу', () => {
    const c = col({ name: 'qty', fieldType: 'number' })
    expect(coerceValue('42', c)).toBe(42)
  })

  it('должен поддерживать запятую как десятичный разделитель', () => {
    const c = col({ name: 'price', fieldType: 'number' })
    expect(coerceValue('3,14', c)).toBe(3.14)
  })

  it('должен вернуть 0 для невалидного числа', () => {
    const c = col({ name: 'qty', fieldType: 'number' })
    expect(coerceValue('abc', c)).toBe(0)
  })

  it('должен привести к boolean', () => {
    const c = col({ name: 'active', fieldType: 'boolean' })
    expect(coerceValue('true', c)).toBe(true)
    expect(coerceValue('1', c)).toBe(true)
    expect(coerceValue('да', c)).toBe(true)
    expect(coerceValue('yes', c)).toBe(true)
    expect(coerceValue('✓', c)).toBe(true)
    expect(coerceValue('false', c)).toBe(false)
    expect(coerceValue('no', c)).toBe(false)
  })

  it('должен вернуть строку для string-типа', () => {
    const c = col({ name: 'title', fieldType: 'string' })
    expect(coerceValue(' hello ', c)).toBe('hello')
  })
})

describe('parseTSV', () => {
  it('должен разобрать TSV из Excel', () => {
    const tsv = 'Товар\t10\t100\nУслуга\t5\t200'
    const result = parseTSV(tsv)
    expect(result).toEqual([
      ['Товар', '10', '100'],
      ['Услуга', '5', '200'],
    ])
  })

  it('должен отфильтровать пустые строки', () => {
    const tsv = 'A\t1\n\n\nB\t2\n'
    const result = parseTSV(tsv)
    expect(result).toEqual([
      ['A', '1'],
      ['B', '2'],
    ])
  })

  it('должен обработать пустой ввод', () => {
    expect(parseTSV('')).toEqual([])
  })
})

describe('buildTSV', () => {
  const columns = [col({ name: 'product', label: 'Товар' }), col({ name: 'qty', label: 'Кол-во', fieldType: 'number' })]

  const rows = [
    { product: 'Молоко', qty: 2 },
    { product: 'Хлеб', qty: 1 },
  ]

  it('должен собрать TSV с заголовками', () => {
    const result = buildTSV(rows, columns)
    expect(result).toBe('Товар\tКол-во\nМолоко\t2\nХлеб\t1')
  })

  it('должен фильтровать по выбранным строкам', () => {
    const result = buildTSV(rows, columns, new Set([1]))
    expect(result).toBe('Товар\tКол-во\nХлеб\t1')
  })

  it('должен обработать computed колонку', () => {
    const cols = [
      col({ name: 'qty', label: 'Кол-во', fieldType: 'number' }),
      col({
        name: 'total',
        label: 'Итого',
        computed: (r: Record<string, unknown>) => Number(r.qty) * 100,
      }),
    ]
    const data = [{ qty: 5 }]
    const result = buildTSV(data, cols)
    expect(result).toBe('Кол-во\tИтого\n5\t500')
  })
})

describe('computeAggregate', () => {
  const rows = [{ value: 10 }, { value: 20 }, { value: 30 }]

  it('должен вычислить сумму', () => {
    expect(computeAggregate(rows, 'value', 'sum')).toBe(60)
  })

  it('должен вычислить среднее', () => {
    expect(computeAggregate(rows, 'value', 'avg')).toBe(20)
  })

  it('должен вычислить количество', () => {
    expect(computeAggregate(rows, 'value', 'count')).toBe(3)
  })

  it('должен вычислить минимум', () => {
    expect(computeAggregate(rows, 'value', 'min')).toBe(10)
  })

  it('должен вычислить максимум', () => {
    expect(computeAggregate(rows, 'value', 'max')).toBe(30)
  })

  it('должен вернуть 0 для пустого массива', () => {
    expect(computeAggregate([], 'value', 'sum')).toBe(0)
  })

  it('должен использовать computeFn', () => {
    const data = [
      { qty: 2, price: 100 },
      { qty: 3, price: 200 },
    ]
    const result = computeAggregate(data, 'total', 'sum', (r) => Number(r.qty) * Number(r.price))
    expect(result).toBe(800) // 200 + 600
  })
})
