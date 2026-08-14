import { Component, computed, effect, inject, Input, signal } from '@angular/core'
import { FormRootService } from '../core/form-root.service'

/**
 * Вычисляемое поле формы (readonly) — Angular-эквивалент `FieldCalculated` (`@letar/forms-vue`,
 * `field-calculated.ts`): пересчитывается при изменении ЛЮБОГО значения формы, значение можно
 * (но не обязательно) записать обратно в `name`, чтобы оно ушло вместе с остальной формой при
 * submit — тот же приём (`form.setFieldValue`), что в Vue-версии, и та же подписка на
 * `formRoot.form.valueChanges`, что уже решала эту задачу в `FieldCascadingSelectComponent`
 * (Stage E) — читать значения ДРУГИХ полей нативный `FormGroup` умеет только через события,
 * не через реактивный снапшот состояния (в отличие от `@tanstack/vue-form`).
 *
 * `deps` из Vue-версии здесь не портирован: там это чистая оптимизация (не пересчитывать при
 * несвязанных полях), а не требование корректности — `formRoot.form.valueChanges` в любом случае
 * эмитит на каждое изменение формы, `compute()` в этом пруфе достаточно дёшев, чтобы считать
 * лишний вызов не проблемой (то же упрощение, что уже сделано для остальных 60 полей — headless
 * пакет не гонится за оптимизациями рендера, которых нет и в самом Angular-биндинге).
 */
@Component({
  selector: 'letar-field-calculated',
  standalone: true,
  imports: [],
  template: `
    @if (!hidden) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (label) {
          <span class="letar-field__label">{{ label }}</span>
        }
        <p class="letar-field__calculated-value" data-testid="calculated-value">{{ displayValue() }}</p>
        @if (helperText) {
          <p class="letar-field__helper">{{ helperText }}</p>
        }
      </div>
    }
  `,
})
export class FieldCalculatedComponent {
  @Input()
  name?: string
  @Input()
  label?: string
  @Input({ required: true })
  compute!: (values: Record<string, unknown>) => unknown
  @Input()
  format?: (value: unknown) => string
  @Input()
  hidden = false
  @Input()
  helperText?: string

  private readonly formRoot = inject(FormRootService)

  /** Снапшот значений всей формы — обновляется на каждое `valueChanges` (см. `syncValues` ниже). */
  private readonly values = signal<Record<string, unknown>>({})

  protected readonly computedValue = computed(() => this.compute(this.values()))
  protected readonly displayValue = computed(() => {
    const value = this.computedValue()
    return this.format ? this.format(value) : String(value ?? '')
  })

  constructor() {
    effect((onCleanup) => {
      const syncValues = () => this.values.set(this.formRoot.form.getRawValue())
      syncValues()
      const subscription = this.formRoot.form.valueChanges.subscribe(syncValues)
      onCleanup(() => subscription.unsubscribe())
    })

    // Записывает вычисленное значение обратно в форму под `name` — только если `name` задан
    // (Vue-версия допускает `FieldCalculated` без `name` — чисто отображаемая сводка).
    effect(() => {
      if (!this.name) {
        return
      }
      const value = this.computedValue()
      const ctrl = this.formRoot.registerField(this.name, undefined)
      if (!Object.is(ctrl.value, value)) {
        ctrl.setValue(value)
      }
    })
  }
}
