import { Component, effect, Input, signal } from '@angular/core'
import { FieldBase } from '../core/field-base'

export interface ImageChoiceOption {
  value: string
  label: string
  image: string
  description?: string
}

/**
 * Grid карточек с изображениями — Angular-эквивалент `FieldImageChoice` (`@letar/forms-vue`):
 * `string` (single) или `string[]` (multiple), тот же приём, что у остальных кнопочных полей
 * Stage E — свой сигнал `valueArray` (нормализованный к массиву для обоих режимов), синк через
 * `effect()` + `ctrl.events.subscribe()`, выбор — ручной `ctrl.setValue()`.
 */
@Component({
  selector: 'letar-field-image-choice',
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
          class="letar-field__image-choice"
          [style.grid-template-columns]="'repeat(' + columns + ', minmax(0, 1fr))'"
        >
          @for (option of options; track option.value) {
            <button
              type="button"
              [attr.role]="multiple ? 'checkbox' : 'radio'"
              class="letar-field__image-choice-item"
              [attr.aria-checked]="isSelected(option.value)"
              [attr.data-selected]="isSelected(option.value) || null"
              (click)="select(ctrl, option.value)"
            >
              <img [src]="option.image" [alt]="option.label" class="letar-field__image-choice-img" />
              <span class="letar-field__image-choice-label">{{ option.label }}</span>
              @if (option.description) {
                <span class="letar-field__image-choice-description">{{ option.description }}</span>
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
export class FieldImageChoiceComponent extends FieldBase {
  @Input({ required: true })
  options: ImageChoiceOption[] = []
  @Input()
  columns = 3
  @Input()
  multiple = false

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

  isSelected(value: string): boolean {
    return this.valueArray().includes(value)
  }

  select(ctrl: { setValue: (value: string | string[]) => void; markAsTouched: () => void }, value: string): void {
    if (this.multiple) {
      const current = this.valueArray()
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      ctrl.setValue(next)
    } else {
      ctrl.setValue(value)
    }
    ctrl.markAsTouched()
  }
}
