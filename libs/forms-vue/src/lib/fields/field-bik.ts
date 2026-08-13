import { validateBik } from '@letar/forms-core/validators/ru'
import { createDocumentField } from './document-field-base'

/** FieldBIK (headless) — поле ввода БИК (9 цифр) */
export const FieldBIK = createDocumentField({
  displayName: 'FieldBIK',
  mask: '999999999',
  placeholder: '044525225',
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      return undefined
    }
    if (digits.length !== 9) {
      return 'БИК должен содержать 9 цифр'
    }
    return validateBik(digits) ? undefined : 'БИК должен начинаться с "04"'
  },
})
