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

/**
 * Инпут с автодополнением города — Angular-эквивалент `FieldCity` (`@letar/forms-vue`,
 * `field-city.ts`), та же `createAddressSuggestions` (`bounds: {from:'city', to:'settlement'}`),
 * что у `FieldAddressComponent`. Значение — голая строка (не `AddressValue`). На blur без выбора
 * подсказки сохраняет введённый текст как есть — тот же UX, что у Vue/React-версий.
 */
@Component({
  selector: 'letar-field-city',
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
            [placeholder]="resolvedPlaceholder() ?? 'Введите город'"
            [attr.data-field-name]="name"
            (input)="onInput($event, ctrl)"
            (focus)="addr.handleFocus()"
            (blur)="onBlur(ctrl)"
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
export class FieldCityComponent extends FieldBase implements AfterViewInit {
  @Input()
  provider?: AddressProvider
  @Input()
  token?: string
  @Input()
  minChars = 2
  @Input()
  debounceMs = 300

  @ViewChild('container')
  private readonly containerRef?: ElementRef<HTMLElement>

  private readonly destroyRef = inject(DestroyRef)
  private readonly tokenProvider = computed(() => (this.token ? createDaDataProvider({ token: this.token }) : null))

  protected readonly addr = createAddressSuggestions({
    getProvider: () => this.provider ?? this.tokenProvider(),
    getMinChars: () => this.minChars,
    getDebounceMs: () => this.debounceMs,
    count: 7,
    bounds: { from: 'city', to: 'settlement' },
    destroyRef: this.destroyRef,
    onSelect: (suggestion) => {
      const cityName = (suggestion.data?.['city'] as string | undefined)
        ?? (suggestion.data?.['settlement'] as string | undefined)
        ?? suggestion.value
      this.addr.inputValue.set(cityName)
      this.control()?.setValue(cityName)
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
        const value = typeof ctrl.value === 'string' ? ctrl.value : ''
        if (value && value !== this.addr.inputValue()) {
          this.addr.inputValue.set(value)
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

  protected onInput(event: Event, ctrl: { setValue: (value: string) => void }): void {
    const value = (event.target as HTMLInputElement).value
    this.addr.handleInput(value)
    if (!value) {
      ctrl.setValue('')
    }
  }

  protected onBlur(ctrl: { value: unknown; setValue: (value: string) => void; markAsTouched: () => void }): void {
    if (this.addr.inputValue() && this.addr.inputValue() !== ctrl.value) {
      ctrl.setValue(this.addr.inputValue())
    }
    ctrl.markAsTouched()
  }

  protected onSuggestionMousedown(event: Event, suggestion: AddressSuggestion): void {
    event.preventDefault()
    this.addr.select(suggestion)
  }
}
