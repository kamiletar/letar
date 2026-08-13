import { Component, Input } from '@angular/core'
import { DOCUMENT_FIELD_TEMPLATE, DocumentFieldBase } from '../core/document-field-base'

/** Расчётный счёт (20 цифр) — Angular-эквивалент `FieldBankAccount` (`@letar/forms-vue`). */
@Component({
  selector: 'letar-field-bank-account',
  standalone: true,
  template: DOCUMENT_FIELD_TEMPLATE,
})
export class FieldBankAccountComponent extends DocumentFieldBase {
  readonly mask = '99999999999999999999'

  @Input()
  override placeholder = '40702810038000000001'

  protected validateDocument(value: string): string | undefined {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 20) {
      return 'Расчётный счёт должен содержать 20 цифр'
    }
    return undefined
  }
}
