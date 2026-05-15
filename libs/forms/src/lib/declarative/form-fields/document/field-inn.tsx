'use client'

import { LuFileText } from 'react-icons/lu'
import { validateInn10, validateInn12 } from '../../../validators/ru/inn'
import { createDocumentField } from './document-field-base'

/** Form.Document.INN — поле ввода ИНН (10 или 12 цифр) */
export const FieldINN = createDocumentField({
  displayName: 'FieldINN',
  mask: '999999999999', // 12 цифр максимум
  placeholder: '7707083893',
  icon: <LuFileText />,
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return undefined // Пустое — пропускаем (required проверит Zod)
    if (digits.length === 10) {
      return validateInn10(digits) ? undefined : 'Неверная контрольная сумма ИНН'
    }
    if (digits.length === 12) {
      return validateInn12(digits) ? undefined : 'Неверная контрольная сумма ИНН'
    }
    return 'ИНН должен содержать 10 или 12 цифр'
  },
})
