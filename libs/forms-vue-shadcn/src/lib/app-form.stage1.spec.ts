import { AppForm } from '@letar/forms-vue/core'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from './app-form.test-utils'
import { FieldCurrency } from './fields/field-currency'
import { FieldDate } from './fields/field-date'
import { FieldHidden } from './fields/field-hidden'
import { FieldNumberInput } from './fields/field-number-input'
import { FieldPassword } from './fields/field-password'
import { FieldPercentage } from './fields/field-percentage'
import { FieldTime } from './fields/field-time'
import { FieldYesNo } from './fields/field-yes-no'

beforeEach(() => {
  setupRekaPolyfills()
})

const stage1Schema = z.object({
  quantity: z.number().optional().meta({ ui: { title: 'Количество' } }),
  password: z.string().optional().meta({ ui: { title: 'Пароль' } }),
  birthDate: z.string().optional().meta({ ui: { title: 'Дата рождения' } }),
  startTime: z.string().optional().meta({ ui: { title: 'Время начала' } }),
  price: z.number().optional().meta({ ui: { title: 'Цена' } }),
  discount: z.number().optional().meta({ ui: { title: 'Скидка' } }),
  utm: z.string().optional(),
  agree: z.boolean().optional().meta({ ui: { title: 'Согласны?' } }),
})

function Stage1TestForm() {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          { schema: stage1Schema, initialValue: {}, onSubmit: vi.fn() },
          {
            default: () => [
              h(FieldNumberInput, { name: 'quantity', min: 1, max: 10 }),
              h(FieldPassword, { name: 'password' }),
              h(FieldDate, { name: 'birthDate' }),
              h(FieldTime, { name: 'startTime' }),
              h(FieldCurrency, { name: 'price' }),
              h(FieldPercentage, { name: 'discount' }),
              h(FieldHidden, { name: 'utm', value: 'ABC123' }),
              h(FieldYesNo, { name: 'agree' }),
            ],
          },
        )
    },
  })
}

describe('forms-vue-shadcn: Этап 1 — новые поля на rekaUIKit', () => {
  it('рендерят метку и контрол для каждого поля', () => {
    const wrapper = mount(Stage1TestForm(), { attachTo: document.body })

    expect(wrapper.find('input[data-field-name="quantity"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('input[type="date"]').exists()).toBe(true)
    expect(wrapper.find('input[type="time"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="price"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="discount"]').exists()).toBe(true)
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(2)

    wrapper.unmount()
  })

  it('FieldPassword переключает видимость по клику', async () => {
    const wrapper = mount(Stage1TestForm(), { attachTo: document.body })
    const input = wrapper.find('input[type="password"]')

    await wrapper.find('button[aria-label="Toggle password visibility"]').trigger('click')

    expect(input.attributes('type')).toBe('text')
    wrapper.unmount()
  })
})
