import { Component, Input } from '@angular/core'
import { DOCUMENT_FIELD_TEMPLATE, DocumentFieldBase } from '../core/document-field-base'

/**
 * Паспорт РФ (XX XX XXXXXX, серия + номер) — Angular-эквивалент `FieldPassport`
 * (`@letar/forms-vue`). Без контрольной суммы — российский паспорт её не несёт, проверяется
 * только формат (10 цифр), 1-в-1 `passport.ts` (`@letar/forms-core/validators/ru`).
 */
@Component({
  selector: 'letar-field-passport',
  standalone: true,
  template: DOCUMENT_FIELD_TEMPLATE,
})
export class FieldPassportComponent extends DocumentFieldBase {
  readonly mask = '99 99 999999'

  @Input()
  override placeholder = '45 06 123456'

  protected validateDocument(value: string): string | undefined {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 10) {
      return 'Паспорт: серия (4 цифры) + номер (6 цифр)'
    }
    return undefined
  }
}
