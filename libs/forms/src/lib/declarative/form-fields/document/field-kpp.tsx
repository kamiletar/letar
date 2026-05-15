'use client'

import { LuFileText } from 'react-icons/lu'
import { validateKpp } from '../../../validators/ru/kpp'
import { createDocumentField } from './document-field-base'

/** Form.Document.KPP — поле ввода КПП (9 символов) */
export const FieldKPP = createDocumentField({
  displayName: 'FieldKPP',
  mask: '*********', // 9 символов (цифры или буквы)
  placeholder: '770701001',
  icon: <LuFileText />,
  validate: (value) => {
    const clean = value.replace(/[\s-]/g, '').toUpperCase()
    if (!clean) return undefined
    if (clean.length !== 9) return 'КПП должен содержать 9 символов'
    return validateKpp(clean) ? undefined : 'Неверный формат КПП'
  },
})
