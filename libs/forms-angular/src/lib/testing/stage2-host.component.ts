import { Component } from '@angular/core'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { FieldCheckboxComponent } from '../fields/field-checkbox.component'
import { FieldDateComponent } from '../fields/field-date.component'
import { FieldNativeSelectComponent } from '../fields/field-native-select.component'
import { FieldNumberComponent } from '../fields/field-number.component'
import { FieldPasswordComponent } from '../fields/field-password.component'
import { FieldRadioGroupComponent } from '../fields/field-radio-group.component'
import { FieldStringComponent } from '../fields/field-string.component'
import { FieldSwitchComponent } from '../fields/field-switch.component'
import { FieldTextareaComponent } from '../fields/field-textarea.component'
import { FieldYesNoComponent } from '../fields/field-yes-no.component'

/**
 * Host для Этапа 2 — оставшиеся 9 полей разом (Textarea/Number/Password/Checkbox/Switch/
 * RadioGroup/NativeSelect/Date/YesNo), тот же приём выноса Angular-декоратора в обычный `.ts`
 * (не `.spec.ts`), что и в `stage1-host.component.ts`.
 */
export const stage2Schema = z.object({
  bio: z.string().meta({ ui: { title: 'О себе' } }),
  quantity: z.number().min(1, 'Минимум 1').meta({ ui: { title: 'Количество' } }),
  password: z.string().min(6, 'Минимум 6 символов').meta({ ui: { title: 'Пароль' } }),
  agree: z.boolean().meta({ ui: { title: 'Согласен с условиями' } }),
  notifications: z.boolean().meta({ ui: { title: 'Уведомления' } }),
  size: z.string().meta({ ui: { title: 'Размер' } }),
  type: z.string().meta({ ui: { title: 'Тип' } }),
  birthDate: z.string().meta({ ui: { title: 'Дата рождения' } }),
  subscribe: z.boolean().meta({ ui: { title: 'Подписаться на рассылку?' } }),
})

@Component({
  standalone: true,
  imports: [
    AppFormComponent,
    FieldTextareaComponent,
    FieldNumberComponent,
    FieldPasswordComponent,
    FieldCheckboxComponent,
    FieldSwitchComponent,
    FieldRadioGroupComponent,
    FieldNativeSelectComponent,
    FieldDateComponent,
    FieldYesNoComponent,
    FieldStringComponent,
  ],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="lastSubmit = $event">
      <letar-field-textarea name="bio" />
      <letar-field-number name="quantity" />
      <letar-field-password name="password" />
      <letar-field-checkbox name="agree" />
      <letar-field-switch name="notifications" />
      <letar-field-radio-group
        name="size"
        [options]="[{ value: 'sm', label: 'S' }, { value: 'lg', label: 'L' }]"
      />
      <letar-field-native-select
        name="type"
        [options]="[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]"
      />
      <letar-field-date name="birthDate" />
      <letar-field-yes-no name="subscribe" />
    </letar-app-form>
  `,
})
export class Stage2HostComponent {
  schema = stage2Schema
  initialValue = {
    bio: '',
    quantity: 1,
    password: '',
    agree: false,
    notifications: false,
    size: '',
    type: '',
    birthDate: '',
    subscribe: undefined,
  }
  lastSubmit: Record<string, unknown> | undefined
}
