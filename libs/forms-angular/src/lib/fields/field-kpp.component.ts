import { Component, Input } from '@angular/core'
import { validateKpp } from '@letar/forms-core/validators/ru'
import { DOCUMENT_FIELD_TEMPLATE, DocumentFieldBase } from '../core/document-field-base'

/** КПП (9 символов) — Angular-эквивалент `FieldKPP` (`@letar/forms-vue`). */
@Component({
  selector: 'letar-field-kpp',
  standalone: true,
  template: DOCUMENT_FIELD_TEMPLATE,
})
export class FieldKppComponent extends DocumentFieldBase {
  readonly mask = '*********'

  @Input()
  override placeholder = '770701001'

  protected validateDocument(value: string): string | undefined {
    const clean = value.replace(/[\s-]/g, '').toUpperCase()
    if (clean.length !== 9) {
      return 'КПП должен содержать 9 символов'
    }
    return validateKpp(clean) ? undefined : 'Неверный формат КПП'
  }
}
