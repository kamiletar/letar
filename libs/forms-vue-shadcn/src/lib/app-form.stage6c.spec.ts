import { AppForm } from '@letar/forms-vue/core'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from './app-form.test-utils'
import { FieldDataGrid } from './fields/field-data-grid'

beforeEach(() => {
  setupRekaPolyfills()
})

const stage6cSchema = z.object({
  employees: z.array(
    z.object({
      name: z.string(),
      salary: z.number(),
    }),
  ),
})

const initialEmployees = [
  { name: 'Аня', salary: 100 },
  { name: 'Борис', salary: 300 },
  { name: 'Вера', salary: 200 },
]

function Stage6cTestForm(
  options: {
    onSubmit?: (value: unknown) => void
    pageSize?: number
    rowSelection?: boolean
    employees?: { name: string; salary: number }[]
  } = {},
) {
  const { onSubmit = vi.fn(), pageSize = 20, rowSelection = false, employees = initialEmployees } = options

  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          { schema: stage6cSchema, initialValue: { employees }, onSubmit },
          {
            default: () => [
              h(FieldDataGrid, {
                name: 'employees',
                columns: [
                  { name: 'name', filter: true },
                  { name: 'salary', align: 'right' },
                ],
                pageSize,
                rowSelection,
              }),
            ],
          },
        )
    },
  })
}

/**
 * `defineAsyncComponent`'s реальный `import()` под Vite/Vitest резолвится через несколько
 * макротасков — тот же тайминг, что у `FieldRichText` (Этап 5б) и headless `FieldDataGrid`.
 */
async function waitForLazyField() {
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 25))
    await flushPromises()
    await nextTick()
  }
}

describe('Этап 6 (часть 3) — FieldDataGrid (Reka-скин)', () => {
  it('загружается лениво и рендерит строку на каждый элемент массива', async () => {
    const wrapper = mount(Stage6cTestForm())
    await waitForLazyField()

    const table = wrapper.find('[data-field-name="employees"] table')
    expect(table.exists()).toBe(true)
    expect(table.findAll('tbody tr')).toHaveLength(3)
  })

  it('клик по заголовку сортирует строки по колонке', async () => {
    const wrapper = mount(Stage6cTestForm())
    await waitForLazyField()

    const nameHeader = wrapper.findAll('th').find((th) => th.text().includes('Name'))
    expect(nameHeader).toBeTruthy()

    await nameHeader!.trigger('click')
    await nextTick()

    const rowsAsc = wrapper.findAll('tbody tr')
    expect(rowsAsc[0]?.text()).toContain('Аня')

    await nameHeader!.trigger('click')
    await nextTick()

    const rowsDesc = wrapper.findAll('tbody tr')
    expect(rowsDesc[0]?.text()).toContain('Вера')
  })

  it('текстовый фильтр по колонке сужает строки', async () => {
    const wrapper = mount(Stage6cTestForm())
    await waitForLazyField()

    const filterInput = wrapper.find('input[placeholder*="Фильтр"]')
    expect(filterInput.exists()).toBe(true)

    await filterInput.setValue('Бор')
    await nextTick()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.text()).toContain('Борис')
  })

  it('пагинация ограничивает число строк на странице и переключается кнопками', async () => {
    const wrapper = mount(Stage6cTestForm({ pageSize: 2 }))
    await waitForLazyField()

    expect(wrapper.findAll('tbody tr')).toHaveLength(2)

    const nextButton = wrapper.findAll('button').find((btn) => btn.text().includes('Далее'))
    expect(nextButton).toBeTruthy()
    expect(nextButton!.attributes('disabled')).toBeUndefined()

    await nextButton!.trigger('click')
    await nextTick()

    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })

  it('инлайн-редактирование ячейки (клик → ввод → blur) записывает значение в форму', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(Stage6cTestForm({ onSubmit }))
    await waitForLazyField()

    const firstNameCell = wrapper.find('tbody tr td span')
    expect(firstNameCell.exists()).toBe(true)
    expect(firstNameCell.text()).toBe('Аня')

    await firstNameCell.trigger('click')
    await nextTick()

    const input = wrapper.find('tbody tr td input')
    expect(input.exists()).toBe(true)

    await input.setValue('Анна')
    await input.trigger('blur')
    await nextTick()

    expect(wrapper.find('tbody tr td span').text()).toBe('Анна')
  })

  it('row-selection + bulk-delete убирает выбранные строки из формы', async () => {
    const wrapper = mount(Stage6cTestForm({ rowSelection: true }))
    await waitForLazyField()

    expect(wrapper.findAll('tbody tr')).toHaveLength(3)

    // `rekaUIKit.Checkbox` рендерит `CheckboxRoot` (Reka UI) — кнопка с `role="checkbox"`,
    // не нативный `<input type="checkbox">` (в отличие от headless-версии).
    const checkboxes = wrapper.findAll('tbody [role="checkbox"]')
    expect(checkboxes.length).toBeGreaterThanOrEqual(1)

    await checkboxes[0]!.trigger('click')
    await nextTick()

    const deleteButton = wrapper.findAll('button').find((btn) => btn.text().includes('Удалить выбранные'))
    expect(deleteButton).toBeTruthy()
    expect(deleteButton!.text()).toContain('(1)')

    await deleteButton!.trigger('click')
    await nextTick()

    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('рендерит кнопку CSV-экспорта без падения (не проверяем сам файл)', async () => {
    const wrapper = mount(Stage6cTestForm())
    await waitForLazyField()

    const exportButton = wrapper.findAll('button').find((btn) => btn.text().includes('CSV'))
    expect(exportButton).toBeTruthy()
  })
})
