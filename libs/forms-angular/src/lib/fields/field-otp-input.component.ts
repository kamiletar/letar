import {
  Component,
  effect,
  ElementRef,
  inject,
  Input,
  type OnDestroy,
  type QueryList,
  signal,
  ViewChildren,
} from '@angular/core'
import type { FormControl } from '@angular/forms'
import { FieldBase } from '../core/field-base'
import { PIN_INPUT_PATTERNS, type PinInputCharType, splitPinChars } from '../core/pin-input-utils'

/**
 * OTP-инпут — Angular-эквивалент `FieldOTPInput` (`@letar/forms-vue`, `field-otp-input.ts`): тот
 * же грид ячеек, что `FieldPinInputComponent`, плюс таймер повторной отправки. Vue-версия держит
 * таймер в `ref`/`setInterval` внутри `setup()`, здесь — `signal`/`setInterval` + `ngOnDestroy`
 * (тот же принцип, что `DocumentFieldBase.ngOnDestroy` для `MaskController`).
 *
 * `autoSubmit` — вместо вызова `form.handleSubmit()` (TanStack Form API в Vue, для которого у
 * `FormRootService` нет прямого эквивалента) здесь `closest('form').requestSubmit()`: native DOM
 * submit на ближайшую форму запускает `(ngSubmit)` `AppFormComponent`, ровно то же наблюдаемое
 * поведение при другом механизме триггера.
 */
@Component({
  selector: 'letar-field-otp-input',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div class="letar-field__otp">
          <div class="letar-field__pin-input" role="group" [attr.aria-label]="resolvedLabel()">
            @for (cell of cells(); track $index; let i = $index) {
              <input
                #cellEl
                [type]="mask ? 'password' : 'text'"
                [attr.inputmode]="type === 'numeric' ? 'numeric' : 'text'"
                maxlength="1"
                [value]="cell"
                [attr.autocomplete]="i === 0 ? 'one-time-code' : 'off'"
                class="letar-field__pin-input-box"
                [attr.data-field-name]="i === 0 ? name : null"
                (input)="onCellInput(i, $event, ctrl)"
                (keydown)="onCellKeydown(i, $event, ctrl)"
                (paste)="onCellPaste(i, $event, ctrl)"
                (blur)="ctrl.markAsTouched()"
              />
            }
          </div>
          @if (onResend) {
            <div class="letar-field__otp-resend">
              @if (countdown() > 0) {
                <span class="letar-field__hint" data-testid="otp-countdown">
                  Повторно через {{ formatCountdown(countdown()) }}
                </span>
              } @else {
                <button type="button" [disabled]="isResending()" (click)="handleResend()">Отправить повторно</button>
              }
            </div>
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldOtpInputComponent extends FieldBase implements OnDestroy {
  @Input()
  length = 6
  @Input()
  type: PinInputCharType = 'numeric'
  @Input()
  mask = false
  @Input()
  autoSubmit = false
  @Input()
  resendTimeout = 60
  @Input()
  onResend?: () => Promise<void>

  @ViewChildren('cellEl')
  private readonly cellEls?: QueryList<ElementRef<HTMLInputElement>>

  private readonly hostElement = inject(ElementRef<HTMLElement>)

  readonly cells = signal<string[]>([])
  readonly countdown = signal(0)
  readonly isResending = signal(false)
  private timer: ReturnType<typeof setInterval> | null = null

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.cells.set(splitPinChars(typeof ctrl.value === 'string' ? ctrl.value : '', this.length))
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }

  protected formatCountdown(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  private startCountdown(): void {
    this.countdown.set(this.resendTimeout)
    this.timer = setInterval(() => {
      const next = this.countdown() - 1
      this.countdown.set(next)
      if (next <= 0 && this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    }, 1000)
  }

  protected async handleResend(): Promise<void> {
    if (!this.onResend || this.countdown() > 0) {
      return
    }
    this.isResending.set(true)
    try {
      await this.onResend()
      this.startCountdown()
    } finally {
      this.isResending.set(false)
    }
  }

  private focusCell(index: number): void {
    this.cellEls?.get(index)?.nativeElement.focus()
  }

  private commit(ctrl: FormControl, next: string[]): void {
    const joined = next.join('')
    ctrl.setValue(joined)
    ctrl.markAsTouched()
    if (joined.length === this.length && next.every((c) => c !== '') && this.autoSubmit) {
      const form = (this.hostElement.nativeElement as HTMLElement).closest('form')
      form?.requestSubmit()
    }
  }

  protected onCellInput(index: number, event: Event, ctrl: FormControl): void {
    const pattern = PIN_INPUT_PATTERNS[this.type]
    const target = event.target as HTMLInputElement
    const filtered = target.value.split('').filter((c) => pattern.test(c))
    const char = filtered.length > 0 ? filtered[filtered.length - 1]! : ''
    const next = splitPinChars(typeof ctrl.value === 'string' ? ctrl.value : '', this.length)
    next[index] = char
    target.value = char
    this.commit(ctrl, next)
    if (char && index < this.length - 1) {
      this.focusCell(index + 1)
    }
  }

  protected onCellKeydown(index: number, event: KeyboardEvent, ctrl: FormControl): void {
    if (event.key === 'Backspace') {
      const next = splitPinChars(typeof ctrl.value === 'string' ? ctrl.value : '', this.length)
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
    if (event.key === 'ArrowRight' && index < this.length - 1) {
      this.focusCell(index + 1)
    }
  }

  protected onCellPaste(index: number, event: ClipboardEvent, ctrl: FormControl): void {
    event.preventDefault()
    const pattern = PIN_INPUT_PATTERNS[this.type]
    const pasted = event.clipboardData?.getData('text') ?? ''
    const filtered = pasted.split('').filter((c) => pattern.test(c))
    const next = splitPinChars(typeof ctrl.value === 'string' ? ctrl.value : '', this.length)
    for (let i = 0; i < filtered.length && index + i < this.length; i++) {
      next[index + i] = filtered[i]!
    }
    this.commit(ctrl, next)
    this.focusCell(Math.min(index + filtered.length, this.length - 1))
  }
}
