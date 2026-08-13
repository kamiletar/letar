import { Component, Input } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * Процентное поле — Angular-эквивалент `FieldPercentage` (`@letar/forms-vue`). Значение хранится
 * как есть (50 = 50%), не как доля (0.5) — тот же контракт, что у React/Vue-версий.
 */
@Component({
  selector: 'letar-field-percentage',
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
export class FieldPercentageComponent extends FieldBase {
  @Input()
  min = 0
  @Input()
  max = 100
  @Input()
  step = 1
}
