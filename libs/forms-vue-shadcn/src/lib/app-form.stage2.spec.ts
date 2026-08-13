import { AppForm } from '@letar/forms-vue/core'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from './app-form.test-utils'
import { FieldNativeSelect } from './fields/field-native-select'
import { FieldRadioGroup } from './fields/field-radio-group'
import { FieldSwitch } from './fields/field-switch'

beforeEach(() => {
  setupRekaPolyfills()
})

const stage2Schema = z.object({
  plan: z.string().optional().meta({ ui: { title: 'Тариф' } }),
  country: z.string().optional().meta({ ui: { title: 'Страна' } }),
  notify: z.boolean().optional().meta({ ui: { title: 'Уведомления' } }),
})

const PLAN_OPTIONS = [{ value: 'basic', label: 'Базовый' }, { value: 'pro', label: 'Про' }]
const COUNTRY_OPTIONS = [{ value: 'ru', label: 'Россия' }, { value: 'by', label: 'Беларусь' }]

function Stage2TestForm() {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          { schema: stage2Schema, initialValue: {}, onSubmit: vi.fn() },
          {
            default: () => [
              h(FieldRadioGroup, { name: 'plan', options: PLAN_OPTIONS }),
              h(FieldNativeSelect, { name: 'country', options: COUNTRY_OPTIONS }),
              h(FieldSwitch, { name: 'notify' }),
            ],
          },
        )
    },
  })
}

describe('forms-vue-shadcn: Этап 2 — select-family на rekaUIKit', () => {
  it('рендерят метку и контрол для каждого поля', () => {
    const wrapper = mount(Stage2TestForm(), { attachTo: document.body })

    expect(wrapper.findAll('[data-field-name="plan"] [role="radio"]')).toHaveLength(2)
    expect(wrapper.find('select[data-field-name="country"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="country"] option')).toBeTruthy()
    expect(wrapper.find('button[data-slot="switch"][data-field-name="notify"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('FieldRadioGroup: клик по опции выставляет значение поля', async () => {
    const wrapper = mount(Stage2TestForm(), { attachTo: document.body })

    const options = wrapper.findAll('[data-field-name="plan"] [role="radio"]')
    await options[1]?.trigger('click')
    await nextTick()

    expect(options[1]?.attributes('data-state')).toBe('checked')
    wrapper.unmount()
  })

  it('FieldNativeSelect: выбор опции вызывает handleChange', async () => {
    const wrapper = mount(Stage2TestForm(), { attachTo: document.body })

    const select = wrapper.find('select[data-field-name="country"]')
    await select.setValue('by')
    await nextTick()

    expect((select.element as HTMLSelectElement).value).toBe('by')
    wrapper.unmount()
  })

  it('FieldSwitch: клик переключает состояние', async () => {
    const wrapper = mount(Stage2TestForm(), { attachTo: document.body })

    const toggle = wrapper.find('button[data-field-name="notify"]')
    expect(toggle.attributes('data-state')).not.toBe('checked')

    await toggle.trigger('click')
    await nextTick()

    expect(wrapper.find('button[data-field-name="notify"]').attributes('data-state')).toBe('checked')
    wrapper.unmount()
  })
})
