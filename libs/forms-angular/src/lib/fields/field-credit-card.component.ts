import { Component, computed, type ElementRef, Input, signal, ViewChild } from '@angular/core'
import type { FormControl } from '@angular/forms'
import {
  type CardBrand,
  detectBrand,
  formatCardNumber,
  formatExpiry,
  isExpiryValid,
  luhn,
  maxFormattedLength,
  stripCardNumber,
} from '@letar/forms-core/credit-card'
import { FieldBase } from '../core/field-base'

export interface CreditCardValue {
  number: string
  expiry: string
  cvc: string
}

type CreditCardFieldStatus = 'idle' | 'valid' | 'error'

const EMPTY_VALUE: CreditCardValue = { number: '', expiry: '', cvc: '' }

/**
 * Составное поле банковской карты — Angular-эквивалент `FieldCreditCard` (`@letar/forms-vue`,
 * `field-credit-card.ts` + `use-credit-card-field.ts`). Значение схемы — один объект
 * `{ number, expiry, cvc }` в одном `FormControl` (тот же принцип, что `FieldDateRangeComponent`,
 * Stage E: `control()` — всегда один `FormControl` на всё значение поля, вложенный `FormGroup` не
 * заводится). Три под-инпута читают/пишут в этот объект напрямую через `ctrl.setValue({...})`,
 * не через `[formControl]`.
 *
 * Форматтеры/валидаторы (`formatCardNumber`/`luhn`/`detectBrand`/...) — 1:1 переиспользование
 * `@letar/forms-core/credit-card`, framework-agnostic, тот же импорт, что в React/Vue-скинах.
 *
 * ⚠️ Иконка бренда карты (SVG, Simple Icons) не портирована — Vue-версия строит её через `h()`
 * (`card-brand-icon.ts`), Angular-эквивалент потребовал бы отдельного набора inline-SVG шаблонов
 * без явной пользы для headless-пруфа (нет дизайн-системы, которую иконка обслуживает). Вместо
 * иконки — `data-brand`/текстовая подпись бренда, определение бренда (`detectBrand`) и вся логика
 * валидации по-прежнему полнофункциональны.
 *
 * ⚠️ Как и в Vue, поле не читает начальное значение `ctrl.value` в display-сигналы при
 * монтировании (`numberDisplay`/`expiryDisplay`/`cvcValue` стартуют пустыми) — сознательное
 * упрощение composable `useCreditCardField`, не Angular-специфичный пробел: составное поле не
 * поддерживает предзаполнение через `initialValue` формы, только ручной ввод.
 */
@Component({
  selector: 'letar-field-credit-card',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div
          role="group"
          [attr.aria-label]="resolvedLabel()"
          class="letar-field__credit-card letar-field__credit-card--{{ layout }}"
        >
          <div class="letar-field__credit-card-number-group">
            @if (showBrandIcon) {
              <span class="letar-field__credit-card-brand" [attr.data-brand]="brand().brand">{{ brand().brand }}</span>
            }
            <div class="letar-field__credit-card-number-wrap">
              <input
                class="letar-field__control"
                [value]="numberDisplay()"
                (input)="onNumberInput($event, ctrl)"
                (blur)="onNumberBlur()"
                [placeholder]="numberPlaceholder"
                inputmode="numeric"
                autocomplete="cc-number"
                name="cardnumber"
                [attr.maxlength]="numberMaxLength()"
                [disabled]="disabled"
                [readOnly]="readOnly"
                aria-label="Номер карты"
                [attr.data-status]="numberStatus()"
              />
            </div>
          </div>
          <div class="letar-field__credit-card-row">
            <input
              #expiryEl
              class="letar-field__control"
              [value]="expiryDisplay()"
              (input)="onExpiryInput($event, ctrl)"
              (blur)="onExpiryBlur()"
              [placeholder]="expiryPlaceholder"
              inputmode="numeric"
              autocomplete="cc-exp"
              name="cc-exp"
              maxlength="5"
              [disabled]="disabled"
              [readOnly]="readOnly"
              aria-label="Срок действия"
              [attr.data-status]="expiryStatus()"
            />
            <input
              #cvcEl
              class="letar-field__control"
              [value]="cvcValue()"
              (input)="onCvcInput($event, ctrl)"
              (blur)="onCvcBlur()"
              [placeholder]="cvcPlaceholder"
              inputmode="numeric"
              autocomplete="cc-csc"
              name="cvc"
              [attr.maxlength]="brand().cvcLength"
              [disabled]="disabled"
              [readOnly]="readOnly"
              [attr.aria-label]="'CVC (' + brand().cvcLength + ' цифры)'"
              [title]="cvcHint()"
              [attr.data-status]="cvcStatus()"
            />
          </div>
        </div>
        @if (numberError()) {
          <p class="letar-field__error" role="alert">{{ numberError() }}</p>
        }
        @if (expiryError()) {
          <p class="letar-field__error" role="alert">{{ expiryError() }}</p>
        }
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldCreditCardComponent extends FieldBase {
  @Input()
  brands?: CardBrand[]
  @Input()
  showBrandIcon = true
  @Input()
  layout: 'inline' | 'stacked' = 'inline'
  @Input()
  disabled = false
  @Input()
  readOnly = false
  @Input()
  numberPlaceholder = '0000 0000 0000 0000'
  @Input()
  expiryPlaceholder = 'MM / YY'
  @Input()
  cvcPlaceholder = 'CVC'

  @ViewChild('expiryEl')
  private readonly expiryElRef?: ElementRef<HTMLInputElement>
  @ViewChild('cvcEl')
  private readonly cvcElRef?: ElementRef<HTMLInputElement>

  readonly numberDisplay = signal('')
  readonly expiryDisplay = signal('')
  readonly cvcValue = signal('')
  readonly numberStatus = signal<CreditCardFieldStatus>('idle')
  readonly expiryStatus = signal<CreditCardFieldStatus>('idle')
  readonly cvcStatus = signal<CreditCardFieldStatus>('idle')
  readonly numberError = signal<string | undefined>(undefined)
  readonly expiryError = signal<string | undefined>(undefined)

  readonly brand = computed(() => detectBrand(this.numberDisplay()))
  private readonly isBrandAllowed = computed(() =>
    !this.brands || this.brands.length === 0 || this.brands.includes(this.brand().brand)
  )
  readonly cvcHint = computed(() =>
    this.brand().brand === 'amex' ? '4 цифры на лицевой стороне карты' : '3 цифры на обратной стороне карты'
  )
  readonly numberMaxLength = computed(() => maxFormattedLength(this.numberDisplay()))

  private updateComposite(ctrl: FormControl, patch: Partial<CreditCardValue>): void {
    const current = (ctrl.value as CreditCardValue | undefined) ?? EMPTY_VALUE
    ctrl.setValue({ ...current, ...patch })
  }

  protected onNumberInput(event: Event, ctrl: FormControl): void {
    const raw = stripCardNumber((event.target as HTMLInputElement).value)
    const formatted = formatCardNumber(raw)
    this.numberDisplay.set(formatted)
    this.numberStatus.set('idle')
    this.numberError.set(undefined)

    this.updateComposite(ctrl, { number: raw })

    const maxLen = Math.max(...this.brand().lengths)
    if (raw.length >= maxLen) {
      this.expiryElRef?.nativeElement.focus()
    }
  }

  protected onNumberBlur(): void {
    const raw = stripCardNumber(this.numberDisplay())
    if (!raw) {
      return
    }
    if (raw.length < 12) {
      this.numberStatus.set('error')
      this.numberError.set('Номер слишком короткий')
    } else if (!luhn(raw)) {
      this.numberStatus.set('error')
      this.numberError.set('Некорректный номер карты')
    } else if (!this.isBrandAllowed()) {
      this.numberStatus.set('error')
      this.numberError.set('Этот тип карты не поддерживается')
    } else {
      this.numberStatus.set('valid')
      this.numberError.set(undefined)
    }
  }

  protected onExpiryInput(event: Event, ctrl: FormControl): void {
    let raw = (event.target as HTMLInputElement).value.replace(/\D/g, '')
    if (raw.length === 1 && Number(raw) > 1) {
      raw = `0${raw}`
    }
    const formatted = formatExpiry(raw)
    this.expiryDisplay.set(formatted)
    this.expiryStatus.set('idle')
    this.expiryError.set(undefined)

    this.updateComposite(ctrl, { expiry: formatted })

    if (formatted.length === 5) {
      this.cvcElRef?.nativeElement.focus()
    }
  }

  protected onExpiryBlur(): void {
    if (!this.expiryDisplay()) {
      return
    }
    if (this.expiryDisplay().length < 5) {
      this.expiryStatus.set('error')
      this.expiryError.set('Введите MM/YY')
    } else if (!isExpiryValid(this.expiryDisplay())) {
      this.expiryStatus.set('error')
      this.expiryError.set('Карта просрочена')
    } else {
      this.expiryStatus.set('valid')
      this.expiryError.set(undefined)
    }
  }

  protected onCvcInput(event: Event, ctrl: FormControl): void {
    const raw = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, this.brand().cvcLength)
    this.cvcValue.set(raw)
    this.cvcStatus.set('idle')

    this.updateComposite(ctrl, { cvc: raw })
  }

  protected onCvcBlur(): void {
    if (!this.cvcValue()) {
      return
    }
    this.cvcStatus.set(this.cvcValue().length < this.brand().cvcLength ? 'error' : 'valid')
  }
}
