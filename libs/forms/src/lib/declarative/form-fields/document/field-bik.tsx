'use client'

import { LuLandmark } from 'react-icons/lu'
import { validateBik } from '../../../validators/ru/bik'
import { createDocumentField } from './document-field-base'

/** Form.Document.BIK — поле ввода БИК (9 цифр) */
export const FieldBIK = createDocumentField({
  displayName: 'FieldBIK',
  mask: '999999999',
  placeholder: '044525225',
  icon: <LuLandmark />,
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return undefined
    if (digits.length !== 9) return 'БИК должен содержать 9 цифр'
    return validateBik(digits) ? undefined : 'БИК должен начинаться с "04"'
  },
})
