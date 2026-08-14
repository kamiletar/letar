import { Component, effect, Input, signal } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * Шкала Лайкерта — Angular-эквивалент `FieldLikert` (`@letar/forms-vue`). Значение — `number`
 * (1-based индекс выбранной точки), один `FormControl` на весь вопрос (не составной объект —
 * составные значения нужны только `FieldMatrixChoice`/`FieldTableEditor`/`FieldDataGrid`
 * из этого стейджа, здесь один вопрос = одно скалярное значение, как в `FieldRating`).
 *
 * `role="radiogroup"` на обёртке / `role="radio"` + `aria-checked` на точке — портировано без
 * изменений из Vue-версии, значение хранится напрямую в `FormControl` (не в отдельном сигнале,
 * как `FieldTags`/`FieldRichText`), поэтому `[value]`/`(click)` читают `control()!.value` напрямую.
 */
@Component({
  selector: 'letar-field-likert',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div role="radiogroup" [attr.aria-label]="resolvedLabel()" [attr.data-field-name]="name" class="letar-field__likert">
          @for (anchor of anchors; track anchor; let i = $index) {
            <button
              type="button"
              role="radio"
              class="letar-field__likert-option"
              [attr.aria-checked]="selectedPoint() === i + 1"
              [attr.data-selected]="selectedPoint() === i + 1"
              [disabled]="disabled"
              (click)="selectPoint(ctrl, i + 1)"
            >
              @if (showNumbers) {
                <span class="letar-field__likert-number">{{ i + 1 }}</span>
              }
              <span class="letar-field__likert-dot" [attr.data-selected]="selectedPoint() === i + 1"></span>
              <span class="letar-field__likert-anchor" [attr.data-selected]="selectedPoint() === i + 1">{{ anchor }}</span>
            </button>
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldLikertComponent extends FieldBase {
  @Input({ required: true })
  anchors: string[] = []
  @Input()
  showNumbers = false
  @Input()
  disabled = false

  protected readonly selectedPoint = signal<number | undefined>(undefined)

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.selectedPoint.set(ctrl.value as number | undefined)
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  protected selectPoint(ctrl: { setValue: (value: number) => void; markAsTouched: () => void }, point: number): void {
    if (this.disabled) {
      return
    }
    ctrl.setValue(point)
    ctrl.markAsTouched()
  }
}
