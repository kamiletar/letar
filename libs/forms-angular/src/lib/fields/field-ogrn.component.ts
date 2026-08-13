import { Component, Input } from '@angular/core'
import { validateOgrn } from '@letar/forms-core/validators/ru'
import { DOCUMENT_FIELD_TEMPLATE, DocumentFieldBase } from '../core/document-field-base'

/** ОГРН (13 цифр) — Angular-эквивалент `FieldOGRN` (`@letar/forms-vue`). */
@Component({
  selector: 'letar-field-ogrn',
  standalone: true,
  template: DOCUMENT_FIELD_TEMPLATE,
})
export class FieldOgrnComponent extends DocumentFieldBase {
  readonly mask = '9999999999999'

  @Input()
  override placeholder = '1027700132195'

  protected validateDocument(value: string): string | undefined {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 13) {
      return 'ОГРН должен содержать 13 цифр'
    }
    return validateOgrn(digits) ? undefined : 'Неверная контрольная сумма ОГРН'
  }
}
