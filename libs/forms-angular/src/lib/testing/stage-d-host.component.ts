import { Component } from '@angular/core'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { FieldDateRangeComponent } from '../fields/field-date-range.component'
import { FieldDateTimePickerComponent } from '../fields/field-datetime-picker.component'
import { FieldDurationComponent } from '../fields/field-duration.component'
import { FieldScheduleComponent, type WeeklySchedule } from '../fields/field-schedule.component'

/**
 * Host для Stage D — 4 поля (DateRange/DateTimePicker/Duration/Schedule), тот же приём выноса
 * Angular-декоратора в обычный `.ts` (не `.spec.ts`), что и в предыдущих `stage-*-host.component.ts`.
 *
 * `workingHours` — `z.any()` (не строгий `z.object`): `WeeklySchedule` — compound-тип с 7 optional
 * ключами, для теста не выразительность Zod-схемы важна, а сам факт единого `FormControl` для
 * составного значения — то же упрощение, что допустимо в headless-пруфе (не продакшен-схема).
 */
export const stageDSchema = z.object({
  vacation: z.object({ start: z.string(), end: z.string() }).meta({ ui: { title: 'Отпуск' } }),
  meeting: z.string().meta({ ui: { title: 'Встреча' } }),
  meetingLength: z.number().min(15, 'Минимум 15 минут').meta({ ui: { title: 'Длительность встречи' } }),
  workingHours: z.any().meta({ ui: { title: 'График работы' } }),
})

const initialWorkingHours: WeeklySchedule = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: null,
  sunday: null,
}

@Component({
  standalone: true,
  imports: [
    AppFormComponent,
    FieldDateRangeComponent,
    FieldDateTimePickerComponent,
    FieldDurationComponent,
    FieldScheduleComponent,
  ],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="lastSubmit = $event">
      <letar-field-date-range name="vacation" [presets]="['thisWeek', 'thisMonth']" />
      <letar-field-datetime-picker name="meeting" [timeStep]="30" />
      <letar-field-duration name="meetingLength" />
      <letar-field-schedule name="workingHours" />
    </letar-app-form>
  `,
})
export class StageDHostComponent {
  schema = stageDSchema
  initialValue = {
    vacation: { start: '', end: '' },
    meeting: '',
    meetingLength: 0,
    workingHours: initialWorkingHours,
  }
  lastSubmit: Record<string, unknown> | undefined
}
