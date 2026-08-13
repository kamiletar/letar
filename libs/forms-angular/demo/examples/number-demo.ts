import { Component } from '@angular/core'
import { z } from 'zod'
import { AppFormComponent } from '../../src/lib/core/app-form.component'
import { FieldNumberComponent } from '../../src/lib/fields/field-number.component'

/**
 * Изолированный пример FieldNumber — самодостаточный файл (своя Zod-схема, свой AppForm).
 * Читается напрямую form-docs (P7 Этап 3) тем же приёмом, что у `libs/forms-vue-shadcn/demo/examples`.
 */
const schema = z.object({
  quantity: z.number().min(1, 'Минимум 1').meta({ ui: { title: 'Количество' } }),
})

@Component({
  standalone: true,
  imports: [AppFormComponent, FieldNumberComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="onSubmit($event)">
      <letar-field-number name="quantity" />
      <button type="submit">Сохранить</button>
    </letar-app-form>
    @if (submittedJson) {
      <pre>{{ submittedJson }}</pre>
    }
  `,
})
export class NumberDemoComponent {
  schema = schema
  initialValue = { quantity: 1 }
  submittedJson = ''

  onSubmit(value: Record<string, unknown>): void {
    this.submittedJson = JSON.stringify(value, null, 2)
  }
}
