import { Component, effect, Input, signal } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * Голый `<input type="range">` — Angular-эквивалент `FieldSlider` (`@letar/forms-vue`), без
 * Radix/Reka Slider-примитива (нет UIKit-абстракции в headless-пакете).
 *
 * `sliderValue` — отдельный сигнал, не прямое чтение `ctrl.value` из шаблона: приложение
 * работает в zoneless-режиме (`provideZonelessChangeDetection()`), а `FormControl.value` — не
 * сигнал сам по себе. Без явной подписки на `ctrl.events` интерполяция `{{ sliderValue() }}`
 * не обновлялась бы после первого рендера — тот же приём, что `FieldBase` уже применяет для
 * `hasError`/`errorMessage`.
 */
@Component({
  selector: 'letar-field-slider',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <div class="letar-field__slider">
          <input
            [id]="name"
            [formControl]="ctrl"
            type="range"
            [min]="min"
            [max]="max"
            [step]="step"
            class="letar-field__control letar-field__slider-input"
          />
          @if (showValue) {
            <span class="letar-field__slider-value">{{ sliderValue() }}</span>
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldSliderComponent extends FieldBase {
  @Input()
  min = 0
  @Input()
  max = 100
  @Input()
  step = 1
  @Input()
  showValue = false

  readonly sliderValue = signal(0)

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const syncValue = () => this.sliderValue.set((ctrl.value as number | undefined) ?? this.min)
      syncValue()
      const subscription = ctrl.events.subscribe(syncValue)
      onCleanup(() => subscription.unsubscribe())
    })
  }
}
