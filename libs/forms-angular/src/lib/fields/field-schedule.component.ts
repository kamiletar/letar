import { Component, computed, effect, Input, signal } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { FieldBase } from '../core/field-base'

export interface ScheduleDaySchedule {
  open: string
  close: string
}

export interface WeeklySchedule {
  monday: ScheduleDaySchedule | null
  tuesday: ScheduleDaySchedule | null
  wednesday: ScheduleDaySchedule | null
  thursday: ScheduleDaySchedule | null
  friday: ScheduleDaySchedule | null
  saturday: ScheduleDaySchedule | null
  sunday: ScheduleDaySchedule | null
}

export type DayOfWeek = keyof WeeklySchedule

const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_DAY_NAMES: Record<DayOfWeek, string> = {
  monday: 'Понедельник',
  tuesday: 'Вторник',
  wednesday: 'Среда',
  thursday: 'Четверг',
  friday: 'Пятница',
  saturday: 'Суббота',
  sunday: 'Воскресенье',
}

const DEFAULT_WORKING_HOURS: WeeklySchedule = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: null,
  sunday: null,
}

function isValidTimeRange(open: string, close: string): boolean {
  const [openH, openM] = open.split(':').map(Number)
  const [closeH, closeM] = close.split(':').map(Number)
  return closeH * 60 + closeM > openH * 60 + openM
}

/**
 * Редактор недельного расписания — самое сложное из четырёх полей Stage D: toggle дня, время
 * open/close, копирование понедельника на будни, проверка `close > open` с предупреждением.
 * Angular-эквивалент `FieldSchedule` (`@letar/forms-vue`), логика 1-в-1 (в т.ч. типы
 * `WeeklySchedule`/`ScheduleDaySchedule`/`DayOfWeek` и константы — портированы, а не
 * переиспользованы: они не вынесены в `@letar/forms-core`, живут локально во всех трёх скинах,
 * тот же выбор что у Vue-версии).
 *
 * Значение схемы — единый объект `WeeklySchedule` в одном `FormControl` (не `FormGroup` с 7
 * подконтролами по дням) — тот же принцип составного значения, что у `FieldDateRangeComponent`.
 * `scheduleValue` — свой сигнал на `ctrl.events`, с фолбэком на `defaultSchedule`, когда контрол
 * ещё пуст (1-в-1 с Vue: `field.state.value ?? props.defaultSchedule`, не физическая запись
 * дефолта в контрол — до первого взаимодействия `ctrl.value` остаётся тем, что дал `AppForm`).
 *
 * `<input type="checkbox" role="switch">` вместо Radix/Chakra `Switch` — тот же приём, что у
 * headless `FieldSwitchComponent` (Этап 1–2).
 */
@Component({
  selector: 'letar-field-schedule',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div class="letar-field__schedule" [attr.data-field-name]="name">
          @if (invalidDays().length > 0) {
            <p class="letar-field__schedule-warning">
              Время закрытия должно быть позже открытия: {{ invalidDaysLabel() }}
            </p>
          }
          @if (showCopyToWeekdays && days.includes('monday')) {
            <button
              type="button"
              class="letar-field__schedule-copy"
              [disabled]="!scheduleValue().monday"
              (click)="handleCopyToWeekdays(ctrl)"
            >{{ copyToWeekdaysLabel }}</button>
          }
          @for (day of days; track day) {
            <div class="letar-field__schedule-day" [attr.data-day]="day">
              <label class="letar-field__schedule-day-toggle">
                <input
                  type="checkbox"
                  role="switch"
                  [attr.data-day-switch]="day"
                  [checked]="isDayEnabled(day)"
                  (change)="onDayToggle(ctrl, day, $event)"
                />
                <span>{{ mergedDayNames()[day] }}</span>
              </label>
              @if (isDayEnabled(day)) {
                <span class="letar-field__schedule-day-times">
                  <input
                    type="time"
                    [value]="dayOpen(day)"
                    (change)="onTimeChange(ctrl, day, 'open', $event)"
                  />
                  <input
                    type="time"
                    [value]="dayClose(day)"
                    (change)="onTimeChange(ctrl, day, 'close', $event)"
                  />
                </span>
              } @else {
                <span class="letar-field__schedule-day-off">{{ offLabel }}</span>
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
export class FieldScheduleComponent extends FieldBase {
  @Input()
  dayNames: Partial<Record<DayOfWeek, string>> = {}
  @Input()
  defaultSchedule: WeeklySchedule = DEFAULT_WORKING_HOURS
  @Input()
  days: DayOfWeek[] = DAYS_OF_WEEK
  @Input()
  showCopyToWeekdays = true
  @Input()
  offLabel = 'Выходной'
  @Input()
  copyToWeekdaysLabel = 'Скопировать Пн на будни'
  @Input()
  defaultOpenTime = '09:00'
  @Input()
  defaultCloseTime = '18:00'

  readonly scheduleValue = signal<WeeklySchedule>(DEFAULT_WORKING_HOURS)

  readonly mergedDayNames = computed(() => ({ ...DEFAULT_DAY_NAMES, ...this.dayNames }))

  readonly invalidDays = computed(() =>
    this.days.filter((day) => {
      const daySchedule = this.scheduleValue()[day]
      return daySchedule && !isValidTimeRange(daySchedule.open, daySchedule.close)
    })
  )

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.scheduleValue.set((ctrl.value as WeeklySchedule | undefined) ?? this.defaultSchedule)
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  invalidDaysLabel(): string {
    const names = this.mergedDayNames()
    return this.invalidDays().map((day) => names[day]).join(', ')
  }

  isDayEnabled(day: DayOfWeek): boolean {
    return this.scheduleValue()[day] !== null && this.scheduleValue()[day] !== undefined
  }

  dayOpen(day: DayOfWeek): string {
    return this.scheduleValue()[day]?.open ?? this.defaultOpenTime
  }

  dayClose(day: DayOfWeek): string {
    return this.scheduleValue()[day]?.close ?? this.defaultCloseTime
  }

  onDayToggle(ctrl: FormControl, day: DayOfWeek, event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked
    ctrl.setValue({
      ...this.scheduleValue(),
      [day]: enabled ? { open: this.defaultOpenTime, close: this.defaultCloseTime } : null,
    })
    ctrl.markAsTouched()
  }

  onTimeChange(ctrl: FormControl, day: DayOfWeek, field: 'open' | 'close', event: Event): void {
    const value = (event.target as HTMLInputElement).value
    const schedule = this.scheduleValue()
    const current = schedule[day]
    if (!current) {
      return
    }
    ctrl.setValue({ ...schedule, [day]: { ...current, [field]: value } })
    ctrl.markAsTouched()
  }

  handleCopyToWeekdays(ctrl: FormControl): void {
    const schedule = this.scheduleValue()
    const mondaySchedule = schedule.monday
    if (!mondaySchedule) {
      return
    }
    ctrl.setValue({
      ...schedule,
      tuesday: mondaySchedule,
      wednesday: mondaySchedule,
      thursday: mondaySchedule,
      friday: mondaySchedule,
    })
    ctrl.markAsTouched()
  }
}
