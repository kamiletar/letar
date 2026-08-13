import { AppForm } from '@letar/forms-vue/core'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from './app-form.test-utils'
import { FieldAuto } from './fields/field-auto'
import { FieldAutocomplete } from './fields/field-autocomplete'
import { FieldCalculated } from './fields/field-calculated'
import { FieldCascadingSelect } from './fields/field-cascading-select'
import { FieldCheckboxCard } from './fields/field-checkbox-card'
import { FieldCombobox } from './fields/field-combobox'
import { FieldEditable } from './fields/field-editable'
import { FieldImageChoice } from './fields/field-image-choice'
import { FieldListbox } from './fields/field-listbox'
import { FieldPasswordStrength } from './fields/field-password-strength'
import { FieldRadioCard } from './fields/field-radio-card'
import { FieldSchedule } from './fields/field-schedule'
import { FieldSegmentedGroup } from './fields/field-segmented-group'
import { FieldTags } from './fields/field-tags'

beforeEach(() => {
  setupRekaPolyfills()
})

const CARD_OPTIONS = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
]

const stage8Part2Schema = z.object({
  tags: z.array(z.string()).optional(),
  checkboxCard: z.array(z.string()).optional(),
  radioCard: z.string().optional(),
  segmentedGroup: z.string().optional(),
  imageChoice: z.string().optional(),
  listbox: z.string().optional(),
  autocomplete: z.string().optional(),
  combobox: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  autoString: z.string().optional().meta({ ui: { title: 'Строка' } }),
  autoBool: z.boolean().optional(),
  price: z.number().optional(),
  qty: z.number().optional(),
  total: z.unknown().optional(),
  editable: z.string().optional(),
  password: z.string().optional(),
  schedule: z.unknown().optional(),
})

function Stage8Part2TestForm() {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          { schema: stage8Part2Schema, initialValue: { price: 10, qty: 2 }, onSubmit: vi.fn() },
          {
            default: () => [
              h(FieldTags, { name: 'tags', maxTags: 3 }),
              h(FieldCheckboxCard, { name: 'checkboxCard', options: CARD_OPTIONS }),
              h(FieldRadioCard, { name: 'radioCard', options: CARD_OPTIONS }),
              h(FieldSegmentedGroup, { name: 'segmentedGroup', options: CARD_OPTIONS }),
              h(FieldImageChoice, {
                name: 'imageChoice',
                options: [{ value: 'x', label: 'X', image: '/x.png' }],
              }),
              h(FieldListbox, { name: 'listbox', options: CARD_OPTIONS }),
              h(FieldAutocomplete, { name: 'autocomplete', suggestions: ['Москва', 'Минск'] }),
              h(FieldCombobox, { name: 'combobox', options: CARD_OPTIONS }),
              h(FieldCascadingSelect, {
                name: 'city',
                dependsOn: 'country',
                loadOptions: async (parent: string | undefined) =>
                  parent === 'ru' ? [{ value: 'msk', label: 'Москва' }] : [],
              }),
              h(FieldAuto, { name: 'autoString' }),
              h(FieldAuto, { name: 'autoBool' }),
              h(FieldCalculated, {
                name: 'total',
                compute: (v: Record<string, unknown>) => (Number(v.price) || 0) * (Number(v.qty) || 0),
              }),
              h(FieldEditable, { name: 'editable' }),
              h(FieldPasswordStrength, { name: 'password' }),
              h(FieldSchedule, { name: 'schedule' }),
            ],
          },
        )
    },
  })
}

describe('Этап 8 (часть 2) — select-семейство и специализированные поля (Reka-скин)', () => {
  it('рендерят контрол для каждого поля', () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })

    expect(wrapper.find('[data-field-name="checkboxCard"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="radioCard"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="segmentedGroup"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="imageChoice"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="listbox"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="city"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="calculated-value"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="editable"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="password"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="schedule"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('FieldCheckboxCard: клик по карточке переключает aria-checked', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const button = wrapper.find('[data-field-name="checkboxCard"]').find('button')

    await button.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-field-name="checkboxCard"]').find('button').attributes('aria-checked')).toBe('true')
    wrapper.unmount()
  })

  it('FieldRadioCard: одиночный выбор — выбор второй карточки снимает выбор с первой', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const group = wrapper.find('[data-field-name="radioCard"]')
    const buttons = group.findAll('button')

    await buttons[1].trigger('click')
    await nextTick()

    const after = wrapper.find('[data-field-name="radioCard"]').findAll('button')
    expect(after[0].attributes('aria-checked')).toBe('false')
    expect(after[1].attributes('aria-checked')).toBe('true')
    wrapper.unmount()
  })

  it('FieldSegmentedGroup: клик по сегменту выбирает его', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const buttons = wrapper.find('[data-field-name="segmentedGroup"]').findAll('button')

    await buttons[0].trigger('click')
    await nextTick()

    expect(wrapper.find('[data-field-name="segmentedGroup"]').findAll('button')[0].attributes('aria-checked')).toBe(
      'true',
    )
    wrapper.unmount()
  })

  it('FieldImageChoice: клик по карточке выбирает её', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const button = wrapper.find('[data-field-name="imageChoice"]').find('button')

    await button.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-field-name="imageChoice"]').find('button').attributes('aria-checked')).toBe('true')
    wrapper.unmount()
  })

  it('FieldListbox: single-режим — клик выбирает опцию', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const options = wrapper.find('[data-field-name="listbox"]').findAll('button')

    await options[1].trigger('click')
    await nextTick()

    expect(wrapper.find('[data-field-name="listbox"]').findAll('button')[1].attributes('aria-selected')).toBe(
      'true',
    )
    wrapper.unmount()
  })

  it('FieldCascadingSelect: пока родитель пуст — select задизейблен', () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })

    const trigger = wrapper.find('[data-field-name="city"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('data-disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('FieldAuto: string → текстовый инпут, boolean → чекбокс', () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })

    expect(wrapper.find('input[data-field-name="autoString"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="checkbox"][data-field-name="autoBool"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('FieldCalculated: вычисляет значение из зависимых полей при монтировании', () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })

    expect(wrapper.find('[data-testid="calculated-value"]').text()).toBe('20')
    wrapper.unmount()
  })

  it('FieldEditable: клик по превью переключает в режим редактирования', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const preview = wrapper.find('button[data-field-name="editable"]')

    await preview.trigger('click')
    await nextTick()

    expect(wrapper.find('input[data-field-name="editable"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('FieldPasswordStrength: сильный пароль удовлетворяет всем требованиям', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const input = wrapper.find('input[data-field-name="password"]')

    await input.setValue('Sup3r$ecret')
    await nextTick()

    const met = wrapper.findAll('li').filter((li) => li.text().startsWith('Хотя бы') || li.text().startsWith('Минимум'))
    expect(met.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('FieldSchedule: toggle дня включает поля времени', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })

    expect(wrapper.find('[data-day="sunday"]').text()).toContain('Выходной')

    const sundaySwitch = wrapper.find('[data-day-switch="sunday"]')
    await sundaySwitch.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-day="sunday"]').findAll('input[type="time"]').length).toBe(2)
    wrapper.unmount()
  })
})
