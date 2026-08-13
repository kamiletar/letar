import { Component, Input, signal } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * Текстовое поле с подсказками — Angular-эквивалент `FieldAutocomplete` (`@letar/forms-vue`).
 * В отличие от `FieldComboboxComponent`, значение контрола ВСЕГДА произвольный текст (не только
 * значение из списка) — `[formControl]` работает напрямую на `<input>`, дополнительный сигнал
 * для инпута не нужен, подсказки — чисто оверлей поверх. Beta: только статичные `suggestions`,
 * без асинхронного поиска.
 */
@Component({
  selector: 'letar-field-autocomplete',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div class="letar-field__autocomplete">
          <input
            type="text"
            class="letar-field__control"
            [attr.data-field-name]="name"
            [formControl]="ctrl"
            [placeholder]="resolvedPlaceholder() ?? 'Начните вводить...'"
            (input)="isOpen.set(true)"
            (focus)="isOpen.set(true)"
            (blur)="isOpen.set(false)"
          />
          @if (isOpen() && filteredSuggestions(ctrl.value).length > 0) {
            <ul class="letar-field__autocomplete-list" role="listbox">
              @for (suggestion of filteredSuggestions(ctrl.value); track suggestion) {
                <li
                  role="option"
                  class="letar-field__autocomplete-option"
                  (mousedown)="onSelect($event, ctrl, suggestion)"
                >{{ suggestion }}</li>
              }
            </ul>
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldAutocompleteComponent extends FieldBase {
  @Input()
  suggestions: string[] = []
  @Input()
  minChars = 1

  readonly isOpen = signal(false)

  filteredSuggestions(currentValue: string | null | undefined): string[] {
    const value = currentValue ?? ''
    if (value.length < this.minChars) {
      return []
    }
    const needle = value.toLowerCase()
    return this.suggestions.filter((suggestion) => suggestion.toLowerCase().includes(needle))
  }

  onSelect(event: Event, ctrl: { setValue: (value: string) => void }, suggestion: string): void {
    event.preventDefault()
    ctrl.setValue(suggestion)
    this.isOpen.set(false)
  }
}
