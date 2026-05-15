'use client'

import { LuBookOpen } from 'react-icons/lu'
import { createDocumentField } from './document-field-base'

/** Form.Document.Passport — поле паспорта (XX XX XXXXXX) */
export const FieldPassport = createDocumentField({
  displayName: 'FieldPassport',
  mask: '99 99 999999',
  placeholder: '45 06 123456',
  icon: <LuBookOpen />,
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return undefined
    if (digits.length !== 10) return 'Паспорт: серия (4 цифры) + номер (6 цифр)'
    return undefined
  },
})
