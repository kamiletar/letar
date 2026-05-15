'use client'

import { useEffect, useState } from 'react'

export type ScrollDirection = 'up' | 'down' | null

/**
 * Хук для отслеживания направления скролла
 *
 * Возвращает 'up' при скролле вверх, 'down' при скролле вниз,
 * null в начальном состоянии. Использует requestAnimationFrame
 * для оптимизации производительности.
 *
 * @param threshold - Минимальная дельта скролла для определения направления (по умолчанию 10)
 * @returns ScrollDirection — 'up' | 'down' | null
 *
 * @example
 * ```tsx
 * const scrollDirection = useScrollDirection()
 *
 * // Скрыть header при скролле вниз
 * const isHeaderVisible = scrollDirection !== 'down'
 * ```
 */
export function useScrollDirection(threshold = 10): ScrollDirection {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(null)

  useEffect(() => {
    let lastScrollY = window.scrollY
    let ticking = false

    const updateScrollDirection = () => {
      const scrollY = window.scrollY

      if (Math.abs(scrollY - lastScrollY) < threshold) {
        ticking = false
        return
      }

      setScrollDirection(scrollY > lastScrollY ? 'down' : 'up')
      lastScrollY = scrollY > 0 ? scrollY : 0
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [threshold])

  return scrollDirection
}
