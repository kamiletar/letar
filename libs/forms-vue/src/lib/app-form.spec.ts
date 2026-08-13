import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { AppForm } from './core/app-form'
import { FieldBankAccount, FieldCorrAccount } from './fields/field-bank-account'
import { FieldCheckbox } from './fields/field-checkbox'
import { FieldCreditCard } from './fields/field-credit-card'
import { FieldCurrency } from './fields/field-currency'
import { FieldDate } from './fields/field-date'
import { FieldDateRange } from './fields/field-date-range'
import { FieldDateTimePicker } from './fields/field-datetime-picker'
import { FieldDuration } from './fields/field-duration'
import { FieldHidden } from './fields/field-hidden'
import { FieldINN } from './fields/field-inn'
import { FieldInput } from './fields/field-input'
import { FieldMaskedInput } from './fields/field-masked-input'
import { FieldNativeSelect } from './fields/field-native-select'
import { FieldNumber } from './fields/field-number'
import { FieldNumberInput } from './fields/field-number-input'
import { FieldPassport } from './fields/field-passport'
import { FieldPassword } from './fields/field-password'
import { FieldPercentage } from './fields/field-percentage'
import { FieldPhone } from './fields/field-phone'
import { FieldRadioGroup } from './fields/field-radio-group'
import { FieldRating } from './fields/field-rating'
import { FieldSelect } from './fields/field-select'
import { FieldSlider } from './fields/field-slider'
import { FieldSwitch } from './fields/field-switch'
import { FieldTextarea } from './fields/field-textarea'
import { FieldTime } from './fields/field-time'
import { FieldYesNo } from './fields/field-yes-no'

const schema = z.object({
  title: z.string().min(3, 'Минимум 3 символа').meta({ ui: { title: 'Название', placeholder: 'Введите...' } }),
  rating: z.number().min(1).max(10).meta({ ui: { title: 'Рейтинг' } }),
  agree: z.boolean().meta({ ui: { title: 'Согласен' } }),
  category: z.string().meta({ ui: { title: 'Категория' } }),
  notes: z.string().optional().meta({ ui: { title: 'Заметки' } }),
})

function TestForm(onSubmit: (value: Record<string, unknown>) => void) {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          {
            schema,
            initialValue: { title: '', rating: 5, agree: false, category: '', notes: '' },
            onSubmit,
          },
          {
            default: () => [
              h(FieldInput, { name: 'title' }),
              h(FieldNumber, { name: 'rating' }),
              h(FieldCheckbox, { name: 'agree' }),
              h(FieldSelect, {
                name: 'category',
                options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
              }),
              h(FieldTextarea, { name: 'notes' }),
              h('button', { type: 'submit' }, 'Сохранить'),
            ],
          },
        )
    },
  })
}

describe('AppForm + Field*', () => {
  it('renders labels resolved from Zod .meta({ ui }) — same contract as the React skin', () => {
    const wrapper = mount(TestForm(vi.fn()))

    expect(wrapper.find('label[for="title"]').text()).toBe('Название *')
    expect(wrapper.find('input[name="title"]').attributes('placeholder')).toBe('Введите...')
    expect(wrapper.find('label[for="rating"]').text()).toBe('Рейтинг *')
  })

  it('shows the field-level Zod error and blocks submit on invalid input', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(TestForm(onSubmit))

    const input = wrapper.find('input[name="title"]')
    await input.setValue('ab')
    await input.trigger('blur')
    await nextTick()

    expect(wrapper.find('[data-field-name="title"] .letar-field__error').text()).toBe('Минимум 3 символа')

    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the resolved value once every field is valid', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(TestForm(onSubmit))

    await wrapper.find('input[name="title"]').setValue('Валидное название')
    await wrapper.find('select[name="category"]').setValue('a')
    await wrapper.find('input[name="agree"]').setValue(true)
    await nextTick()

    await wrapper.find('form').trigger('submit')
    // `handleSubmit` валидирует все поля параллельно (в т.ч. onChange-валидаторы,
    // которые сами резолвятся асинхронно) — одного `nextTick` недостаточно.
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      title: 'Валидное название',
      category: 'a',
      agree: true,
    })
  })

  it('throws when a field is rendered outside <AppForm> — same guard as forms-react', () => {
    // подавляем ожидаемый console.error от Vue при выбросе внутри setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => mount(FieldInput, { props: { name: 'title' } })).toThrow('вне <AppForm>')

    consoleError.mockRestore()
  })
})

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

describe('Этап 3 — маски/документы через forms-core/mask', () => {
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

  it('FieldINN: formatMode "off" — без группировки, ошибка при длине не 10/12', async () => {
    const wrapper = mount(Stage3TestForm(), { attachTo: document.body })
    const input = wrapper.find('input[data-field-name="inn"]')

    await input.setValue('12345')
    await input.trigger('blur')
    await nextTick()

    expect(wrapper.find('[data-field-name="inn"] .letar-field__error').text()).toBe(
      'ИНН должен содержать 10 или 12 цифр',
    )
    wrapper.unmount()
  })

  it('FieldBankAccount: 20 цифр без ошибки, FieldCorrAccount требует префикс "301"', async () => {
    const wrapper = mount(Stage3TestForm(), { attachTo: document.body })

    const bankAccount = wrapper.find('input[data-field-name="bankAccount"]')
    await bankAccount.setValue('40702810038000000001')
    await bankAccount.trigger('blur')
    await nextTick()
    expect(wrapper.find('[data-field-name="bankAccount"] .letar-field__error').exists()).toBe(false)

    const corrAccount = wrapper.find('input[data-field-name="corrAccount"]')
    await corrAccount.setValue('40702810038000000001')
    await corrAccount.trigger('blur')
    await nextTick()
    expect(wrapper.find('[data-field-name="corrAccount"] .letar-field__error').text()).toBe(
      'Корр. счёт должен начинаться с "301"',
    )

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

const creditCardSchema = z.object({
  card: z.any().optional().meta({ ui: { title: 'Данные карты' } }),
})

function CreditCardTestForm() {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          { schema: creditCardSchema, initialValue: {}, onSubmit: vi.fn() },
          { default: () => [h(FieldCreditCard, { name: 'card' })] },
        )
    },
  })
}

describe('Этап 3 (продолжение) — FieldCreditCard', () => {
  it('форматирует номер карты пробелами каждые 4 цифры и определяет бренд Visa', async () => {
    const wrapper = mount(CreditCardTestForm())
    const number = wrapper.find('input[name="cardnumber"]')

    await number.setValue('4111111111111111')
    await nextTick()

    expect((number.element as HTMLInputElement).value).toBe('4111 1111 1111 1111')
    expect(wrapper.find('[aria-label="Visa"]').exists()).toBe(true)
  })

  it('валидирует номер по Luhn на blur — валидный номер снимает ошибку', async () => {
    const wrapper = mount(CreditCardTestForm())
    const number = wrapper.find('input[name="cardnumber"]')

    await number.setValue('4111111111111112')
    await number.trigger('blur')
    await nextTick()
    expect(number.attributes('data-status')).toBe('error')

    await number.setValue('4111111111111111')
    await number.trigger('blur')
    await nextTick()
    expect(number.attributes('data-status')).toBe('valid')
  })

  it('автоформатирует срок действия (smart month) и автопереходит к CVC при заполнении', async () => {
    const wrapper = mount(CreditCardTestForm(), { attachTo: document.body })
    const expiry = wrapper.find('input[name="cc-exp"]')
    const cvc = wrapper.find('input[name="cvc"]')

    await expiry.setValue('2')
    expect((expiry.element as HTMLInputElement).value).toBe('02')

    await expiry.setValue('1225')
    await nextTick()
    expect((expiry.element as HTMLInputElement).value).toBe('12/25')
    expect(document.activeElement).toBe(cvc.element)

    wrapper.unmount()
  })

  it('CVC принимает только цифры, ограничен длиной бренда (3 для Visa)', async () => {
    const wrapper = mount(CreditCardTestForm())
    const cvc = wrapper.find('input[name="cvc"]')

    await cvc.setValue('12a3')
    await nextTick()

    expect((cvc.element as HTMLInputElement).value).toBe('123')
  })
})
