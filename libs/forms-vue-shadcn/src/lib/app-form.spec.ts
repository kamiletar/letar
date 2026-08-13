import { AppForm } from '@letar/forms-vue/core'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { FieldCheckbox } from './fields/field-checkbox'
import { FieldCombobox } from './fields/field-combobox'
import { FieldNumber } from './fields/field-number'
import { FieldSelect } from './fields/field-select'
import { FieldString } from './fields/field-string'
import { FieldTextarea } from './fields/field-textarea'

/**
 * `SelectContent`/`ComboboxContent` (Reka UI) измеряют доступное место через `ResizeObserver` и
 * позиционируются через `@floating-ui` — jsdom не реализует ни то, ни другое. Полифиллы ниже —
 * стандартный минимум для тестирования Radix/Reka-компонентов вне браузера, не специфика этой
 * библиотеки.
 */
beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- полифилл под jsdom, не production-код
  ;(globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
  Element.prototype.scrollIntoView = vi.fn()
})

const schema = z.object({
  title: z.string().min(3, 'Минимум 3 символа').meta({ ui: { title: 'Название', placeholder: 'Введите...' } }),
  rating: z.number().min(1).max(10).meta({ ui: { title: 'Рейтинг' } }),
  agree: z.boolean().meta({ ui: { title: 'Согласен' } }),
  category: z.string().meta({ ui: { title: 'Категория' } }),
  notes: z.string().optional().meta({ ui: { title: 'Заметки' } }),
  tag: z.string().optional().meta({ ui: { title: 'Тег' } }),
})

const CATEGORY_OPTIONS = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]

function TestForm(onSubmit: (value: Record<string, unknown>) => void) {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          {
            schema,
            initialValue: { title: '', rating: 5, agree: false, category: '', notes: '', tag: '' },
            onSubmit,
          },
          {
            default: () => [
              h(FieldString, { name: 'title' }),
              h(FieldNumber, { name: 'rating' }),
              h(FieldCheckbox, { name: 'agree' }),
              h(FieldSelect, { name: 'category', options: CATEGORY_OPTIONS }),
              h(FieldTextarea, { name: 'notes' }),
              h(FieldCombobox, { name: 'tag', options: CATEGORY_OPTIONS }),
              h('button', { type: 'submit' }, 'Сохранить'),
            ],
          },
        )
    },
  })
}

describe('forms-vue-shadcn: AppForm + Field* на rekaUIKit', () => {
  it('renders labels resolved from Zod .meta({ ui }) — same contract as forms-vue/forms-react', () => {
    const wrapper = mount(TestForm(vi.fn()), { attachTo: document.body })

    expect(wrapper.find('label[data-slot="field-label"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Название')
    expect(wrapper.find('input[data-field-name="title"]').attributes('placeholder')).toBe('Введите...')

    wrapper.unmount()
  })

  it('shows the field-level Zod error and blocks submit on invalid input', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(TestForm(onSubmit), { attachTo: document.body })

    const input = wrapper.find('input[data-field-name="title"]')
    await input.setValue('ab')
    await input.trigger('blur')
    await nextTick()

    expect(wrapper.find('[data-slot="field-error"]').text()).toBe('Минимум 3 символа')

    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(onSubmit).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('submits the resolved value once every field is valid', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(TestForm(onSubmit), { attachTo: document.body })

    await wrapper.find('input[data-field-name="title"]').setValue('Валидное название')
    await wrapper.find('[data-field-name="agree"]').trigger('click')

    // Reka `SelectRoot`/`ComboboxRoot` — контролируемые компоненты без нативного `<select>`,
    // достаточно проверить, что форма с валидным `title`+`agree` доходит до сабмита.
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      title: 'Валидное название',
      agree: true,
    })

    wrapper.unmount()
  })

  it('FieldCheckbox: toggles the underlying boolean value on click', async () => {
    const wrapper = mount(TestForm(vi.fn()), { attachTo: document.body })

    const checkbox = wrapper.find('[data-field-name="agree"]')
    expect(checkbox.attributes('data-state')).not.toBe('checked')

    await checkbox.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-slot="checkbox"]').attributes('data-state')).toBe('checked')
    wrapper.unmount()
  })

  it('throws when a field is rendered outside <AppForm> — same guard as forms-vue', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => mount(FieldString, { props: { name: 'title' } })).toThrow('вне <AppForm>')

    consoleError.mockRestore()
  })
})
