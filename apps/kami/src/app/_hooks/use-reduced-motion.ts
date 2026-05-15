'use client'

import { useEffect, useState } from 'react'

/**
 * Хук для определения prefers-reduced-motion
 * Возвращает true если пользователь предпочитает уменьшенную анимацию
 *
 * @example
 * const prefersReducedMotion = useReducedMotion()
 * if (prefersReducedMotion) {
 *   // Показать статичную версию
 * }
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}
