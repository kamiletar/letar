import { computed, Directive, effect, inject, Input, type OnChanges, signal } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { resolveFieldMeta } from './field-meta'
import { FormRootService } from './form-root.service'
import { zodValidator } from './zod-validator'

/**
 * Общая база всех `Field*`-компонентов — Angular-эквивалент того, что в `@letar/forms-vue`
 * даёт `createField` + `resolveFieldMeta`/`withFieldValidation` (`field-wiring.ts`) вместе:
 * тут это не фабрика высшего порядка (Angular не пишет компоненты как render-функции), а
 * abstract-класс, от которого наследуются `FieldString`, `FieldCheckbox` и т.д.
 *
 * `name`/`label`/`placeholder` — `@Input()` (legacy-декоратор), не сигнальный `input()`: та же
 * находка, что в `app-form.component.ts` — JIT не резолвит сигнальные inputs на компоненте,
 * потребляемом снаружи. Из-за этого `meta`/`resolvedLabel`/... не пересчитаются реактивно при
 * смене `name` после первого рендера (эффект читает `this.name` как обычное поле, не сигнал) —
 * не проблема для заявленного скоупа (`name` не меняется после монтирования поля), но заявлено
 * как известное ограничение для координатора форм, если Angular-порт когда-то расширят.
 *
 * `control` — сигнал, не немедленно доступный `FormControl`: он заполняется в `effect()`
 * конструктора, а не синхронно, потому что регистрация зависит от `formRoot.schema()`, который
 * `AppFormComponent` мог ещё не выставить на момент конструирования этого поля (порядок
 * конструкторов host/content-projected детей в Angular не документирован как гарантированный).
 * Эффекты во всём дереве флашатся одним пакетом после синхронной фазы построения — к моменту
 * первого рендера шаблона `control()` уже не `undefined`.
 */
@Directive()
export abstract class FieldBase implements OnChanges {
  @Input({ required: true })
  name!: string
  @Input()
  label?: string
  @Input()
  placeholder?: string

  protected readonly formRoot = inject(FormRootService)

  /** Сигнал-«тик», инкрементируемый в `ngOnChanges` — заставляет `meta` пересчитаться и при
   * смене `@Input()`-полей (которые сами по себе не сигналы), не только `formRoot.schema()`. */
  private readonly inputsVersion = signal(0)

  protected readonly meta = computed(() => {
    this.inputsVersion()
    return resolveFieldMeta(this.formRoot.schema(), this.name, this.label, this.placeholder)
  })

  readonly control = signal<FormControl | undefined>(undefined)
  readonly resolvedLabel = computed(() => this.meta().label)
  readonly resolvedPlaceholder = computed(() => this.meta().placeholder)
  readonly isRequired = computed(() => this.meta().required)

  /** `hasError`/`errorMessage` — не `computed()` от `control()`: статус контрола (invalid/touched)
   * меняется через RxJS `AbstractControl.events` (Angular ≥18), не через сигнал сам по себе,
   * поэтому пересчёт идёт вручную во втором `effect()` с подпиской на конкретный инстанс контрола. */
  readonly hasError = signal(false)
  readonly errorMessage = signal('')

  ngOnChanges(): void {
    this.inputsVersion.update((v) => v + 1)
  }

  constructor() {
    effect(() => {
      const meta = this.meta()
      const validator = zodValidator(meta.fieldSchema)
      this.control.set(this.formRoot.registerField(this.name, validator))
    })

    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const syncErrorState = () => {
        const invalidAndTouched = ctrl.invalid && (ctrl.touched || ctrl.dirty)
        this.hasError.set(invalidAndTouched)
        const zodError = ctrl.errors?.['zod'] as { message?: string } | undefined
        this.errorMessage.set(invalidAndTouched ? zodError?.message ?? '' : '')
      }
      syncErrorState()
      const subscription = ctrl.events.subscribe(syncErrorState)
      onCleanup(() => subscription.unsubscribe())
    })
  }
}
