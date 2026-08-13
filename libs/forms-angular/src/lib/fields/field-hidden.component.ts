import { Component, effect, Input } from '@angular/core'
import { FieldBase } from '../core/field-base'

/**
 * Скрытое поле — не рендерится в DOM, но участвует в form state (utm-метки, referral-коды).
 * Angular-эквивалент `FieldHidden` (`@letar/forms-vue`).
 *
 * `value` — обычный `@Input()` (legacy-декоратор, как везде в этом пакете), не сигнал: значение
 * применяется к контролу один раз, в момент когда `control()` впервые становится доступен
 * (тот же эффект, что регистрирует контрол в `FieldBase`, уже отработал раньше — конструктор
 * базового класса вызывается первым). Это то же принятое ограничение, что документировано для
 * `name`/`label`/`placeholder` в `FieldBase` — смена `value` после монтирования поля вне скоупа.
 */
@Component({
  selector: 'letar-field-hidden',
  standalone: true,
  template: '',
})
export class FieldHiddenComponent extends FieldBase {
  @Input()
  value?: unknown

  constructor() {
    super()
    effect(() => {
      const ctrl = this.control()
      if (!ctrl || this.value === undefined || Object.is(ctrl.value, this.value)) {
        return
      }
      ctrl.setValue(this.value)
    })
  }
}
