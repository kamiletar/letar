import { Component, Input } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

export interface FieldRadioGroupOption {
  value: string
  label: string
}

/**
 * Нативные `<input type="radio">` — Angular-эквивалент `FieldRadioGroup` (`@letar/forms-vue`).
 * Несколько radio, разделяющих ОДИН и тот же `FormControl` через `[formControl]` (не
 * `formControlName` + `name`-атрибут) — `RadioControlValueAccessor` группирует их по идентичности
 * инстанса контрола, это нативный примитив `@angular/forms`, работает без ручного state-менеджмента.
 */
@Component({
  selector: 'letar-field-radio-group',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <fieldset class="letar-field letar-field--radio-group">
        <legend>{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</legend>
        @for (option of options; track option.value) {
          <label class="letar-field__radio-option">
            <input [formControl]="ctrl" type="radio" [value]="option.value" [name]="name" />
            {{ option.label }}
          </label>
        }
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </fieldset>
    }
  `,
})
export class FieldRadioGroupComponent extends FieldBase {
  @Input({ required: true })
  options: FieldRadioGroupOption[] = []
}
