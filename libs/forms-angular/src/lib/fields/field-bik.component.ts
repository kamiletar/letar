import { Component, Input } from '@angular/core'
import { validateBik } from '@letar/forms-core/validators/ru'
import { DOCUMENT_FIELD_TEMPLATE, DocumentFieldBase } from '../core/document-field-base'

/** БИК (9 цифр) — Angular-эквивалент `FieldBIK` (`@letar/forms-vue`). */
@Component({
  selector: 'letar-field-bik',
  standalone: true,
  template: DOCUMENT_FIELD_TEMPLATE,
})
export class FieldBikComponent extends DocumentFieldBase {
  readonly mask = '999999999'

  @Input()
  override placeholder = '044525225'

  protected validateDocument(value: string): string | undefined {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 9) {
      return 'БИК должен содержать 9 цифр'
    }
    return validateBik(digits) ? undefined : 'БИК должен начинаться с "04"'
  }
}
