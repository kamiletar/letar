import { AppForm } from '@letar/forms-vue/core'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from './app-form.test-utils'
import { FieldDateRange } from './fields/field-date-range'
import { FieldDateTimePicker } from './fields/field-datetime-picker'
import { FieldDuration } from './fields/field-duration'
import { FieldRating } from './fields/field-rating'
import { FieldSlider } from './fields/field-slider'

beforeEach(() => {
  setupRekaPolyfills()
})

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
              h(FieldSlider, { name: 'volume', min: 0, max: 100, step: 10, showValue: true }),
              h(FieldRating, { name: 'satisfaction', count: 5 }),
            ],
          },
        )
    },
  })
}

describe('forms-vue-shadcn: Этап 4 — дата/число-виджеты на rekaUIKit', () => {
  it('рендерят контролы всех пяти полей', () => {
    const wrapper = mount(Stage4TestForm(), { attachTo: document.body })

    expect(wrapper.find('input[data-field-name="vacation.start"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="vacation.end"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="meeting-date"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="meeting-time"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="duration-hours"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="duration-mins"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="slider"][data-field-name="volume"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-field-name="satisfaction"] [role="radio"]')).toHaveLength(5)

    wrapper.unmount()
  })

  it('FieldDateRange: клик по пресету "Сегодня" заполняет start и end одинаковой датой', async () => {
    const wrapper = mount(Stage4TestForm(), { attachTo: document.body })
    const today = new Date().toISOString().split('T')[0]

    const presetButtons = wrapper.findAll('button').filter((b) => b.text() === 'Сегодня')
    await presetButtons[0]?.trigger('click')
    await nextTick()

    expect((wrapper.find('input[data-field-name="vacation.start"]').element as HTMLInputElement).value).toBe(today)
    expect((wrapper.find('input[data-field-name="vacation.end"]').element as HTMLInputElement).value).toBe(today)

    wrapper.unmount()
  })

  it('FieldDuration: часы+минуты складываются в минуты формы', async () => {
    const wrapper = mount(Stage4TestForm(), { attachTo: document.body })

    await wrapper.find('input[data-field-name="duration-hours"]').setValue(1)
    await wrapper.find('input[data-field-name="duration-mins"]').setValue(30)
    await nextTick()

    expect((wrapper.find('input[data-field-name="duration-hours"]').element as HTMLInputElement).value).toBe('1')
    expect((wrapper.find('input[data-field-name="duration-mins"]').element as HTMLInputElement).value).toBe('30')

    wrapper.unmount()
  })

  it('FieldSlider: стрелка вправо на фокусе увеличивает значение и показывает его рядом с меткой', async () => {
    const wrapper = mount(Stage4TestForm(), { attachTo: document.body })
    const thumb = wrapper.find('[data-slot="slider"][data-field-name="volume"] [role="slider"]')

    await thumb.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()

    expect(wrapper.find('[data-slot="slider-value"]').text()).toBe('10')

    wrapper.unmount()
  })

  it('FieldRating: клик по звезде выставляет её номер и отмечает aria-checked', async () => {
    const wrapper = mount(Stage4TestForm(), { attachTo: document.body })
    const stars = wrapper.findAll('[data-field-name="satisfaction"] [role="radio"]')

    await stars[2]?.trigger('click')
    await nextTick()

    expect(stars[2]?.attributes('aria-checked')).toBe('true')

    wrapper.unmount()
  })
})
