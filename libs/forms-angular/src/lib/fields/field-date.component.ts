import { Component } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/** `<input type="date">` — Angular-эквивалент `FieldDate` (`@letar/forms-vue`). Значение — строка `yyyy-mm-dd`. */
@Component({
  selector: 'letar-field-date',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <input [id]="name" [formControl]="ctrl" type="date" class="letar-field__control" />
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldDateComponent extends FieldBase {}
