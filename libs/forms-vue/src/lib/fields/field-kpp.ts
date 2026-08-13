import { validateKpp } from '@letar/forms-core/validators/ru'
import { createDocumentField } from './document-field-base'

/** FieldKPP (headless) — поле ввода КПП (9 символов) */
export const FieldKPP = createDocumentField({
  displayName: 'FieldKPP',
  mask: '*********',
  placeholder: '770701001',
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
