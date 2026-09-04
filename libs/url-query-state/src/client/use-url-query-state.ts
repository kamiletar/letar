'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import {
  type ActiveFilterEntry,
  buildQueryStateHref,
  diffFromDefaults,
  hasActiveFilters,
  mergeQueryState,
  type QueryStateCodec,
  type QueryValue,
} from '../lib/query-state'

export interface UseUrlQueryStateOptions {
  /**
   * 'push' (дефолт) — заповедь №18: "назад" в браузере отменяет последний изменённый фильтр,
   * каждое изменение — своя запись истории.
   * 'replace' — не плодит историю (например, для измерений вроде номера страницы —
   * заповедь №1, где история должна отменять переход между страницами сайта, а не подгрузку).
   */
  historyMode?: 'push' | 'replace'
}

export interface UseUrlQueryStateResult<T extends Record<string, QueryValue>> {
  state: T
  /** Настоящий href для `<Link>` — заповедь №14: копирование ссылки, средний клик, right-click. */
  buildHref: (patch: Partial<T>) => string
  /** Программный переход — для случаев без `<Link>` (например, клавиатурный шорткат). */
  setState: (patch: Partial<T>) => void
  activeFilters: ActiveFilterEntry<T>[]
  hasActiveFilters: boolean
}

/**
 * Синхронизирует объект состояния с query-параметрами текущего URL (Next.js App Router).
 * Заповедь №18: фильтр применяется мгновенно (переход по `<Link href={buildHref(...)}>`, без
 * отдельной кнопки "Применить"), состояние переживает обновление страницы и копируется вместе
 * со ссылкой.
 */
export function useUrlQueryState<T extends Record<string, QueryValue>>(
  codec: QueryStateCodec<T>,
  options: UseUrlQueryStateOptions = {},
): UseUrlQueryStateResult<T> {
  const { historyMode = 'push' } = options
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const state = useMemo(() => codec.parse(searchParams), [codec, searchParams])

  function buildHref(patch: Partial<T> = {}): string {
    return buildQueryStateHref(pathname, codec, state, patch)
  }

  function setState(patch: Partial<T>): void {
    const href = buildHref(patch)
    if (historyMode === 'replace') {
      router.replace(href, { scroll: false })
    } else {
      router.push(href, { scroll: false })
    }
  }

  return {
    state,
    buildHref,
    setState,
    activeFilters: diffFromDefaults(state, codec.defaults),
    hasActiveFilters: hasActiveFilters(state, codec.defaults),
  }
}

// mergeQueryState не используется напрямую в хуке (buildQueryStateHref делает это внутри),
// но реэкспортируется — потребителю может понадобиться посчитать next-состояние без похода в URL.
export { mergeQueryState }
