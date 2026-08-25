'use client'

import { validateForeignPassport } from '@letar/forms-core/validators/ru'
import { LuPlane } from 'react-icons/lu'
import { createDocumentField } from './document-field-base'

/** Form.Document.ForeignPassport — загранпаспорт (99 9999999, серия 2 + номер 7) */
export const FieldForeignPassport = createDocumentField({
  displayName: 'FieldForeignPassport',
  mask: '99 9999999',
  placeholder: '75 0123456',
  icon: LuPlane,
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      return undefined
    }
    return validateForeignPassport(digits) ? undefined : 'Загранпаспорт должен содержать 9 цифр (серия + номер)'
  },
})
