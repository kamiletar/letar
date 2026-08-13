import { Component, Input } from '@angular/core'
import { DOCUMENT_FIELD_TEMPLATE, DocumentFieldBase } from '../core/document-field-base'

/**
 * Корр. счёт (20 цифр, начинается с "301") — Angular-эквивалент `FieldCorrAccount`
 * (`@letar/forms-vue`). Отдельный компонент, не вариант `FieldBankAccount` — разный `placeholder`
 * и дополнительная проверка префикса, 1-в-1 разделение Vue-версии (`field-bank-account.ts`).
 */
@Component({
  selector: 'letar-field-corr-account',
  standalone: true,
  template: DOCUMENT_FIELD_TEMPLATE,
})
export class FieldCorrAccountComponent extends DocumentFieldBase {
  readonly mask = '99999999999999999999'

  @Input()
  override placeholder = '30101810400000000225'

  protected validateDocument(value: string): string | undefined {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 20) {
      return 'Корр. счёт должен содержать 20 цифр'
    }
    if (!digits.startsWith('301')) {
      return 'Корр. счёт должен начинаться с "301"'
    }
    return undefined
  }
}
