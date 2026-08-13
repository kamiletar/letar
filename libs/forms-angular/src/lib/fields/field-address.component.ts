import {
  type AfterViewInit,
  Component,
  computed,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  Input,
  ViewChild,
} from '@angular/core'
import { type AddressProvider, type AddressSuggestion, createDaDataProvider } from '@letar/forms-core/address'
import { createAddressSuggestions } from '../core/address-suggestions'
import { FieldBase } from '../core/field-base'

interface AddressValue {
  value: string
  data?: Record<string, unknown>
}

/**
 * Инпут с автодополнением адреса — Angular-эквивалент `FieldAddress` (`@letar/forms-vue`,
 * `field-address.ts`). `createDaDataProvider`/`AddressProvider` (`@letar/forms-core/address`)
 * framework-agnostic, порт не потребовался — Angular-специфика только в `createAddressSuggestions`
 * (`../core/address-suggestions.ts`, Angular-эквивалент Vue-composable `useAddressSuggestions`).
 * Значение — `AddressValue` (`{ value, data? }`) либо голая строка при `valueOnly`.
 *
 * `createAddressSuggestions` вызывается один раз как инициализатор поля класса (не в шаблоне,
 * не в методе жизненного цикла) — тот же принцип, что `usePinInputField`/`useSignatureField` в
 * Vue: composable/контроллер с собственным состоянием теряет стабильную идентичность, если
 * пересоздавать его на каждый рендер. `attachClickOutside` — отдельным вызовом из
 * `ngAfterViewInit`, потому что `@ViewChild`-ref контейнера не существует до первого рендера DOM.
 */
@Component({
  selector: 'letar-field-address',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div #container class="letar-field__address" style="position: relative">
          <input
            type="text"
            class="letar-field__control"
            [value]="addr.inputValue()"
            [placeholder]="resolvedPlaceholder() ?? 'Начните вводить адрес...'"
            [attr.data-field-name]="name"
            (input)="onInput($event)"
            (focus)="addr.handleFocus()"
            (blur)="ctrl.markAsTouched()"
            (keydown)="addr.handleKeydown($event)"
          />
          @if (addr.isLoading()) {
            <span class="letar-field__address-spinner">…</span>
          }
          @if (addr.isOpen() && addr.suggestions().length > 0) {
            <ul class="letar-field__address-suggestions">
              @for (suggestion of addr.suggestions(); track suggestion.value + $index; let i = $index) {
                <li
                  [class]="i === addr.highlightedIndex() ? 'letar-field__address-suggestion--highlighted' : ''"
                  (mousedown)="onSuggestionMousedown($event, suggestion)"
                >{{ suggestion.label }}</li>
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
export class FieldAddressComponent extends FieldBase implements AfterViewInit {
  @Input()
  provider?: AddressProvider
  @Input()
  token?: string
  @Input()
  minChars = 3
  @Input()
  debounceMs = 300
  @Input()
  valueOnly = false

  @ViewChild('container')
  private readonly containerRef?: ElementRef<HTMLElement>

  private readonly destroyRef = inject(DestroyRef)
  private readonly tokenProvider = computed(() => (this.token ? createDaDataProvider({ token: this.token }) : null))

  protected readonly addr = createAddressSuggestions({
    getProvider: () => this.provider ?? this.tokenProvider(),
    getMinChars: () => this.minChars,
    getDebounceMs: () => this.debounceMs,
    destroyRef: this.destroyRef,
    onSelect: (suggestion) => {
      this.addr.inputValue.set(suggestion.value)
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      if (this.valueOnly) {
        ctrl.setValue(suggestion.value)
      } else {
        ctrl.setValue({ value: suggestion.value, data: suggestion.data } satisfies AddressValue)
      }
    },
  })

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => {
        const value = ctrl.value as AddressValue | string | undefined
        const display = typeof value === 'string' ? value : value?.value
        if (display !== undefined && display !== this.addr.inputValue()) {
          this.addr.inputValue.set(display)
        }
      }
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  ngAfterViewInit(): void {
    if (this.containerRef) {
      this.addr.attachClickOutside(this.containerRef.nativeElement)
    }
  }

  protected onInput(event: Event): void {
    this.addr.handleInput((event.target as HTMLInputElement).value)
  }

  protected onSuggestionMousedown(event: Event, suggestion: AddressSuggestion): void {
    event.preventDefault()
    this.addr.select(suggestion)
  }
}
