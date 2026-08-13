import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { AppForm } from './core/app-form'
import { FieldCurrency } from './fields/field-currency'
import { FieldDate } from './fields/field-date'
import { FieldHidden } from './fields/field-hidden'
import { FieldNativeSelect } from './fields/field-native-select'
import { FieldNumberInput } from './fields/field-number-input'
import { FieldPassword } from './fields/field-password'
import { FieldPercentage } from './fields/field-percentage'
import { FieldRadioGroup } from './fields/field-radio-group'
import { FieldSwitch } from './fields/field-switch'
import { FieldTime } from './fields/field-time'
import { FieldYesNo } from './fields/field-yes-no'

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
