'use client'

import { Box, Input, useSelectContext } from '@chakra-ui/react'
import type { UIKitSelectSearch } from '@letar/forms-core/uikit'
import type { KeyboardEvent, ReactElement } from 'react'
import { useEffect, useRef, useSyncExternalStore } from 'react'

const COARSE_POINTER_QUERY = '(pointer: coarse)'

function subscribeCoarsePointer(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => undefined
  }
  const media = window.matchMedia(COARSE_POINTER_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function getCoarsePointer(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(COARSE_POINTER_QUERY).matches
}

export interface SelectSearchFieldProps {
  search: UIKitSelectSearch
  /** `id` части `Select.List` — на неё указывает `aria-controls` */
  listId: string
  /** `value` первой доступной опции в порядке отображения; `undefined` — список пуст */
  firstValue: string | undefined
}

/**
 * Поле поиска внутри выпадашки Select (Chakra). Живёт внутри `Select.Root` — берёт `api` из контекста.
 *
 * Root работает с `composite: false`: у Content роль `dialog`, а `listbox` и `aria-activedescendant`
 * уходят на `Select.List`. Фокус остаётся в этом поле, поэтому ARIA combobox задаём вручную.
 */
export function SelectSearchField({ search, listId, firstValue }: SelectSearchFieldProps): ReactElement {
  const api = useSelectContext()

  // Список закрыт/открыт на устройстве без точного указателя: клавиатура телефона не должна выскакивать
  const coarsePointer = useSyncExternalStore(subscribeCoarsePointer, getCoarsePointer, () => false)

  // При каждом изменении запроса подсвечиваем первую доступную опцию: иначе подсвеченная могла
  // быть отфильтрована, и первая стрелка «пустая». `api` не стабилен — читаем через ref, чтобы
  // эффект не сбрасывал подсветку на каждый рендер
  const apiRef = useRef(api)
  useEffect(() => {
    apiRef.current = api
  })
  const { query } = search
  useEffect(() => {
    if (!query.trim()) {
      return
    }
    // Микрозадача: эффекты Root (синхронизация новой коллекции в машину zag) идут ПОСЛЕ эффектов этого
    // дочернего компонента, а подсветка значения, которого в машине ещё нет, теряется
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) {
        return
      }
      if (firstValue === undefined) {
        apiRef.current.clearHighlightValue()
      } else {
        apiRef.current.setHighlightValue(firstValue)
      }
    })
    return () => {
      cancelled = true
    }
  }, [query, firstValue])

  const highlighted = api.highlightedValue ? api.collection.find(api.highlightedValue) : null
  const activeDescendant = highlighted ? api.getItemProps({ item: highlighted }).id : undefined

  // Таблица клавиш zag исполняется раньше проверки «редактируемый элемент»: пробел стал бы Enter
  // (выбрал бы пункт), Home/End гасили бы курсор, Enter во время IME-композиции выбрал бы пункт.
  // ArrowUp/Down, Enter, Tab и Escape проходят к Content — это и есть навигация.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key === ' ' || event.key === 'Home' || event.key === 'End'
      || (event.key === 'Enter' && event.nativeEvent.isComposing)
    ) {
      event.stopPropagation()
    }
  }

  return (
    <Box position="sticky" top={0} zIndex={1} bg="bg.panel" p={1} borderBottomWidth="1px">
      <Input
        size="sm"
        // ≥ 16px, иначе iOS зумит страницу при фокусе
        fontSize="md"
        type="text"
        value={search.query}
        onChange={(event) => search.onQueryChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={search.placeholder}
        autoComplete="off"
        role="combobox"
        aria-label={search.ariaLabel}
        aria-expanded
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={activeDescendant}
        data-no-autofocus={coarsePointer ? '' : undefined}
      />
    </Box>
  )
}
