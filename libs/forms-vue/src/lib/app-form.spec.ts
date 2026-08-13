import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { AppForm } from './core/app-form'
import { FieldCheckbox } from './fields/field-checkbox'
import { FieldCurrency } from './fields/field-currency'
import { FieldDate } from './fields/field-date'
import { FieldHidden } from './fields/field-hidden'
import { FieldInput } from './fields/field-input'
import { FieldNativeSelect } from './fields/field-native-select'
import { FieldNumber } from './fields/field-number'
import { FieldNumberInput } from './fields/field-number-input'
import { FieldPassword } from './fields/field-password'
import { FieldPercentage } from './fields/field-percentage'
import { FieldRadioGroup } from './fields/field-radio-group'
import { FieldSelect } from './fields/field-select'
import { FieldSwitch } from './fields/field-switch'
import { FieldTextarea } from './fields/field-textarea'
import { FieldTime } from './fields/field-time'
import { FieldYesNo } from './fields/field-yes-no'

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

const stage1Schema = z.object({
  quantity: z.number().meta({ ui: { title: 'Количество' } }),
  password: z.string().meta({ ui: { title: 'Пароль' } }),
  notifications: z.boolean().meta({ ui: { title: 'Уведомления' } }),
  size: z.string().meta({ ui: { title: 'Размер' } }),
  type: z.string().meta({ ui: { title: 'Тип' } }),
  utm: z.string().optional(),
  agree: z.boolean().optional().meta({ ui: { title: 'Согласны?' } }),
  birthDate: z.string().meta({ ui: { title: 'Дата рождения' } }),
  startTime: z.string().meta({ ui: { title: 'Время начала' } }),
  price: z.number().optional().meta({ ui: { title: 'Цена' } }),
  discount: z.number().optional().meta({ ui: { title: 'Скидка' } }),
})

function Stage1TestForm() {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          {
            schema: stage1Schema,
            initialValue: {
              quantity: 1,
              password: '',
              notifications: false,
              size: '',
              type: '',
              utm: undefined,
              agree: undefined,
              birthDate: '',
              startTime: '',
              price: undefined,
              discount: undefined,
            },
            onSubmit: vi.fn(),
          },
          {
            default: () => [
              h(FieldNumberInput, { name: 'quantity', min: 1, max: 10 }),
              h(FieldPassword, { name: 'password' }),
              h(FieldSwitch, { name: 'notifications' }),
              h(FieldRadioGroup, {
                name: 'size',
                options: [{ value: 'sm', label: 'S' }, { value: 'lg', label: 'L' }],
              }),
              h(FieldNativeSelect, {
                name: 'type',
                options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
              }),
              h(FieldHidden, { name: 'utm', value: 'ABC123' }),
              h(FieldYesNo, { name: 'agree' }),
              h(FieldDate, { name: 'birthDate' }),
              h(FieldTime, { name: 'startTime' }),
              h(FieldCurrency, { name: 'price' }),
              h(FieldPercentage, { name: 'discount' }),
            ],
          },
        )
    },
  })
}

describe('Этап 1 — новые нативные поля', () => {
  it('рендерят метку из схемы и участвуют в form state', async () => {
    const wrapper = mount(Stage1TestForm())

    expect(wrapper.find('label[for="quantity"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('input[role="switch"]').exists()).toBe(true)
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
    expect(wrapper.find('select#type').exists()).toBe(true)
    expect(wrapper.find('input[type="date"]').exists()).toBe(true)
    expect(wrapper.find('input[type="time"]').exists()).toBe(true)

    // FieldHidden не рендерит DOM-узел, но синхронизирует value с form state
    await nextTick()
    expect(wrapper.find('[data-field-name="utm"]').exists()).toBe(false)
  })

  it('переключает видимость пароля по клику', async () => {
    const wrapper = mount(Stage1TestForm())
    const input = wrapper.find('input[type="password"]')

    await wrapper.find('button[aria-label="Toggle password visibility"]').trigger('click')

    expect(input.attributes('type')).toBe('text')
  })

  it('YesNo выставляет boolean по клику на блок', async () => {
    const wrapper = mount(Stage1TestForm())

    const yesOption = wrapper.findAll('[role="radio"]')[0]
    await yesOption?.trigger('click')

    expect(yesOption?.attributes('aria-checked')).toBe('true')
  })

  it('RadioGroup выбирает значение по клику', async () => {
    const wrapper = mount(Stage1TestForm())
    const secondRadio = wrapper.findAll('input[type="radio"]')[1]
    if (!secondRadio) {
      throw new Error('второй radio не найден')
    }

    await secondRadio.setValue()

    expect((secondRadio.element as HTMLInputElement).checked).toBe(true)
  })
})
