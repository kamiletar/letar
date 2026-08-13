import { Component, Input } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * Headless-версия без `Intl.NumberFormat`-форматирования — Angular-эквивалент `FieldCurrency`
 * (`@letar/forms-vue`). Нет UIKit-обёртки, которая применила бы форматирование визуально;
 * `currency` прокидывается атрибутом `data-currency` для потребителя, который захочет добавить
 * форматирование сам.
 */
@Component({
  selector: 'letar-field-currency',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <input
          [id]="name"
          [formControl]="ctrl"
          [placeholder]="resolvedPlaceholder() ?? ''"
          type="number"
          [min]="min"
          [max]="max"
          [step]="step"
          [attr.data-currency]="currency"
          class="letar-field__control"
        />
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldCurrencyComponent extends FieldBase {
  @Input()
  currency = 'RUB'
  @Input()
  min?: number
  @Input()
  max?: number
  @Input()
  step = 0.01
}
