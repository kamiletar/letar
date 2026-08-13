import { Component, effect, Input, signal } from '@angular/core'
import type { FormControl } from '@angular/forms'
import {
  DATE_RANGE_PRESET_LABELS,
  type DateRangePreset,
  type DateRangeValue,
  getPresetRange,
} from '@letar/forms-core/field-widgets'
import { FieldBase } from '../core/field-base'

export type { DateRangePreset, DateRangeValue }

/**
 * Два связанных `<input type="date">` — Angular-эквивалент `FieldDateRange` (`@letar/forms-vue`).
 * Значение схемы — единый объект `{ start, end }` в одном `FormControl` (не `FormGroup` с двумя
 * подконтролами — тот же принцип, что уже держит `FieldBase`: control() всегда один `FormControl`
 * на всё значение поля, независимо от того, примитив это или составной объект).
 *
 * `[formControl]` не используется ни на одном из двух `<input>` — у каждого своя часть составного
 * значения, `FormControlDirective` ожидает совпадение типа значения с контролом целиком. Вместо
 * этого — собственный сигнал `rangeValue`, подписанный на `ctrl.events` (тот же приём, что
 * `FieldRatingComponent`/`FieldSliderComponent`, Stage A: zoneless-приложение, `FormControl.value`
 * сам по себе не реактивен для шаблона), и ручные `ctrl.setValue()`/`ctrl.markAsTouched()` по
 * `input`/`click`.
 *
 * Пресеты — ряд кнопок под инпутами, не выпадающее меню (1-в-1 с Vue: нет смысла заводить
 * отдельный примитив ради 7 текстовых пунктов в headless-пакете).
 */
@Component({
  selector: 'letar-field-date-range',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div class="letar-field__date-range letar-field__date-range--{{ orientation }}">
          <label class="letar-field__date-range-part">
            <span>{{ startLabel }}</span>
            <input
              type="date"
              class="letar-field__control"
              [attr.data-field-name]="name + '.start'"
              [value]="rangeValue().start"
              [min]="min"
              [max]="rangeValue().end || max"
              (input)="onStartInput($event, ctrl)"
              (blur)="ctrl.markAsTouched()"
            />
          </label>
          <label class="letar-field__date-range-part">
            <span>{{ endLabel }}</span>
            <input
              type="date"
              class="letar-field__control"
              [attr.data-field-name]="name + '.end'"
              [value]="rangeValue().end"
              [min]="rangeValue().start || min"
              [max]="max"
              (input)="onEndInput($event, ctrl)"
              (blur)="ctrl.markAsTouched()"
            />
          </label>
        </div>
        @if (presets && presets.length > 0) {
          <div class="letar-field__date-range-presets">
            @for (preset of presets; track preset) {
              <button
                type="button"
                class="letar-field__date-range-preset"
                (click)="applyPreset(ctrl, preset)"
              >{{ presetLabels[preset] }}</button>
            }
          </div>
        }
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldDateRangeComponent extends FieldBase {
  @Input()
  startLabel = 'С'
  @Input()
  endLabel = 'По'
  @Input()
  min?: string
  @Input()
  max?: string
  @Input()
  presets?: DateRangePreset[]
  @Input()
  orientation: 'horizontal' | 'vertical' = 'horizontal'

  readonly presetLabels = DATE_RANGE_PRESET_LABELS
  readonly rangeValue = signal<DateRangeValue>({ start: '', end: '' })

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.rangeValue.set((ctrl.value as DateRangeValue | undefined) ?? { start: '', end: '' })
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  onStartInput(event: Event, ctrl: FormControl): void {
    const value = (event.target as HTMLInputElement).value
    ctrl.setValue({ ...this.rangeValue(), start: value })
    ctrl.markAsTouched()
  }

  onEndInput(event: Event, ctrl: FormControl): void {
    const value = (event.target as HTMLInputElement).value
    ctrl.setValue({ ...this.rangeValue(), end: value })
    ctrl.markAsTouched()
  }

  applyPreset(ctrl: FormControl, preset: DateRangePreset): void {
    ctrl.setValue(getPresetRange(preset))
    ctrl.markAsTouched()
  }
}
