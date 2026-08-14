import { Component } from '@angular/core'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { FieldAutoComponent } from '../fields/field-auto.component'
import { FieldCalculatedComponent } from '../fields/field-calculated.component'
import { FieldMaskedInputComponent } from '../fields/field-masked-input.component'

/**
 * Host для Stage J — последний этап (3 поля): `FieldAutoComponent`, `FieldCalculatedComponent`,
 * `FieldMaskedInputComponent`. Тот же приём выноса Angular-декоратора в обычный `.ts`
 * (не `.spec.ts`), что и предыдущие stage-host компоненты.
 *
 * `FieldAuto` покрыт пятью разными Zod-типами (string короткая/длинная, number, boolean, enum) —
 * ровно диапазон диспетчеризации, который есть в реализации. `FieldCalculated` считает
 * `quantity × price` — оба поля рендерятся через `FieldAuto`, поэтому реально зарегистрированы
 * в `FormGroup` (иначе `formRoot.form.getRawValue()` их не видит). `FieldMaskedInput` использует
 * ту же маску "999-999", что и `FieldDepartmentCodeComponent` (Stage B) — сравнение поведения
 * с уже проверенным документным полем.
 */
export const stageJSchema = z.object({
  bio: z.string().max(300).meta({ ui: { title: 'О себе' } }),
  nickname: z.string().meta({ ui: { title: 'Ник' } }),
  age: z.number().meta({ ui: { title: 'Возраст' } }),
  subscribed: z.boolean().meta({ ui: { title: 'Подписка' } }),
  role: z.enum(['admin', 'user']).meta({ ui: { title: 'Роль' } }),
  quantity: z.number().meta({ ui: { title: 'Количество' } }),
  price: z.number().meta({ ui: { title: 'Цена' } }),
  departmentCode: z.string().meta({ ui: { title: 'Код подразделения' } }),
})

@Component({
  standalone: true,
  imports: [AppFormComponent, FieldAutoComponent, FieldCalculatedComponent, FieldMaskedInputComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="lastSubmit = $event">
      <letar-field-auto name="bio" />
      <letar-field-auto name="nickname" />
      <letar-field-auto name="age" />
      <letar-field-auto name="subscribed" />
      <letar-field-auto name="role" />
      <letar-field-auto name="quantity" />
      <letar-field-auto name="price" />
      <letar-field-calculated
        name="total"
        label="Итого"
        [compute]="computeTotal"
        [format]="formatTotal"
        helperText="Автоматически: количество × цена"
      />
      <letar-field-masked-input
        name="departmentCode"
        mask="999-999"
        formatDescription="Формат: 3 цифры, дефис, 3 цифры"
      />
    </letar-app-form>
  `,
})
export class StageJHostComponent {
  schema = stageJSchema
  initialValue = {
    bio: '',
    nickname: '',
    age: 0,
    subscribed: false,
    role: 'user',
    quantity: 2,
    price: 100,
    departmentCode: '',
  }
  lastSubmit: Record<string, unknown> | undefined

  computeTotal = (values: Record<string, unknown>): number =>
    (Number(values['quantity']) || 0) * (Number(values['price']) || 0)

  formatTotal = (value: unknown): string => `${value} ₽`
}
