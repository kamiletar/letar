'use client'

import { LuFileText } from 'react-icons/lu'
import { validateOgrn } from '../../../validators/ru/ogrn'
import { createDocumentField } from './document-field-base'

/** Form.Document.OGRN — поле ввода ОГРН (13 цифр) */
export const FieldOGRN = createDocumentField({
  displayName: 'FieldOGRN',
  mask: '9999999999999',
  placeholder: '1027700132195',
  icon: <LuFileText />,
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return undefined
    if (digits.length !== 13) return 'ОГРН должен содержать 13 цифр'
    return validateOgrn(digits) ? undefined : 'Неверная контрольная сумма ОГРН'
  },
})
