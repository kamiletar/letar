import { Component, computed, Input, signal } from '@angular/core'
import { FieldBase } from '../core/field-base'

export interface FieldComboboxOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

/**
 * Searchable select с группами — Angular-эквивалент `FieldCombobox` (`@letar/forms-vue`).
 * Beta-упрощение, как и у Vue/React-версий: только статичные `options`, фильтрация по вхождению
 * подстроки в `label`, без асинхронного поиска.
 *
 * `<input>` не привязан через `[formControl]` — текст в инпуте (поисковый запрос/подпись
 * выбранной опции) и значение контрола (`value` опции) разные вещи, `FormControlDirective`
 * ожидает совпадение отображаемого значения со значением контрола. Синхронизация — тот же приём,
 * что `FieldDateRangeComponent`: локальный сигнал плюс ручной `ctrl.setValue()`.
 */
@Component({
  selector: 'letar-field-combobox',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div class="letar-field__combobox">
          <input
            type="text"
            class="letar-field__control"
            [attr.data-field-name]="name"
            [value]="inputValue()"
            [placeholder]="resolvedPlaceholder() ?? 'Поиск...'"
            (input)="onInput($event)"
            (focus)="isOpen.set(true)"
            (blur)="onBlur(ctrl)"
          />
          @if (isOpen() && filteredOptions().length > 0) {
            <ul class="letar-field__combobox-list" role="listbox">
              @for (option of filteredOptions(); track option.value) {
                <li
                  role="option"
                  class="letar-field__combobox-option"
                  [attr.aria-disabled]="option.disabled"
                  (mousedown)="onSelect($event, ctrl, option)"
                >{{ option.label }}</li>
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
export class FieldComboboxComponent extends FieldBase {
  @Input({ required: true })
  options: FieldComboboxOption[] = []
  @Input()
  minChars = 0

  readonly inputValue = signal('')
  readonly isOpen = signal(false)

  readonly filteredOptions = computed(() => {
    const needle = this.inputValue().toLowerCase()
    if (this.inputValue().length < this.minChars) {
      return []
    }
    if (!needle) {
      return this.options
    }
    return this.options.filter((option) => option.label.toLowerCase().includes(needle))
  })

  onInput(event: Event): void {
    this.inputValue.set((event.target as HTMLInputElement).value)
    this.isOpen.set(true)
  }

  onSelect(event: Event, ctrl: { setValue: (value: string) => void }, option: FieldComboboxOption): void {
    event.preventDefault()
    if (option.disabled) {
      return
    }
    ctrl.setValue(option.value)
    this.inputValue.set(option.label)
    this.isOpen.set(false)
  }

  onBlur(ctrl: { markAsTouched: () => void }): void {
    this.isOpen.set(false)
    ctrl.markAsTouched()
  }
}
