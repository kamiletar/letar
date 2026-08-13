import { Component, Input } from '@angular/core'
import { validateDepartmentCode } from '@letar/forms-core/validators/ru'
import { DOCUMENT_FIELD_TEMPLATE, DocumentFieldBase } from '../core/document-field-base'

/** Код подразделения, выдавшего паспорт (999-999) — Angular-эквивалент `FieldDepartmentCode`
 * (`@letar/forms-vue`). */
@Component({
  selector: 'letar-field-department-code',
  standalone: true,
  template: DOCUMENT_FIELD_TEMPLATE,
})
export class FieldDepartmentCodeComponent extends DocumentFieldBase {
  readonly mask = '999-999'

  @Input()
  override placeholder = '770-001'

  protected validateDocument(value: string): string | undefined {
    const digits = value.replace(/\D/g, '')
    return validateDepartmentCode(digits) ? undefined : 'Код подразделения должен содержать 6 цифр'
  }
}
