import { Component, effect, Input, signal } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { hhmmToMinutes, minutesToHHMM } from '@letar/forms-core/field-widgets'
import { FieldBase } from '../core/field-base'

/**
 * Значение — число минут. Два формата (Angular-эквивалент `FieldDuration`, `@letar/forms-vue`):
 * `minutes` — один `<input type="number">`; `HH:MM` (по умолчанию) — два инпута часы/минуты.
 * Оба режима пишут в один и тот же `FormControl` через `clamp()` — обычный `[formControl]` не
 * годится в режиме `HH:MM`, потому что видимых полей два, а значение схемы — одно число.
 *
 * `durationValue` — свой сигнал на `ctrl.events`, тот же приём, что у `FieldDateRangeComponent`.
 */
@Component({
  selector: 'letar-field-duration',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        @if (format === 'minutes') {
          <input
            [id]="name"
            type="number"
            class="letar-field__control"
            [value]="durationValue()"
            [min]="min"
            [max]="max"
            [step]="step"
            (input)="onMinutesInput($event, ctrl)"
            (blur)="ctrl.markAsTouched()"
          />
        } @else {
          <div class="letar-field__duration">
            <input
              [id]="name"
              type="number"
              class="letar-field__control letar-field__duration-hours"
              [attr.data-field-name]="name + '-hours'"
              [value]="hoursPart()"
              [min]="0"
              [max]="maxHours()"
              (input)="onHoursInput($event, ctrl)"
              (blur)="ctrl.markAsTouched()"
            />
            <span>:</span>
            <input
              type="number"
              class="letar-field__control letar-field__duration-mins"
              [attr.data-field-name]="name + '-mins'"
              [value]="minsPart()"
              [min]="0"
              [max]="59"
              [step]="step"
              (input)="onMinsInput($event, ctrl)"
              (blur)="ctrl.markAsTouched()"
            />
          </div>
        }
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldDurationComponent extends FieldBase {
  @Input()
  format: 'HH:MM' | 'minutes' = 'HH:MM'
  @Input()
  min = 0
  @Input()
  max = 1440
  @Input()
  step = 15

  readonly durationValue = signal(0)

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.durationValue.set((ctrl.value as number | undefined) ?? 0)
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  hoursPart(): number {
    return minutesToHHMM(this.durationValue()).hours
  }

  minsPart(): number {
    return minutesToHHMM(this.durationValue()).mins
  }

  maxHours(): number {
    return Math.floor(this.max / 60)
  }

  private clamp(ctrl: FormControl, next: number): void {
    ctrl.setValue(Math.max(this.min, Math.min(this.max, next)))
    ctrl.markAsTouched()
  }

  onMinutesInput(event: Event, ctrl: FormControl): void {
    this.clamp(ctrl, Number((event.target as HTMLInputElement).value))
  }

  onHoursInput(event: Event, ctrl: FormControl): void {
    const hours = Number((event.target as HTMLInputElement).value)
    this.clamp(ctrl, hhmmToMinutes(hours, this.minsPart()))
  }

  onMinsInput(event: Event, ctrl: FormControl): void {
    const mins = Number((event.target as HTMLInputElement).value)
    this.clamp(ctrl, hhmmToMinutes(this.hoursPart(), mins))
  }
}
