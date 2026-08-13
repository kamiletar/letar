import { Component } from '@angular/core'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { type CheckboxCardOption, FieldCheckboxCardComponent } from '../fields/field-checkbox-card.component'
import { FieldTagsComponent } from '../fields/field-tags.component'

/**
 * Host для Stage F — 2 поля: `FieldCheckboxCardComponent` (множественный выбор карточками) и
 * `FieldTagsComponent` (тег-инпут). Тот же приём выноса Angular-декоратора в обычный `.ts`
 * (не `.spec.ts`), что и `stage-e-host.component.ts`.
 */
export const stageFSchema = z.object({
  interests: z.any().meta({ ui: { title: 'Интересы' } }),
  skills: z.any().meta({ ui: { title: 'Навыки' } }),
})

const interestOptions: CheckboxCardOption[] = [
  { value: 'music', label: 'Музыка', description: 'Синтезаторы и звук' },
  { value: 'code', label: 'Код', description: 'Разработка' },
  { value: 'art', label: 'Искусство' },
]

@Component({
  standalone: true,
  imports: [AppFormComponent, FieldCheckboxCardComponent, FieldTagsComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="lastSubmit = $event">
      <letar-field-checkbox-card name="interests" [options]="interestOptions" />
      <letar-field-tags name="skills" placeholder="Добавьте навык" />
    </letar-app-form>
  `,
})
export class StageFHostComponent {
  schema = stageFSchema
  initialValue = {
    interests: [],
    skills: [],
  }
  lastSubmit: Record<string, unknown> | undefined

  interestOptions = interestOptions
}
