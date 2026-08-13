import { Component, effect, Input, signal } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

export interface CascadingSelectOption {
  value: string
  label: string
  disabled?: boolean
}

const UNSET = Symbol('cascading-select-unset')

/**
 * Зависимый select — Angular-эквивалент `FieldCascadingSelect` (`@letar/forms-vue`): список опций
 * зависит от значения ДРУГОГО поля (`dependsOn`), сброс своего значения при смене родителя,
 * disable пока родитель пуст. Портирован 1:1 по поведению (загрузка/сброс/disable), не по
 * технике — Vue-версия читает значение родителя через `form.useStore(selector)`
 * (`@tanstack/vue-form`, полностью реактивный snapshot состояния формы), у Angular
 * `FormGroup`/`FormControl` такого снапшот-сигнала нет.
 *
 * Вместо этого — подписка на `formRoot.form.valueChanges`: `FormGroup.addControl` сам вызывает
 * `updateValueAndValidity()` (эмитит `valueChanges` по умолчанию), поэтому одна подписка на
 * value changes ВСЕЙ формы ловит и «поле-родитель ещё не смонтировано на момент конструирования
 * этого поля» (порядок конструкторов content-projected детей не гарантирован — см. `field-base.ts`),
 * и «родитель сменил значение» — без ручного опроса графа полей и без правок `FormRootService`.
 *
 * `ctrl.disable()`/`ctrl.enable()` — не `[attr.disabled]` на `<select [formControl]>`: смешивать
 * нативный атрибут с `ReactiveFormsModule`-биндингом Angular считает ошибкой конфигурации и пишет
 * предупреждение в консоль (`disabled`-состояние в Reactive Forms — прерогатива самого контрола).
 */
@Component({
  selector: 'letar-field-cascading-select',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <select [formControl]="ctrl" class="letar-field__control" [attr.data-field-name]="name">
          <option value="">{{ effectivePlaceholder() }}</option>
          @for (option of options(); track option.value) {
            <option [value]="option.value" [disabled]="option.disabled">{{ option.label }}</option>
          }
        </select>
        @if (isLoading()) {
          <span class="letar-field__cascading-select-loading">…</span>
        }
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldCascadingSelectComponent extends FieldBase {
  @Input({ required: true })
  dependsOn!: string
  @Input({ required: true })
  loadOptions!: (parentValue: string | undefined) => Promise<CascadingSelectOption[]>
  @Input()
  initialOptions: CascadingSelectOption[] = []
  @Input()
  clearOnParentChange = true
  @Input()
  disableWhenParentEmpty = true
  @Input()
  placeholderWhenDisabled?: string

  readonly options = signal<CascadingSelectOption[]>([])
  readonly isLoading = signal(false)
  readonly parentValue = signal<string | undefined>(undefined)

  private prevParentValue: string | undefined | typeof UNSET = UNSET

  constructor() {
    super()
    this.options.set(this.initialOptions)

    effect((onCleanup) => {
      const subscription = this.formRoot.form.valueChanges.subscribe(() => this.syncParentValue())
      this.syncParentValue()
      onCleanup(() => subscription.unsubscribe())
    })

    effect(() => {
      const parentValue = this.parentValue()
      void this.loadForParent(parentValue)
    })

    effect(() => {
      const ctrl = this.control()
      const isParentEmpty = !this.parentValue()
      const isDisabled = this.isLoading() || (this.disableWhenParentEmpty && isParentEmpty)
      if (!ctrl) {
        return
      }
      if (isDisabled && ctrl.enabled) {
        ctrl.disable({ emitEvent: false })
      } else if (!isDisabled && ctrl.disabled) {
        ctrl.enable({ emitEvent: false })
      }
    })
  }

  effectivePlaceholder(): string {
    return !this.parentValue() && this.placeholderWhenDisabled
      ? this.placeholderWhenDisabled
      : this.resolvedPlaceholder() ?? ''
  }

  private syncParentValue(): void {
    const parentCtrl = this.formRoot.form.get(this.dependsOn)
    const value = parentCtrl?.value as string | undefined
    if (value !== this.parentValue()) {
      this.parentValue.set(value)
    }
  }

  private async loadForParent(parentValue: string | undefined): Promise<void> {
    const ctrl = this.control()
    if (this.prevParentValue !== UNSET && this.prevParentValue !== parentValue && this.clearOnParentChange) {
      ctrl?.setValue('')
    }
    this.prevParentValue = parentValue

    if (!parentValue) {
      this.options.set(this.initialOptions)
      return
    }
    this.isLoading.set(true)
    try {
      this.options.set(await this.loadOptions(parentValue))
    } catch {
      this.options.set([])
    } finally {
      this.isLoading.set(false)
    }
  }
}
