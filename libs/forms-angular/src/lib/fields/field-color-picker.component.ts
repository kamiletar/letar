import { Component, effect, Input, signal } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { FieldBase } from '../core/field-base'

const DEFAULT_SWATCHES = [
  '#000000',
  '#4A5568',
  '#F56565',
  '#ED64A6',
  '#9F7AEA',
  '#6B46C1',
  '#4299E1',
  '#0BC5EA',
  '#38B2AC',
  '#48BB78',
  '#ECC94B',
  '#DD6B20',
]

/**
 * Пикер цвета — Angular-эквивалент `FieldColorPicker` (`@letar/forms-vue`, `field-color-picker.ts`).
 * Тот же выбор упрощения, что в Vue: нативный `<input type="color">` (браузерный пикер уже даёт
 * area+hue+alpha слайдеры бесплатно) вместо Ark UI `ColorPicker.Root` (Chakra-скин) + текстовый
 * hex-инпут для точного значения + палитра свотчей.
 */
@Component({
  selector: 'letar-field-color-picker',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div class="letar-field__color-picker">
          <div class="letar-field__color-picker-row">
            <input
              type="color"
              [value]="colorValue()"
              class="letar-field__color-swatch-input"
              [attr.data-field-name]="name"
              (input)="onColorInput($event, ctrl)"
              (blur)="ctrl.markAsTouched()"
            />
            <input
              type="text"
              [value]="colorValue()"
              class="letar-field__control letar-field__color-hex"
              (change)="onColorInput($event, ctrl)"
              (blur)="ctrl.markAsTouched()"
            />
          </div>
          @if (swatches.length > 0) {
            <div class="letar-field__color-swatches">
              @for (swatch of swatches; track swatch) {
                <button
                  type="button"
                  [attr.aria-label]="swatch"
                  [attr.data-selected]="isSelected(swatch) || null"
                  class="letar-field__color-swatch"
                  [style.backgroundColor]="swatch"
                  (click)="selectSwatch(ctrl, swatch)"
                ></button>
              }
            </div>
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldColorPickerComponent extends FieldBase {
  @Input()
  swatches: string[] = DEFAULT_SWATCHES

  readonly colorValue = signal('#000000')

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.colorValue.set((typeof ctrl.value === 'string' && ctrl.value) || '#000000')
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  protected isSelected(swatch: string): boolean {
    return swatch.toLowerCase() === this.colorValue().toLowerCase()
  }

  protected onColorInput(event: Event, ctrl: FormControl): void {
    ctrl.setValue((event.target as HTMLInputElement).value)
  }

  protected selectSwatch(ctrl: FormControl, swatch: string): void {
    ctrl.setValue(swatch)
  }
}
