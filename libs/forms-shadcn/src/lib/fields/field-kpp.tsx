'use client'

import { validateKpp } from '@letar/forms-core/validators/ru'
import { FileText } from 'lucide-react'
import { createDocumentField } from './document-field-base'

/** Form.Field.KPP (shadcn) — поле ввода КПП (9 символов) */
export const FieldKPP = createDocumentField({
  displayName: 'FieldKPP',
  mask: '*********', // 9 символов (цифры или буквы)
  placeholder: '770701001',
  icon: <FileText />,
  validate: (value) => {
    const clean = value.replace(/[\s-]/g, '').toUpperCase()
    if (!clean) {
      return undefined
    }
    if (clean.length !== 9) {
      return 'КПП должен содержать 9 символов'
    }
    return validateKpp(clean) ? undefined : 'Неверный формат КПП'
  },
})
