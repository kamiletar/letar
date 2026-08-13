import { Component, Input } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * `<input type="time">` — Angular-эквивалент `FieldTime` (`@letar/forms-vue`).
 */
@Component({
  selector: 'letar-field-time',
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
          type="time"
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
export class FieldTimeComponent extends FieldBase {
  @Input()
  min?: string
  @Input()
  max?: string
  @Input()
  step?: number
}
