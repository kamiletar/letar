'use client'

import { useLayoutEffect, useRef } from 'react'

/**
 * Публикует высоту DOM-элемента в CSS-переменную на `document.documentElement`, пока
 * `active === true`, и сбрасывает её в `0px` при выключении/размонтировании. Общая часть
 * координации bottom-anchored компонентов (`CookieBanner`, `StickyActionBar`) — см.
 * `.claude/docs/ui-components.md`, раздел «Координация bottom-anchored компонентов».
 *
 * `getBoundingClientRect()` — и для немедленного значения при монтировании (быстрее первого
 * асинхронного колбэка `ResizeObserver`), и внутри самого колбэка (не `entry.contentRect`,
 * который считает только content-box без border — высоты расходились бы на 1px).
 */
export function usePublishedHeight(varName: string, active: boolean) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = document.documentElement
    if (!active || !ref.current) {
      root.style.setProperty(varName, '0px')
      return
    }
    const el = ref.current
    root.style.setProperty(varName, `${el.getBoundingClientRect().height}px`)

    const observer = new ResizeObserver(() => {
      root.style.setProperty(varName, `${el.getBoundingClientRect().height}px`)
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.setProperty(varName, '0px')
    }
  }, [varName, active])

  return ref
}
