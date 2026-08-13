import { Component, effect, Input, signal } from '@angular/core'
import { FieldBase } from '../core/field-base'

export interface CheckboxCardOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

/**
 * Множественный выбор карточками — Angular-эквивалент `FieldCheckboxCard` (`@letar/forms-vue`),
 * `role="checkbox"` на каждой карточке (без `role="radiogroup"` — карточки независимы). Та же
 * механика, что `FieldRadioCardComponent` (Stage E), но значение `string[]`: свой сигнал
 * `selectedValues`, синхронизируемый через `effect()` + `ctrl.events.subscribe()`, тоггл — ручной
 * `ctrl.setValue()`.
 */
@Component({
  selector: 'letar-field-checkbox-card',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div
          role="group"
          [attr.aria-label]="resolvedLabel()"
          [attr.data-field-name]="name"
          [attr.data-orientation]="orientation"
          class="letar-field__card-group"
        >
          @for (option of options; track option.value) {
            <button
              type="button"
              role="checkbox"
              class="letar-field__card"
              [attr.aria-checked]="isSelected(option.value)"
              [attr.data-selected]="isSelected(option.value) || null"
              [disabled]="option.disabled"
              (click)="toggle(ctrl, option.value)"
            >
              <span class="letar-field__card-label">{{ option.label }}</span>
              @if (option.description) {
                <span class="letar-field__card-description">{{ option.description }}</span>
              }
            </button>
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldCheckboxCardComponent extends FieldBase {
  @Input({ required: true })
  options: CheckboxCardOption[] = []
  @Input()
  orientation: 'horizontal' | 'vertical' = 'horizontal'

  readonly selectedValues = signal<string[]>([])

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => {
        const value = ctrl.value as string[] | undefined
        this.selectedValues.set(Array.isArray(value) ? value : [])
      }
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  isSelected(value: string): boolean {
    return this.selectedValues().includes(value)
  }

  toggle(ctrl: { setValue: (value: string[]) => void; markAsTouched: () => void }, value: string): void {
    const current = this.selectedValues()
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    ctrl.setValue(next)
    ctrl.markAsTouched()
  }
}
