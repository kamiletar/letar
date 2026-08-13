import { Component, Input } from '@angular/core'
import { validateForeignPassport } from '@letar/forms-core/validators/ru'
import { DOCUMENT_FIELD_TEMPLATE, DocumentFieldBase } from '../core/document-field-base'

/** Загранпаспорт (99 9999999, серия 2 + номер 7) — Angular-эквивалент `FieldForeignPassport`
 * (`@letar/forms-vue`). */
@Component({
  selector: 'letar-field-foreign-passport',
  standalone: true,
  template: DOCUMENT_FIELD_TEMPLATE,
})
export class FieldForeignPassportComponent extends DocumentFieldBase {
  readonly mask = '99 9999999'

  @Input()
  override placeholder = '75 0123456'

  protected validateDocument(value: string): string | undefined {
    const digits = value.replace(/\D/g, '')
    return validateForeignPassport(digits) ? undefined : 'Загранпаспорт должен содержать 9 цифр (серия + номер)'
  }
}
