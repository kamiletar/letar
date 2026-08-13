import { Component, effect, Input, signal } from '@angular/core'
import { FieldBase } from '../core/field-base'

export interface RadioCardOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

/**
 * Одиночный выбор карточками — Angular-эквивалент `FieldRadioCard` (`@letar/forms-vue`),
 * `role="radio"` в `role="radiogroup"`. Как `FieldListboxComponent` — кнопки без нативного
 * value-accessor, свой сигнал `selectedValue` синхронизируется через `effect()` +
 * `ctrl.events.subscribe()`, выбор — ручной `ctrl.setValue()`.
 */
@Component({
  selector: 'letar-field-radio-card',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div
          role="radiogroup"
          [attr.aria-label]="resolvedLabel()"
          [attr.data-field-name]="name"
          [attr.data-orientation]="orientation"
          class="letar-field__card-group"
        >
          @for (option of options; track option.value) {
            <button
              type="button"
              role="radio"
              class="letar-field__card"
              [attr.aria-checked]="selectedValue() === option.value"
              [attr.data-selected]="selectedValue() === option.value || null"
              [disabled]="option.disabled"
              (click)="select(ctrl, option.value)"
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
export class FieldRadioCardComponent extends FieldBase {
  @Input({ required: true })
  options: RadioCardOption[] = []
  @Input()
  orientation: 'horizontal' | 'vertical' = 'horizontal'

  readonly selectedValue = signal<string | undefined>(undefined)

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.selectedValue.set((ctrl.value as string | undefined) ?? undefined)
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  select(ctrl: { setValue: (value: string) => void; markAsTouched: () => void }, value: string): void {
    ctrl.setValue(value)
    ctrl.markAsTouched()
  }
}
