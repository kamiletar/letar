import { Component } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * `<input type="checkbox">` — Angular-эквивалент `FieldCheckbox` (`@letar/forms-vue`). Boolean
 * читается/пишется автоматически: `[formControl]` на `type="checkbox"` подхватывает встроенный
 * `CheckboxControlValueAccessor`, без ручной обработки `change`/`checked`.
 */
@Component({
  selector: 'letar-field-checkbox',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field letar-field--checkbox">
        <input [id]="name" [formControl]="ctrl" type="checkbox" class="letar-field__control" />
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldCheckboxComponent extends FieldBase {}
