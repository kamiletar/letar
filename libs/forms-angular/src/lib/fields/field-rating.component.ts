import { Component, effect, Input, signal } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * Ряд кнопок-звёзд на текстовых символах (`★`/`☆`) — Angular-эквивалент `FieldRating`
 * (`@letar/forms-vue`), без иконки-либы в headless-пакете. Не использует `[formControl]`
 * напрямую (нет нативного `ControlValueAccessor` для звёзд) — значение меняется вручную через
 * `ctrl.setValue()`/`ctrl.markAsTouched()` по клику, тот же контракт, что у Vue-версии через
 * `field.handleChange`/`field.handleBlur`.
 *
 * `ratingValue` — отдельный сигнал по той же причине, что и в `FieldSliderComponent`: приложение
 * zoneless, `ctrl.value` сам по себе не реактивен для шаблона.
 */
@Component({
  selector: 'letar-field-rating',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        <div class="letar-field__rating" role="radiogroup">
          @for (star of stars; track star) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="star === ratingValue()"
              [attr.aria-label]="star + ' из ' + count"
              class="letar-field__rating-star"
              [attr.data-selected]="star <= ratingValue()"
              (click)="selectStar(ctrl, star)"
            >{{ star <= ratingValue() ? '★' : '☆' }}</button>
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldRatingComponent extends FieldBase {
  @Input()
  count = 5

  readonly ratingValue = signal(0)

  get stars(): number[] {
    return Array.from({ length: this.count }, (_, i) => i + 1)
  }

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const syncValue = () => this.ratingValue.set((ctrl.value as number | undefined) ?? 0)
      syncValue()
      const subscription = ctrl.events.subscribe(syncValue)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  selectStar(ctrl: FormControl, star: number): void {
    ctrl.setValue(star)
    ctrl.markAsTouched()
  }
}
