import { Component, Input } from '@angular/core'
import { validateInn10, validateInn12 } from '@letar/forms-core/validators/ru'
import { DOCUMENT_FIELD_TEMPLATE, DocumentFieldBase, type DocumentFieldFormatMode } from '../core/document-field-base'

/**
 * ИНН (10 цифр юрлицо / 12 физлицо) — Angular-эквивалент `FieldINN` (`@letar/forms-vue`).
 * `formatMode: 'off'` — без структурной маски: длина переменная, группирующая маска
 * фиксированной длины дала бы ложный отказ на валидном коротком значении.
 */
@Component({
  selector: 'letar-field-inn',
  standalone: true,
  template: DOCUMENT_FIELD_TEMPLATE,
})
export class FieldInnComponent extends DocumentFieldBase {
  readonly mask = '9'
  override readonly formatMode: DocumentFieldFormatMode = 'off'
  override readonly maxLength = 12

  @Input()
  override placeholder = '7707083893'

  protected validateDocument(value: string): string | undefined {
    const digits = value.replace(/\D/g, '')
    if (digits.length === 10) {
      return validateInn10(digits) ? undefined : 'Неверная контрольная сумма ИНН'
    }
    if (digits.length === 12) {
      return validateInn12(digits) ? undefined : 'Неверная контрольная сумма ИНН'
    }
    return 'ИНН должен содержать 10 или 12 цифр'
  }
}
