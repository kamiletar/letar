import { Component, Input } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

export interface FieldNativeSelectOption {
  value: string
  label: string
}

/**
 * Нативный `<select>` — Angular-эквивалент `FieldNativeSelect` (`@letar/forms-vue`).
 * `SelectControlValueAccessor` — встроенный, `[formControl]` + `<option [value]>` работает без
 * ручной обработки `change`.
 */
@Component({
  selector: 'letar-field-native-select',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <select [id]="name" [formControl]="ctrl" class="letar-field__control">
          @for (option of options; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldNativeSelectComponent extends FieldBase {
  @Input({ required: true })
  options: FieldNativeSelectOption[] = []
}
