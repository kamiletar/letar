import { Component, effect, Input, signal } from '@angular/core'
import { FieldBase } from '../core/field-base'

export interface SegmentedGroupOption {
  value: string
  label: string
  disabled?: boolean
}

/**
 * Сегментированный переключатель — Angular-эквивалент `FieldSegmentedGroup` (`@letar/forms-vue`):
 * визуально связанные кнопки для одиночного выбора, `role="radiogroup"`/`role="radio"`, тот же
 * паттерн, что `FieldRadioGroupComponent`, но без нативного `<input type="radio">` (голая
 * разметка на кнопках, как у Vue-версии) — свой сигнал + `ctrl.events.subscribe()`.
 */
@Component({
  selector: 'letar-field-segmented-group',
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
          class="letar-field__segmented-group"
        >
          @for (option of options; track option.value) {
            <button
              type="button"
              role="radio"
              class="letar-field__segment"
              [attr.aria-checked]="selectedValue() === option.value"
              [attr.data-selected]="selectedValue() === option.value || null"
              [disabled]="option.disabled"
              (click)="select(ctrl, option.value)"
            >{{ option.label }}</button>
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldSegmentedGroupComponent extends FieldBase {
  @Input({ required: true })
  options: SegmentedGroupOption[] = []
  @Input()
  orientation: 'horizontal' | 'vertical' = 'horizontal'

  readonly selectedValue = signal<string>('')

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.selectedValue.set((ctrl.value as string | undefined) ?? '')
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
