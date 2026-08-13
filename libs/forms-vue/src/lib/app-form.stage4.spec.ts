import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { AppForm } from './core/app-form'
import { FieldDateRange } from './fields/field-date-range'
import { FieldDateTimePicker } from './fields/field-datetime-picker'
import { FieldDuration } from './fields/field-duration'
import { FieldRating } from './fields/field-rating'
import { FieldSlider } from './fields/field-slider'

const stage4Schema = z.object({
  vacation: z.any().optional().meta({ ui: { title: 'Отпуск' } }),
  meeting: z.string().optional().meta({ ui: { title: 'Встреча' } }),
  duration: z.number().optional().meta({ ui: { title: 'Длительность' } }),
  volume: z.number().optional().meta({ ui: { title: 'Громкость' } }),
  satisfaction: z.number().optional().meta({ ui: { title: 'Оценка' } }),
})

function Stage4TestForm() {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          { schema: stage4Schema, initialValue: {}, onSubmit: vi.fn() },
          {
            default: () => [
              h(FieldDateRange, { name: 'vacation', presets: ['today', 'thisWeek'] }),
              h(FieldDateTimePicker, { name: 'meeting' }),
              h(FieldDuration, { name: 'duration' }),
              h(FieldSlider, { name: 'volume', min: 0, max: 100, showValue: true }),
              h(FieldRating, { name: 'satisfaction', count: 5 }),
            ],
          },
        )
    },
  })
}

describe('Этап 4 — дата/число-виджеты', () => {
  it('рендерят контролы всех пяти полей', () => {
    const wrapper = mount(Stage4TestForm())

    expect(wrapper.find('input[data-field-name="vacation.start"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="vacation.end"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="meeting-date"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="meeting-time"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="duration-hours"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="duration-mins"]').exists()).toBe(true)
    expect(wrapper.find('input[type="range"][data-field-name="volume"]').exists()).toBe(true)
    expect(wrapper.find('[data-field-name="satisfaction"] [role="radiogroup"]').exists()).toBe(true)
  })

  it('FieldDateRange: клик по пресету "Сегодня" заполняет start и end одинаковой датой', async () => {
    const wrapper = mount(Stage4TestForm())
    const today = new Date().toISOString().split('T')[0]

    await wrapper.findAll('.letar-field__date-range-preset')[0]?.trigger('click')
    await nextTick()

    expect((wrapper.find('input[data-field-name="vacation.start"]').element as HTMLInputElement).value).toBe(today)
    expect((wrapper.find('input[data-field-name="vacation.end"]').element as HTMLInputElement).value).toBe(today)
  })

  it('FieldDateTimePicker: комбинирует дату и время в ISO-строку', async () => {
    const wrapper = mount(Stage4TestForm())

    await wrapper.find('input[data-field-name="meeting-date"]').setValue('2026-08-13')
    await wrapper.find('input[data-field-name="meeting-time"]').setValue('14:30')
    await nextTick()

    expect((wrapper.find('input[data-field-name="meeting-time"]').element as HTMLInputElement).value).toBe('14:30')
  })

  it('FieldDuration: часы+минуты складываются в минуты формы', async () => {
    const wrapper = mount(Stage4TestForm())

    await wrapper.find('input[data-field-name="duration-hours"]').setValue(1)
    await wrapper.find('input[data-field-name="duration-mins"]').setValue(30)
    await nextTick()

    expect((wrapper.find('input[data-field-name="duration-hours"]').element as HTMLInputElement).value).toBe('1')
    expect((wrapper.find('input[data-field-name="duration-mins"]').element as HTMLInputElement).value).toBe('30')
  })

  it('FieldSlider: перемещение ползунка обновляет значение и показывает его рядом с меткой', async () => {
    const wrapper = mount(Stage4TestForm())
    const slider = wrapper.find('input[type="range"][data-field-name="volume"]')

    await slider.setValue('42')
    await nextTick()

    expect(wrapper.find('.letar-field__slider-value').text()).toBe('42')
  })

  it('FieldRating: клик по звезде выставляет её номер и отмечает aria-checked', async () => {
    const wrapper = mount(Stage4TestForm())
    const stars = wrapper.findAll('[data-field-name="satisfaction"] button')

    await stars[2]?.trigger('click')
    await nextTick()

    expect(stars[2]?.attributes('aria-checked')).toBe('true')
    expect(stars[0]?.attributes('data-selected')).toBe('true')
    expect(stars[3]?.attributes('data-selected')).toBe('false')
  })
})
