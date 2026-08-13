import {
  type AfterViewInit,
  computed,
  Directive,
  effect,
  type ElementRef,
  type OnDestroy,
  signal,
  ViewChild,
} from '@angular/core'
import type { FormControl } from '@angular/forms'
import { format, MaskController, unformat } from '@letar/forms-core/mask'
import { FieldBase } from './field-base'

/**
 * `'live'` — движок масок (`@letar/forms-core/mask`) группирует ввод литералами маски на каждое
 * нажатие клавиши (БИК/ОГРН/СНИЛС/паспорт/...). `'off'` — только фильтрация допустимых символов,
 * без группировки: для полей переменной длины (ИНН — 10 или 12 цифр), где структурная маска дала
 * бы ложный отказ на валидном коротком значении. Третий Vue-режим (`'blur'`) в документных полях
 * не используется ни разу (`libs/forms-vue/src/lib/fields/field-*.ts`) — не портируется.
 */
export type DocumentFieldFormatMode = 'live' | 'off'

/**
 * Abstract-база 10 из 11 документных полей Stage B (все, кроме `BirthCertificate` — у него нет
 * структурной маски, см. `field-birth-certificate.component.ts`, тот же выбор что и в Vue-версии,
 * `libs/forms-vue/src/lib/fields/field-birth-certificate.ts`).
 *
 * ## Почему не `createDocumentField(config)` (как в Vue)
 *
 * Vue-версия — функциональная фабрика компонента (`defineComponent(...)`), Angular так не может:
 * `@Component` — декоратор класса, а декораторы не создать динамически из объекта конфига без
 * `Reflect`-эквилибристики, которую этот пакет сознательно не использует (см. `field-base.ts` —
 * везде legacy-декораторы, минимум магии ради предсказуемости под JIT). Поэтому конфиг Vue
 * (`{ mask, formatMode, maxLength, placeholder, validate }`) здесь распался на:
 * `abstract readonly mask` + `readonly formatMode` (default `'live'`, оverridable) +
 * `readonly maxLength` + `@Input() override placeholder` (свой default в каждом наследнике) +
 * `abstract validateDocument()`.
 *
 * ## Почему НЕ `[formControl]` в шаблоне (в отличие от всех остальных Field*)
 *
 * `FieldStringComponent` и соседи биндят `[formControl]="ctrl"` — `FormControlDirective`
 * (`ControlValueAccessor`) пишет в контрол ровно то, что лежит в `<input>.value`. Для документных
 * полей это сломало бы инвариант «в `FormControl`/Zod-схему уходит raw (unformatted) значение» —
 * тот же приём, что в `use-mask-field.ts` (Vue): `<input>` в `'live'`-режиме рендерится БЕЗ
 * `value`/`onInput` вовсе, источник истины — DOM, `MaskController` пишет туда напрямую через
 * `setRangeText` и сам вызывает `ctrl.setValue(raw)` в колбэке `onChange`. Поэтому здесь вместо
 * `ControlValueAccessor` — `@ViewChild('inputEl')` + ручной `attach()`/`detach()` контроллера в
 * `ngAfterViewInit`/`ngOnDestroy`, а не декларативный биндинг.
 *
 * ## Двойной источник ошибки (Zod-схема формы + собственная контрольная сумма поля)
 *
 * `hasError`/`errorMessage` из `FieldBase` валидируют против Zod-подсхемы, которую подставило
 * потребляющее приложение (`schema.shape[name]`) — она может быть простым `z.string()`, без
 * `zRu.inn()`. Контрольная сумма документа в этом пакете не должна зависеть от того, что именно
 * написал потребитель в своей схеме (defence-in-depth, тот же принцип что в Vue/React-скинах —
 * там `config.validate` тоже применяется поверх `withFieldValidation`, независимо от Zod).
 * Отсюда `documentErrorMessage` (свой сигнал, пересчитывается на `ctrl.valueChanges`) и
 * `hasDocumentError`/`displayErrorMessage` — OR/приоритет над `hasError`/`errorMessage` базы,
 * 1-в-1 порядок `showError = hasError || !!customError` / `displayError = customError ?? errorMessage`
 * из `document-field-base.ts` (Vue).
 */
@Directive()
export abstract class DocumentFieldBase extends FieldBase implements AfterViewInit, OnDestroy {
  /** DSL движка масок (`9`/`a`/`*`/свои токены) — см. `parse-mask.ts`. */
  abstract readonly mask: string
  readonly formatMode: DocumentFieldFormatMode = 'live'
  /** HTML `maxlength` — актуален вместе с `formatMode: 'off'` (маска длину не ограничивает). */
  readonly maxLength: number | undefined = undefined

  /** Контрольная сумма/формат документа. Возвращает текст ошибки или `undefined`, если валидно
   * (или значение пустое — пустое поле не считается ошибкой контрольной суммы, обязательность
   * поля — забота Zod-схемы, не этого метода). */
  protected abstract validateDocument(raw: string): string | undefined

  @ViewChild('inputEl')
  private readonly inputElRef?: ElementRef<HTMLInputElement>

  private controller: MaskController | null = null
  private lastEmittedRaw: string | null = null

  readonly documentErrorMessage = signal('')
  readonly hasDocumentError = computed(() => this.hasError() || this.documentErrorMessage().length > 0)
  readonly displayErrorMessage = computed(() => this.documentErrorMessage() || this.errorMessage())

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const syncDocumentError = () => {
        const raw = typeof ctrl.value === 'string' ? ctrl.value : ''
        this.documentErrorMessage.set(raw ? this.validateDocument(raw) ?? '' : '')
      }
      syncDocumentError()
      const subscription = ctrl.valueChanges.subscribe(() => {
        syncDocumentError()
        this.syncExternalValue(typeof ctrl.value === 'string' ? ctrl.value : '')
      })
      onCleanup(() => subscription.unsubscribe())
    })
  }

  ngAfterViewInit(): void {
    const ctrl = this.control()
    if (ctrl) {
      this.attachController(ctrl)
    }
  }

  ngOnDestroy(): void {
    this.controller?.detach()
    this.controller = null
  }

  /** `(input)` для `formatMode: 'off'` (без `MaskController`) — простая фильтрация допустимых
   * символов маски без группировки литералами. Для `'live'`-полей с уже прикреплённым
   * контроллером — no-op, тот же ввод обработан напрямую контроллером через его собственные
   * DOM-слушатели (см. класс doc — почему `[formControl]` здесь не используется). */
  protected onManualInput(event: Event): void {
    if (this.controller) {
      return
    }
    const ctrl = this.control()
    if (!ctrl) {
      return
    }
    const input = event.target as HTMLInputElement
    const raw = unformat(input.value, this.mask)
    input.value = raw
    this.lastEmittedRaw = raw
    ctrl.setValue(raw)
  }

  protected onDocumentBlur(): void {
    this.control()?.markAsTouched()
  }

  private attachController(ctrl: FormControl): void {
    const el = this.inputElRef?.nativeElement
    if (!el || this.formatMode !== 'live') {
      return
    }
    const initialRaw = typeof ctrl.value === 'string' ? ctrl.value : ''
    el.value = format(unformat(initialRaw, this.mask), this.mask)
    this.controller = new MaskController(el, {
      mask: this.mask,
      onChange: (formatted) => {
        const raw = unformat(formatted, this.mask)
        this.lastEmittedRaw = raw
        ctrl.setValue(raw)
      },
    })
    this.controller.attach()
    this.lastEmittedRaw = initialRaw
  }

  /** Внешние изменения значения (сброс формы, программный `setValue` вне этого поля) —
   * прокидываем в `MaskController`/DOM напрямую, минуя `onManualInput`/`onChange`. Изменения,
   * пришедшие из самого поля, отфильтровываются через `lastEmittedRaw` (тот же приём, что в
   * Vue-версии, `use-mask-field.ts`). */
  private syncExternalValue(raw: string): void {
    if (this.lastEmittedRaw === raw) {
      return
    }
    if (this.controller) {
      this.controller.setValue(raw)
      this.lastEmittedRaw = raw
      return
    }
    const el = this.inputElRef?.nativeElement
    if (el && el.value !== raw) {
      el.value = raw
    }
    this.lastEmittedRaw = raw
  }
}

/**
 * Общий inline-шаблон 10 документных полей (не `BirthCertificate`) — константа, а не копия в
 * каждом из 10 файлов `field-<kebab>.component.ts`. Angular не поддерживает разделяемый
 * `template`/`@Component` на abstract-классе так, чтобы наследники его переиспользовали
 * декларативно (`@Component` — не наследуемый метадата-декоратор в этом смысле, у каждого класса
 * с `@Component` должен быть свой), поэтому разметка зафиксирована здесь один раз и подставляется
 * в `template: DOCUMENT_FIELD_TEMPLATE` каждого из 10 тонких компонентов-наследников.
 */
export const DOCUMENT_FIELD_TEMPLATE = `
  @if (control(); as ctrl) {
    <div class="letar-field">
      <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
      <input
        #inputEl
        [id]="name"
        [placeholder]="resolvedPlaceholder() ?? ''"
        [attr.maxlength]="maxLength ?? null"
        type="text"
        class="letar-field__control"
        (input)="onManualInput($event)"
        (blur)="onDocumentBlur()"
      />
      @if (hasDocumentError()) {
        <span class="letar-field__error" role="alert">{{ displayErrorMessage() }}</span>
      }
    </div>
  }
`
