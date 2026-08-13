import { Component, Input } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * `<input type="number">` с `min`/`max`/`step` — Angular-эквивалент `FieldNumberInput`
 * (`@letar/forms-vue`). В отличие от `FieldNumberComponent` (простое число без ограничений),
 * этот компонент несёт три дополнительных `@Input()` сверх `name`/`label`/`placeholder` —
 * тот же паттерн, что у `FieldNativeSelectComponent`.
 */
@Component({
  selector: 'letar-field-number-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <input
          [id]="name"
          [formControl]="ctrl"
          [placeholder]="resolvedPlaceholder() ?? ''"
          type="number"
          [min]="min"
          [max]="max"
          [step]="step"
          class="letar-field__control"
        />
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldNumberInputComponent extends FieldBase {
  @Input()
  min?: number
  @Input()
  max?: number
  @Input()
  step?: number
}
