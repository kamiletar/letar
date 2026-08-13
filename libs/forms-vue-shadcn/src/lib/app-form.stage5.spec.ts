import type { AddressProvider, AddressSuggestion } from '@letar/forms-core/address'
import { AppForm } from '@letar/forms-vue/core'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from './app-form.test-utils'
import { FieldAddress } from './fields/field-address'
import { FieldCity } from './fields/field-city'
import { FieldColorPicker } from './fields/field-color-picker'
import { FieldFileUpload } from './fields/field-file-upload'
import { FieldOTPInput } from './fields/field-otp-input'
import { FieldPinInput } from './fields/field-pin-input'
import { FieldSignature } from './fields/field-signature'

beforeEach(() => {
  setupRekaPolyfills()
})

const stage5Schema = z.object({
  pin: z.string().optional().meta({ ui: { title: 'PIN' } }),
  code: z.string().optional().meta({ ui: { title: 'Код' } }),
  color: z.string().optional().meta({ ui: { title: 'Цвет' } }),
  file: z.any().optional().meta({ ui: { title: 'Файл' } }),
})

function Stage5TestForm(onResend?: () => Promise<void>) {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          { schema: stage5Schema, initialValue: {}, onSubmit: vi.fn() },
          {
            default: () => [
              h(FieldPinInput, { name: 'pin', count: 4 }),
              h(FieldOTPInput, { name: 'code', length: 4, resendTimeout: 30, onResend }),
              h(FieldColorPicker, { name: 'color' }),
              h(FieldFileUpload, { name: 'file' }),
            ],
          },
        )
    },
  })
}

describe('Этап 5 (часть 1) — PinInput/OTPInput/ColorPicker/FileUpload', () => {
  it('рендерят контролы всех четырёх полей', () => {
    const wrapper = mount(Stage5TestForm())

    expect(wrapper.findAll('[role="group"]')).toHaveLength(2)
    expect(wrapper.find('input[type="color"][data-field-name="color"]').exists()).toBe(true)
    expect(wrapper.find('input[type="file"][data-field-name="file"]').exists()).toBe(true)
  })

  it('FieldPinInput: ввод цифры переводит фокус на следующую ячейку', async () => {
    const wrapper = mount(Stage5TestForm(), { attachTo: document.body })
    const boxes = wrapper.find('[role="group"][aria-label="PIN"]').findAll('input')

    await boxes[0]?.setValue('1')
    await boxes[1]?.setValue('2')
    await nextTick()

    expect((boxes[0]!.element as HTMLInputElement).value).toBe('1')
    expect(document.activeElement).toBe(boxes[2]!.element)
    wrapper.unmount()
  })

  it('FieldOTPInput: показывает таймер повторной отправки, после истечения — кнопку', async () => {
    const onResend = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount(Stage5TestForm(onResend))

    const button = wrapper.find('button')
    expect(button.text()).toBe('Отправить повторно')

    await button.trigger('click')
    await nextTick()

    expect(onResend).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-testid="otp-countdown"]').exists()).toBe(true)
  })

  it('FieldColorPicker: выбор свотча обновляет значение и отмечает его выбранным', async () => {
    const wrapper = mount(Stage5TestForm())
    const swatch = wrapper.find('[aria-label="#F56565"]')

    await swatch.trigger('click')
    await nextTick()

    expect((wrapper.find('input[type="color"]').element as HTMLInputElement).value).toBe('#f56565')
    expect(swatch.attributes('data-selected')).toBe('true')
  })

  it('FieldFileUpload: выбор файла добавляет его в список, удаление убирает', async () => {
    const wrapper = mount(Stage5TestForm())
    const input = wrapper.find('input[type="file"]')
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' })

    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await nextTick()

    expect(wrapper.find('[data-testid="file-item"]').text()).toContain('note.txt')

    await wrapper.find('[data-testid="file-item"] button').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="file-item"]').exists()).toBe(false)
  })
})

const stage5Part2Schema = z.object({
  signature: z.string().optional().meta({ ui: { title: 'Подпись' } }),
  address: z.any().optional().meta({ ui: { title: 'Адрес' } }),
  city: z.string().optional().meta({ ui: { title: 'Город' } }),
})

const mockSuggestions: AddressSuggestion[] = [
  { label: 'Москва, ул. Тверская, д. 1', value: 'Москва, ул. Тверская, д. 1', data: { city: 'Москва' } },
  { label: 'Москва, ул. Тверская, д. 2', value: 'Москва, ул. Тверская, д. 2', data: { city: 'Москва' } },
]

function createMockProvider(): AddressProvider {
  return { getSuggestions: vi.fn().mockResolvedValue(mockSuggestions) }
}

function Stage5Part2TestForm(provider: AddressProvider) {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          { schema: stage5Part2Schema, initialValue: {}, onSubmit: vi.fn() },
          {
            default: () => [
              h(FieldSignature, { name: 'signature', width: 200, height: 80 }),
              h(FieldAddress, { name: 'address', provider, debounceMs: 0 }),
              h(FieldCity, { name: 'city', provider, debounceMs: 0 }),
            ],
          },
        )
    },
  })
}

describe('Этап 5 (часть 2) — Signature/Address/City', () => {
  beforeEach(() => {
    // jsdom не реализует 2D-контекст canvas — стаб с методами, которые вызывает useSignatureField.
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,stub')
  })

  it('рендерят контролы всех трёх полей', () => {
    const wrapper = mount(Stage5Part2TestForm(createMockProvider()))

    expect(wrapper.find('canvas[data-field-name="signature"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="address"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="city"]').exists()).toBe(true)
  })

  it('FieldSignature: рисование на canvas показывает кнопку очистки', async () => {
    const wrapper = mount(Stage5Part2TestForm(createMockProvider()), { attachTo: document.body })
    const canvas = wrapper.find('canvas')

    await canvas.trigger('mousedown', { clientX: 5, clientY: 5 })
    await canvas.trigger('mousemove', { clientX: 15, clientY: 15 })
    await canvas.trigger('mouseup')
    await nextTick()

    const clearButtons = wrapper.findAll('button').filter((b) => b.text() === 'Очистить')
    expect(clearButtons).toHaveLength(1)

    await clearButtons[0]!.trigger('click')
    await nextTick()

    expect(wrapper.findAll('button').filter((b) => b.text() === 'Очистить')).toHaveLength(0)
    wrapper.unmount()
  })

  it('FieldAddress: ввод запроса показывает подсказки, выбор заполняет инпут', async () => {
    const provider = createMockProvider()
    const wrapper = mount(Stage5Part2TestForm(provider))
    const input = wrapper.find('input[data-field-name="address"]')

    await input.setValue('Тверская')
    await new Promise((resolve) => setTimeout(resolve, 0))
    await nextTick()

    expect(provider.getSuggestions).toHaveBeenCalledWith('Тверская', expect.anything())

    const suggestion = wrapper.findAll('li')[0]!
    await suggestion.trigger('mousedown')
    await nextTick()

    expect((input.element as HTMLInputElement).value).toBe('Москва, ул. Тверская, д. 1')
  })

  it('FieldCity: выбор подсказки извлекает название города из данных провайдера', async () => {
    const provider = createMockProvider()
    const wrapper = mount(Stage5Part2TestForm(provider))
    const input = wrapper.find('input[data-field-name="city"]')

    await input.setValue('Моск')
    await new Promise((resolve) => setTimeout(resolve, 0))
    await nextTick()

    const suggestion = wrapper.findAll('li')[0]!
    await suggestion.trigger('mousedown')
    await nextTick()

    expect((input.element as HTMLInputElement).value).toBe('Москва')
  })
})
