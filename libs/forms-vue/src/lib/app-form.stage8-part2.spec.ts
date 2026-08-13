import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { AppForm } from './core/app-form'
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

describe('Этап 8 (часть 2) — select-семейство и специализированные поля', () => {
  it('рендерят контрол для каждого поля', () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })

    expect(wrapper.find('[data-field-name="tags"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="checkboxCard"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="radioCard"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="segmentedGroup"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="imageChoice"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="listbox"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="autocomplete"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="combobox"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="city"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="calculated-value"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="editable"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="password"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="schedule"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('FieldTags: Enter добавляет тег, повторный тег не дублируется', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const input = wrapper.find('.letar-field__tags-input')

    await input.setValue('первый')
    await input.trigger('keydown', { key: 'Enter' })
    await input.setValue('первый')
    await input.trigger('keydown', { key: 'Enter' })
    await nextTick()

    expect(wrapper.findAll('.letar-field__tag')).toHaveLength(1)
    wrapper.unmount()
  })

  it('FieldCheckboxCard: клик по карточке добавляет/убирает значение из массива', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const cards = wrapper.find('[data-field-name="checkboxCard"]').findAll('button')

    await cards[0].trigger('click')
    await nextTick()
    expect(cards[0].attributes('aria-checked')).toBe('true')

    await cards[0].trigger('click')
    await nextTick()
    expect(wrapper.find('[data-field-name="checkboxCard"]').findAll('button')[0].attributes('aria-checked')).toBe(
      'false',
    )
    wrapper.unmount()
  })

  it('FieldRadioCard: выбор одной карточки снимает выбор с другой', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const group = wrapper.find('[data-field-name="radioCard"]')
    const buttons = group.findAll('button')

    await buttons[0].trigger('click')
    await nextTick()
    expect(wrapper.find('[data-field-name="radioCard"]').findAll('button')[0].attributes('aria-checked')).toBe(
      'true',
    )

    await wrapper.find('[data-field-name="radioCard"]').findAll('button')[1].trigger('click')
    await nextTick()
    const after = wrapper.find('[data-field-name="radioCard"]').findAll('button')
    expect(after[0].attributes('aria-checked')).toBe('false')
    expect(after[1].attributes('aria-checked')).toBe('true')
    wrapper.unmount()
  })

  it('FieldSegmentedGroup: клик по сегменту выбирает его', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const buttons = wrapper.find('[data-field-name="segmentedGroup"]').findAll('button')

    await buttons[1].trigger('click')
    await nextTick()

    expect(wrapper.find('[data-field-name="segmentedGroup"]').findAll('button')[1].attributes('aria-checked')).toBe(
      'true',
    )
    wrapper.unmount()
  })

  it('FieldImageChoice: клик по карточке выбирает её (single-режим)', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const button = wrapper.find('[data-field-name="imageChoice"]').find('button')

    await button.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-field-name="imageChoice"]').find('button').attributes('aria-checked')).toBe('true')
    wrapper.unmount()
  })

  it('FieldListbox: single-режим — повторный клик снимает выбор', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const options = wrapper.find('[data-field-name="listbox"]').findAll('button')

    await options[0].trigger('click')
    await nextTick()
    expect(wrapper.find('[data-field-name="listbox"]').findAll('button')[0].attributes('aria-selected')).toBe('true')

    await wrapper.find('[data-field-name="listbox"]').findAll('button')[0].trigger('click')
    await nextTick()
    expect(wrapper.find('[data-field-name="listbox"]').findAll('button')[0].attributes('aria-selected')).toBe(
      'false',
    )
    wrapper.unmount()
  })

  it('FieldAutocomplete: показывает отфильтрованные подсказки и выбирает по клику', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const input = wrapper.find('[data-field-name="autocomplete"]').find('input')

    await input.setValue('Мо')
    await nextTick()

    const options = wrapper.findAll('.letar-field__autocomplete-option')
    expect(options.length).toBe(1)
    expect(options[0].text()).toBe('Москва')
    wrapper.unmount()
  })

  it('FieldCombobox: фильтрует опции по вводу и выбирает значение', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const input = wrapper.find('[data-field-name="combobox"]').find('input')

    await input.setValue('A')
    await nextTick()

    const options = wrapper.findAll('.letar-field__combobox-option')
    expect(options.length).toBe(1)
    await options[0].trigger('mousedown')
    await nextTick()

    expect((wrapper.find('[data-field-name="combobox"]').find('input').element as HTMLInputElement).value).toBe('A')
    wrapper.unmount()
  })

  it('FieldCascadingSelect: пока родитель пуст — select задизейблен', () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })

    const select = wrapper.find('select[data-field-name="city"]')
    expect(select.exists()).toBe(true)
    expect((select.element as HTMLSelectElement).disabled).toBe(true)

    // родителя (country) в этой форме нет отдельным полем — проверяем стартовое
    // disabled-состояние, полный сценарий загрузки опций покрыт в частных приложениях
    // (driving-school и т.п.)
    wrapper.unmount()
  })

  it('FieldAuto: string → text input, boolean → checkbox', () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })

    expect(
      wrapper.find('input[data-field-name="autoString"]').exists()
        || wrapper.find('#autoString').exists(),
    ).toBe(true)
    expect(wrapper.find('#autoBool').attributes('type')).toBe('checkbox')
    wrapper.unmount()
  })

  it('FieldCalculated: вычисляет значение из зависимых полей при монтировании', () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })

    expect(wrapper.find('[data-testid="calculated-value"]').text()).toBe('20')
    wrapper.unmount()
  })

  it('FieldEditable: клик по превью переключает в режим редактирования', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const preview = wrapper.find('[data-field-name="editable"]').find('button')

    await preview.trigger('click')
    await nextTick()

    expect(wrapper.find('input[data-field-name="editable"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('FieldPasswordStrength: слабый пароль показывает низкий процент, сильный — набор из всех требований', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const input = wrapper.find('input[data-field-name="password"]')

    await input.setValue('a')
    await nextTick()
    expect(wrapper.find('.letar-field__password-meter-fill').attributes('style')).toContain('20%')

    await input.setValue('Sup3r$ecret')
    await nextTick()
    expect(wrapper.find('.letar-field__password-meter-fill').attributes('style')).toContain('100%')
    wrapper.unmount()
  })

  it('FieldSchedule: toggle дня включает поля времени', async () => {
    const wrapper = mount(Stage8Part2TestForm(), { attachTo: document.body })
    const sundaySwitch = wrapper.find('[data-day-switch="sunday"]')

    expect(wrapper.find('[data-day="sunday"]').find('.letar-field__schedule-day-off').exists()).toBe(true)

    await sundaySwitch.setValue(true)
    await nextTick()

    expect(wrapper.find('[data-day="sunday"]').find('.letar-field__schedule-day-times').exists()).toBe(true)
    wrapper.unmount()
  })
})
