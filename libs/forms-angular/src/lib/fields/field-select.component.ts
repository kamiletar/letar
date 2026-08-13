import { Component, Input } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

export interface FieldSelectOption {
  value: string
  label: string
}

/**
 * Стилизуемый select — Angular-эквивалент `FieldSelect` (`@letar/forms-vue`). В headless-скине
 * без CSS/UIKit контракт совпадает с `FieldNativeSelectComponent` (тот же `<select>`) — Vue тоже
 * разводит `FieldSelect`/`FieldNativeSelect` по контракту пропсов (`FieldSelect` поддерживает
 * `placeholder`-опцию), а не по разметке. Разница с `FieldNativeSelectComponent` — пустая опция
 * из `resolvedPlaceholder()`, которую нативный вариант не рендерит вовсе.
 */
@Component({
  selector: 'letar-field-select',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <select [id]="name" [formControl]="ctrl" class="letar-field__control" [attr.data-field-name]="name">
          @if (resolvedPlaceholder()) {
            <option value="">{{ resolvedPlaceholder() }}</option>
          }
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
export class FieldSelectComponent extends FieldBase {
  @Input({ required: true })
  options: FieldSelectOption[] = []
}
