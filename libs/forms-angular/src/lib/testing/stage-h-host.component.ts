import { Component } from '@angular/core'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { FieldEditableComponent } from '../fields/field-editable.component'
import { FieldPasswordStrengthComponent } from '../fields/field-password-strength.component'
import { FieldRichTextComponent } from '../fields/field-rich-text.component'

/**
 * Host для Stage H — 3 поля: `FieldPasswordStrengthComponent`, `FieldEditableComponent`,
 * `FieldRichTextComponent` (ленивая загрузка). Тот же приём выноса Angular-декоратора в обычный
 * `.ts` (не `.spec.ts`), что и предыдущие stage-host компоненты.
 */
export const stageHSchema = z.object({
  password: z.string().optional().meta({ ui: { title: 'Пароль' } }),
  nickname: z.string().optional().meta({ ui: { title: 'Никнейм' } }),
  bio: z.string().optional().meta({ ui: { title: 'О себе' } }),
})

@Component({
  standalone: true,
  imports: [AppFormComponent, FieldPasswordStrengthComponent, FieldEditableComponent, FieldRichTextComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="lastSubmit = $event">
      <letar-field-password-strength name="password" />
      <letar-field-editable name="nickname" />
      <letar-field-rich-text name="bio" />
    </letar-app-form>
  `,
})
export class StageHHostComponent {
  schema = stageHSchema
  initialValue = {
    password: '',
    nickname: '',
    bio: '',
  }
  lastSubmit: Record<string, unknown> | undefined
}
