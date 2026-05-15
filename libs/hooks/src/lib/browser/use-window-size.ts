'use client'

import { useEffect, useState } from 'react'

export interface WindowSize {
  width: number
  height: number
}

/**
 * Хук для отслеживания размера окна
 *
 * Возвращает текущие размеры окна и обновляется при ресайзе.
 * Использует throttle для оптимизации производительности.
 *
 * @returns WindowSize — { width, height }
 *
 * @example
 * ```tsx
 * const { width, height } = useWindowSize()
 *
 * const columns = width < 768 ? 1 : width < 1024 ? 2 : 3
 * ```
 */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const handleResize = () => {
      // Throttle: максимум 60fps
      if (timeoutId) {
        return
      }

      timeoutId = setTimeout(() => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        })
        timeoutId = null
      }, 16) // ~60fps
    }

    // Установить начальное значение
    handleResize()

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  return size
}
