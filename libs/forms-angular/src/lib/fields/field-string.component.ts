import { Component } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * Нативный `<input type="text">` — Angular-эквивалент `FieldInput` (`@letar/forms-vue`).
 * `[formControl]` — нативный примитив `@angular/forms`, не `@tanstack/angular-form`: контрол
 * приходит из `FieldBase.control` (сигнал), связанного через `FormRootService`.
 */
@Component({
  selector: 'letar-field-string',
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
          type="text"
          class="letar-field__control"
        />
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldStringComponent extends FieldBase {}
