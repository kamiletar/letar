import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { AppForm } from './core/app-form'
import { FieldLikert } from './fields/field-likert'
import { FieldMatrixChoice } from './fields/field-matrix-choice'

const stage6Schema = z.object({
  satisfaction: z.number().optional().meta({ ui: { title: 'Удовлетворённость' } }),
  matrixRadio: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional().meta({
    ui: { title: 'Оценка (radio)' },
  }),
  matrixCheckbox: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional().meta({
    ui: { title: 'Оценка (checkbox)' },
  }),
  matrixRating: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional().meta({
    ui: { title: 'Оценка (rating)' },
  }),
})

const anchors = ['Совсем не согласен', 'Не согласен', 'Нейтрально', 'Согласен', 'Полностью согласен']
const rows = [{ value: 'speed', label: 'Скорость' }, { value: 'quality', label: 'Качество' }]
const columns = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
]

function Stage6TestForm() {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          { schema: stage6Schema, initialValue: {}, onSubmit: vi.fn() },
          {
            default: () => [
              h(FieldLikert, { name: 'satisfaction', anchors, showNumbers: true }),
              h(FieldMatrixChoice, { name: 'matrixRadio', rows, columns, variant: 'radio' }),
              h(FieldMatrixChoice, { name: 'matrixCheckbox', rows, columns, variant: 'checkbox' }),
              h(FieldMatrixChoice, { name: 'matrixRating', rows, columns, variant: 'rating' }),
            ],
          },
        )
    },
  })
}

describe('Этап 6 (часть 1) — Likert/MatrixChoice', () => {
  it('FieldLikert: рендерит radiogroup с точкой на каждый якорь', () => {
    const wrapper = mount(Stage6TestForm())
    const group = wrapper.find('[role="radiogroup"][data-field-name="satisfaction"]')

    expect(group.exists()).toBe(true)
    expect(group.findAll('[role="radio"]')).toHaveLength(anchors.length)
  })

  it('FieldLikert: клик по точке выставляет 1-based индекс и aria-checked', async () => {
    const wrapper = mount(Stage6TestForm())
    const options = wrapper.find('[data-field-name="satisfaction"]').findAll('[role="radio"]')

    await options[2]?.trigger('click')
    await nextTick()

    expect(options[2]?.attributes('aria-checked')).toBe('true')
    expect(options[0]?.attributes('aria-checked')).toBe('false')
  })

  it('FieldMatrixChoice (radio): таблица содержит строку на каждый row и колонку на каждый column', () => {
    const wrapper = mount(Stage6TestForm())
    const table = wrapper.find('table[data-field-name="matrixRadio"]')

    expect(table.exists()).toBe(true)
    expect(table.findAll('tbody tr')).toHaveLength(rows.length)
    expect(table.findAll('thead th')).toHaveLength(columns.length + 1)
  })

  it('FieldMatrixChoice (radio): клик по ячейке выставляет значение строки, только одно на строку', async () => {
    const wrapper = mount(Stage6TestForm())
    const table = wrapper.find('table[data-field-name="matrixRadio"]')
    const firstRowCells = table.findAll('tbody tr')[0]!.findAll('[role="radio"]')

    await firstRowCells[1]?.trigger('click')
    await nextTick()

    expect(firstRowCells[1]?.attributes('aria-checked')).toBe('true')
    expect(firstRowCells[0]?.attributes('aria-checked')).toBe('false')

    await firstRowCells[0]?.trigger('click')
    await nextTick()

    expect(firstRowCells[0]?.attributes('aria-checked')).toBe('true')
    expect(firstRowCells[1]?.attributes('aria-checked')).toBe('false')
  })

  it('FieldMatrixChoice (checkbox): позволяет выбрать несколько колонок в одной строке', async () => {
    const wrapper = mount(Stage6TestForm())
    const table = wrapper.find('table[data-field-name="matrixCheckbox"]')
    const firstRowCells = table.findAll('tbody tr')[0]!.findAll('input[type="checkbox"]')

    await firstRowCells[0]?.setValue(true)
    await firstRowCells[1]?.setValue(true)
    await nextTick()

    expect((firstRowCells[0]!.element as HTMLInputElement).checked).toBe(true)
    expect((firstRowCells[1]!.element as HTMLInputElement).checked).toBe(true)
  })

  it('FieldMatrixChoice (rating): клик по звезде отмечает её выбранной', async () => {
    const wrapper = mount(Stage6TestForm())
    const table = wrapper.find('table[data-field-name="matrixRating"]')
    const firstRowCells = table.findAll('tbody tr')[0]!.findAll('button')

    await firstRowCells[1]?.trigger('click')
    await nextTick()

    expect(firstRowCells[1]?.attributes('aria-pressed')).toBe('true')
  })
})
