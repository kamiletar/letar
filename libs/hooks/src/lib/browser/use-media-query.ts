'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Хук для отслеживания CSS media query
 *
 * Отслеживает изменения media query и возвращает boolean.
 * Поддерживает SSR (возвращает false на сервере).
 *
 * @param query - CSS media query строка
 * @returns boolean — соответствует ли текущий viewport запросу
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 768px)')
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
 * const isRetina = useMediaQuery('(min-resolution: 2dppx)')
 *
 * if (isMobile) {
 *   return <MobileLayout />
 * }
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined') {
        return () => {}
      }

      const mediaQuery = window.matchMedia(query)
      mediaQuery.addEventListener('change', onStoreChange)

      return () => {
        mediaQuery.removeEventListener('change', onStoreChange)
      }
    },
    [query],
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.matchMedia(query).matches
  }, [query])

  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// Предопределённые breakpoints (соответствуют Chakra UI)
export const breakpoints = {
  /** max-width: 479px */
  isMobile: '(max-width: 479px)',
  /** min-width: 480px and max-width: 767px */
  isTablet: '(min-width: 480px) and (max-width: 767px)',
  /** min-width: 768px and max-width: 991px */
  isLaptop: '(min-width: 768px) and (max-width: 991px)',
  /** min-width: 992px */
  isDesktop: '(min-width: 992px)',
  /** prefers-color-scheme: dark */
  prefersDark: '(prefers-color-scheme: dark)',
  /** prefers-reduced-motion: reduce */
  prefersReducedMotion: '(prefers-reduced-motion: reduce)',
} as const
