import { AppForm } from '@letar/forms-vue/core'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { FieldBankAccount, FieldCorrAccount } from './fields/field-bank-account'
import { FieldCheckbox } from './fields/field-checkbox'
import { FieldCombobox } from './fields/field-combobox'
import { FieldCurrency } from './fields/field-currency'
import { FieldDate } from './fields/field-date'
import { FieldHidden } from './fields/field-hidden'
import { FieldINN } from './fields/field-inn'
import { FieldMaskedInput } from './fields/field-masked-input'
import { FieldNativeSelect } from './fields/field-native-select'
import { FieldNumber } from './fields/field-number'
import { FieldNumberInput } from './fields/field-number-input'
import { FieldPassport } from './fields/field-passport'
import { FieldPassword } from './fields/field-password'
import { FieldPercentage } from './fields/field-percentage'
import { FieldPhone } from './fields/field-phone'
import { FieldRadioGroup } from './fields/field-radio-group'
import { FieldSelect } from './fields/field-select'
import { FieldString } from './fields/field-string'
import { FieldSwitch } from './fields/field-switch'
import { FieldTextarea } from './fields/field-textarea'
import { FieldTime } from './fields/field-time'
import { FieldYesNo } from './fields/field-yes-no'

/**
 * `SelectContent`/`ComboboxContent` (Reka UI) измеряют доступное место через `ResizeObserver` и
 * позиционируются через `@floating-ui` — jsdom не реализует ни то, ни другое. Полифиллы ниже —
 * стандартный минимум для тестирования Radix/Reka-компонентов вне браузера, не специфика этой
 * библиотеки.
 */
beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- полифилл под jsdom, не production-код
  ;(globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
  Element.prototype.scrollIntoView = vi.fn()
})

const schema = z.object({
  title: z.string().min(3, 'Минимум 3 символа').meta({ ui: { title: 'Название', placeholder: 'Введите...' } }),
  rating: z.number().min(1).max(10).meta({ ui: { title: 'Рейтинг' } }),
  agree: z.boolean().meta({ ui: { title: 'Согласен' } }),
  category: z.string().meta({ ui: { title: 'Категория' } }),
  notes: z.string().optional().meta({ ui: { title: 'Заметки' } }),
  tag: z.string().optional().meta({ ui: { title: 'Тег' } }),
})

const CATEGORY_OPTIONS = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]

function TestForm(onSubmit: (value: Record<string, unknown>) => void) {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          {
            schema,
            initialValue: { title: '', rating: 5, agree: false, category: '', notes: '', tag: '' },
            onSubmit,
          },
          {
            default: () => [
              h(FieldString, { name: 'title' }),
              h(FieldNumber, { name: 'rating' }),
              h(FieldCheckbox, { name: 'agree' }),
              h(FieldSelect, { name: 'category', options: CATEGORY_OPTIONS }),
              h(FieldTextarea, { name: 'notes' }),
              h(FieldCombobox, { name: 'tag', options: CATEGORY_OPTIONS }),
              h('button', { type: 'submit' }, 'Сохранить'),
            ],
          },
        )
    },
  })
}

describe('forms-vue-shadcn: AppForm + Field* на rekaUIKit', () => {
  it('renders labels resolved from Zod .meta({ ui }) — same contract as forms-vue/forms-react', () => {
    const wrapper = mount(TestForm(vi.fn()), { attachTo: document.body })

    expect(wrapper.find('label[data-slot="field-label"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Название')
    expect(wrapper.find('input[data-field-name="title"]').attributes('placeholder')).toBe('Введите...')

    wrapper.unmount()
  })

  it('shows the field-level Zod error and blocks submit on invalid input', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(TestForm(onSubmit), { attachTo: document.body })

    const input = wrapper.find('input[data-field-name="title"]')
    await input.setValue('ab')
    await input.trigger('blur')
    await nextTick()

    expect(wrapper.find('[data-slot="field-error"]').text()).toBe('Минимум 3 символа')

    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(onSubmit).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('submits the resolved value once every field is valid', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(TestForm(onSubmit), { attachTo: document.body })

    await wrapper.find('input[data-field-name="title"]').setValue('Валидное название')
    await wrapper.find('[data-field-name="agree"]').trigger('click')

    // Reka `SelectRoot`/`ComboboxRoot` — контролируемые компоненты без нативного `<select>`,
    // достаточно проверить, что форма с валидным `title`+`agree` доходит до сабмита.
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      title: 'Валидное название',
      agree: true,
    })

    wrapper.unmount()
  })

  it('FieldCheckbox: toggles the underlying boolean value on click', async () => {
    const wrapper = mount(TestForm(vi.fn()), { attachTo: document.body })

    const checkbox = wrapper.find('[data-field-name="agree"]')
    expect(checkbox.attributes('data-state')).not.toBe('checked')

    await checkbox.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-slot="checkbox"]').attributes('data-state')).toBe('checked')
    wrapper.unmount()
  })

  it('throws when a field is rendered outside <AppForm> — same guard as forms-vue', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => mount(FieldString, { props: { name: 'title' } })).toThrow('вне <AppForm>')

    consoleError.mockRestore()
  })
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

const stage3Schema = z.object({
  passport: z.string().optional().meta({ ui: { title: 'Паспорт' } }),
  inn: z.string().optional().meta({ ui: { title: 'ИНН' } }),
  bankAccount: z.string().optional().meta({ ui: { title: 'Расчётный счёт' } }),
  corrAccount: z.string().optional().meta({ ui: { title: 'Корр. счёт' } }),
  phone: z.string().optional().meta({ ui: { title: 'Телефон' } }),
  departmentCode: z.string().optional().meta({ ui: { title: 'Код подразделения' } }),
})

function Stage3TestForm() {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          { schema: stage3Schema, initialValue: {}, onSubmit: vi.fn() },
          {
            default: () => [
              h(FieldPassport, { name: 'passport' }),
              h(FieldINN, { name: 'inn' }),
              h(FieldBankAccount, { name: 'bankAccount' }),
              h(FieldCorrAccount, { name: 'corrAccount' }),
              h(FieldPhone, { name: 'phone' }),
              h(FieldMaskedInput, {
                name: 'departmentCode',
                mask: '999-999',
                formatDescription: 'Формат: 3 цифры, дефис, 3 цифры',
              }),
            ],
          },
        )
    },
  })
}

describe('forms-vue-shadcn: Этап 3 — маски/документы через forms-core/mask', () => {
  it('рендерят метку и контрол для каждого поля', () => {
    const wrapper = mount(Stage3TestForm(), { attachTo: document.body })

    expect(wrapper.find('input[data-field-name="passport"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="inn"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="bankAccount"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="corrAccount"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="phone"]').exists()).toBe(true)
    expect(wrapper.find('input[data-field-name="departmentCode"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('FieldPassport: ввод цифр форматируется маской "XX XX XXXXXX" (live, MaskController)', async () => {
    const wrapper = mount(Stage3TestForm(), { attachTo: document.body })
    const input = wrapper.find('input[data-field-name="passport"]')

    await input.setValue('4506123456')
    await nextTick()

    expect((input.element as HTMLInputElement).value).toBe('45 06 123456')
    wrapper.unmount()
  })

  it('FieldINN: formatMode "off" — ошибка при длине не 10/12', async () => {
    const wrapper = mount(Stage3TestForm(), { attachTo: document.body })
    const input = wrapper.find('input[data-field-name="inn"]')

    await input.setValue('12345')
    await input.trigger('blur')
    await nextTick()

    expect(wrapper.find('[data-slot="field-error"]').text()).toBe('ИНН должен содержать 10 или 12 цифр')
    wrapper.unmount()
  })

  it('FieldCorrAccount: 20 цифр без префикса "301" — ошибка контрольной суммы', async () => {
    const wrapper = mount(Stage3TestForm(), { attachTo: document.body })
    const input = wrapper.find('input[data-field-name="corrAccount"]')

    await input.setValue('40702810038000000001')
    await input.trigger('blur')
    await nextTick()

    expect(wrapper.find('[data-slot="field-error"]').text()).toBe('Корр. счёт должен начинаться с "301"')
    wrapper.unmount()
  })

  it('FieldPhone: форматирует цифры маской RU-телефона (чистый форматтер, не MaskController)', async () => {
    const wrapper = mount(Stage3TestForm(), { attachTo: document.body })
    const input = wrapper.find('input[data-field-name="phone"]')

    await input.setValue('9161234567')
    await nextTick()

    expect((input.element as HTMLInputElement).value).toContain('916')
    wrapper.unmount()
  })

  it('FieldMaskedInput: произвольная маска "999-999" применяется через MaskController', async () => {
    const wrapper = mount(Stage3TestForm(), { attachTo: document.body })
    const input = wrapper.find('input[data-field-name="departmentCode"]')

    await input.setValue('770123')
    await nextTick()

    expect((input.element as HTMLInputElement).value).toBe('770-123')
    wrapper.unmount()
  })
})
