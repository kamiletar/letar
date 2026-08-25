'use client'

import { validateSnils } from '@letar/forms-core/validators/ru'
import { Shield } from 'lucide-react'
import { createDocumentField } from './document-field-base'

/** Form.Field.SNILS (shadcn) — поле СНИЛС (XXX-XXX-XXX YY) */
export const FieldSNILS = createDocumentField({
  displayName: 'FieldSNILS',
  mask: '999-999-999 99',
  placeholder: '123-456-789 00',
  icon: Shield,
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      return undefined
    }
    if (digits.length !== 11) {
      return 'СНИЛС должен содержать 11 цифр'
    }
    return validateSnils(digits) ? undefined : 'Неверная контрольная сумма СНИЛС'
  },
})
