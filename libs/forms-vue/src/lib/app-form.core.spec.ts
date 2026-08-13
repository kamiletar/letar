import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { AppForm } from './core/app-form'
import { FieldCheckbox } from './fields/field-checkbox'
import { FieldInput } from './fields/field-input'
import { FieldNumber } from './fields/field-number'
import { FieldSelect } from './fields/field-select'
import { FieldTextarea } from './fields/field-textarea'

const schema = z.object({
  title: z.string().min(3, 'Минимум 3 символа').meta({ ui: { title: 'Название', placeholder: 'Введите...' } }),
  rating: z.number().min(1).max(10).meta({ ui: { title: 'Рейтинг' } }),
  agree: z.boolean().meta({ ui: { title: 'Согласен' } }),
  category: z.string().meta({ ui: { title: 'Категория' } }),
  notes: z.string().optional().meta({ ui: { title: 'Заметки' } }),
})

function TestForm(onSubmit: (value: Record<string, unknown>) => void) {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          {
            schema,
            initialValue: { title: '', rating: 5, agree: false, category: '', notes: '' },
            onSubmit,
          },
          {
            default: () => [
              h(FieldInput, { name: 'title' }),
              h(FieldNumber, { name: 'rating' }),
              h(FieldCheckbox, { name: 'agree' }),
              h(FieldSelect, {
                name: 'category',
                options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
              }),
              h(FieldTextarea, { name: 'notes' }),
              h('button', { type: 'submit' }, 'Сохранить'),
            ],
          },
        )
    },
  })
}

describe('AppForm + Field*', () => {
  it('renders labels resolved from Zod .meta({ ui }) — same contract as the React skin', () => {
    const wrapper = mount(TestForm(vi.fn()))

    expect(wrapper.find('label[for="title"]').text()).toBe('Название *')
    expect(wrapper.find('input[name="title"]').attributes('placeholder')).toBe('Введите...')
    expect(wrapper.find('label[for="rating"]').text()).toBe('Рейтинг *')
  })

  it('shows the field-level Zod error and blocks submit on invalid input', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(TestForm(onSubmit))

    const input = wrapper.find('input[name="title"]')
    await input.setValue('ab')
    await input.trigger('blur')
    await nextTick()

    expect(wrapper.find('[data-field-name="title"] .letar-field__error').text()).toBe('Минимум 3 символа')

    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the resolved value once every field is valid', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(TestForm(onSubmit))

    await wrapper.find('input[name="title"]').setValue('Валидное название')
    await wrapper.find('select[name="category"]').setValue('a')
    await wrapper.find('input[name="agree"]').setValue(true)
    await nextTick()

    await wrapper.find('form').trigger('submit')
    // `handleSubmit` валидирует все поля параллельно (в т.ч. onChange-валидаторы,
    // которые сами резолвятся асинхронно) — одного `nextTick` недостаточно.
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      title: 'Валидное название',
      category: 'a',
      agree: true,
    })
  })

  it('throws when a field is rendered outside <AppForm> — same guard as forms-react', () => {
    // подавляем ожидаемый console.error от Vue при выбросе внутри setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => mount(FieldInput, { props: { name: 'title' } })).toThrow('вне <AppForm>')

    consoleError.mockRestore()
  })
})
