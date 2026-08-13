import { validateDepartmentCode } from '@letar/forms-core/validators/ru'
import { createDocumentField } from './document-field-base'

/** FieldDepartmentCode (headless) — код подразделения, выдавшего паспорт (999-999) */
export const FieldDepartmentCode = createDocumentField({
  displayName: 'FieldDepartmentCode',
  mask: '999-999',
  placeholder: '770-001',
  validate: (value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      return undefined
    }
    return validateDepartmentCode(digits) ? undefined : 'Код подразделения должен содержать 6 цифр'
  },
})
