import { Component, computed, effect, signal } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { normalizeBirthCertificate, validateBirthCertificate } from '@letar/forms-core/validators/ru'
import { FieldBase } from '../core/field-base'

/**
 * Свидетельство о рождении — Angular-эквивалент `FieldBirthCertificate` (`@letar/forms-vue`).
 * НЕ наследует `DocumentFieldBase` — как и Vue-версия, БЕЗ структурной маски (римская часть
 * серии переменной длины, 1-5 знаков; структурная маска дала бы ложный отказ). Свободный ввод —
 * поэтому обычный `[formControl]`-биндинг (как у `FieldStringComponent`) достаточен, движок
 * масок не нужен, а значит нет и причины отказываться от `ControlValueAccessor` (в отличие от
 * `DocumentFieldBase`, см. её комментарий "Почему НЕ `[formControl]`").
 *
 * Нормализация гомоглифов (`|||`→`III`, позиционные X/Х) и разделителей — на `blur`, не на
 * каждый символ, 1-в-1 порт `field-birth-certificate.ts` (Vue).
 */
@Component({
  selector: 'letar-field-birth-certificate',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <input
          [id]="name"
          [formControl]="ctrl"
          [placeholder]="resolvedPlaceholder() ?? 'II-МЮ № 123456'"
          type="text"
          class="letar-field__control"
          (blur)="onBlur()"
        />
        @if (hasFormatError()) {
          <span class="letar-field__error" role="alert">{{ displayErrorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldBirthCertificateComponent extends FieldBase {
  /** Собственная ошибка формата (независимо от Zod-схемы приложения — тот же принцип
   * defence-in-depth, что у документных полей, см. `DocumentFieldBase`). */
  private readonly formatErrorMessage = signal('')
  readonly hasFormatError = computed(() => this.hasError() || this.formatErrorMessage().length > 0)
  readonly displayErrorMessage = computed(() => this.formatErrorMessage() || this.errorMessage())

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => {
        const raw = typeof ctrl.value === 'string' ? ctrl.value : ''
        this.formatErrorMessage.set(
          raw && !validateBirthCertificate(raw)
            ? 'Формат: римская часть-две буквы № шесть цифр (например, II-МЮ № 123456)'
            : '',
        )
      }
      sync()
      const subscription = ctrl.valueChanges.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  protected onBlur(): void {
    const ctrl = this.control()
    if (!ctrl) {
      return
    }
    const raw = typeof ctrl.value === 'string' ? ctrl.value : ''
    if (raw) {
      ctrl.setValue(normalizeBirthCertificate(raw))
    }
    ctrl.markAsTouched()
  }
}
