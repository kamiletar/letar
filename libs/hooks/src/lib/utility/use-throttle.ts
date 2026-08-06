'use client'

import { useCallback, useRef } from 'react'

/**
 * Хук для throttle функции
 *
 * Ограничивает частоту вызова функции — не чаще чем раз в указанный интервал.
 * Полезен для обработки скролла, ресайза окна и других частых событий.
 *
 * @param callback - Функция для throttle
 * @param delay - Минимальный интервал между вызовами в мс (по умолчанию 300)
 * @returns Throttled функция
 *
 * @example
 * ```tsx
 * const handleScroll = useThrottle(() => {
 *   console.log('Scroll position:', window.scrollY)
 * }, 100)
 *
 * useEffect(() => {
 *   window.addEventListener('scroll', handleScroll)
 *   return () => window.removeEventListener('scroll', handleScroll)
 * }, [handleScroll])
 * ```
 */
export function useThrottle<T extends (...args: unknown[]) => void>(callback: T, delay = 300): T {
  const lastRun = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return useCallback(
    ((...args: unknown[]) => {
      const now = Date.now()

      if (now - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = now
      } else {
        // Очищаем предыдущий таймаут и ставим новый
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(
          () => {
            callback(...args)
            lastRun.current = Date.now()
          },
          delay - (now - lastRun.current),
        )
      }
    }) as T,
    [callback, delay],
  )
}
