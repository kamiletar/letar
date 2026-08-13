import { type DestroyRef, signal, type WritableSignal } from '@angular/core'
import type { AddressProvider, AddressSuggestion } from '@letar/forms-core/address'

export interface AddressSuggestionsOptions {
  /** Провайдер резолвится лениво при каждом запросе — `@Input()` (`token`) могут смениться. */
  getProvider: () => AddressProvider | null
  /**
   * `minChars`/`debounceMs` — геттеры, не значения: `createAddressSuggestions()` вызывается один
   * раз в конструкторе поля (`FieldAddressComponent`/`FieldCityComponent`), а Angular заполняет
   * `@Input()` (legacy-декораторы) только ПОСЛЕ возврата из конструктора — то же ограничение,
   * что задокументировано в `field-base.ts`/`app-form.component.ts`. Захват `this.debounceMs` по
   * значению в момент создания контроллера навсегда зафиксировал бы дефолт (`300`), даже если
   * шаблон передал `[debounceMs]="0"`. Геттер читает текущее значение поля в момент вызова
   * (`handleInput`), к которому Angular уже применил биндинг.
   */
  getMinChars?: () => number
  getDebounceMs?: () => number
  count?: number
  bounds?: { from?: string; to?: string }
  filters?: Record<string, unknown>
  onSelect: (suggestion: AddressSuggestion) => void
  /** `DestroyRef` вызывающего компонента — снимает `document`-слушатель и таймер debounce при
   * уничтожении поля (эквивалент `onBeforeUnmount` в Vue-composable). */
  destroyRef: DestroyRef
}

export interface AddressSuggestionsController {
  inputValue: WritableSignal<string>
  suggestions: WritableSignal<AddressSuggestion[]>
  isLoading: WritableSignal<boolean>
  isOpen: WritableSignal<boolean>
  highlightedIndex: WritableSignal<number>
  handleInput: (value: string) => void
  handleFocus: () => void
  handleKeydown: (event: KeyboardEvent) => void
  select: (suggestion: AddressSuggestion) => void
  close: () => void
  /** Регистрирует контейнер для click-outside — вызывается из `ngAfterViewInit` поля, когда
   * `@ViewChild`-ref уже заполнен (в конструкторе DOM ещё не существует). */
  attachClickOutside: (container: HTMLElement) => void
}

/**
 * Контроллер подсказок адреса/города — общий для `FieldAddressComponent` и `FieldCityComponent`,
 * Angular-эквивалент `useAddressSuggestions` (`@letar/forms-vue/core`). `createDaDataProvider`/
 * `AddressProvider` (`@letar/forms-core/address`) framework-agnostic, порт не потребовался —
 * здесь только Angular-обвязка (debounce через `setTimeout`, click-outside через
 * `document.addEventListener` + `DestroyRef`, клавиатура). Обычная фабричная функция, а не
 * `@Injectable()`-сервис: состояние принадлежит одному полю, DI-провайдинг не нужен (тот же выбор,
 * что `usePinInputField`/`useSignatureField` в Vue — composable, не Pinia store).
 */
export function createAddressSuggestions(options: AddressSuggestionsOptions): AddressSuggestionsController {
  const { getMinChars, getDebounceMs, count = 10, bounds, filters, onSelect, destroyRef } = options
  const minChars = () => getMinChars?.() ?? 3
  const debounceMs = () => getDebounceMs?.() ?? 300

  const inputValue = signal('')
  const suggestions = signal<AddressSuggestion[]>([])
  const isLoading = signal(false)
  const isOpen = signal(false)
  const highlightedIndex = signal(-1)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let requestId = 0
  let justSelected = false
  let containerEl: HTMLElement | null = null

  async function fetchSuggestions(query: string): Promise<void> {
    const provider = options.getProvider()
    if (query.length < minChars() || !provider) {
      suggestions.set([])
      return
    }

    const currentRequest = ++requestId
    isLoading.set(true)
    try {
      const results = await provider.getSuggestions(query, { count, bounds, filters })
      if (currentRequest !== requestId) {
        return
      }
      suggestions.set(results)
      isOpen.set(results.length > 0)
    } catch (error) {
      if (currentRequest !== requestId) {
        return
      }
      console.error('Ошибка загрузки подсказок адреса:', error)
      suggestions.set([])
    } finally {
      if (currentRequest === requestId) {
        isLoading.set(false)
      }
    }
  }

  function handleInput(value: string): void {
    inputValue.set(value)
    highlightedIndex.set(-1)

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    if (justSelected) {
      justSelected = false
      return
    }
    if (!value) {
      requestId++
      suggestions.set([])
      isOpen.set(false)
      return
    }
    debounceTimer = setTimeout(() => void fetchSuggestions(value), debounceMs())
  }

  function handleFocus(): void {
    if (suggestions().length > 0) {
      isOpen.set(true)
    }
  }

  function select(suggestion: AddressSuggestion): void {
    justSelected = true
    isOpen.set(false)
    suggestions.set([])
    onSelect(suggestion)
  }

  function close(): void {
    isOpen.set(false)
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!isOpen() || suggestions().length === 0) {
      return
    }
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        const i = highlightedIndex()
        highlightedIndex.set(i < suggestions().length - 1 ? i + 1 : 0)
        break
      }
      case 'ArrowUp': {
        event.preventDefault()
        const i = highlightedIndex()
        highlightedIndex.set(i > 0 ? i - 1 : suggestions().length - 1)
        break
      }
      case 'Enter': {
        event.preventDefault()
        const i = highlightedIndex()
        if (i >= 0) {
          select(suggestions()[i]!)
        }
        break
      }
      case 'Escape':
        close()
        break
    }
  }

  function handleClickOutside(event: MouseEvent): void {
    if (containerEl && !containerEl.contains(event.target as Node)) {
      close()
    }
  }

  function attachClickOutside(container: HTMLElement): void {
    containerEl = container
    document.addEventListener('mousedown', handleClickOutside)
  }

  destroyRef.onDestroy(() => {
    document.removeEventListener('mousedown', handleClickOutside)
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  })

  return {
    inputValue,
    suggestions,
    isLoading,
    isOpen,
    highlightedIndex,
    handleInput,
    handleFocus,
    handleKeydown,
    select,
    close,
    attachClickOutside,
  }
}
