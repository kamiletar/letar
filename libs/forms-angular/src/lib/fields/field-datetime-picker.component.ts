import { Component, effect, Input, signal } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { combineDateTime, parseDateTime } from '@letar/forms-core/field-widgets'
import { FieldBase } from '../core/field-base'

/**
 * Два нативных инпута (`date`+`time`) рядом — Angular-эквивалент `FieldDateTimePicker`
 * (`@letar/forms-vue`). Значение — строка ISO (`YYYY-MM-DDTHH:MM:00`) в одном `FormControl`,
 * собранная/разобранная через `combineDateTime`/`parseDateTime` (`@letar/forms-core/field-widgets`,
 * framework-free — без единой правки для Angular, тот же пруф, что у остальных полей пакета).
 *
 * Как и `FieldDateRangeComponent` — без `[formControl]` на инпутах (каждый инпут держит только
 * часть составного значения), свой сигнал `dtValue` подписан на `ctrl.events`.
 */
@Component({
  selector: 'letar-field-datetime-picker',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <div class="letar-field__datetime-picker">
          <input
            [id]="name"
            type="date"
            class="letar-field__control"
            [attr.data-field-name]="name + '-date'"
            [value]="parsed().date"
            [min]="minDate()"
            [max]="maxDate()"
            (input)="onDateInput($event, ctrl)"
            (blur)="ctrl.markAsTouched()"
          />
          <input
            type="time"
            class="letar-field__control"
            [attr.data-field-name]="name + '-time'"
            [value]="parsed().time"
            [step]="timeStep * 60"
            (input)="onTimeInput($event, ctrl)"
            (blur)="ctrl.markAsTouched()"
          />
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldDateTimePickerComponent extends FieldBase {
  @Input()
  minDateTime?: string
  @Input()
  maxDateTime?: string
  @Input()
  timeStep = 15

  readonly dtValue = signal<string | undefined>(undefined)

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.dtValue.set(ctrl.value as string | undefined)
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  parsed(): { date: string; time: string } {
    return parseDateTime(this.dtValue())
  }

  minDate(): string | undefined {
    return this.minDateTime?.slice(0, 10)
  }

  maxDate(): string | undefined {
    return this.maxDateTime?.slice(0, 10)
  }

  onDateInput(event: Event, ctrl: FormControl): void {
    const date = (event.target as HTMLInputElement).value
    ctrl.setValue(combineDateTime(date, this.parsed().time) || undefined)
    ctrl.markAsTouched()
  }

  onTimeInput(event: Event, ctrl: FormControl): void {
    const time = (event.target as HTMLInputElement).value
    ctrl.setValue(combineDateTime(this.parsed().date, time) || undefined)
    ctrl.markAsTouched()
  }
}
