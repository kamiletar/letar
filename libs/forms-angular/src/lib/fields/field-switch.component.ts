import { Component } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * `<input type="checkbox" role="switch">` — Angular-эквивалент `FieldSwitch` (`@letar/forms-vue`).
 * Тот же `CheckboxControlValueAccessor`, что у `FieldCheckbox` — разница только в `role`/классе
 * для визуального стиля переключателя (headless-пакет, стилей самих нет).
 */
@Component({
  selector: 'letar-field-switch',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field letar-field--switch">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <input [id]="name" [formControl]="ctrl" type="checkbox" role="switch" class="letar-field__control" />
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldSwitchComponent extends FieldBase {}
