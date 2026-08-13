import { validateInn10, validateInn12 } from '@letar/forms-core/validators/ru'
import { createDocumentField } from './document-field-base'

/**
 * FieldINN (Reka-скин) — поле ввода ИНН (10 или 12 цифр).
 *
 * Без структурной маски — длина переменная (10 юрлицо / 12 физлицо), группирующая маска
 * фиксированной длины дала бы ложный отказ на валидном коротком значении.
 */
export const FieldINN = createDocumentField({
  displayName: 'FieldINN',
  mask: '9',
  formatMode: 'off',
  maxLength: 12,
  placeholder: '7707083893',
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      return undefined
    }
    if (digits.length === 10) {
      return validateInn10(digits) ? undefined : 'Неверная контрольная сумма ИНН'
    }
    if (digits.length === 12) {
      return validateInn12(digits) ? undefined : 'Неверная контрольная сумма ИНН'
    }
    return 'ИНН должен содержать 10 или 12 цифр'
  },
})
