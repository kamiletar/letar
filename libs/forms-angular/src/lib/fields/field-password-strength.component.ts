import { Component, effect, Input, type OnInit, signal } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { FieldBase } from '../core/field-base'

export type PasswordRequirement = 'minLength:8' | 'uppercase' | 'lowercase' | 'number' | 'special'

const DEFAULT_REQUIREMENTS: PasswordRequirement[] = ['minLength:8', 'uppercase', 'lowercase', 'number', 'special']

const REQUIREMENT_LABELS: Record<PasswordRequirement, string> = {
  'minLength:8': 'Минимум 8 символов',
  uppercase: 'Хотя бы одна заглавная буква',
  lowercase: 'Хотя бы одна строчная буква',
  number: 'Хотя бы одна цифра',
  special: 'Хотя бы один спецсимвол (!@#$%^&*)',
}

function checkRequirement(password: string, requirement: PasswordRequirement): boolean {
  switch (requirement) {
    case 'minLength:8':
      return password.length >= 8
    case 'uppercase':
      return /[A-Z]/.test(password)
    case 'lowercase':
      return /[a-z]/.test(password)
    case 'number':
      return /[0-9]/.test(password)
    case 'special':
      return /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    default:
      return false
  }
}

function calculateStrength(password: string, requirements: PasswordRequirement[]): number {
  if (!password) {
    return 0
  }
  const metCount = requirements.filter((req) => checkRequirement(password, req)).length
  return Math.round((metCount / requirements.length) * 100)
}

function getStrengthLabel(strength: number): string {
  if (strength < 25) {
    return 'Слабый'
  }
  if (strength < 50) {
    return 'Средний'
  }
  if (strength < 75) {
    return 'Хороший'
  }
  return 'Сильный'
}

/**
 * Индикатор силы пароля — Angular-эквивалент `FieldPasswordStrength` (`@letar/forms-vue`,
 * `field-password-strength.ts`), логика расчёта (`checkRequirement`/`calculateStrength`/
 * `getStrengthLabel`) — 1:1 порт, framework-agnostic по природе, но не вынесена в `forms-core`:
 * единственный потребитель в этом скине, тот же выбор, что уже сделан в Vue-версии.
 *
 * `value` — локальный сигнал компонента, не читается напрямую из `control()` в шаблоне (в отличие
 * от `FieldTagsComponent`) — рассчитывать `strength()`/`isMet()` на каждый CD-тик из `ctrl.value`
 * тоже можно было бы, но локальный сигнал делает зависимость explicit и не требует протаскивать
 * `ctrl` в три метода. Синхронизация с `control()` — тот же приём `effect()` + `ctrl.events`, что
 * `FieldTagsComponent`.
 *
 * `defaultVisible` — инициализация видимости через `ngOnInit()`, не в конструкторе и не в
 * field-инициализаторе класса: Angular присваивает `@Input()`-поля между конструктором и
 * `ngOnInit()`, поэтому `this.defaultVisible` в конструкторе — ещё значение по умолчанию (`false`),
 * не переданное извне. Это Angular-специфичное отличие от Vue, где `setup()` получает уже
 * заполненные `props`.
 */
@Component({
  selector: 'letar-field-password-strength',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div class="letar-field__password-strength">
          <input
            class="letar-field__control"
            [attr.type]="visible() ? 'text' : 'password'"
            [value]="value()"
            [placeholder]="resolvedPlaceholder() ?? 'Введите пароль'"
            [attr.data-field-name]="name"
            (input)="onInput($event, ctrl)"
            (blur)="ctrl.markAsTouched()"
          />
          <button
            type="button"
            aria-label="Показать/скрыть пароль"
            class="letar-field__password-toggle"
            (click)="visible.set(!visible())"
          >{{ visible() ? 'Скрыть' : 'Показать' }}</button>
          @if (value()) {
            <div class="letar-field__password-meter">
              <span class="letar-field__password-meter-label">Надёжность: {{ strengthLabel() }}</span>
              <div class="letar-field__password-meter-bar">
                <div class="letar-field__password-meter-fill" [style.width.%]="strength()"></div>
              </div>
            </div>
          }
          @if (showRequirements && value()) {
            <ul class="letar-field__password-requirements">
              @for (req of requirements; track req) {
                <li class="letar-field__password-requirement" [attr.data-met]="isMet(req) || null">
                  {{ isMet(req) ? '✓' : '✗' }} {{ requirementLabels[req] }}
                </li>
              }
            </ul>
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldPasswordStrengthComponent extends FieldBase implements OnInit {
  @Input()
  requirements: PasswordRequirement[] = DEFAULT_REQUIREMENTS
  @Input()
  showRequirements = true
  @Input()
  defaultVisible = false

  protected readonly requirementLabels = REQUIREMENT_LABELS

  readonly value = signal('')
  readonly visible = signal(false)

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.value.set((ctrl.value as string | undefined) ?? '')
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  ngOnInit(): void {
    this.visible.set(this.defaultVisible)
  }

  protected onInput(event: Event, ctrl: FormControl): void {
    const next = (event.target as HTMLInputElement).value
    this.value.set(next)
    ctrl.setValue(next)
  }

  protected strength(): number {
    return calculateStrength(this.value(), this.requirements)
  }

  protected strengthLabel(): string {
    return getStrengthLabel(this.strength())
  }

  protected isMet(requirement: PasswordRequirement): boolean {
    return checkRequirement(this.value(), requirement)
  }
}
