import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { AppForm } from './core/app-form'
import { FieldBankAccount, FieldCorrAccount } from './fields/field-bank-account'
import { FieldCreditCard } from './fields/field-credit-card'
import { FieldINN } from './fields/field-inn'
import { FieldMaskedInput } from './fields/field-masked-input'
import { FieldPassport } from './fields/field-passport'
import { FieldPhone } from './fields/field-phone'

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
