import { Component } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/** Нативный `<textarea>` — Angular-эквивалент `FieldTextarea` (`@letar/forms-vue`). */
@Component({
  selector: 'letar-field-textarea',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <textarea
          [id]="name"
          [formControl]="ctrl"
          [placeholder]="resolvedPlaceholder() ?? ''"
          class="letar-field__control"
        ></textarea>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldTextareaComponent extends FieldBase {}
