import { Component, effect, type ElementRef, Input, type QueryList, signal, ViewChildren } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { FieldBase } from '../core/field-base'
import { PIN_INPUT_PATTERNS, type PinInputCharType, splitPinChars } from '../core/pin-input-utils'

export type { PinInputCharType }

/**
 * PIN-инпут — Angular-эквивалент `FieldPinInput` (`@letar/forms-vue`, `field-pin-input.ts`):
 * N ячеек `<input maxlength="1">` вместо Ark UI `PinInput.Root` (Chakra-скин), значение схемы —
 * строка (`"1234"`). Клавиатурная логика (Backspace/стрелки/paste) — 1-в-1 порт
 * `usePinInputField` (Vue-composable), здесь без промежуточного слоя `usePinInputField`-объекта:
 * Angular-версия читает/пишет `FormControl` напрямую в обработчиках (composable в Vue существовал
 * ради переиспользуемого замыкания над `inputs: HTMLInputElement[]`, здесь его роль играет
 * `@ViewChildren` + `splitPinChars`/`PIN_INPUT_PATTERNS` из `../core/pin-input-utils`).
 *
 * `[formControl]` не используется — та же причина, что у `FieldTagsComponent`/
 * `FieldCheckboxCardComponent`: значение поля составное (N ячеек), не 1:1 с одним `<input>`.
 * Собственный сигнал `cells`, синхронизируемый через `effect()` + `ctrl.events.subscribe()`.
 */
@Component({
  selector: 'letar-field-pin-input',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div class="letar-field__pin-input" role="group" [attr.aria-label]="resolvedLabel()">
          @for (cell of cells(); track $index; let i = $index) {
            <input
              #cellEl
              [type]="mask ? 'password' : 'text'"
              [attr.inputmode]="type === 'numeric' ? 'numeric' : 'text'"
              maxlength="1"
              [value]="cell"
              [attr.autocomplete]="otp && i === 0 ? 'one-time-code' : 'off'"
              class="letar-field__pin-input-box"
              [attr.data-field-name]="i === 0 ? name : null"
              (input)="onCellInput(i, $event, ctrl)"
              (keydown)="onCellKeydown(i, $event, ctrl)"
              (paste)="onCellPaste(i, $event, ctrl)"
              (blur)="ctrl.markAsTouched()"
            />
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldPinInputComponent extends FieldBase {
  @Input()
  count = 4
  @Input()
  mask = false
  @Input()
  otp = false
  @Input()
  type: PinInputCharType = 'numeric'
  @Input()
  onComplete?: (value: string) => void

  @ViewChildren('cellEl')
  private readonly cellEls?: QueryList<ElementRef<HTMLInputElement>>

  readonly cells = signal<string[]>([])

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.cells.set(splitPinChars(typeof ctrl.value === 'string' ? ctrl.value : '', this.count))
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  private focusCell(index: number): void {
    this.cellEls?.get(index)?.nativeElement.focus()
  }

  private commit(ctrl: FormControl, next: string[]): void {
    const joined = next.join('')
    ctrl.setValue(joined)
    ctrl.markAsTouched()
    if (joined.length === this.count && next.every((c) => c !== '')) {
      this.onComplete?.(joined)
    }
  }

  protected onCellInput(index: number, event: Event, ctrl: FormControl): void {
    const pattern = PIN_INPUT_PATTERNS[this.type]
    const target = event.target as HTMLInputElement
    // Берём последний допустимый символ — покрывает и обычный ввод, и перезапись заполненной ячейки.
    const filtered = target.value.split('').filter((c) => pattern.test(c))
    const char = filtered.length > 0 ? filtered[filtered.length - 1]! : ''
    const next = splitPinChars(typeof ctrl.value === 'string' ? ctrl.value : '', this.count)
    next[index] = char
    target.value = char
    this.commit(ctrl, next)
    if (char && index < this.count - 1) {
      this.focusCell(index + 1)
    }
  }

  protected onCellKeydown(index: number, event: KeyboardEvent, ctrl: FormControl): void {
    if (event.key === 'Backspace') {
      const next = splitPinChars(typeof ctrl.value === 'string' ? ctrl.value : '', this.count)
      if (next[index]) {
        next[index] = ''
        this.commit(ctrl, next)
        return
      }
      if (index > 0) {
        next[index - 1] = ''
        this.commit(ctrl, next)
        this.focusCell(index - 1)
      }
      return
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      this.focusCell(index - 1)
    }
    if (event.key === 'ArrowRight' && index < this.count - 1) {
      this.focusCell(index + 1)
    }
  }

  protected onCellPaste(index: number, event: ClipboardEvent, ctrl: FormControl): void {
    event.preventDefault()
    const pattern = PIN_INPUT_PATTERNS[this.type]
    const pasted = event.clipboardData?.getData('text') ?? ''
    const filtered = pasted.split('').filter((c) => pattern.test(c))
    const next = splitPinChars(typeof ctrl.value === 'string' ? ctrl.value : '', this.count)
    for (let i = 0; i < filtered.length && index + i < this.count; i++) {
      next[index + i] = filtered[i]!
    }
    this.commit(ctrl, next)
    this.focusCell(Math.min(index + filtered.length, this.count - 1))
  }
}
