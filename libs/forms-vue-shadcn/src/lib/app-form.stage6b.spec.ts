import { AppForm } from '@letar/forms-vue/core'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from './app-form.test-utils'
import { FieldTableEditor } from './fields/field-table-editor'

beforeEach(() => {
  setupRekaPolyfills()
})

const stage6bSchema = z.object({
  items: z.array(
    z.object({
      product: z.string(),
      qty: z.number(),
    }),
  ).max(5),
})

function Stage6bTestForm(onSubmit = vi.fn()) {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          {
            schema: stage6bSchema,
            initialValue: { items: [{ product: 'Товар 1', qty: 2 }, { product: 'Товар 2', qty: 5 }] },
            onSubmit,
          },
          {
            default: () => [
              h(FieldTableEditor, { name: 'items', addLabel: 'Добавить строку', sortable: true, selectable: true }),
            ],
          },
        )
    },
  })
}

describe('Этап 6 (часть 2) — FieldTableEditor (Reka/Tailwind)', () => {
  it('рендерит заголовок из auto-колонок schema и строку на каждый элемент массива', () => {
    const wrapper = mount(Stage6bTestForm())
    const table = wrapper.find('[data-field-name="items"] table')

    expect(table.exists()).toBe(true)
    expect(table.findAll('tbody tr[data-row-index]')).toHaveLength(2)
    expect(table.findAll('thead th').length).toBeGreaterThanOrEqual(2)
  })

  it('кнопка «Добавить строку» пушит дефолтную строку в форму', async () => {
    const wrapper = mount(Stage6bTestForm())
    const addButton = wrapper.findAll('button').find((b) => b.text().includes('Добавить строку'))

    await addButton?.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-field-name="items"] table').findAll('tbody tr[data-row-index]')).toHaveLength(3)
  })

  it('кнопка удаления строки убирает её из формы', async () => {
    const wrapper = mount(Stage6bTestForm())
    const table = wrapper.find('[data-field-name="items"] table')

    const removeButtons = table.findAll('button[aria-label="Удалить строку"]')
    await removeButtons[0]?.trigger('click')
    await nextTick()

    expect(table.findAll('tbody tr[data-row-index]')).toHaveLength(1)
  })

  it('редактирование ячейки (клик → ввод → blur) меняет значение формы', async () => {
    const wrapper = mount(Stage6bTestForm())
    const table = wrapper.find('[data-field-name="items"] table')

    const productCell = table.find('td[data-row="0"][data-col="0"]')
    await productCell.trigger('click')
    await nextTick()

    const input = table.find('td[data-row="0"][data-col="0"] input')
    expect(input.exists()).toBe(true)

    await input.setValue('Обновлённый товар')
    await input.trigger('blur')
    await nextTick()

    expect(table.find('td[data-row="0"][data-col="0"]').text()).toContain('Обновлённый товар')
  })

  it('drag&drop переставляет строки местами', async () => {
    const wrapper = mount(Stage6bTestForm())
    const table = wrapper.find('[data-field-name="items"] table')
    const rowsBefore = table.findAll('tbody tr[data-row-index]')

    expect(rowsBefore[0]?.text()).toContain('Товар 1')
    expect(rowsBefore[1]?.text()).toContain('Товар 2')

    await rowsBefore[0]?.trigger('dragstart')
    await rowsBefore[1]?.trigger('dragover')
    await rowsBefore[1]?.trigger('drop')
    await nextTick()

    const reordered = table.findAll('tbody tr[data-row-index]')
    expect(reordered[0]?.text()).toContain('Товар 2')
    expect(reordered[1]?.text()).toContain('Товар 1')
  })

  it('copy-paste TSV добавляет строки из буфера обмена', async () => {
    const wrapper = mount(Stage6bTestForm())
    const container = wrapper.find('[data-field-name="items"]')

    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { getData: () => 'Товар 3\t7\nТовар 4\t9' },
    })
    Object.defineProperty(pasteEvent, 'target', { value: container.element })
    container.element.dispatchEvent(pasteEvent)
    await nextTick()

    const table = wrapper.find('[data-field-name="items"] table')
    expect(table.findAll('tbody tr[data-row-index]')).toHaveLength(4)
    expect(table.text()).toContain('Товар 3')
    expect(table.text()).toContain('Товар 4')
  })
})
