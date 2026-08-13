import { Component, signal } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * `<input type="password">` с переключателем видимости — Angular-эквивалент `FieldPassword`
 * (`@letar/forms-vue`). `visible` — локальный UI-сигнал компонента (не часть `FieldBase`,
 * специфика конкретно этого поля).
 */
@Component({
  selector: 'letar-field-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <div class="letar-field__password-row">
          <input
            [id]="name"
            [formControl]="ctrl"
            [placeholder]="resolvedPlaceholder() ?? ''"
            [type]="visible() ? 'text' : 'password'"
            class="letar-field__control"
          />
          <button
            type="button"
            aria-label="Toggle password visibility"
            (click)="visible.set(!visible())"
          >
            {{ visible() ? '🙈' : '👁' }}
          </button>
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldPasswordComponent extends FieldBase {
  readonly visible = signal(false)
}
