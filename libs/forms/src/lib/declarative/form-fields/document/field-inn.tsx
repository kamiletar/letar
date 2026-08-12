'use client'

import { validateInn10, validateInn12 } from '@letar/forms-core/validators/ru'
import { LuFileText } from 'react-icons/lu'
import { createDocumentField } from './document-field-base'

/**
 * Form.Document.INN — поле ввода ИНН (10 или 12 цифр).
 *
 * Без структурной маски (MASK_ENGINE.md §5.3) — длина переменная (10 юрлицо / 12 физлицо),
 * группирующая маска фиксированной длины дала бы ложный отказ на валидном коротком значении.
 * `formatMode: 'off'` + `mask: '9'` — только фильтрация «оставить цифры», без группировки;
 * `maxLength` ограничивает дальнейший ввод после 12 цифр.
 */
export const FieldINN = createDocumentField({
  displayName: 'FieldINN',
  mask: '9',
  formatMode: 'off',
  maxLength: 12,
  placeholder: '7707083893',
  icon: <LuFileText />,
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      return undefined // Пустое — пропускаем (required проверит Zod)
    }
    if (digits.length === 10) {
      return validateInn10(digits) ? undefined : 'Неверная контрольная сумма ИНН'
    }
    if (digits.length === 12) {
      return validateInn12(digits) ? undefined : 'Неверная контрольная сумма ИНН'
    }
    return 'ИНН должен содержать 10 или 12 цифр'
  },
})
