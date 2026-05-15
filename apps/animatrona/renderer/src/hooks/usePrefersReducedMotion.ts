'use client'

/**
 * Хук для определения prefers-reduced-motion настройки пользователя
 *
 * Используется для отключения анимаций в компонентах когда пользователь
 * указал в настройках системы "reduce motion" для accessibility.
 *
 * @example
 * const prefersReducedMotion = usePrefersReducedMotion()
 * const animation = prefersReducedMotion ? 'none' : `${pulseAnimation} 2s infinite`
 */

import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  // Default: false (показываем анимации)
  // SSR-safe: на сервере возвращаем false, на клиенте проверяем
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQueryList = window.matchMedia(QUERY)

    // Устанавливаем начальное значение
    setPrefersReducedMotion(mediaQueryList.matches)

    // Слушаем изменения настроек
    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQueryList.addEventListener('change', listener)
    return () => mediaQueryList.removeEventListener('change', listener)
  }, [])

  return prefersReducedMotion
}
