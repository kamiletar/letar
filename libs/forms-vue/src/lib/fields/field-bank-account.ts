import { createDocumentField } from './document-field-base'

/** FieldBankAccount (headless) — поле расчётного счёта (20 цифр) */
export const FieldBankAccount = createDocumentField({
  displayName: 'FieldBankAccount',
  mask: '99999999999999999999',
  placeholder: '40702810038000000001',
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      return undefined
    }
    if (digits.length !== 20) {
      return 'Расчётный счёт должен содержать 20 цифр'
    }
    return undefined
  },
})

/** FieldCorrAccount (headless) — поле корр. счёта (20 цифр, начинается с 301) */
export const FieldCorrAccount = createDocumentField({
  displayName: 'FieldCorrAccount',
  mask: '99999999999999999999',
  placeholder: '30101810400000000225',
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      return undefined
    }
    if (digits.length !== 20) {
      return 'Корр. счёт должен содержать 20 цифр'
    }
    if (!digits.startsWith('301')) {
      return 'Корр. счёт должен начинаться с "301"'
    }
    return undefined
  },
})
