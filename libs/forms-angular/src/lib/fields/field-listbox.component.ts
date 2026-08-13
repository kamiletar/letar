import { Component, effect, Input, signal } from '@angular/core'
import { getOptionLabel, groupOptions } from '@letar/forms-core/uikit'
import { FieldBase } from '../core/field-base'

export interface ListboxOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

/**
 * Все опции видны сразу (не выпадающий список) — Angular-эквивалент `FieldListbox`
 * (`@letar/forms-vue`). `string | string[]` в зависимости от `selectionMode`, группировка через
 * `groupOptions`/`getOptionLabel` из `@letar/forms-core/uikit` (то же framework-free ядро, что и
 * Vue-версия — без единой правки под Angular).
 *
 * Контрол держит примитив/массив целиком (тот же принцип, что `DateRange`/`Schedule`, Stage D) —
 * кнопки-опции не `[formControl]`-совместимы (нет нативного value-accessor для кастомного
 * `role="option"`), поэтому свой сигнал `valueArray`, синхронизируемый через `effect()` +
 * `ctrl.events.subscribe()`, и ручной `ctrl.setValue()` по клику.
 */
@Component({
  selector: 'letar-field-listbox',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div
          role="listbox"
          [attr.aria-multiselectable]="selectionMode === 'multiple'"
          [attr.data-field-name]="name"
          class="letar-field__listbox"
        >
          @for (group of groupedOptions(); track group.name) {
            @if (group.name) {
              <div class="letar-field__listbox-group">{{ group.name }}</div>
            }
            @for (option of group.options; track option.value) {
              <button
                type="button"
                role="option"
                class="letar-field__listbox-option"
                [attr.aria-selected]="isSelected(option.value)"
                [attr.data-selected]="isSelected(option.value) || null"
                [disabled]="option.disabled"
                (click)="toggle(ctrl, option.value)"
              >{{ getOptionLabel(option) }}</button>
            }
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldListboxComponent extends FieldBase {
  @Input({ required: true })
  options: ListboxOption[] = []
  @Input()
  selectionMode: 'single' | 'multiple' = 'single'

  readonly valueArray = signal<string[]>([])

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => {
        const value = ctrl.value as string | string[] | undefined
        this.valueArray.set(Array.isArray(value) ? value : value ? [value] : [])
      }
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  groupedOptions(): { name: string; options: ListboxOption[] }[] {
    const groups = groupOptions(this.options)
    if (!groups) {
      return [{ name: '', options: this.options }]
    }
    return Array.from(groups.entries()).map(([name, options]) => ({ name: name || '', options }))
  }

  getOptionLabel(option: ListboxOption): string {
    return getOptionLabel(option)
  }

  isSelected(value: string): boolean {
    return this.valueArray().includes(value)
  }

  toggle(ctrl: { setValue: (value: string | string[]) => void; markAsTouched: () => void }, value: string): void {
    if (this.selectionMode === 'single') {
      ctrl.setValue(this.valueArray()[0] === value ? '' : value)
    } else {
      const current = this.valueArray()
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      ctrl.setValue(next)
    }
    ctrl.markAsTouched()
  }
}
