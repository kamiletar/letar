import { AppForm, FormGroup } from '@letar/forms-vue/core'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { FieldString } from './fields/field-string'
import { FormStepsCompleted } from './steps/form-steps-completed'
import { FormStepsIndicator } from './steps/form-steps-indicator'
import { FormStepsNavigation } from './steps/form-steps-navigation'
import { FormSteps } from './steps/form-steps-root'
import { FormStepsStep } from './steps/form-steps-step'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('Этап 6 (часть 4) — Form.Group', () => {
  const groupSchema = z.object({
    info: z.object({
      base: z.object({
        title: z.string(),
      }),
    }),
  })

  function GroupTestForm(onSubmit: (value: unknown) => void) {
    return defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            { schema: groupSchema, initialValue: { info: { base: { title: '' } } }, onSubmit },
            {
              default: () => [
                h(FormGroup, { name: 'info' }, () => [
                  h(FormGroup, { name: 'base' }, () => [
                    h(FieldString, { name: 'title' }),
                  ]),
                ]),
                h('button', { type: 'submit' }, 'Отправить'),
              ],
            },
          )
      },
    })
  }

  it('поле внутри вложенного FormGroup пишет значение по dot-пути', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(GroupTestForm(onSubmit))

    await wrapper.find('input').setValue('Заголовок')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(onSubmit).toHaveBeenCalledWith({ info: { base: { title: 'Заголовок' } } })
  })

  it('без FormGroup путь поля остаётся плоским (нет регрессии для обычных полей)', async () => {
    const flatSchema = z.object({ title: z.string() })
    const onSubmit = vi.fn()

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              AppForm,
              { schema: flatSchema, initialValue: { title: '' }, onSubmit },
              {
                default: () => [h(FieldString, { name: 'title' }), h('button', { type: 'submit' }, 'Отправить')],
              },
            )
        },
      }),
    )

    await wrapper.find('input').setValue('Плоский')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Плоский' })
  })
})

describe('Этап 6 (часть 4) — Form.Steps', () => {
  const stepsSchema = z.object({
    firstName: z.string().min(1, 'Обязательное поле'),
    email: z.string(),
  })

  function StepsTestForm(
    options: { onSubmit?: (value: unknown) => void; stepPersistence?: { key: string; debounceMs?: number } } = {},
  ) {
    const { onSubmit = vi.fn(), stepPersistence } = options

    return defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            { schema: stepsSchema, initialValue: { firstName: '', email: '' }, onSubmit },
            {
              default: () => [
                h(FormSteps, { stepPersistence }, () => [
                  h(FormStepsIndicator),
                  h(FormStepsStep, { title: 'Шаг 1' }, () => [h(FieldString, { name: 'firstName' })]),
                  h(FormStepsStep, { title: 'Шаг 2' }, () => [h(FieldString, { name: 'email' })]),
                  h(FormStepsNavigation),
                  h(FormStepsCompleted, () => ['Готово']),
                ]),
              ],
            },
          )
      },
    })
  }

  beforeEach(() => {
    localStorage.clear()
  })

  it('рендерит только поле активного шага', () => {
    const wrapper = mount(StepsTestForm())

    expect(wrapper.findAll('input')).toHaveLength(1)
    expect(wrapper.find('[data-step-index="0"]').exists()).toBe(true)
    expect(wrapper.find('[data-step-index="1"]').exists()).toBe(false)
  })

  it('невалидное поле шага блокирует переход "Далее"', async () => {
    const wrapper = mount(StepsTestForm())

    const nextButton = wrapper.findAll('button').find((btn) => btn.text().includes('Далее'))
    expect(nextButton).toBeTruthy()

    await nextButton!.trigger('click')
    await flushPromises()
    await nextTick()

    // firstName пуст (min(1) не проходит) — переход не состоялся
    expect(wrapper.find('[data-step-index="0"]').exists()).toBe(true)
    expect(wrapper.find('[data-step-index="1"]').exists()).toBe(false)
  })

  it('валидное поле шага пропускает переход "Далее"', async () => {
    const wrapper = mount(StepsTestForm())

    await wrapper.find('input').setValue('Ками')

    const nextButton = wrapper.findAll('button').find((btn) => btn.text().includes('Далее'))
    await nextButton!.trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.find('[data-step-index="0"]').exists()).toBe(false)
    expect(wrapper.find('[data-step-index="1"]').exists()).toBe(true)
  })

  it('goToStep через Indicator — нелинейная навигация без валидации', async () => {
    const wrapper = mount(StepsTestForm())
    await nextTick()

    const indicatorButtons = wrapper.findAll('ol.flex button')
    expect(indicatorButtons).toHaveLength(2)

    await indicatorButtons[1]!.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-step-index="1"]').exists()).toBe(true)
  })

  it('после skipToEnd (кнопка "Пропустить") показывает Form.Steps.Completed', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              AppForm,
              { schema: stepsSchema, initialValue: { firstName: '', email: '' }, onSubmit: vi.fn() },
              {
                default: () => [
                  h(FormSteps, {}, () => [
                    h(FormStepsStep, { title: 'Шаг 1' }, () => [h(FieldString, { name: 'firstName' })]),
                    h(FormStepsStep, { title: 'Шаг 2' }, () => [h(FieldString, { name: 'email' })]),
                    h(FormStepsNavigation, { showSkip: true }),
                    h(FormStepsCompleted, () => ['Готово']),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await nextTick()

    expect(wrapper.text()).not.toContain('Готово')

    const skipButton = wrapper.findAll('button').find((btn) => btn.text().includes('Пропустить'))
    expect(skipButton).toBeTruthy()

    await skipButton!.trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.text()).toContain('Готово')
    expect(wrapper.find('[data-step-index="0"]').exists()).toBe(false)
    expect(wrapper.find('[data-step-index="1"]').exists()).toBe(false)
  })

  it('персистирует текущий шаг в localStorage и восстанавливает его при повторном монтировании', async () => {
    const key = 'stage6d-shadcn-test-persist'
    const wrapperA = mount(StepsTestForm({ stepPersistence: { key, debounceMs: 5 } }))

    await wrapperA.find('input').setValue('Ками')
    const nextButton = wrapperA.findAll('button').find((btn) => btn.text().includes('Далее'))
    await nextButton!.trigger('click')
    await flushPromises()
    await nextTick()

    await wait(50)
    expect(localStorage.getItem(`form-steps-shadcn:${key}`)).toBe('1')

    const wrapperB = mount(StepsTestForm({ stepPersistence: { key, debounceMs: 5 } }))
    expect(wrapperB.find('[data-step-index="1"]').exists()).toBe(true)
    expect(wrapperB.find('[data-step-index="0"]').exists()).toBe(false)
  })
})
