import { Component, Input } from '@angular/core'
import { validateSnils } from '@letar/forms-core/validators/ru'
import { DOCUMENT_FIELD_TEMPLATE, DocumentFieldBase } from '../core/document-field-base'

/** СНИЛС (XXX-XXX-XXX YY) — Angular-эквивалент `FieldSNILS` (`@letar/forms-vue`). */
@Component({
  selector: 'letar-field-snils',
  standalone: true,
  template: DOCUMENT_FIELD_TEMPLATE,
})
export class FieldSnilsComponent extends DocumentFieldBase {
  readonly mask = '999-999-999 99'

  @Input()
  override placeholder = '123-456-789 00'

  protected validateDocument(value: string): string | undefined {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 11) {
      return 'СНИЛС должен содержать 11 цифр'
    }
    return validateSnils(digits) ? undefined : 'Неверная контрольная сумма СНИЛС'
  }
}
