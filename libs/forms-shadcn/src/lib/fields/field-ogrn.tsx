'use client'

import { validateOgrn } from '@letar/forms-core/validators/ru'
import { FileText } from 'lucide-react'
import { createDocumentField } from './document-field-base'

/** Form.Field.OGRN (shadcn) — поле ввода ОГРН (13 цифр) */
export const FieldOGRN = createDocumentField({
  displayName: 'FieldOGRN',
  mask: '9999999999999',
  placeholder: '1027700132195',
  icon: FileText,
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      return undefined
    }
    if (digits.length !== 13) {
      return 'ОГРН должен содержать 13 цифр'
    }
    return validateOgrn(digits) ? undefined : 'Неверная контрольная сумма ОГРН'
  },
})
