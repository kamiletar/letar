import type { AddressProvider, AddressSuggestion } from '@letar/forms-core/address'
import { onBeforeUnmount, onMounted, type Ref, ref } from 'vue'

export interface UseAddressSuggestionsOptions {
  /** Провайдер резолвится лениво при каждом запросе — пропы поля (`token`) могут смениться. */
  getProvider: () => AddressProvider | null
  minChars?: number
  debounceMs?: number
  count?: number
  bounds?: { from?: string; to?: string }
  filters?: Record<string, unknown>
  onSelect: (suggestion: AddressSuggestion) => void
}

export interface UseAddressSuggestionsResult {
  inputValue: Ref<string>
  suggestions: Ref<AddressSuggestion[]>
  isLoading: Ref<boolean>
  isOpen: Ref<boolean>
  highlightedIndex: Ref<number>
  containerRef: Ref<HTMLElement | null>
  handleInput: (value: string) => void
  handleFocus: () => void
  handleKeydown: (e: KeyboardEvent) => void
  select: (suggestion: AddressSuggestion) => void
  close: () => void
}

/**
 * Composable подсказок адреса/города — общий для `FieldAddress` и `FieldCity`, обоих Vue-скинов.
 * `createDaDataProvider`/`AddressProvider` (`@letar/forms-core/address`) уже framework-agnostic —
 * порт не потребовался, здесь только Vue-обвязка (debounce, click-outside, клавиатура).
 */
export function useAddressSuggestions(options: UseAddressSuggestionsOptions): UseAddressSuggestionsResult {
  const { minChars = 3, debounceMs = 300, count = 10, bounds, filters, onSelect } = options

  const inputValue = ref('')
  const suggestions = ref<AddressSuggestion[]>([]) as Ref<AddressSuggestion[]>
  const isLoading = ref(false)
  const isOpen = ref(false)
  const highlightedIndex = ref(-1)
  const containerRef = ref<HTMLElement | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let requestId = 0
  let justSelected = false

  async function fetchSuggestions(query: string) {
    const provider = options.getProvider()
    if (query.length < minChars || !provider) {
      suggestions.value = []
      return
    }

    const currentRequest = ++requestId
    isLoading.value = true
    try {
      const results = await provider.getSuggestions(query, { count, bounds, filters })
      if (currentRequest !== requestId) {
        return
      }
      suggestions.value = results
      isOpen.value = results.length > 0
    } catch (error) {
      if (currentRequest !== requestId) {
        return
      }
      console.error('Ошибка загрузки подсказок адреса:', error)
      suggestions.value = []
    } finally {
      if (currentRequest === requestId) {
        isLoading.value = false
      }
    }
  }

  function handleInput(value: string) {
    inputValue.value = value
    highlightedIndex.value = -1

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    if (justSelected) {
      justSelected = false
      return
    }
    if (!value) {
      requestId++
      suggestions.value = []
      isOpen.value = false
      return
    }
    debounceTimer = setTimeout(() => fetchSuggestions(value), debounceMs)
  }

  function handleFocus() {
    if (suggestions.value.length > 0) {
      isOpen.value = true
    }
  }

  function select(suggestion: AddressSuggestion) {
    justSelected = true
    isOpen.value = false
    suggestions.value = []
    onSelect(suggestion)
  }

  function close() {
    isOpen.value = false
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!isOpen.value || suggestions.value.length === 0) {
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        highlightedIndex.value = highlightedIndex.value < suggestions.value.length - 1 ? highlightedIndex.value + 1 : 0
        break
      case 'ArrowUp':
        e.preventDefault()
        highlightedIndex.value = highlightedIndex.value > 0 ? highlightedIndex.value - 1 : suggestions.value.length - 1
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex.value >= 0) {
          select(suggestions.value[highlightedIndex.value]!)
        }
        break
      case 'Escape':
        close()
        break
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
      close()
    }
  }

  onMounted(() => document.addEventListener('mousedown', handleClickOutside))
  onBeforeUnmount(() => {
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
    containerRef,
    handleInput,
    handleFocus,
    handleKeydown,
    select,
    close,
  }
}
