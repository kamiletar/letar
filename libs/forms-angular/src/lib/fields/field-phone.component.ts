import { type AfterViewInit, Component, effect, type ElementRef, Input, ViewChild } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { formatPhoneNumber, PHONE_MASKS, type PhoneCountry, stripPhoneNumber } from '@letar/forms-core/phone'
import { FieldBase } from '../core/field-base'

/**
 * Телефон — Angular-эквивалент `FieldPhone` (`@letar/forms-vue`,
 * `libs/forms-vue/src/lib/fields/field-phone.ts`). Форматирование чистым JS-форматтером
 * `@letar/forms-core/phone` (`formatPhoneNumber`/`stripPhoneNumber`), НЕ через
 * `MaskController` — единственное «масочное» поле во всех скинах (React/Vue/теперь Angular),
 * которое сознательно обходит движок масок: `MaskController` заполняет слоты посимвольно и не
 * может ретроактивно распознать междугородний trunk-префикс (ведущая `8` в РФ), см. комментарий
 * в `format-phone.ts`. Вместо этого — пересчёт всей строки на каждый `input` (тот же приём, что
 * в React/Vue: controlled `onChange`, не DOM-мутация).
 *
 * `[formControl]` здесь не используется (как и в `DocumentFieldBase`) — по той же причине:
 * в `<input>` отображается forматированное значение, а в `FormControl` уходит то, что диктует
 * `autoUnmask` (см. ниже), и эти два значения не совпадают напрямую. `@ViewChild('inputEl')` +
 * ручной `(input)`/`(blur)` — тот же паттерн, что в `document-field-base.ts`, но без
 * `MaskController`/`ngAfterViewInit`-attach: контроллера нет, поэтому проще — весь пересчёт в
 * одном обработчике.
 *
 * `autoUnmask` — 1-в-1 контракт с Vue/React (`libs/forms-vue/src/lib/fields/field-phone.ts`,
 * `libs/forms-shadcn/src/lib/fields/field-phone.tsx`): `false` (default) — в `FormControl`
 * уходит форматированная строка (то же, что видно в `<input>`); `true` — уходят только цифры
 * (`stripPhoneNumber(formatted)`). Раздельное поведение сознательно не унифицировано с
 * `DocumentFieldBase` (там `FormControl` всегда получает raw) — Phone обязан остаться
 * совместимым с готовым Vue/React API, которое уже задокументировано (`forms-vue/README.md`)
 * и на которое ориентируются потребители, портирующие форму между скинами.
 */
@Component({
  selector: 'letar-field-phone',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <input
          #inputEl
          [id]="name"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          [placeholder]="displayPlaceholder"
          class="letar-field__control"
          (input)="onPhoneInput($event, ctrl)"
          (blur)="onPhoneBlur()"
        />
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldPhoneComponent extends FieldBase implements AfterViewInit {
  @Input()
  country: PhoneCountry = 'RU'
  @Input()
  autoUnmask = false

  @ViewChild('inputEl')
  private readonly inputElRef?: ElementRef<HTMLInputElement>

  /** Последнее значение, отданное этим полем в `FormControl` — фильтр для `syncExternalValue`,
   * тот же приём, что в `DocumentFieldBase` (не переформатировать DOM на собственное же событие). */
  private lastEmittedValue: string | null = null

  protected get mask(): string {
    return PHONE_MASKS[this.country]
  }

  protected get displayPlaceholder(): string {
    return this.resolvedPlaceholder() ?? this.mask.replace(/9/g, '_')
  }

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const subscription = ctrl.valueChanges.subscribe(() => {
        this.syncExternalValue(typeof ctrl.value === 'string' ? ctrl.value : '')
      })
      onCleanup(() => subscription.unsubscribe())
    })
  }

  ngAfterViewInit(): void {
    const ctrl = this.control()
    if (!ctrl) {
      return
    }
    const initial = typeof ctrl.value === 'string' ? ctrl.value : ''
    const el = this.inputElRef?.nativeElement
    if (el) {
      el.value = formatPhoneNumber(stripPhoneNumber(initial), this.mask)
    }
    this.lastEmittedValue = initial
  }

  protected onPhoneInput(event: Event, ctrl: FormControl): void {
    const input = event.target as HTMLInputElement
    const digits = stripPhoneNumber(input.value)
    const formatted = formatPhoneNumber(digits, this.mask)
    input.value = formatted
    const value = this.autoUnmask ? stripPhoneNumber(formatted) : formatted
    this.lastEmittedValue = value
    ctrl.setValue(value)
  }

  protected onPhoneBlur(): void {
    this.control()?.markAsTouched()
  }

  /** Внешние изменения значения (сброс формы, программный `setValue` вне этого поля) —
   * прокидываем в DOM напрямую, минуя `onPhoneInput`. Тот же приём, что в
   * `document-field-base.ts` (`syncExternalValue`). */
  private syncExternalValue(value: string): void {
    if (this.lastEmittedValue === value) {
      return
    }
    const el = this.inputElRef?.nativeElement
    if (el) {
      const digits = this.autoUnmask ? value : stripPhoneNumber(value)
      el.value = formatPhoneNumber(digits, this.mask)
    }
    this.lastEmittedValue = value
  }
}
