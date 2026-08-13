import { Component } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * `<input type="number">` — Angular-эквивалент `FieldNumber` (`@letar/forms-vue`). Числовое
 * значение не требует ручного `parseFloat`: `type="number"` + `[formControl]` подхватывает
 * встроенный `NumberValueAccessor` (`@angular/forms`) — value в контроле всегда `number`,
 * не строка.
 */
@Component({
  selector: 'letar-field-number',
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
          class="letar-field__control"
        />
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldNumberComponent extends FieldBase {}
