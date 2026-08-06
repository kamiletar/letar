'use client'

import { useCallback, useEffect, useState } from 'react'

export interface UseInfiniteScrollSentinelOptions {
  /** Есть ли ещё не подгруженные страницы */
  hasNextPage: boolean | undefined
  /** Идёт подгрузка следующей страницы — блокирует повторный вызов onLoadMore */
  isFetchingNextPage?: boolean
  /** Подгрузить следующую страницу */
  onLoadMore: () => void
  /** rootMargin для IntersectionObserver — запускает подгрузку заранее, до появления во вьюпорте */
  rootMargin?: string
}

/**
 * Infinite scroll через невидимый sentinel-элемент + IntersectionObserver.
 *
 * Возвращает callback-ref (не `useRef`) — sentinel обычно рендерится условно
 * (`{hasNextPage && <Box ref={sentinelRef} />}`), и обычный `useRef` не подхватит узел,
 * смонтированный после первого эффекта. См. `.claude/docs/react-effect-stable-ref-pitfall.md`.
 *
 * @example
 * ```tsx
 * const sentinelRef = useInfiniteScrollSentinel({ hasNextPage, isFetchingNextPage, onLoadMore: fetchNextPage })
 * // ...
 * {hasNextPage && <Box ref={sentinelRef} h="1px" />}
 * ```
 */
export function useInfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  rootMargin = '800px',
}: UseInfiniteScrollSentinelOptions) {
  const [sentinelEl, setSentinelEl] = useState<HTMLElement | null>(null)
  const sentinelRef = useCallback((el: HTMLElement | null) => {
    setSentinelEl(el)
  }, [])

  useEffect(() => {
    if (!hasNextPage || !sentinelEl) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          onLoadMore()
        }
      },
      { rootMargin },
    )
    observer.observe(sentinelEl)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, onLoadMore, rootMargin, sentinelEl])

  return sentinelRef
}
