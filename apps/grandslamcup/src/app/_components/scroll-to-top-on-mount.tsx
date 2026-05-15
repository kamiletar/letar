'use client'

/**
 * Скролл в начало страницы при маунте компонента.
 * Используется когда Next.js scroll restoration кеширует позицию
 * и пользователь попадает на страницу в её середине.
 */

import { useEffect } from 'react'

export function ScrollToTopOnMount() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])
  return null
}
