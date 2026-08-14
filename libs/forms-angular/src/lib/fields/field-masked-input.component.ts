import { Component, Input } from '@angular/core'
import { DocumentFieldBase, type DocumentFieldFormatMode } from '../core/document-field-base'

/**
 * FieldMaskedInput — универсальная маска (Stage J) — Angular-эквивалент `FieldMaskedInput`
 * (`@letar/forms-vue`, `field-masked-input.ts`). `mask` приходит из пропсов, а не зашита в
 * компонент — в отличие от 10 документных полей Stage B (ИНН/БИК/СНИЛС/...), где маска — деталь
 * реализации конкретного документа.
 *
 * ## Почему наследует `DocumentFieldBase`, а не собственный движок
 *
 * `DocumentFieldBase` — уже готовый мост к `@letar/forms-core/mask` (`MaskController`): DOM
 * управляется контроллером напрямую (`'live'`), `FormControl` получает raw-значение, внешние
 * изменения синхронизируются обратно в DOM. Это ТОТ ЖЕ движок, которым пользуются 10 документных
 * полей — задание прямо требует не писать масочную логику заново. `mask`/`formatMode`/`maxLength`
 * в базовом классе объявлены `abstract`/с дефолтом на чтение (документные поля прописывают их как
 * константы класса) — здесь они переобъявлены как `@Input()`, это не меняет ничего в
 * `document-field-base.ts` и не рискует регрессией 10 уже работающих полей.
 *
 * `validateDocument()` — обязательный абстрактный метод базы (контрольная сумма документа), но
 * у универсальной маски нет своей контрольной суммы: всегда `undefined`, ошибка валидности
 * целиком идёт из Zod-подсхемы формы (`hasError`/`errorMessage` из `FieldBase`, `hasDocumentError`
 * в этом случае вырождается в `hasError()`).
 *
 * `formatDescription` — обязателен (не `?`), как в Vue-версии: WCAG 3.3.2 требует, чтобы формат
 * ввода был известен до начала ввода, а не только в момент ошибки валидации.
 */
@Component({
  selector: 'letar-field-masked-input',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <p [id]="hintId" class="letar-field__hint">{{ formatDescription }}</p>
        <input
          #inputEl
          [id]="name"
          [placeholder]="resolvedPlaceholder() ?? ''"
          [attr.maxlength]="maxLength ?? null"
          [attr.aria-describedby]="hintId"
          type="text"
          class="letar-field__control"
          (input)="onManualInput($event)"
          (blur)="onDocumentBlur()"
        />
        @if (hasDocumentError()) {
          <span class="letar-field__error" role="alert">{{ displayErrorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldMaskedInputComponent extends DocumentFieldBase {
  @Input({ required: true })
  mask!: string
  @Input()
  override formatMode: DocumentFieldFormatMode = 'live'
  @Input()
  override maxLength: number | undefined = undefined
  @Input({ required: true })
  formatDescription!: string

  protected get hintId(): string {
    return `${this.name}-format-description`
  }

  protected validateDocument(): string | undefined {
    return undefined
  }
}
