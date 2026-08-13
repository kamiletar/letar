import { Injectable, signal } from '@angular/core'
import { FormControl, FormGroup, type ValidatorFn } from '@angular/forms'
import type { ZodType } from 'zod'

/**
 * Angular-эквивалент `AppFormContext` (`@letar/forms-vue`, `form-context.ts`) — но не через
 * Vue `provide`/`inject`, а через Angular DI (`providers: [FormRootService]` на `AppForm`,
 * см. `app-form.component.ts`). `providers` (в отличие от `viewProviders`) видны и содержимому,
 * спроецированному через `<ng-content>` — этим и держится связь «поле знает про форму».
 *
 * `schema` — сигнал, не обычное поле: поля читают его через `computed()`
 * (`field-meta.ts`/`field-base.ts`), поэтому неважно, в каком порядке Angular вызывает
 * конструкторы/`ngOnInit` компонента формы и спроецированных в неё полей — сигналы
 * пересчитываются глитч-free по графу зависимостей, а не по порядку жизненного цикла.
 */
@Injectable()
export class FormRootService {
  readonly schema = signal<ZodType | undefined>(undefined)
  /** Заводится в конструкторе `AppFormComponent` — к моменту, когда поля читают `form`, он уже создан. */
  form = new FormGroup({})
  /** Начальные значения формы — поле берёт своё при первой регистрации контрола (см. ниже). */
  initialValue: Record<string, unknown> = {}

  /**
   * Регистрирует `FormControl` под `name`, если его ещё нет — вызывается из `effect()` каждого
   * поля (`FieldBase`). Идемпотентно: повторный вызов с тем же `name` возвращает существующий
   * контрол, не пересоздаёт его (иначе значение поля терялось бы при каждом пересчёте эффекта).
   * Стартовое значение — из `initialValue[name]`, а не жёстко `undefined`: `AppFormComponent`
   * обязан выставить `initialValue` до того, как поля начнут регистрироваться (см. его
   * конструктор — синхронно, не через `effect()`, порядок здесь важен).
   */
  registerField(name: string, validator: ValidatorFn | undefined): FormControl {
    const existing = this.form.get(name)
    if (existing instanceof FormControl) {
      return existing
    }
    const control = new FormControl(this.initialValue[name], validator ? { validators: validator } : undefined)
    this.form.addControl(name, control)
    return control
  }
}
