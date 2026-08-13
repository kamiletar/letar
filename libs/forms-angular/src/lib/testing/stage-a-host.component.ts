import { Component } from '@angular/core'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { FieldCurrencyComponent } from '../fields/field-currency.component'
import { FieldHiddenComponent } from '../fields/field-hidden.component'
import { FieldNumberInputComponent } from '../fields/field-number-input.component'
import { FieldPercentageComponent } from '../fields/field-percentage.component'
import { FieldRatingComponent } from '../fields/field-rating.component'
import { FieldSliderComponent } from '../fields/field-slider.component'
import { FieldTimeComponent } from '../fields/field-time.component'

/**
 * Host для Stage A — 7 самых простых полей (NumberInput/Currency/Percentage/Slider/Rating/
 * Hidden/Time), тот же приём выноса Angular-декоратора в обычный `.ts` (не `.spec.ts`), что и
 * в `stage1-host.component.ts`/`stage2-host.component.ts`.
 */
export const stageASchema = z.object({
  amount: z.number().min(1, 'Минимум 1').meta({ ui: { title: 'Количество' } }),
  price: z.number().meta({ ui: { title: 'Цена' } }),
  discount: z.number().meta({ ui: { title: 'Скидка' } }),
  volume: z.number().meta({ ui: { title: 'Громкость' } }),
  rating: z.number().meta({ ui: { title: 'Оценка' } }),
  utm: z.string().meta({ ui: { title: 'UTM-метка' } }),
  startTime: z.string().meta({ ui: { title: 'Время начала' } }),
})

@Component({
  standalone: true,
  imports: [
    AppFormComponent,
    FieldNumberInputComponent,
    FieldCurrencyComponent,
    FieldPercentageComponent,
    FieldSliderComponent,
    FieldRatingComponent,
    FieldHiddenComponent,
    FieldTimeComponent,
  ],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="lastSubmit = $event">
      <letar-field-number-input name="amount" [min]="1" [max]="10" />
      <letar-field-currency name="price" currency="USD" />
      <letar-field-percentage name="discount" />
      <letar-field-slider name="volume" [showValue]="true" />
      <letar-field-rating name="rating" [count]="5" />
      <letar-field-hidden name="utm" value="from-campaign" />
      <letar-field-time name="startTime" />
    </letar-app-form>
  `,
})
export class StageAHostComponent {
  schema = stageASchema
  initialValue = {
    amount: 1,
    price: 0,
    discount: 0,
    volume: 50,
    rating: 0,
    utm: '',
    startTime: '',
  }
  lastSubmit: Record<string, unknown> | undefined
}
