import { Component } from '@angular/core'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { FieldPhoneComponent } from '../fields/field-phone.component'

/**
 * Host для Stage C — единственное поле `Phone`. Два инстанса: `phone` (default `autoUnmask:
 * false`) и `phoneRaw` (`autoUnmask: true`) — покрывают оба режима контракта, 1-в-1 с Vue
 * (`libs/forms-vue/src/lib/fields/field-phone.ts`), см. комментарий в `field-phone.component.ts`.
 */
export const stageCSchema = z.object({
  phone: z.string().meta({ ui: { title: 'Телефон' } }),
  phoneRaw: z.string().meta({ ui: { title: 'Телефон (raw)' } }),
})

@Component({
  standalone: true,
  imports: [AppFormComponent, FieldPhoneComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="lastSubmit = $event">
      <letar-field-phone name="phone" />
      <letar-field-phone name="phoneRaw" [autoUnmask]="true" />
    </letar-app-form>
  `,
})
export class StageCHostComponent {
  schema = stageCSchema
  initialValue = {
    phone: '',
    phoneRaw: '',
  }
  lastSubmit: Record<string, unknown> | undefined
}
