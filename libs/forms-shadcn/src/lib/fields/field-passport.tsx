'use client'

import { BookOpen } from 'lucide-react'
import { createDocumentField } from './document-field-base'

/** Form.Field.Passport (shadcn) — поле паспорта (XX XX XXXXXX) */
export const FieldPassport = createDocumentField({
  displayName: 'FieldPassport',
  mask: '99 99 999999',
  placeholder: '45 06 123456',
  icon: BookOpen,
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      return undefined
    }
    if (digits.length !== 10) {
      return 'Паспорт: серия (4 цифры) + номер (6 цифр)'
    }
    return undefined
  },
})
